export function initMemo(): void {
  const textarea = document.getElementById('memo-input') as HTMLTextAreaElement
  const charCount = document.getElementById('char-count')!
  const saveStatus = document.getElementById('save-status')!

  let saveTimer: ReturnType<typeof setTimeout> | null = null

  function updateCharCount(): void {
    charCount.textContent = `${textarea.value.length} 文字`
  }

  async function saveMemo(): Promise<void> {
    try {
      await window.api.memoSave(textarea.value)
      saveStatus.textContent = '保存済み'
      setTimeout(() => {
        saveStatus.textContent = ''
      }, 2000)
    } catch (err) {
      console.error('メモの保存に失敗しました:', err)
      saveStatus.textContent = '保存失敗'
    }
  }

  function debounceSave(): void {
    if (saveTimer) clearTimeout(saveTimer)
    saveStatus.textContent = '...'
    saveTimer = setTimeout(() => {
      saveTimer = null
      saveMemo()
    }, 1000)
  }

  textarea.addEventListener('input', () => {
    updateCharCount()
    debounceSave()
  })

  // Ctrl+S / Cmd+S で即時保存
  textarea.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      if (saveTimer) {
        clearTimeout(saveTimer)
        saveTimer = null
      }
      saveMemo()
    }
  })

  // 起動時にメモを読み込む
  window.api.memoLoad().then((text) => {
    textarea.value = text
    updateCharCount()
  }).catch(console.error)
}
