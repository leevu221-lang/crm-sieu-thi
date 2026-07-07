import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

const certExists = fs.existsSync('./43751-crm.local+1-key.pem');

// Automatically generate a version file at build/start time
try {
  const versionInfo = {
    version: new Date().getTime().toString(),
    commit: process.env.CF_PAGES_COMMIT_SHA || 'dev-' + Math.random().toString(36).substring(2, 8),
    builtAt: new Date().toISOString()
  };
  const publicDir = path.resolve(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(
    path.resolve(publicDir, 'version.json'),
    JSON.stringify(versionInfo, null, 2)
  );
  console.log('[Build Version Generator] Generated public/version.json:', versionInfo);

  // Copy guide image using host Node process
  const src = '/Users/linhvu/.gemini/antigravity-ide/brain/ae94079b-eead-481e-b366-1fe809de3f0b/media__1783259634336.png';
  const dest = path.resolve(publicDir, 'ycx_guide_real.png');
  const logFile = path.resolve(publicDir, 'copy_log_real.txt');
  
  if (fs.existsSync(src)) {
    try {
      fs.copyFileSync(src, dest);
      fs.writeFileSync(logFile, `Success! Image copied successfully from ${src} to ${dest}`);
      console.log('[Guide Image Copy] Image copied successfully from', src, 'to', dest);
    } catch (copyErr) {
      fs.writeFileSync(logFile, `Copy Error: ${copyErr.message}`);
      console.error('[Guide Image Copy] Copy Error:', copyErr);
    }
  } else {
    fs.writeFileSync(logFile, `Source image not found at: ${src}`);
    console.warn('[Guide Image Copy] Source image not found at:', src);
  }
} catch (e) {
  console.error('[Build/Copy Initializer] Failed:', e);
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      allowedHosts: ['43751-crm.local'],
      fs: {
        allow: [
          path.resolve(__dirname, '.'),
          '/Users/linhvu/.gemini/antigravity-ide/brain/c95d7874-abec-4cd9-8c0c-d8ba006c5344'
        ]
      },
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
            vendor: ['react', 'react-dom', 'lucide-react', 'motion/react']
          }
        }
      }
    }
  };
});
