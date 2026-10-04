import { timingSafeEqual } from "node:crypto";
import { config } from "./config.js";

function corsHeaders(event) {
  const origin = event?.headers?.origin || event?.headers?.Origin || "";
  const allow = config.allowedOrigins.includes(origin) ? origin : config.allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "content-type,x-admin-key",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    Vary: "Origin",
  };
}

export function json(event, statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json", ...corsHeaders(event) },
    body: JSON.stringify(body),
  };
}

export function parseJson(event) {
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : event.body;
    return JSON.parse(raw || "{}");
  } catch {
    return null;
  }
}

export function isAdmin(event) {
  const given = event?.headers?.["x-admin-key"] || "";
  const expected = config.adminKey;
  if (!expected || expected.length < 16 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
