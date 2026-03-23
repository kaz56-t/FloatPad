import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  memoList: () => ipcRenderer.invoke('memo:list'),
  memoSave: (id: number, text: string) => ipcRenderer.invoke('memo:save', id, text),
  memoLoad: (id: number) => ipcRenderer.invoke('memo:load', id),
  memoCreate: (name: string) => ipcRenderer.invoke('memo:create', name),
  memoDelete: (id: number) => ipcRenderer.invoke('memo:delete', id),
  memoRename: (id: number, name: string) => ipcRenderer.invoke('memo:rename', id, name),
  settingsSave: (data: object) => ipcRenderer.invoke('settings:save', data),
  settingsLoad: () => ipcRenderer.invoke('settings:load'),
  windowSetOpacity: (opacity: number) => ipcRenderer.invoke('window:setOpacity', opacity),
  chooseFolder: () => ipcRenderer.invoke('dialog:chooseFolder')
})
