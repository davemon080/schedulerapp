import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { defineConfig, Plugin } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Custom Vite plugin to ensure that native Capacitor plugins resolve seamlessly
 * in all environments (Web, PWA, and Native Android / iOS builds).
 * 
 * If a native plugin package is missing from node_modules during a local build,
 * it routes to our self-contained bridge or generates a safe Capacitor plugin 
 * registration so Rollup never fails with 'failed to resolve import'.
 */
function capacitorNativePluginResolver(): Plugin {
  return {
    name: 'capacitor-native-plugin-resolver',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (source.startsWith('@capacitor/') && source !== '@capacitor/core') {
        // Explicit bridges for push and local notifications
        if (source === '@capacitor/push-notifications') {
          return path.resolve(__dirname, 'src/lib/capacitorPushNotifications.ts');
        }
        if (source === '@capacitor/local-notifications') {
          return path.resolve(__dirname, 'src/lib/capacitorLocalNotifications.ts');
        }

        // Check if installed in node_modules
        const localModulePath = path.resolve(__dirname, 'node_modules', source);
        if (fs.existsSync(localModulePath)) {
          return null; // Let standard node resolution handle it
        }

        // Try Vite's internal resolver
        try {
          const resolved = await this.resolve(source, importer, { skipSelf: true });
          if (resolved) return resolved;
        } catch {}

        // Virtual fallback registration via @capacitor/core
        return '\0capacitor-virtual:' + source;
      }
      return null;
    },
    load(id) {
      if (id.startsWith('\0capacitor-virtual:@capacitor/')) {
        const rawName = id.replace('\0capacitor-virtual:@capacitor/', '');
        const pascalName = rawName
          .split('-')
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join('');

        return `
          import { registerPlugin } from '@capacitor/core';
          export const ${pascalName} = registerPlugin('${pascalName}', {});
          export default ${pascalName};
        `;
      }
      return null;
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      capacitorNativePluginResolver(),
      react(), 
      tailwindcss()
    ],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        '@': path.resolve(__dirname, '.'),
        '@admin': path.resolve(__dirname, 'admin'),
        '@src': path.resolve(__dirname, 'src'),
        '@capacitor/push-notifications': path.resolve(__dirname, 'src/lib/capacitorPushNotifications.ts'),
        '@capacitor/local-notifications': path.resolve(__dirname, 'src/lib/capacitorLocalNotifications.ts'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/client',
        'motion/react',
        'lucide-react',
      ],
    },
    server: {
      hmr: false,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    define: {
      'import.meta.env.VITE_APP_URL': JSON.stringify(
        process.env.APP_URL || 'https://ais-dev-akmbhqg4c2q66ko6cai24t-427573213327.europe-west1.run.app'
      ),
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          payment: path.resolve(__dirname, 'payment/index.html'),
        },
      },
    },
  };
});
