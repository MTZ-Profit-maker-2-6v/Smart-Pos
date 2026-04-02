const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 768,
    kiosk: true,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const loadMain = async () => {
    if (!app.isPackaged) {
      await mainWindow.loadURL('http://localhost:5173');
    } else {
      await mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
    }
  };

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.show();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (!mainWindow.isVisible()) mainWindow.show();
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.warn('Main window failed to load', { errorCode, errorDescription, validatedURL });
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.setBackgroundColor('#0a0a0a');
    if (!mainWindow.isVisible()) mainWindow.show();
  });

  // fallback in case the renderer takes too long
  setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (!mainWindow.isVisible()) mainWindow.show();
  }, 10000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  loadMain().catch((err) => {
    console.error('Failed to load main window', err);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
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
