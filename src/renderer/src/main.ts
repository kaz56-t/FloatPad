import './style.css'
import { initMemo } from './memo'
import { initCalculator } from './calculator'
import { initWebViewer } from './webviewer'
import { initSettings } from './settings'

const tabs = document.querySelectorAll<HTMLButtonElement>('.tab')
const panels = document.querySelectorAll<HTMLDivElement>('.panel')
const closeBtn = document.getElementById('close-btn')!
const settingsBtn = document.getElementById('settings-btn')!
const settingsPanel = document.getElementById('panel-settings')!

let currentTab = 'memo'

function switchTab(tabName: string): void {
  currentTab = tabName
  // 設定パネルを閉じる
  settingsPanel.classList.remove('active')
  settingsBtn.classList.remove('active')
  // タブとパネルを切り替え
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === tabName))
  panels.forEach((p) => p.classList.toggle('active', p.id === `panel-${tabName}`))
  // 最後のタブを保存
  window.api.settingsLoad().then((s) => window.api.settingsSave({ ...s, lastTab: tabName })).catch(console.error)
}

function openSettings(): void {
  tabs.forEach((t) => t.classList.remove('active'))
  panels.forEach((p) => p.classList.remove('active'))
  settingsPanel.classList.add('active')
  settingsBtn.classList.add('active')
}

function closeSettings(): void {
  settingsPanel.classList.remove('active')
  settingsBtn.classList.remove('active')
  // 元のタブに戻す
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === currentTab))
  panels.forEach((p) => p.classList.toggle('active', p.id === `panel-${currentTab}`))
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    if (tab.dataset.tab) switchTab(tab.dataset.tab)
  })
})

settingsBtn.addEventListener('click', () => {
  if (settingsPanel.classList.contains('active')) {
    closeSettings()
  } else {
    openSettings()
  }
})

closeBtn.addEventListener('click', () => window.close())

// 各機能を初期化
initMemo()
initCalculator()
initWebViewer()
initSettings()

// 設定から最後のタブを復元
window.api.settingsLoad().then((settings) => {
  if (settings?.lastTab) switchTab(settings.lastTab)
}).catch(console.error)
