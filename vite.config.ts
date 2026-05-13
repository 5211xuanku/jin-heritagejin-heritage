import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'remove-crossorigin',
      transformIndexHtml(html) {
        return html.replace(/\bcrossorigin\s*(?:=["'][^"']*["'])?/g, '')
      },
      enforce: 'post',
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 减小 chunk 大小警告阈值
    chunkSizeWarningLimit: 500,
    // 启用 minify
    minify: 'terser',
    terserOptions: {
      compress: {
        // 生产环境移除 console.log
        drop_console: true,
        // 移除注释
        drop_debugger: true,
        // 移除纯函数调用副作用
        pure_funcs: ['console.info', 'console.debug', 'console.warn'],
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React 核心（包含 react-dom 依赖的 scheduler 等）
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
            return 'vendor'
          }
          // Three.js（最大依赖）
          if (id.includes('node_modules/three/')) {
            return 'three'
          }
          // CloudBase SDK（延迟加载的 chunk）
          if (id.includes('node_modules/@cloudbase/')) {
            return 'cloudbase'
          }
          // Framer Motion
          if (id.includes('node_modules/framer-motion/')) {
            return 'motion'
          }
          // lucide 图标
          if (id.includes('node_modules/lucide-react/')) {
            return 'lucide'
          }
          // 其他 node_modules 合并到 vendor（避免循环引用）
          if (id.includes('node_modules/')) {
            return 'vendor'
          }
        },
      },
    },
  },
})
