import type { Handler } from '@netlify/functions';
import { resolveThiDuaAiStatus } from '../../src/utils/thiDuaAiServerCore';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-CRM-User',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ configured: false, provider: 'gemini', message: 'Method Not Allowed' }),
    };
  }

  const health = resolveThiDuaAiStatus({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  });

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(health),
  };
};

