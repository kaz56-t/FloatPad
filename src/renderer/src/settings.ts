export function initSettings(): void {
  const memoDirInput = document.getElementById('memo-dir-input') as HTMLInputElement
  const memoDirBrowse = document.getElementById('memo-dir-browse') as HTMLButtonElement
  const opacitySlider = document.getElementById('opacity-slider') as HTMLInputElement
  const opacityValue = document.getElementById('opacity-value')!
  const resetBtn = document.getElementById('settings-reset') as HTMLButtonElement

  // 現在の設定を反映
  window.api.settingsLoad().then((settings) => {
    memoDirInput.value = settings.memoDir || ''
    const op = settings.opacity ?? 100
    opacitySlider.value = String(op)
    opacityValue.textContent = `${op}%`
  }).catch(console.error)

  // フォルダ選択
  memoDirBrowse.addEventListener('click', async () => {
    const folder = await window.api.chooseFolder()
    if (folder) {
      memoDirInput.value = folder
      const settings = await window.api.settingsLoad()
      await window.api.settingsSave({ ...settings, memoDir: folder })
    }
  })

  // 透過度スライダー
  opacitySlider.addEventListener('input', () => {
    const value = parseInt(opacitySlider.value)
    opacityValue.textContent = `${value}%`
    window.api.windowSetOpacity(value).catch(console.error)
  })

  // デフォルトに戻す
  resetBtn.addEventListener('click', async () => {
    memoDirInput.value = ''
    opacitySlider.value = '100'
    opacityValue.textContent = '100%'
    const settings = await window.api.settingsLoad()
    await window.api.settingsSave({ ...settings, memoDir: '', opacity: 100 })
    await window.api.windowSetOpacity(100)
  })
}
