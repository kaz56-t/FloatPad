export function initMemo(): void {
  const textarea = document.getElementById('memo-input') as HTMLTextAreaElement
  const titleInput = document.getElementById('memo-title') as HTMLInputElement
  const charCount = document.getElementById('char-count')!
  const saveStatus = document.getElementById('save-status')!
  const tabbar = document.getElementById('memo-tabbar')!
  const tabsScroll = document.getElementById('memo-tabs-scroll')!
  const addBtn = document.getElementById('memo-add-btn')!
  const lineNumToggle = document.getElementById('line-num-toggle')!
  const lineNumToggleSettings = document.getElementById('line-num-toggle-settings') as HTMLInputElement | null
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
    if (lineNumToggleSettings) lineNumToggleSettings.checked = enabled
    lineNumbers.classList.toggle('hidden', !enabled)
    if (enabled) updateLineNumbers()
    window.api.settingsLoad()
      .then((s) => window.api.settingsSave({ ...s, showLineNumbers: enabled }))
      .catch(console.error)
  }

  lineNumToggle.addEventListener('click', () => setLineNumbers(!showLineNumbers))
  lineNumToggleSettings?.addEventListener('change', () => setLineNumbers(lineNumToggleSettings.checked))

  textarea.addEventListener('scroll', () => {
    if (showLineNumbers) lineNumbers.scrollTop = textarea.scrollTop
  })

  // --- メモタブ描画 ---

  function renderTabs(): void {
    tabsScroll.querySelectorAll('.memo-tab').forEach((el) => el.remove())

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

      tab.addEventListener('click', () => { if (!didDrag) switchMemo(memo.id) })
      tab.addEventListener('mousedown', (e) => {
        if (e.button === 1) { e.preventDefault(); void deleteMemo(memo.id) }
      })

      tabsScroll.appendChild(tab)
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
    const memo = memos.find((m) => m.id === id)
    titleInput.value = memo?.name ?? ''
    const text = await window.api.memoLoad(id)
    textarea.value = text
    updateCharCount()
    updateLineNumbers()
    renderTabs()
    // アクティブタブをスクロール範囲内に収める
    const activeTab = tabsScroll.querySelector<HTMLElement>('.memo-tab.active')
    if (activeTab) activeTab.scrollIntoView({ block: 'nearest', inline: 'nearest' })

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

  // --- タブバー ドラッグスクロール ---
  let dragActive = false
  let didDrag = false
  let dragStartX = 0
  let scrollStart = 0
  const DRAG_THRESHOLD = 5

  tabsScroll.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('#memo-add-btn')) return
    dragActive = true
    didDrag = false
    dragStartX = e.pageX
    scrollStart = tabsScroll.scrollLeft
  })

  window.addEventListener('mouseup', () => {
    dragActive = false
    tabsScroll.classList.remove('dragging')
  })

  window.addEventListener('mousemove', (e) => {
    if (!dragActive) return
    const delta = e.pageX - dragStartX
    if (!didDrag && Math.abs(delta) > DRAG_THRESHOLD) {
      didDrag = true
      tabsScroll.classList.add('dragging')
    }
    if (didDrag) tabsScroll.scrollLeft = scrollStart - delta
  })

  // --- タイトル入力 → タブ名同期 ---
  let titleTimer: ReturnType<typeof setTimeout> | null = null
  titleInput.addEventListener('input', () => {
    const memo = memos.find((m) => m.id === activeId)
    if (!memo) return
    const newName = titleInput.value.trim() || 'メモ'
    memo.name = newName
    renderTabs()
    if (titleTimer) clearTimeout(titleTimer)
    titleTimer = setTimeout(() => {
      titleTimer = null
      window.api.memoRename(activeId, newName).catch(console.error)
    }, 800)
  })

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
      return
    }

    // Tab: インデント / アンインデント
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = textarea.selectionStart
      const val = textarea.value
      const lineStart = val.lastIndexOf('\n', start - 1) + 1
      if (e.shiftKey) {
        // アンインデント: 行頭のスペースを最大2つ削除
        const spaces = val.slice(lineStart).match(/^ {1,4}/)?.[0].length ?? 0
        if (spaces > 0) {
          textarea.value = val.slice(0, lineStart) + val.slice(lineStart + spaces)
          textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - spaces)
        }
      } else {
        // インデント: 行頭に4スペース追加
        textarea.value = val.slice(0, lineStart) + '    ' + val.slice(lineStart)
        textarea.selectionStart = textarea.selectionEnd = start + 4
      }
      updateCharCount()
      debounceSave()
      if (showLineNumbers) updateLineNumbers()
      return
    }

    // Enter: 箇条書きの継続
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      const start = textarea.selectionStart
      const val = textarea.value
      const lineStart = val.lastIndexOf('\n', start - 1) + 1
      const lineText = val.slice(lineStart, start)
      const bulletMatch = lineText.match(/^(\s*)([-*]) /)
      if (bulletMatch) {
        e.preventDefault()
        const indent = bulletMatch[1]
        const bullet = bulletMatch[2]
        const prefix = indent + bullet + ' '
        if (lineText.trimEnd() === (indent + bullet)) {
          // 空の箇条書き行: 記号を削除して通常改行
          textarea.value = val.slice(0, lineStart) + '\n' + val.slice(start)
          textarea.selectionStart = textarea.selectionEnd = lineStart + 1
        } else {
          // 次行に同じ箇条書きを継続
          const insertion = '\n' + prefix
          textarea.value = val.slice(0, start) + insertion + val.slice(start)
          textarea.selectionStart = textarea.selectionEnd = start + insertion.length
        }
        updateCharCount()
        debounceSave()
        if (showLineNumbers) updateLineNumbers()
      }
    }
  })

  // --- 初期化 ---

  ;(async () => {
    const settings = await window.api.settingsLoad()

    showLineNumbers = settings.showLineNumbers ?? false
    if (lineNumToggleSettings) lineNumToggleSettings.checked = showLineNumbers
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

    titleInput.value = memos.find((m) => m.id === activeId)?.name ?? ''
    textarea.value = await window.api.memoLoad(activeId)
    updateCharCount()
    renderTabs()
    updateLineNumbers()
  })().catch(console.error)
}
