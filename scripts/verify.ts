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
    await win.waitForTimeout(500)
    await win.locator('textarea').fill('Playwright テスト 12345')
    await win.waitForTimeout(1500) // debounce 待機
    const memoPath = path.join(process.cwd(), 'user-data', 'memo-1.txt')
    const saved = await fs.readFile(memoPath, 'utf-8')
    results['メモ自動保存'] = saved.includes('Playwright テスト 12345') ? 'OK' : `FAIL: 内容不一致`
    await win.screenshot({ path: `${RESULTS_DIR}/02_memo.png` })
  } catch (e) {
    results['メモ自動保存'] = `FAIL: ${e}`
  }

  // --- ②-b 複数メモ：新規作成 → タブ数確認 ---
  try {
    await win.click('[data-tab="memo"]')
    await win.waitForTimeout(300)
    await win.click('#memo-add-btn')
    await win.waitForTimeout(300)
    const tabCount = await win.locator('.memo-tab').count()
    results['複数メモ作成'] = tabCount >= 2 ? 'OK' : `FAIL: タブ数=${tabCount}`
    await win.screenshot({ path: `${RESULTS_DIR}/02b_multi_memo.png` })
  } catch (e) {
    results['複数メモ作成'] = `FAIL: ${e}`
  }

  // --- ②-c 行番号：設定パネルのチェックボックスでトグル確認 ---
  try {
    await win.click('[data-tab="memo"]')
    await win.waitForTimeout(200)
    await win.click('#settings-btn')
    await win.waitForTimeout(200)
    await win.check('#line-num-toggle-settings')
    await win.waitForTimeout(200)
    await win.click('#settings-btn') // 設定を閉じる
    await win.waitForTimeout(200)
    const visible = await win.locator('#line-numbers').isVisible()
    results['行番号表示'] = visible ? 'OK' : 'FAIL: 行番号が表示されない'
    await win.screenshot({ path: `${RESULTS_DIR}/02c_line_numbers.png` })
    // 元に戻す
    await win.click('#settings-btn')
    await win.waitForTimeout(200)
    await win.uncheck('#line-num-toggle-settings')
    await win.click('#settings-btn')
  } catch (e) {
    results['行番号表示'] = `FAIL: ${e}`
  }

  // --- ②-d メモ名 inline リネーム確認 ---
  try {
    await win.click('[data-tab="memo"]')
    await win.waitForTimeout(300)
    // まず2つ目のタブがあることを確認、なければ作成
    const tabCount = await win.locator('.memo-tab').count()
    if (tabCount < 2) {
      await win.click('#memo-add-btn')
      await win.waitForTimeout(300)
    }
    // 最初のタブをダブルクリック
    await win.locator('.memo-tab').first().dblclick()
    await win.waitForTimeout(200)
    const renameInput = win.locator('.memo-tab-rename-input')
    const inputVisible = await renameInput.isVisible()
    if (inputVisible) {
      await renameInput.fill('テストメモ')
      await renameInput.press('Enter')
      await win.waitForTimeout(200)
      const tabName = await win.locator('.memo-tab').first().locator('.memo-tab-name').textContent()
      results['メモ名inline化'] = tabName === 'テストメモ' ? 'OK' : `FAIL: 名前="${tabName}"`
    } else {
      results['メモ名inline化'] = 'FAIL: 入力フィールドが表示されない'
    }
    await win.screenshot({ path: `${RESULTS_DIR}/02d_rename.png` })
  } catch (e) {
    results['メモ名inline化'] = `FAIL: ${e}`
  }

  // --- ②-e Tab インデント確認 ---
  try {
    await win.click('[data-tab="memo"]')
    await win.waitForTimeout(300)
    await win.locator('textarea').click()
    await win.locator('textarea').fill('')
    await win.locator('textarea').pressSequentially('hello')
    await win.locator('textarea').press('Tab')
    const val = await win.locator('textarea').inputValue()
    results['Tabインデント'] = val === '  hello' ? 'OK' : `FAIL: 値="${val}"`
    await win.screenshot({ path: `${RESULTS_DIR}/02e_indent.png` })
  } catch (e) {
    results['Tabインデント'] = `FAIL: ${e}`
  }

  // --- ②-f 箇条書き継続確認 ---
  try {
    await win.click('[data-tab="memo"]')
    await win.waitForTimeout(300)
    await win.locator('textarea').click()
    await win.locator('textarea').fill('')
    await win.locator('textarea').pressSequentially('- item1')
    await win.locator('textarea').press('Enter')
    const val = await win.locator('textarea').inputValue()
    results['箇条書き継続'] = val === '- item1\n- ' ? 'OK' : `FAIL: 値="${val}"`
    await win.screenshot({ path: `${RESULTS_DIR}/02f_bullet.png` })
  } catch (e) {
    results['箇条書き継続'] = `FAIL: ${e}`
  }

  // --- ②-g フォントサイズ変更確認 ---
  try {
    await win.click('#settings-btn')
    await win.waitForTimeout(200)
    await win.locator('#font-size-slider').fill('18')
    await win.locator('#font-size-slider').dispatchEvent('input')
    await win.waitForTimeout(200)
    const fontSize = await win.evaluate(() =>
      getComputedStyle(document.getElementById('memo-input')!).fontSize
    )
    results['フォントサイズ'] = fontSize === '18px' ? 'OK' : `FAIL: fontSize="${fontSize}"`
    await win.screenshot({ path: `${RESULTS_DIR}/02g_fontsize.png` })
    await win.click('#settings-btn')
  } catch (e) {
    results['フォントサイズ'] = `FAIL: ${e}`
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
