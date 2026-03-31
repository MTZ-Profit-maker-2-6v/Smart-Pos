const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';
let mainWindow = null;

function createWindow() {
  const splash = new BrowserWindow({
    width: 420,
    height: 320,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    show: true,
  });
  splash.loadFile(path.join(__dirname, 'splash.html'));

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 768,
    kiosk: true,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#1d4ed8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const loadMain = async () => {
    if (isDev) {
      await mainWindow.loadURL('http://localhost:5173');
    } else {
      await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  };

  mainWindow.once('ready-to-show', () => {
    if (splash) {
      splash.close();
    }
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  loadMain().catch((err) => {
    console.error('Failed to load main window', err);
    if (splash) splash.close();
    if (mainWindow) mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('print-silent', async () => {
  if (!mainWindow) return;
  return new Promise((resolve, reject) => {
    mainWindow.webContents.print({ silent: true, printBackground: true }, (success, errorType) => {
      if (!success) {
        reject(new Error(`Silent print failed: ${String(errorType)}`));
      } else {
        resolve();
      }
    });
  });
});
