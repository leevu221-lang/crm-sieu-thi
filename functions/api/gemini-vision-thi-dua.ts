import {
  analyzeThiDuaImageServer,
  resolveGeminiServerStatus,
  type ServerEnvLike,
  type VisionAnalyzeRequestBody,
} from '../../src/utils/thiDuaAiServerCore';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-CRM-User',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

function extractCloudflareServerEnv(env?: ServerEnvLike): ServerEnvLike {
  return {
    GEMINI_API_KEY: env?.GEMINI_API_KEY,
    GEMINI_MODEL: env?.GEMINI_MODEL,
    FIREBASE_PROJECT_ID: env?.FIREBASE_PROJECT_ID,
    VITE_FIREBASE_PROJECT_ID: env?.VITE_FIREBASE_PROJECT_ID,
    FIREBASE_API_KEY: env?.FIREBASE_API_KEY,
    VITE_FIREBASE_API_KEY: env?.VITE_FIREBASE_API_KEY,
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context: { env: ServerEnvLike }) {
  const statusInfo = resolveGeminiServerStatus(extractCloudflareServerEnv(context.env));
  return new Response(
    JSON.stringify({
      ...statusInfo,
      endpoint: 'gemini-vision-thi-dua',
      runtime: 'cloudflare-pages',
    }),
    { status: 200, headers: CORS_HEADERS }
  );
}

export async function onRequestPost(context: {
  request: Request;
  env: ServerEnvLike;
}) {
  try {
    const serverEnv = extractCloudflareServerEnv(context.env);
    const body = (await context.request.json()) as VisionAnalyzeRequestBody;
    const result = await analyzeThiDuaImageServer(body, serverEnv);
    return new Response(JSON.stringify(result), {
      status: result.status,
      headers: CORS_HEADERS,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        status: 400,
        errorCode: 'INVALID_IMAGE',
        error: err?.message || 'Yêu cầu không hợp lệ.',
      }),
      { status: 400, headers: CORS_HEADERS }
    );
  }
}

