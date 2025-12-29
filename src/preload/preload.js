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
  setWindowOpacity: (value) => ipcRenderer.send('set-window-opacity', value),
});

contextBridge.exposeInMainWorld('pages', {
  loadPage: (url) => ipcRenderer.invoke('load-page', url),
});

contextBridge.exposeInMainWorld('api', {
  getPlaybackState: (token) => ipcRenderer.invoke('get-playback-state', token),
  getCurrentUser: (token) => ipcRenderer.invoke('get-current-user', token),
  startPlayback: (token) => ipcRenderer.invoke('start-playback', token),
  pausePlayback: (token) => ipcRenderer.invoke('pause-playback', token),
  skipToNext: (token) => ipcRenderer.invoke('skip-to-next', token),
  skipToPrevious: (token) => ipcRenderer.invoke('skip-to-previous', token),
  seekToPosition: (token, position_ms) => ipcRenderer.invoke('seek-to-position', token, position_ms),
});