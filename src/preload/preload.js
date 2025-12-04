
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('spotify', {
  getClientId: () => ipcRenderer.invoke('get-client-id'),
  getRedirectUri: () => ipcRenderer.invoke('get-redirect-uri'),
  onAuthCode: (callback) => ipcRenderer.on('auth-code', (event, data) => callback(data)),
  openAuthWindow: (url) => ipcRenderer.send('open-auth-window', url),
  closeAuthWindow: () => ipcRenderer.send('close-auth-window'),
})

contextBridge.exposeInMainWorld('pages', {
    loadPage: (url) => ipcRenderer.invoke('load-page', url),
})