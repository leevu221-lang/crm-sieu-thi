import {
  resolveThiDuaAiStatus,
  type ServerEnvLike,
} from '../../../src/utils/thiDuaAiServerCore';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-CRM-User',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context: { env: ServerEnvLike }) {
  const { env } = context;
  const apiKey = env?.GEMINI_API_KEY;
  const health = resolveThiDuaAiStatus({ GEMINI_API_KEY: apiKey });
  return new Response(JSON.stringify(health), {
    status: 200,
    headers: CORS_HEADERS,
  });
}

