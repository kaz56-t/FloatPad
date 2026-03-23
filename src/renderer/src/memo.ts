export function initMemo(): void {
  const textarea = document.getElementById('memo-input') as HTMLTextAreaElement
  const charCount = document.getElementById('char-count')!
  const saveStatus = document.getElementById('save-status')!
  const tabbar = document.getElementById('memo-tabbar')!
  const addBtn = document.getElementById('memo-add-btn')!
  const lineNumToggle = document.getElementById('line-num-toggle')!
  const lineNumbers = document.getElementById('line-numbers')!

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let memos: MemoMeta[] = []
  let activeId = 1
  let showLineNumbers = false

  function updateCharCount(): void {
    charCount.textContent = `${textarea.value.length} 文字`
  }

  async function saveMemo(): Promise<void> {
    try {
      await window.api.memoSave(activeId, textarea.value)
      saveStatus.textContent = '保存済み'
      setTimeout(() => { saveStatus.textContent = '' }, 2000)
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

  // --- 行番号 ---

  function updateLineNumbers(): void {
    if (!showLineNumbers) return
    const lines = textarea.value.split('\n')
    lineNumbers.textContent = lines.map((_, i) => i + 1).join('\n')
    lineNumbers.scrollTop = textarea.scrollTop
  }

  function setLineNumbers(enabled: boolean): void {
    showLineNumbers = enabled
    lineNumToggle.classList.toggle('active', enabled)
    lineNumbers.classList.toggle('hidden', !enabled)
    if (enabled) updateLineNumbers()
    window.api.settingsLoad()
      .then((s) => window.api.settingsSave({ ...s, showLineNumbers: enabled }))
      .catch(console.error)
  }

  lineNumToggle.addEventListener('click', () => setLineNumbers(!showLineNumbers))

  textarea.addEventListener('scroll', () => {
    if (showLineNumbers) lineNumbers.scrollTop = textarea.scrollTop
  })

  // --- メモタブ描画 ---

  function renderTabs(): void {
    tabbar.querySelectorAll('.memo-tab').forEach((el) => el.remove())

    memos.forEach((memo) => {
      const tab = document.createElement('div')
      tab.className = 'memo-tab' + (memo.id === activeId ? ' active' : '')
      tab.dataset.id = String(memo.id)

      const nameSpan = document.createElement('span')
      nameSpan.className = 'memo-tab-name'
      nameSpan.textContent = memo.name
      tab.appendChild(nameSpan)

      if (memos.length > 1) {
        const closeBtn = document.createElement('button')
        closeBtn.className = 'memo-tab-close'
        closeBtn.textContent = '×'
        closeBtn.title = '削除'
        closeBtn.addEventListener('click', async (e) => {
          e.stopPropagation()
          await deleteMemo(memo.id)
        })
        tab.appendChild(closeBtn)
      }

      tab.addEventListener('click', () => switchMemo(memo.id))
      tab.addEventListener('dblclick', (e) => {
        if ((e.target as HTMLElement).classList.contains('memo-tab-close')) return
        renameMemo(memo.id)
      })

      tabbar.insertBefore(tab, addBtn)
    })
  }

  // --- メモ操作 ---

  async function switchMemo(id: number): Promise<void> {
    // 切り替え前に現在のメモを保存
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    await saveMemo()

    activeId = id
    const text = await window.api.memoLoad(id)
    textarea.value = text
    updateCharCount()
    updateLineNumbers()
    renderTabs()

    window.api.settingsLoad()
      .then((s) => window.api.settingsSave({ ...s, activeMemoId: id }))
      .catch(console.error)
  }

  async function deleteMemo(id: number): Promise<void> {
    if (memos.length <= 1) return
    await window.api.memoDelete(id)
    memos = memos.filter((m) => m.id !== id)

    if (activeId === id) {
      const next = memos[0]
      activeId = next.id
      textarea.value = await window.api.memoLoad(next.id)
      updateCharCount()
      updateLineNumbers()
    }
    renderTabs()
  }

  async function renameMemo(id: number): Promise<void> {
    const memo = memos.find((m) => m.id === id)
    if (!memo) return
    const newName = prompt('メモ名を入力:', memo.name)
    if (newName && newName.trim() && newName.trim() !== memo.name) {
      memo.name = newName.trim()
      await window.api.memoRename(id, memo.name)
      renderTabs()
    }
  }

  addBtn.addEventListener('click', async () => {
    const newMemo = await window.api.memoCreate(`メモ ${memos.length + 1}`)
    memos.push(newMemo)
    await switchMemo(newMemo.id)
  })

  // --- テキストエリアイベント ---

  textarea.addEventListener('input', () => {
    updateCharCount()
    debounceSave()
    if (showLineNumbers) updateLineNumbers()
  })

  textarea.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
      saveMemo()
    }
  })

  // --- 初期化 ---

  ;(async () => {
    const settings = await window.api.settingsLoad()

    showLineNumbers = settings.showLineNumbers ?? false
    if (showLineNumbers) {
      lineNumbers.classList.remove('hidden')
      lineNumToggle.classList.add('active')
    }

    memos = await window.api.memoList()
    if (memos.length === 0) {
      const created = await window.api.memoCreate('メモ 1')
      memos = [created]
    }

    activeId = settings.activeMemoId ?? memos[0].id
    if (!memos.find((m) => m.id === activeId)) {
      activeId = memos[0].id
    }

    textarea.value = await window.api.memoLoad(activeId)
    updateCharCount()
    renderTabs()
    updateLineNumbers()
  })().catch(console.error)
}
