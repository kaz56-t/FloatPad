import { _electron as electron } from 'playwright'

async function run(): Promise<void> {
  console.log('Launching...')
  const app = await electron.launch({ args: ['.'] })
  console.log('App launched')
  const win = await app.firstWindow()
  console.log('Got window')
  await win.waitForLoadState('domcontentloaded')
  console.log('DOM loaded')
  await win.waitForTimeout(1500)

  const debug = await win.evaluate(async () => {
    const hasApi = typeof (window as any).api !== 'undefined'
    if (!hasApi) return { hasApi, keys: [] as string[], saveResult: null as unknown, saveErr: '' }
    const keys = Object.keys((window as any).api)
    let saveResult: unknown = null
    let saveErr = ''
    try {
      saveResult = await (window as any).api.memoSave('debug 12345')
    } catch (e) {
      saveErr = String(e)
    }
    return { hasApi, keys, saveResult, saveErr }
  })
  console.log('Debug result:', JSON.stringify(debug))

  await win.screenshot({ path: 'test-results/debug.png' })
  await app.close()
}

run().catch(console.error)
