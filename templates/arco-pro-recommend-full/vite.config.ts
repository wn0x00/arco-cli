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
    // Match the old @arco-plugins/vite-plugin-svgr behavior: every `*.svg`
    // import returns the SVG as a React component (default export). Without
    // this `include`, vite-plugin-svgr v4 only handles `*.svg?react` queries
    // and `import Logo from './logo.svg'` would resolve to a data URL string,
    // which React then tries to render as a tag name and crashes.
    svgr({ include: '**/*.svg' }),
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
