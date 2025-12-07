const { BrowserWindow } = require('electron');
const path = require('node:path');
const { clientId, redirectUri } = require('./config');

const AUTH_WINDOW_WIDTH = 600;
const AUTH_WINDOW_HEIGHT = 800;

const tokenEndpoint = "https://accounts.spotify.com/api/token";
const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const scope = 'user-read-playback-state user-modify-playback-state user-read-currently-playing streaming';

let authWindow;

const openAuthWindow = (url) => {
  // Prevents opening multiple auth windows
  if (authWindow && !authWindow.isDestroyed()) {
    authWindow.focus();
    authWindow.loadURL(url);
    return;
  }

  authWindow = new BrowserWindow({
    width: AUTH_WINDOW_WIDTH,
    height: AUTH_WINDOW_HEIGHT,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
  });

  authWindow.loadURL(url);
  authWindow.setMenuBarVisibility(false);

  // Clean up
  authWindow.on('closed', () => {
    authWindow = null;
  });
}

const handleCloseAuthWindow = event => { authWindow.close(); }

const handleGetToken = async (event, code, codeVerifier) => {
  const url = tokenEndpoint;
  const payload = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  }

  const response = await fetch(url, payload);
  return await response.json();
}

// Refresh token once the current access token expires
const handleRefreshToken = async (refreshToken) => {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  return await response.json();
}

const handleRedirectToSpotifyAuthorize = async (event, codeChallenge, state) =>  {
  const authUrl = new URL(authorizationEndpoint);

  const params =  {
      response_type: 'code',
      client_id: clientId,
      scope,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      redirect_uri: redirectUri,
      state: state,
  }

  authUrl.search = new URLSearchParams(params).toString();
  openAuthWindow(authUrl.toString());
}

module.exports = {
  getAuthWindow: () => authWindow,
  handleCloseAuthWindow,
  handleRedirectToSpotifyAuthorize,
  handleGetToken,
  handleRefreshToken,
};