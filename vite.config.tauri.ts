import { defineConfig } from 'vite'

// TAURI_DEV_HOST は Tauri CLI が iOS/Android向けに設定する環境変数
const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  // ログ出力を抑えない（Tauriのデバッグのため）
  clearScreen: false,
  // Electron用のsrc/rendererをルートとして流用する
  root: 'src/renderer',
  // ビルド成果物はルートの dist/ へ出力（tauri.conf.json の frontendDist と一致）
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    // Tauri は Windows では Chromium、macOS/Linux では WebKit を使用
    target:
      process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    // リリースビルドのみ minify
    minify: process.env.TAURI_ENV_DEBUG ? false : 'esbuild',
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 5183,
        }
      : undefined,
    watch: {
      // src-tauri の変更は Rust の watch が担当するため除外
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
})
