const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  settings: {
    work: 25,
    shortBreak: 5,
    longBreak: 15,
    longBreakInterval: 4,
    theme: 'warm',
    clockStyle: 'ring',
    notifications: { system: true, sound: true, alwaysOnTop: false },
  },
  tasks: [],
};

class Store {
  constructor(userDataPath) {
    this.base = path.join(userDataPath, 'pomodoro');
    if (!fs.existsSync(this.base)) {
      fs.mkdirSync(this.base, { recursive: true });
    }
  }

  _read(filename, fallback) {
    const fp = path.join(this.base, filename);
    try {
      if (fs.existsSync(fp)) {
        return JSON.parse(fs.readFileSync(fp, 'utf-8'));
      }
    } catch (e) {
      console.warn('读取文件失败，使用默认值:', filename, e.message);
    }
    return structuredClone(fallback);
  }

  _write(filename, data) {
    const fp = path.join(this.base, filename);
    try {
      fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('写入文件失败:', filename, e.message);
      return false;
    }
  }

  loadSettings() {
    return this._read('settings.json', DEFAULTS.settings);
  }

  saveSettings(data) {
    return this._write('settings.json', data);
  }

  loadTasks() {
    return this._read('tasks.json', DEFAULTS.tasks);
  }

  saveTasks(data) {
    return this._write('tasks.json', data);
  }

  loadStats() {
    return this._read('stats.json', {});
  }

  saveStats(data) {
    return this._write('stats.json', data);
  }

  recordPomodoro(taskId) {
    const today = new Date().toISOString().split('T')[0];
    const stats = this.loadStats();
    if (!stats[today]) {
      stats[today] = { total: 0, tasks: {} };
    }
    stats[today].total++;

    const tasks = this.loadTasks();
    if (taskId) {
      stats[today].tasks[taskId] = (stats[today].tasks[taskId] || 0) + 1;
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        task.completed = (task.completed || 0) + 1;
        this.saveTasks(tasks);
      }
    }

    this.saveStats(stats);
    return { stats, tasks };
  }
}

module.exports = Store;
module.exports.DEFAULTS = DEFAULTS;
