const { safeStorage } = require('electron');
const puppeteer = require('puppeteer');
const { Buffer } = require('node:buffer');
const { getCookies } = require('./authorization');

const api = "https://api.spotify.com/v1";
let page;
let lyricsCache = new Map();
let isLoaded = false;

const openWebPlayer = async (event) => {
  if (isLoaded) return;

  const cookies = await getCookies();

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  [page] = await browser.pages();

  await page.goto("https://open.spotify.com");

  // Transform Electron cookies to Puppeteer cookies
  const puppeteerCookies = cookies.map(c => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path || "/",
    secure: c.secure,
    httpOnly: c.httpOnly,
    sameSite: c.sameSite === "no_restriction" ? "None" :
              c.sameSite === "lax" ? "Lax" :
              c.sameSite === "strict" ? "Strict" : "Lax"
  }));

  // Set cookies on the page
  await browser.setCookie(...puppeteerCookies);

  // Reload to apply session cookies
  await page.reload({ waitUntil: "networkidle2" });

  // Close the 'Allow cookies?' banner
  try {
    await page.locator('.onetrust-close-btn-handler.onetrust-close-btn-ui.banner-close-button.ot-close-icon').click();
  } catch (err) {
    if (err.name !== 'TimeoutError') {
      console.error(err);
    }
  }

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('/color-lyrics/v2/track/')) {
      try {
        const data = await res.json();
        // Get track ID from request URL
        const trackId = url.match(/track\/([^/?]+)/)?.[1];
        if (trackId) {
          lyricsCache.set(trackId, data);
        }
      } catch(err) {
        console.error(err);
      }
    }
  });

  page.on('close', () => isLoaded = false);

  isLoaded = true;
};

const getLyrics = async (event, id) => {
  const lyricsButton = 'button[data-testid="lyrics-button"]';


  // Check if the track has lyrics, if yes, open lyrics tab
  let elHandler;
  try {
    elHandler = await page.waitForSelector(lyricsButton, { timeout: 20_000 });
  } catch {
    console.log('1');
    return null;  // Timeout
  }
  const hasLyrics = await elHandler.evaluate(el => !el.disabled);
  if (!hasLyrics) {
    console.log('2');
    return null;
  }

  // Check that lyrics tab is not already opened
  const isActive = await page.$eval(
    lyricsButton,
    el => el?.getAttribute('data-active') === 'true',
  ).catch(() => false);
  if (!isActive) {
    await page.waitForSelector(lyricsButton, {
      visible: true,
    });
    await page.click(lyricsButton);
  }

  return await waitForLyrics(id);
}

const getPlaybackState = async (event, token) => requestData(token, "/me/player");

const getCurrentUser = async (event, token) => requestData(token, "/me");

const requestData = async (token, path) => {
  if (safeStorage.isEncryptionAvailable()) {
    token = safeStorage.decryptString(Buffer.from(token, 'base64'));
  }
  try {
    const response = await fetch(`${api}${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    } else if (response.status === 204) {  // No active Spotify device
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`requestData: ${error.message}`);
  }
}

// Helper that waits for lyrics to be cached
const waitForLyrics = (trackId, timeout=3000) => {
  return new Promise((resolve) => {

    // Already cached
    if (lyricsCache.has(trackId)) {
      return resolve(lyricsCache.get(trackId));
    }

    const start = Date.now();

    const intervalId = setInterval(() => {
      if (lyricsCache.has(trackId)) {
        clearInterval(intervalId);
        resolve(lyricsCache.get(trackId));
      } else if (Date.now() - start > timeout) {
        clearInterval(intervalId);
        resolve(null);  // Time out: no lyrics
      }
    }, 100); // Poll every 100ms
  });
};

const modifyPlayback = async (token, path) => {
  if (safeStorage.isEncryptionAvailable()) {
    token = safeStorage.decryptString(Buffer.from(token, 'base64'));
  }
  try {
    const response = await fetch(`${api}${path}`, {
      method: "PUT",
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
  } catch (error) {
    console.error(`modifyPlayback: ${error.message}`);
  }
}

const startPlayback = async (event, token) => modifyPlayback(token, '/me/player/play');

const pausePlayback = async (event, token) => modifyPlayback(token, '/me/player/pause');

module.exports = {
  getPlaybackState,
  openWebPlayer,
  getLyrics,
  startPlayback,
  pausePlayback,
  getCurrentUser,
}