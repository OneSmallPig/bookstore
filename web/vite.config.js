import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import fs from 'node:fs';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // 加载当前环境的环境变量
  const env = loadEnv(mode, process.cwd());
  
  // 解析API基础URL，优先使用环境变量中的值
  const apiBaseUrl = env.VITE_API_BASE_URL 
    ? new URL(env.VITE_API_BASE_URL).origin 
    : 'http://localhost:3000';
  
  console.log(`Mode: ${mode}, API Base URL: ${apiBaseUrl}`);
  
  // 预加载默认图片到内存中，确保中间件能访问
  let defaultCoverImageCache = null;
  let defaultCoverImageType = '';
  
  try {
    const imagePath = path.resolve(__dirname, 'src/images/default-cover.jpg');
    if (fs.existsSync(imagePath)) {
      defaultCoverImageCache = fs.readFileSync(imagePath);
      defaultCoverImageType = 'image/jpeg';
      console.log('默认封面图片已加载到缓存中');
    } else {
      // 尝试加载SVG版本
      const svgPath = path.resolve(__dirname, 'src/images/default-book-cover.svg');
      if (fs.existsSync(svgPath)) {
        defaultCoverImageCache = fs.readFileSync(svgPath);
        defaultCoverImageType = 'image/svg+xml';
        console.log('使用SVG默认封面图片作为备选');
      }
    }
  } catch (error) {
    console.error('加载默认封面图片到缓存失败:', error);
  }
  
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
      },
      // 添加静态文件服务配置
      fs: {
        // 允许为 /src 目录提供服务
        allow: ['..']
      }
    },
    // 静态资源处理
    publicDir: 'public',
    // 添加自定义重定向处理
    plugins: [
      {
        name: 'image-fallback-plugin',
        configureServer(server) {
          // 添加一个变量来控制日志输出频率，5分钟内只打印一次相同的日志
          const logThrottleMap = new Map();
          const LOG_THROTTLE_TIME = 5 * 60 * 1000; // 5分钟
          
          server.middlewares.use((req, res, next) => {
            // 处理请求 /src/images/default-cover.jpg
            if (req.url === '/src/images/default-cover.jpg' || req.url.includes('default-book-cover')) {
              // 检查是否需要打印日志
              const now = Date.now();
              const lastLogTime = logThrottleMap.get('default-cover-redirect') || 0;
              
              if (now - lastLogTime > LOG_THROTTLE_TIME) {
                console.log('接收到默认封面图片请求，直接从缓存返回');
                logThrottleMap.set('default-cover-redirect', now);
              }
              
              // 如果有缓存的图片，直接返回缓存的图片内容
              if (defaultCoverImageCache) {
                res.setHeader('Content-Type', defaultCoverImageType);
                res.setHeader('Cache-Control', 'public, max-age=86400'); // 缓存一天
                res.setHeader('ETag', '"default-cover-image"');
                res.statusCode = 200;
                return res.end(defaultCoverImageCache);
              } 
              // 没有缓存，使用重定向
              else {
                return res.writeHead(302, {
                  'Location': '../images/default-cover.jpg',
                  'Cache-Control': 'public, max-age=86400' // 缓存一天
                }).end();
              }
            }
            next();
          });
        }
      }
    ],
    // 定义环境变量前缀，默认为'VITE_'
    envPrefix: 'VITE_',
  };
}); 