const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  onRedirect: (callback) => ipcRenderer.on('oauth-code', (event, data) => callback(data)),
})