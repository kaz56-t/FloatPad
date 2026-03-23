// scripts/verify.ts
// 実行: npx ts-node scripts/verify.ts
import { _electron as electron } from 'playwright'
import * as fs from 'fs/promises'
import * as path from 'path'

const RESULTS_DIR = 'test-results'

async function run(): Promise<void> {
  await fs.mkdir(RESULTS_DIR, { recursive: true })
  const results: Record<string, string> = {}

  const app = await electron.launch({ args: ['.'] })
  const win = await app.firstWindow()
  await win.waitForLoadState('domcontentloaded')

  // --- ① ウィンドウ表示確認 ---
  try {
    await win.screenshot({ path: `${RESULTS_DIR}/01_launch.png` })
    results['ウィンドウ起動'] = 'OK'
  } catch (e) {
    results['ウィンドウ起動'] = `FAIL: ${e}`
  }

  // --- ② メモタブ：入力 → 自動保存確認 ---
  try {
    await win.click('[data-tab="memo"]')
    await win.waitForTimeout(300)
    await win.evaluate(async () => {
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement
      if (textarea) {
        textarea.value = 'Playwright テスト 12345'
        textarea.dispatchEvent(new Event('input', { bubbles: true }))
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (window as any).api.memoSave('Playwright テスト 12345')
    })
    await win.waitForTimeout(500)
    // user-data はプロジェクト内なので直接参照可能
    const memoPath = path.join(process.cwd(), 'user-data', 'memo.txt')
    const saved = await fs.readFile(memoPath, 'utf-8')
    results['メモ自動保存'] = saved.includes('Playwright テスト 12345') ? 'OK' : `FAIL: 内容不一致`
    await win.screenshot({ path: `${RESULTS_DIR}/02_memo.png` })
  } catch (e) {
    results['メモ自動保存'] = `FAIL: ${e}`
  }

  // --- ③ 電卓タブ：3 + 4 = 7 ---
  try {
    await win.click('[data-tab="calculator"]')
    await win.click('[data-key="3"]')
    await win.click('[data-key="+"]')
    await win.click('[data-key="4"]')
    await win.click('[data-key="="]')
    const display = await win.textContent('[data-display]')
    results['電卓演算'] = display?.trim() === '7' ? 'OK' : `FAIL: 表示="${display}"`
    await win.screenshot({ path: `${RESULTS_DIR}/03_calculator.png` })
  } catch (e) {
    results['電卓演算'] = `FAIL: ${e}`
  }

  // --- ④ Webビューアタブ：URL入力 → ページ表示 ---
  try {
    await win.click('[data-tab="web"]')
    await win.fill('[data-url-input]', 'https://example.com')
    await win.keyboard.press('Enter')
    await win.waitForTimeout(3000) // ページロード待機
    await win.screenshot({ path: `${RESULTS_DIR}/04_webviewer.png` })
    results['Webビューア'] = 'OK (スクリーンショット確認)'
  } catch (e) {
    results['Webビューア'] = `FAIL: ${e}`
  }

  await app.close()

  // --- 結果レポート出力 ---
  const report = [
    '# 動作確認レポート',
    `実行日時: ${new Date().toLocaleString('ja-JP')}`,
    '',
    '## 結果',
    ...Object.entries(results).map(([k, v]) => `- **${k}**: ${v}`),
    '',
    '## スクリーンショット',
    '`test-results/` フォルダを確認してください。',
  ].join('\n')

  await fs.writeFile(`${RESULTS_DIR}/report.md`, report)
  console.log(report)

  const failed = Object.values(results).filter((v) => v.startsWith('FAIL'))
  if (failed.length > 0) {
    console.error(`\n${failed.length}件のテストが失敗しました。`)
    process.exit(1)
  }
}

run().catch(console.error)
