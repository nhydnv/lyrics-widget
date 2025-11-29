const { app, BrowserWindow } = require('electron/main');
const http = require('http');

const createWindow = () => {
  const window = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
  });

  // Save globally so the server can send IPC messages
  global.mainWindow = window;

  window.loadFile('src/renderer/index.html');
}

// Create a server to redirect to after user authorised with Spotify
const createAuthServer = () => {
  const server = http.createServer((req, res) => {
    // Redirect URI = "http://127.0.0.1:8080/callback"
    const url = new URL(req.url, "http://127.0.0.1:8080");

    if (url.pathname === "/callback") {
      // Get code and state in the query parameters
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      // Send response headers to the user's browser
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h1>You may now close this window.</h1>");

      // Send an IPC message containing the code from main to renderer
      global.mainWindow.webContents.send("oauth-code", { code, state });
    }
  });

  server.listen(8080, "127.0.0.1", () => {
    console.log("OAuth redirect server running on http://127.0.0.1:8080/callback");
  });
}

app.whenReady().then(() => {
  createWindow();
  createAuthServer();

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