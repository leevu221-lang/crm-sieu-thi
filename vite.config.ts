import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';
import {
  analyzeThiDuaImageServer,
  resolveGeminiServerStatus,
  type VisionAnalyzeRequestBody,
} from './src/utils/thiDuaAiServerCore';

function createThiDuaAiMiddleware(serverEnv: Record<string, string>): Connect.NextHandleFunction {
  const effectiveEnv = {
    GEMINI_API_KEY: serverEnv.GEMINI_API_KEY || process.env.GEMINI_API_KEY,
    GEMINI_MODEL: serverEnv.GEMINI_MODEL || process.env.GEMINI_MODEL,
    FIREBASE_PROJECT_ID: serverEnv.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    VITE_FIREBASE_PROJECT_ID: serverEnv.VITE_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
    FIREBASE_API_KEY: serverEnv.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
    VITE_FIREBASE_API_KEY: serverEnv.VITE_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
  };

  return (req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CRM-User');
      res.end();
      return;
    }
    if (req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(
        JSON.stringify({
          ...resolveGeminiServerStatus(effectiveEnv),
          endpoint: 'gemini-vision-thi-dua',
          runtime: 'vite-dev-server',
        })
      );
      return;
    }
    if (req.method !== 'POST') {
      next();
      return;
    }
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        const body = (rawBody ? JSON.parse(rawBody) : {}) as VisionAnalyzeRequestBody;
        const result = await analyzeThiDuaImageServer(body, effectiveEnv);
        res.statusCode = result.status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(result));
      } catch (err: any) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, status: 400, error: err?.message || 'Yêu cầu không hợp lệ.' }));
      }
    });
  };
}

function thiDuaAiApiPlugin(serverEnv: Record<string, string>): Plugin {
  return {
    name: 'thi-dua-ai-api',
    configureServer(server) {
      server.middlewares.use('/api/gemini-vision-thi-dua', createThiDuaAiMiddleware(serverEnv));
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/gemini-vision-thi-dua', createThiDuaAiMiddleware(serverEnv));
    },
  };
}

const certExists = fs.existsSync('./43751-crm.local+1-key.pem');

// Automatically generate a version file at build/start time
try {
  const versionInfo = {
    version: new Date().getTime().toString(),
    commit: process.env.CF_PAGES_COMMIT_SHA || 'dev-' + Math.random().toString(36).substring(2, 8),
    builtAt: new Date().toISOString()
  };
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(
    path.resolve(publicDir, 'version.json'),
    JSON.stringify(versionInfo, null, 2)
  );
  console.log('[Build Version Generator] Generated public/version.json:', versionInfo);
} catch (e) {
  console.error('[Build Version Generator] Failed:', e);
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    plugins: [react(), tailwindcss(), thiDuaAiApiPlugin(env)],
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      allowedHosts: ['43751-crm.local'],
      ...(certExists && {
        https: {
          key: fs.readFileSync('./43751-crm.local+1-key.pem'),
          cert: fs.readFileSync('./43751-crm.local+1.pem'),
        },
      }),
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-xlsx': ['xlsx'],
            'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage'],
            'vendor-icons': ['lucide-react'],
            'vendor-motion': ['framer-motion'],
            'vendor-charts': ['recharts'],
            'vendor-capture': ['html-to-image', 'modern-screenshot', 'html2canvas']
          }
        }
      }
    }
  };
});
