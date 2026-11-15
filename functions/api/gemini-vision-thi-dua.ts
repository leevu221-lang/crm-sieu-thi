import {
  analyzeThiDuaImageServer,
  extractCloudflareServerEnv,
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

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context: { env: ServerEnvLike }) {
  const { env } = context;
  const statusInfo = resolveGeminiServerStatus(extractCloudflareServerEnv(env));
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
    const { env } = context;
    const serverEnv = extractCloudflareServerEnv(env);
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

