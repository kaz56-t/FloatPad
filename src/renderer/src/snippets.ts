export function initSnippets(): void {
  const listEl = document.getElementById('snippets-list')!
  const addForm = document.getElementById('snippets-add-form')!
  const titleInput = document.getElementById('snippets-title-input') as HTMLInputElement
  const textInput = document.getElementById('snippets-text-input') as HTMLTextAreaElement
  const addBtn = document.getElementById('snippets-add-btn')!
  const saveBtn = document.getElementById('snippets-save-btn')!
  const cancelBtn = document.getElementById('snippets-cancel-btn')!

  let snippets: SnippetItem[] = []

  async function load(): Promise<void> {
    try {
      snippets = await window.api.snippetsLoad()
      render()
    } catch (err) {
      console.error('定型文の読み込みに失敗しました:', err)
    }
  }

  async function save(): Promise<void> {
    try {
      await window.api.snippetsSave(snippets)
    } catch (err) {
      console.error('定型文の保存に失敗しました:', err)
    }
  }

  function render(): void {
    listEl.innerHTML = ''
    if (snippets.length === 0) {
      const empty = document.createElement('div')
      empty.style.cssText = 'color: var(--text-dim); font-size: 13px; text-align: center; padding: 20px;'
      empty.textContent = '定型文がありません。「＋ 追加」で追加できます。'
      listEl.appendChild(empty)
      return
    }
    snippets.forEach((snippet) => {
      const item = document.createElement('div')
      item.className = 'snippet-item'

      const copyBtn = document.createElement('button')
      copyBtn.className = 'snippet-copy-btn'
      copyBtn.textContent = 'コピー'
      copyBtn.title = snippet.text
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(snippet.text).catch(console.error)
      })

      const titleSpan = document.createElement('span')
      titleSpan.className = 'snippet-item-title'
      titleSpan.textContent = snippet.title
      titleSpan.title = snippet.text

      const deleteBtn = document.createElement('button')
      deleteBtn.className = 'snippet-delete-btn'
      deleteBtn.textContent = '削除'
      deleteBtn.addEventListener('click', async () => {
        snippets = snippets.filter((s) => s.id !== snippet.id)
        await save()
        render()
      })

      item.appendChild(copyBtn)
      item.appendChild(titleSpan)
      item.appendChild(deleteBtn)
      listEl.appendChild(item)
    })
  }

  addBtn.addEventListener('click', () => {
    titleInput.value = ''
    textInput.value = ''
    addForm.classList.remove('hidden')
    titleInput.focus()
  })

  cancelBtn.addEventListener('click', () => {
    addForm.classList.add('hidden')
  })

  saveBtn.addEventListener('click', async () => {
    const title = titleInput.value.trim()
    const text = textInput.value.trim()
    if (!title || !text) return

    const maxId = snippets.reduce((max, s) => Math.max(max, s.id), 0)
    snippets.push({ id: maxId + 1, title, text })
    await save()
    render()
    addForm.classList.add('hidden')
  })

  // 初回ロード
  load().catch(console.error)
}
