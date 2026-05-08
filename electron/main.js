const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('./store');
const { DEFAULTS } = require('./store');
const Notifier = require('./notifier');

let mainWindow;
let store;
let notifier;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 620,
    resizable: true,
    title: '番茄钟',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  mainWindow.setMenu(null);
}

function setupIPC() {
  ipcMain.handle('settings:load', () => store.loadSettings());
  ipcMain.handle('settings:save', (_, data) => store.saveSettings(data));

  ipcMain.handle('tasks:load', () => store.loadTasks());
  ipcMain.handle('tasks:save', (_, data) => store.saveTasks(data));

  ipcMain.handle('stats:load', () => store.loadStats());

  ipcMain.handle('pomodoro:complete', (_, taskId) => store.recordPomodoro(taskId));

  ipcMain.handle('notify', (_, opts) => notifier.notify(opts));

  ipcMain.handle('data:export', async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出数据',
      defaultPath: 'pomodoro-data.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!result.canceled && result.filePath) {
      const data = {
        settings: store.loadSettings(),
        tasks: store.loadTasks(),
        stats: store.loadStats(),
        exportedAt: new Date().toISOString(),
      };
      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
    }
  });

  ipcMain.handle('data:reset', () => {
    store.saveSettings(DEFAULTS.settings);
    store.saveTasks(DEFAULTS.tasks);
    store.saveStats({});
  });
}

app.whenReady().then(() => {
  store = new Store(app.getPath('userData'));
  createWindow();
  // IMPORTANT: notifier needs mainWindow to exist, so create it AFTER createWindow
  notifier = new Notifier(mainWindow);
  setupIPC();
});

app.on('window-all-closed', () => {
  app.quit();
});
