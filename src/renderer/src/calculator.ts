type Operator = '+' | '-' | '×' | '÷'

interface CalcState {
  display: string
  operator: Operator | null
  operand: number | null
  waitingForSecond: boolean
  justCalculated: boolean
}

export function initCalculator(): void {
  const displayEl = document.getElementById('calc-result')!
  const expressionEl = document.getElementById('calc-expression')!
  const historyEl = document.getElementById('calc-history')!

  const history: string[] = []

  const state: CalcState = {
    display: '0',
    operator: null,
    operand: null,
    waitingForSecond: false,
    justCalculated: false
  }

  function updateDisplay(): void {
    displayEl.textContent = state.display
  }

  function addHistory(entry: string): void {
    history.unshift(entry)
    if (history.length > 5) history.pop()
    historyEl.innerHTML = history
      .map((h) => `<div class="calc-history-item">${h}</div>`)
      .join('')
  }

  function calculate(a: number, op: Operator, b: number): number {
    switch (op) {
      case '+': return a + b
      case '-': return a - b
      case '×': return a * b
      case '÷': return b === 0 ? 0 : a / b
    }
  }

  function formatNumber(n: number): string {
    if (!isFinite(n)) return 'エラー'
    const str = n.toString()
    // 桁数が多い場合は精度を落とす
    if (str.replace('.', '').replace('-', '').length > 12) {
      return parseFloat(n.toPrecision(10)).toString()
    }
    return str
  }

  function handleKey(key: string): void {
    // 数字入力
    if ('0123456789'.includes(key)) {
      if (state.waitingForSecond || state.justCalculated) {
        state.display = key === '0' ? '0' : key
        state.waitingForSecond = false
        state.justCalculated = false
      } else {
        if (state.display.replace('-', '').replace('.', '').length >= 12) return
        state.display = state.display === '0' ? key : state.display + key
      }
      updateDisplay()
      return
    }

    // 小数点
    if (key === '.') {
      if (state.waitingForSecond || state.justCalculated) {
        state.display = '0.'
        state.waitingForSecond = false
        state.justCalculated = false
      } else if (!state.display.includes('.')) {
        state.display += '.'
      }
      updateDisplay()
      return
    }

    // AC: 全リセット
    if (key === 'AC') {
      state.display = '0'
      state.operator = null
      state.operand = null
      state.waitingForSecond = false
      state.justCalculated = false
      expressionEl.textContent = ''
      updateDisplay()
      return
    }

    // C / Backspace: 現在の入力をクリア
    if (key === 'C') {
      if (state.display.length > 1 && !state.justCalculated) {
        state.display = state.display.slice(0, -1)
        if (state.display === '-') state.display = '0'
      } else {
        state.display = '0'
      }
      state.justCalculated = false
      updateDisplay()
      return
    }

    // 符号反転
    if (key === '+/-') {
      const n = parseFloat(state.display)
      if (!isNaN(n)) {
        state.display = formatNumber(-n)
        updateDisplay()
      }
      return
    }

    // パーセント
    if (key === '%') {
      const n = parseFloat(state.display)
      if (!isNaN(n)) {
        state.display = formatNumber(n / 100)
        updateDisplay()
      }
      return
    }

    // 演算子
    if (key === '+' || key === '-' || key === '×' || key === '÷') {
      const current = parseFloat(state.display)
      if (state.operator !== null && !state.waitingForSecond) {
        // 連続計算: 前の演算子で計算してから新しい演算子を設定
        const result = calculate(state.operand!, state.operator, current)
        state.display = formatNumber(result)
        state.operand = result
        updateDisplay()
      } else {
        state.operand = current
      }
      state.operator = key
      state.waitingForSecond = true
      state.justCalculated = false
      expressionEl.textContent = `${formatNumber(state.operand)} ${key}`
      return
    }

    // イコール
    if (key === '=') {
      if (state.operator !== null && state.operand !== null) {
        const b = parseFloat(state.display)
        const a = state.operand
        const op = state.operator
        const result = calculate(a, op, b)
        const entry = `${formatNumber(a)} ${op} ${formatNumber(b)} = ${formatNumber(result)}`
        addHistory(entry)
        state.display = formatNumber(result)
        state.operand = null
        state.operator = null
        state.justCalculated = true
        expressionEl.textContent = entry
        updateDisplay()
      }
      return
    }
  }

  // ボタンクリック
  const buttons = document.querySelectorAll<HTMLButtonElement>('.calc-btn')
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.key) handleKey(btn.dataset.key)
    })
  })

  // キーボード入力（電卓パネルがアクティブな時のみ）
  document.addEventListener('keydown', (e) => {
    const panel = document.getElementById('panel-calculator')
    if (!panel?.classList.contains('active')) return

    // テキスト入力中は無視
    const active = document.activeElement
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return

    const keyMap: Record<string, string> = {
      Enter: '=',
      '=': '=',
      '+': '+',
      '-': '-',
      '*': '×',
      '/': '÷',
      Backspace: 'C',
      Escape: 'AC'
    }

    if ('0123456789'.includes(e.key)) {
      handleKey(e.key)
    } else if (e.key === '.') {
      handleKey('.')
    } else if (keyMap[e.key]) {
      e.preventDefault()
      handleKey(keyMap[e.key])
    }
  })

  // 結果表示をクリックでクリップボードにコピー
  displayEl.addEventListener('click', () => {
    navigator.clipboard.writeText(state.display).catch(console.error)
  })

  updateDisplay()
}
