import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // 加载当前环境的环境变量
  const env = loadEnv(mode, process.cwd());
  
  // 解析API基础URL，优先使用环境变量中的值
  const apiBaseUrl = env.VITE_API_BASE_URL 
    ? new URL(env.VITE_API_BASE_URL).origin 
    : 'http://localhost:3000';
  
  console.log(`Mode: ${mode}, API Base URL: ${apiBaseUrl}`);
  
  return {
    root: './',
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          search: resolve(__dirname, 'src/pages/search.html'),
          bookshelf: resolve(__dirname, 'src/pages/bookshelf.html'),
          bookDetail: resolve(__dirname, 'src/pages/book-detail.html'),
          reader: resolve(__dirname, 'src/pages/reader.html'),
          profile: resolve(__dirname, 'src/pages/profile.html'),
          community: resolve(__dirname, 'src/pages/community.html'),
          bookSourceManagement: resolve(__dirname, 'src/pages/book-source-management.html'),
        },
      },
      assetsDir: 'assets',
      sourcemap: true
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true
        }
      }
    },
    // 定义环境变量前缀，默认为'VITE_'
    envPrefix: 'VITE_',
  };
}); 