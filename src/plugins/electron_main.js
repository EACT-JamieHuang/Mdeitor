const {ipcMain, dialog} = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

// 处理目录选择
ipcMain.handle('dialog:selectDirectory', async () => {
  const result = await dialog.showOpenDialog({properties: ['openDirectory']});
  return result.filePaths[0];
});

// 处理加载文件夹结构的请求
ipcMain.handle('fs:loadFolderStructure', async (event, directoryPath) => {
  function getFolderStructure(dir) {
    const folders = [];
    const files = [];
    fs.readdirSync(dir).forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      const filetype = file.split('.').pop();

      if (stats.isDirectory()) {
        folders.push({
          title: file,
          path: filePath,
          children: [],
        });
      } else {
        files.push({
          title: file,
          filetype: filetype,
          path: filePath,
        });
      }
    });
    return [...folders, ...files];
  }

  return getFolderStructure(directoryPath);
});

// 处理文件内容读取
ipcMain.handle('fs:loadFileContent', async (event, filePath) => {
  console.log('ELEPATH:', filePath);
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return data;
  } catch (error) {
    console.error('Failed to load file content:', error);
    throw error;
  }
});

// 处理文件保存
ipcMain.handle('fs:saveFile', async (event, filePath, data) => {
  try {
    fs.writeFileSync(filePath, data, 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to save file:', error);
    throw error;
  }
});

// 複製含 markdown 檔案的資料夾
ipcMain.handle('fs:copyFolderWithMarkdown', async (event, src, dst) => {
  try {
    await fsp.mkdir(dst, {recursive: true});

    const files = await fsp.readdir(src);
    for (const file of files) {
      if (file.toLowerCase().endsWith('.md')) {
        const srcFile = path.join(src, file);
        const dstFile = path.join(dst, file);
        await fsp.copyFile(srcFile, dstFile);
      }
    }

    return true;
  } catch (err) {
    console.error('複製 markdown 檔案錯誤:', err);
    throw err;
  }
});
