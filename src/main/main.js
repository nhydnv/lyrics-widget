const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('node:path');
const http = require('http');
const { readFile } = require('node:fs/promises');
const { getAuthWindow, closeAuthWindow, redirectToSpotifyAuthorize,
        getToken, refreshToken } = require('./authorization.js');
const { getPlaybackState, openWebPlayer, getLyrics, startPlayback, 
        pausePlayback, getCurrentUser, skipToNext, skipToPrevious,
        seekToPosition } = require('./data.js');
const { redirectUri } = require('./config.js');

let mainWindow;

const MAIN_WINDOW_WIDTH = 400;
const MAIN_WINDOW_HEIGHT = 150;

/*
const protocol = "myapp";
const redirectUri = `${protocol}://callback`;
*/

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    titleBarStyle: 'hidden',  // Remove the default title bar
    resizable: false,
    transparent: true,
    alwaysOnTop: false,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
    frame: false,
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    const authWindow = getAuthWindow();
    if (authWindow) { authWindow.close(); }
  });
}

const closeWindow = (_event) => mainWindow?.close();

const minimizeWindow = (_event) => mainWindow?.minimize();

// Create a server to redirect to after user authorised with Spotify
const createAuthServer = (_event) => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, redirectUri);

    if (url.pathname === "/callback") {
      // Get code and state in the query parameters
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      mainWindow.webContents.send("auth-code", { code, state });
    }
  });

  server.listen(8080, "127.0.0.1", () => {
    console.log(`OAuth redirect server running on ${redirectUri}.`);
  });
}

const loadPage = async (_event, relativePath) => {
  const fullPath = path.join(__dirname, "../renderer", relativePath);
  return readFile(fullPath, "utf8");
}

const setAlwaysOnTop = (_event, enabled) => {
  mainWindow?.setAlwaysOnTop(Boolean(enabled));
};

const moveToBottomRight = (_event) => {
  if (!mainWindow) return;
  const display = screen.getDisplayMatching(mainWindow.getBounds());
  const { width, height, x, y } = display.workArea;

  const newX = x + width - MAIN_WINDOW_WIDTH;
  const newY = y + height - MAIN_WINDOW_HEIGHT;

  mainWindow.setPosition(newX, newY);
}

// Create the main window
app.whenReady().then(() => {

  // Window controls
  ipcMain.on('close-window', closeWindow);
  ipcMain.on('minimize-window', minimizeWindow);
  ipcMain.on('always-on-top', setAlwaysOnTop);
  ipcMain.on('move-to-bottom-right', moveToBottomRight);

  // Spotify OAuth
  ipcMain.on('close-auth-window', closeAuthWindow);
  ipcMain.handle('redirect', redirectToSpotifyAuthorize);
  ipcMain.handle('get-token', getToken);
  ipcMain.handle('refresh-token', refreshToken);

  // Page load
  ipcMain.handle('load-page', loadPage);

  // API calls
  ipcMain.handle('get-playback-state', getPlaybackState);
  ipcMain.handle('get-current-user', getCurrentUser);
  ipcMain.handle('start-playback', startPlayback);
  ipcMain.handle('pause-playback', pausePlayback);
  ipcMain.handle('skip-to-next', skipToNext);
  ipcMain.handle('skip-to-previous', skipToPrevious);
  ipcMain.handle('seek-to-position', seekToPosition)

  // Web scraping
  ipcMain.handle('open-web-player', openWebPlayer);
  ipcMain.handle('get-lyrics', getLyrics);

  createWindow();
  if (createAuthServer()) {
    mainWindow.webContents.send("auth-code", { code, state });
  }

  mainWindow.setMenuBarVisibility(false);

  // Open a window if none are open in MacOS
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

/*
// Register our app to handle all "myapp" protocols
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(protocol, process.execPath, [path.resolve(process.argv[1])]);
  }
} 
else {
  app.setAsDefaultProtocolClient(protocol);
}

// Redirect to the mainWindow after Spotify authorisation
// Windows and Linux code
const gotTheLock = app.requestSingleInstanceLock();  // true if only one instance is running

// Prevent two instances from running
if (!gotTheLock) { app.quit(); }
else {
  // When Spotify OAuth redirects to our deep link, a second instance is launched
  // Electron handles this by blocking that second instance and sending its URL to the main instance
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    const deepLink = commandLine.pop();
    const url = new URL(deepLink);
    // Get code and state in the query parameters
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    // Focus on the main instance's window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();

      // Send an IPC message containing the code from main to renderer
      mainWindow.webContents.send("auth-code", { code, state });
      mainWindow.focus();
    }

    // The commandLine is array of strings in which last element is deep link URL
    console.log('Welcome Back', `You arrived from: ${deepLink}`);
  })

  // Create the main window
  app.whenReady().then(() => {
    ipcMain.handle('get-client-id', () => {
      return process.env.SPOTIFY_CLIENT_ID;
    });
    ipcMain.handle('get-redirect-uri', () => redirectUri);
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    })
  })
}
*/