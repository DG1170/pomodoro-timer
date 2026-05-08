const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (s) => ipcRenderer.invoke('settings:save', s),
  loadTasks: () => ipcRenderer.invoke('tasks:load'),
  saveTasks: (t) => ipcRenderer.invoke('tasks:save', t),
  loadStats: () => ipcRenderer.invoke('stats:load'),
  recordPomodoro: (taskId) => ipcRenderer.invoke('pomodoro:complete', taskId),
  notify: (opts) => ipcRenderer.invoke('notify', opts),
  exportData: () => ipcRenderer.invoke('data:export'),
  resetData: () => ipcRenderer.invoke('data:reset'),
});
