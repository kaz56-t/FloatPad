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
  windowSetMini: (mini: boolean) => ipcRenderer.invoke('window:setMini', mini),
  chooseFolder: () => ipcRenderer.invoke('dialog:chooseFolder'),
  globalShortcutUpdate: (accelerator: string) => ipcRenderer.invoke('globalShortcut:update', accelerator),
  snippetsLoad: () => ipcRenderer.invoke('snippets:load'),
  snippetsSave: (data: object[]) => ipcRenderer.invoke('snippets:save', data),
  terminalSpawn: () => ipcRenderer.invoke('terminal:spawn'),
  terminalWrite: (data: string) => ipcRenderer.invoke('terminal:write', data),
  terminalResize: (cols: number, rows: number) => ipcRenderer.invoke('terminal:resize', cols, rows),
  terminalKill: () => ipcRenderer.invoke('terminal:kill'),
  onTerminalData: (cb: (data: string) => void) => {
    ipcRenderer.on('terminal:data', (_, data: string) => cb(data))
  }
})
