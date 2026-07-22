import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';

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
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
        'framer-motion': 'motion/react',
      },
    },
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
      outDir: 'dist'
    }
  };
});
