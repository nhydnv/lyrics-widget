const { BrowserWindow, session, safeStorage } = require('electron');
const { Buffer } = require('node:buffer');
const path = require('node:path');
const { clientId, redirectUri } = require('./config');
const { ref } = require('node:process');

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

const closeAuthWindow = event => { 
  if (authWindow) authWindow.close(); 
}

const getToken = async (event, code, codeVerifier) => {
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
  return encryptToken(await response.json());
}

// Refresh token once the current access token expires
const refreshToken = async (event, refreshToken) => {
  console.log('Refreshing token...');
  refreshToken = safeStorage.decryptString(Buffer.from(refreshToken, 'base64'));
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

  return encryptToken(await response.json());
}

const encryptToken = token => {
  if (safeStorage.isEncryptionAvailable()) {
    token.access_token = safeStorage.encryptString(token.access_token).toString('base64');
    token.refresh_token = safeStorage.encryptString(token.refresh_token).toString('base64');
  }
  return token;
}

const redirectToSpotifyAuthorize = async (event, codeChallenge, state) =>  {
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

const getCookies = async () => {
  const currentSession = session.defaultSession;
  return await currentSession.cookies.get({});
}

module.exports = {
  getAuthWindow: () => authWindow,
  getCookies,
  closeAuthWindow,
  redirectToSpotifyAuthorize,
  getToken,
  refreshToken,
};