import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { vitePluginForArco } from '@arco-plugins/vite-react';
import setting from './src/settings.json';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: [{ find: '@', replacement: '/src' }],
  },
  plugins: [
    react(),
    // vite-plugin-svgr v4 defaults to URL imports unless `?react` is
    // appended. Force every `*.svg` import to return a React component
    // as the default export so the legacy `import Logo from './logo.svg'`
    // usages stay valid.
    svgr({ include: '**/*.svg', svgrOptions: { exportType: 'default' } }),
    vitePluginForArco({
      theme: '@arco-themes/react-arco-pro',
      modifyVars: {
        'arcoblue-6': setting.themeColor,
      },
    }),
  ],
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
});
