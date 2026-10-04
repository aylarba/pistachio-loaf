// DynamoDB access. Single table:
//   PK = DAY#<date>    SK = CAPACITY   booked: loaves reserved that day
//   PK = ORDER#<code>  SK = ORDER      the order; GSI1 indexes it by status
//
// GSI1PK = STATUS#<status>
// GSI1SK = expiresAt (for awaiting_payment, so expired holds are easy to find)
//          or <deliveryDate>#<code> (for every other status, sorted by delivery day)
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  PutCommand,
  GetCommand,
  BatchGetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { config } from "./config.js";

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const T = () => config.tableName;
const isConditionFail = (err) => err?.name === "ConditionalCheckFailedException";

export const sortKeyFor = (order, status) =>
  status === "awaiting_payment" ? order.expiresAt : `${order.date}#${order.code}`;

export async function bookedByDate(dates) {
  const result = Object.fromEntries(dates.map((d) => [d, 0]));
  for (let i = 0; i < dates.length; i += 100) {
    const keys = dates.slice(i, i + 100).map((d) => ({ PK: `DAY#${d}`, SK: "CAPACITY" }));
    const res = await doc.send(new BatchGetCommand({ RequestItems: { [T()]: { Keys: keys } } }));
    for (const item of res.Responses?.[T()] ?? []) result[item.PK.slice(4)] = item.booked ?? 0;
  }
  return result;
}

/** Atomically reserve loaves for a day. Returns false if the day is full. */
export async function reserve(date, quantity, capacity) {
  const limit = capacity - quantity;
  if (limit < 0) return false;
  try {
    await doc.send(
      new UpdateCommand({
        TableName: T(),
        Key: { PK: `DAY#${date}`, SK: "CAPACITY" },
        UpdateExpression: "ADD booked :q",
        ConditionExpression: "attribute_not_exists(booked) OR booked <= :limit",
        ExpressionAttributeValues: { ":q": quantity, ":limit": limit },
      })
    );
    return true;
  } catch (err) {
    if (isConditionFail(err)) return false;
    throw err;
  }
}

export async function release(date, quantity) {
  await doc.send(
    new UpdateCommand({
      TableName: T(),
      Key: { PK: `DAY#${date}`, SK: "CAPACITY" },
      UpdateExpression: "ADD booked :q",
      ExpressionAttributeValues: { ":q": -quantity },
    })
  );
}

/** Saves a new order. Returns false if the code is already taken. */
export async function putOrder(order) {
  try {
    await doc.send(
      new PutCommand({
        TableName: T(),
        Item: {
          PK: `ORDER#${order.code}`,
          SK: "ORDER",
          GSI1PK: `STATUS#${order.status}`,
          GSI1SK: sortKeyFor(order, order.status),
          ...order,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );
    return true;
  } catch (err) {
    if (isConditionFail(err)) return false;
    throw err;
  }
}

export async function getOrder(code) {
  const res = await doc.send(new GetCommand({ TableName: T(), Key: { PK: `ORDER#${code}`, SK: "ORDER" } }));
  return res.Item ?? null;
}

/** Move an order from one status to another. Returns the updated order, or null if it was not in `from`. */
export async function setStatus(order, from, to) {
  try {
    const res = await doc.send(
      new UpdateCommand({
        TableName: T(),
        Key: { PK: `ORDER#${order.code}`, SK: "ORDER" },
        UpdateExpression: "SET #s = :to, GSI1PK = :pk, GSI1SK = :sk, updatedAt = :now",
        ConditionExpression: "#s = :from",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: {
          ":from": from,
          ":to": to,
          ":pk": `STATUS#${to}`,
          ":sk": sortKeyFor(order, to),
          ":now": new Date().toISOString(),
        },
        ReturnValues: "ALL_NEW",
      })
    );
    return res.Attributes;
  } catch (err) {
    if (isConditionFail(err)) return null;
    throw err;
  }
}

export async function listByStatus(status, limit = 200) {
  const res = await doc.send(
    new QueryCommand({
      TableName: T(),
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": `STATUS#${status}` },
      Limit: limit,
    })
  );
  return res.Items ?? [];
}

export async function listExpired(nowIso) {
  const res = await doc.send(
    new QueryCommand({
      TableName: T(),
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk AND GSI1SK < :now",
      ExpressionAttributeValues: { ":pk": "STATUS#awaiting_payment", ":now": nowIso },
    })
  );
  return res.Items ?? [];
}
