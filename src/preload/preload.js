const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('spotify', {
  onAuthCode: (callback) => ipcRenderer.on('auth-code', (event, data) => callback(data)),
  closeAuthWindow: () => ipcRenderer.send('close-auth-window'),
  redirectToSpotifyAuthorize: (codeChallenge, state) => ipcRenderer.invoke('redirect', codeChallenge, state),
  getToken: (code, codeVerifier) => ipcRenderer.invoke('get-token', code, codeVerifier),
  refreshToken: (token) => ipcRenderer.invoke('refresh-token', token),
  openWebPlayer: () => ipcRenderer.invoke('open-web-player'),
  getLyrics: (id) => ipcRenderer.invoke('get-lyrics', id),
});

contextBridge.exposeInMainWorld('controls', {
  closeWindow: () => ipcRenderer.send('close-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
});

contextBridge.exposeInMainWorld('pages', {
  loadPage: (url) => ipcRenderer.invoke('load-page', url),
});

contextBridge.exposeInMainWorld('api', {
  getPlaybackState: (token) => ipcRenderer.invoke('get-playback-state', token),
  startPlayback: (token) => ipcRenderer.send('start-playback', token),
  pausePlayback: (token) => ipcRenderer.send('pause-playback', token),
  getCurrentUser: (token) => ipcRenderer.invoke('get-current-user', token),
});