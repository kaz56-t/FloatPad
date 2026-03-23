import './style.css'
import { initMemo } from './memo'
import { initCalculator } from './calculator'
import { initWebViewer } from './webviewer'

// タブ切り替え
const tabs = document.querySelectorAll<HTMLButtonElement>('.tab')
const panels = document.querySelectorAll<HTMLDivElement>('.panel')
const closeBtn = document.getElementById('close-btn')!

function switchTab(tabName: string): void {
  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === tabName)
  })
  panels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === `panel-${tabName}`)
  })
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const name = tab.dataset.tab
    if (!name) return
    switchTab(name)
    // 最後のタブを設定に保存
    window.api.settingsLoad().then((settings) => {
      return window.api.settingsSave({ ...settings, lastTab: name })
    }).catch(console.error)
  })
})

closeBtn.addEventListener('click', () => window.close())

// 各タブを初期化
initMemo()
initCalculator()
initWebViewer()

// 設定から最後のタブを復元
window.api.settingsLoad().then((settings) => {
  if (settings?.lastTab) {
    switchTab(settings.lastTab)
  }
}).catch(console.error)
