const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  loadFolderStructure: (directoryPath) =>
      ipcRenderer.invoke('fs:loadFolderStructure', directoryPath),
  loadFileContent: (filePath) =>
      ipcRenderer.invoke('fs:loadFileContent', filePath),
  saveFile: (filePath, data) =>
      ipcRenderer.invoke('fs:saveFile', filePath, data),
  pathJoin: (...args) => path.join(...args),
  copyFolderWithMarkdown: (src, dst) =>
      ipcRenderer.invoke('fs:copyFolderWithMarkdown', src, dst)

});
