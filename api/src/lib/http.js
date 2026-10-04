import { config } from "./config.js";

function corsHeaders(event) {
  const origin = event?.headers?.origin || event?.headers?.Origin || "";
  const allow = config.allowedOrigins.includes(origin) ? origin : config.allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "content-type",
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

export function rawBody(event) {
  if (!event.body) return "";
  return event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
}

export function parseJson(event) {
  try {
    return JSON.parse(rawBody(event) || "{}");
  } catch {
    return null;
  }
}
