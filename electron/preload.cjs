const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  printSilent: () => ipcRenderer.invoke('print-silent'),
});
