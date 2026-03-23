import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  memoSave: (text: string) => ipcRenderer.invoke('memo:save', text),
  memoLoad: () => ipcRenderer.invoke('memo:load'),
  settingsSave: (data: object) => ipcRenderer.invoke('settings:save', data),
  settingsLoad: () => ipcRenderer.invoke('settings:load')
})
