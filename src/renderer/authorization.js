/*
---------- Constants ----------
*/
const TOKEN_CHECK = 30_000;           // Check token expiry every 30s
const TOKEN_MIN_TIME_LEFT = 120_000;  // Refresh token if current token expires in less than 2 minutes

// Data structure that manages the current active token, caching it in localStorage
const currentToken = {
  save: function (response) {
    const { access_token, refresh_token, expires_in } = response;
    window.localStorage.setItem('access_token', access_token);
    window.localStorage.setItem('refresh_token', refresh_token);
    window.localStorage.setItem('expires_in', expires_in);

    const now = new Date();
    const expiry = new Date(now.getTime() + (expires_in * 1000));
    window.localStorage.setItem('expires', expiry);
  },
  get access_token() { return window.localStorage.getItem('access_token') || null; },
  get refresh_token() { return window.localStorage.getItem('refresh_token') || null; },
  get expires_in() { return window.localStorage.getItem('expires_in') || null },
  get expires() { return window.localStorage.getItem('expires') || null },
};

/*
---------- Authorisation flow ----------
*/
const redirectToSpotifyAuthorize = async () =>  {
  // Code verifier - generates a random string between 43 and 128 characters long
  const codeVerifier = generateRandomString(64);

  // Code challenge - hash the code verifier using sha256 and encode into base64
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  const state = generateRandomString(16);
  window.localStorage.setItem('code_verifier', codeVerifier);
  window.localStorage.setItem('state', state);
  
  await window.spotify.redirectToSpotifyAuthorize(codeChallenge, state);
}

// Exchange authorization code for an access token by sending a POST request to /api/token
const getToken = async code => {
  // Stored during authorization request
  const codeVerifier = window.localStorage.getItem('code_verifier');
  const response = await window.spotify.getToken(code, codeVerifier);
  // Update current token
  currentToken.save(response);
}

// Refresh token once the current access token expires
const refreshToken = async () => {
  const response = await window.spotify.refreshToken(currentToken.refresh_token);
  currentToken.save(response);
}

const startRefreshToken = async () => {
  // Check every 30 seconds
  setInterval(async () => {
    const timeLeft = new Date(currentToken.expires).getTime() - Date.now()

    // Refresh if there is less than 2 minutes left
    if (timeLeft < TOKEN_MIN_TIME_LEFT) {
      await refreshToken();
    }
  }, TOKEN_CHECK);
}

const loginWithSpotifyClick = () => {
  redirectToSpotifyAuthorize();
}

/*
---------- Utility functions ----------
*/
const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

const sha256 = async (plain) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return window.crypto.subtle.digest('SHA-256', data)
}

const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/*
---------- Authorisation script ----------
*/
export const authorize = () => {
  return new Promise(async (resolve, reject) => {
    loginWithSpotifyClick();

    // On redirect, receive authorisation code and state sent by the main process
    window.spotify.onAuthCode(async (data) => {
      try {
        const code = data['code'];
        const state = data['state'];

        if (!code) {
          window.spotify.closeAuthWindow();
          return resolve(false);
        }

        // If a code is found, we're in a callback, do a token exchange
        // Compare the state parameter received in the redirection URI
        // with the state parameter originally provided to Spotify in the authorization URI
        const storedState = window.localStorage.getItem('state');
        if (state != storedState) {
          console.error("State mismatch.");
          throw new Error("State mismatch.");
        }

        await getToken(code);

        // Remove query parameters from URL so we can refresh correctly
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        url.searchParams.delete("state");

        const updatedUrl = url.search ? url.href : url.href.replace('?', '');
        window.history.replaceState({}, "", updatedUrl);

        // If we have a token (we're logged in), return true;
        if (currentToken.access_token) {
          startRefreshToken();
          window.spotify.closeAuthWindow();
          return resolve(true);
        }
        window.spotify.closeAuthWindow();
        resolve(false);
      } catch (err) { reject(err); }
    });
  });
}