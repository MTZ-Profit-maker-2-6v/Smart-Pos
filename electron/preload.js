import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  printSilent: () => ipcRenderer.invoke('print-silent'),
});
