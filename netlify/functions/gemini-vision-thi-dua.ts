import type { Handler } from '@netlify/functions';
import {
  analyzeThiDuaImageServer,
  extractCloudflareServerEnv,
  resolveGeminiServerStatus,
  type VisionAnalyzeRequestBody,
} from '../../src/utils/thiDuaAiServerCore';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-CRM-User',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  const env = extractCloudflareServerEnv(process.env);

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ...resolveGeminiServerStatus(env),
        endpoint: 'gemini-vision-thi-dua',
        runtime: 'netlify-functions',
      }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: false,
        status: 405,
        error: 'Method Not Allowed',
      }),
    };
  }

  try {
    const body = (event.body ? JSON.parse(event.body) : {}) as VisionAnalyzeRequestBody;
    const result = await analyzeThiDuaImageServer(body, env);
    return {
      statusCode: result.status,
      headers: CORS_HEADERS,
      body: JSON.stringify(result),
    };
  } catch (err: any) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: false,
        status: 400,
        errorCode: 'INVALID_IMAGE',
        error: err?.message || 'Yêu cầu không hợp lệ.',
      }),
    };
  }
};

