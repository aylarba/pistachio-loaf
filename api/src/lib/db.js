// DynamoDB access. Single table:
//   PK = DAY#<date>    SK = CAPACITY   booked: number of loaves reserved that day
//   PK = ORDER#<id>    SK = ORDER      the order and its status
import { DynamoDBClient, ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  PutCommand,
  GetCommand,
  BatchGetCommand,
} from "@aws-sdk/lib-dynamodb";
import { config } from "./config.js";

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const T = () => config.tableName;

export async function bookedByDate(dates) {
  const result = Object.fromEntries(dates.map((d) => [d, 0]));
  // BatchGet allows 100 keys per request
  for (let i = 0; i < dates.length; i += 100) {
    const keys = dates.slice(i, i + 100).map((d) => ({ PK: `DAY#${d}`, SK: "CAPACITY" }));
    const res = await doc.send(new BatchGetCommand({ RequestItems: { [T()]: { Keys: keys } } }));
    for (const item of res.Responses?.[T()] ?? []) {
      result[item.PK.slice(4)] = item.booked ?? 0;
    }
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
    if (err instanceof ConditionalCheckFailedException || err.name === "ConditionalCheckFailedException") {
      return false;
    }
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

export async function putOrder(order) {
  await doc.send(
    new PutCommand({
      TableName: T(),
      Item: { PK: `ORDER#${order.id}`, SK: "ORDER", ...order },
      ConditionExpression: "attribute_not_exists(PK)",
    })
  );
}

export async function getOrder(id) {
  const res = await doc.send(new GetCommand({ TableName: T(), Key: { PK: `ORDER#${id}`, SK: "ORDER" } }));
  return res.Item ?? null;
}

/** Move an order from one status to another. Returns false if it was not in `from`. */
export async function setStatus(id, from, to, extra = {}) {
  const names = { "#s": "status" };
  const values = { ":from": from, ":to": to, ":now": new Date().toISOString() };
  let set = "#s = :to, updatedAt = :now";
  Object.entries(extra).forEach(([k, v], i) => {
    names[`#e${i}`] = k;
    values[`:e${i}`] = v;
    set += `, #e${i} = :e${i}`;
  });
  try {
    await doc.send(
      new UpdateCommand({
        TableName: T(),
        Key: { PK: `ORDER#${id}`, SK: "ORDER" },
        UpdateExpression: `SET ${set}`,
        ConditionExpression: "#s = :from",
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      })
    );
    return true;
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") return false;
    throw err;
  }
}
