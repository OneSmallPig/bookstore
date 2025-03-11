import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
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
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
}); 