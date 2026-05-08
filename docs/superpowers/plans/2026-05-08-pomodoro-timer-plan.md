# 桌面番茄钟 — 实现计划

> **给执行者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 来逐步执行此计划。步骤使用 `- [ ]` 复选框语法追踪进度。

**目标：** 构建基于 Electron + Alpine.js 的桌面番茄钟应用，包含计时、任务、统计、设置四个模块。

**架构：** Electron 主进程负责窗口、JSON 存储和系统通知；渲染进程用 Alpine.js 单页应用实现全部 UI 和交互。CSS Variables 驱动 6 套配色主题和 4 种时钟样式。

**技术栈：** Electron、Alpine.js（CDN 打包到本地）、原生 CSS、JSON 文件存储

---

## 文件结构

```
cs1_1/
├── package.json
├── electron/
│   ├── main.js          — 主进程入口
│   ├── preload.js       — contextBridge IPC 桥接
│   ├── store.js         — JSON 读写 + 默认值
│   └── notifier.js      — 通知 + 声音 + 窗口置顶
├── src/
│   ├── index.html       — 单页面 Alpine.js 应用
│   ├── style.css        — 主题系统 + 时钟样式 + 布局
│   ├── app.js           — 应用状态、IPC 调用、业务逻辑
│   └── timer.js         — 倒计时引擎（纯逻辑，无 DOM 依赖）
└── tests/
    ├── timer.test.js    — 计时引擎单元测试
    └── store.test.js    — 存储模块单元测试
```

---

### 任务 1：项目初始化

**文件：**
- 创建：`package.json`

- [ ] **步骤 1：初始化 npm 项目并安装依赖**

```bash
cd E:\Claude_cs\cs1_1
npm init -y
npm install electron --save-dev
npm install alpinejs
```

- [ ] **步骤 2：验证安装**

```bash
npx electron --version
node -e "require('alpinejs'); console.log('Alpine.js OK');"
```

预期：输出版本号，Alpine.js 加载成功。

- [ ] **步骤 3：更新 package.json 添加启动脚本**

将 package.json 中的 `scripts` 字段替换为：

```json
{
  "name": "pomodoro-timer",
  "version": "1.0.0",
  "description": "桌面番茄钟",
  "main": "electron/main.js",
  "scripts": {
    "start": "electron .",
    "test": "node --test tests/*.test.js"
  },
  "devDependencies": {
    "electron": "^latest"
  },
  "dependencies": {
    "alpinejs": "^3"
  }
}
```

- [ ] **步骤 4：复制 Alpine.js 到 src 目录（离线可用）**

```bash
mkdir -p src
cp node_modules/alpinejs/dist/cdn.min.js src/alpine.min.js
```

---

### 任务 2：Electron 主进程框架

**文件：**
- 创建：`electron/main.js`
- 创建：`electron/preload.js`
- 创建：`src/index.html`（骨架）

- [ ] **步骤 1：编写主进程入口 `electron/main.js`**

```js
const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});
```

- [ ] **步骤 2：编写预加载脚本 `electron/preload.js`**

```js
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
```

- [ ] **步骤 3：编写骨架 HTML `src/index.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN" data-theme="warm">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>番茄钟</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">
    <h1>🍅 番茄钟加载中...</h1>
  </div>
  <script src="timer.js"></script>
  <script src="alpine.min.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **步骤 4：启动验证窗口能正常打开**

```bash
npm start
```

预期：弹出 420×620 窗口，显示"番茄钟加载中..."文字。

---

### 任务 3：JSON 存储模块

**文件：**
- 创建：`electron/store.js`
- 创建：`tests/store.test.js`

- [ ] **步骤 1：编写存储模块测试 `tests/store.test.js`**

```js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// 使用临时目录进行测试
const tmpDir = path.join(os.tmpdir(), 'pomodoro-test-' + Date.now());

// 延迟加载 store（因为 tmpDir 需要在测试前创建）
let Store;
try {
  Store = require('../electron/store');
} catch (e) {
  // 如果模块尚不存在，先标记
}

test('Store 模块存在', () => {
  assert.ok(Store, 'store 模块应该可加载');
});

test('创建 Store 实例时自动创建目录', () => {
  const store = new Store(tmpDir);
  assert.ok(fs.existsSync(path.join(tmpDir, 'pomodoro')));
});

test('loadSettings 首次返回默认值', () => {
  const store = new Store(tmpDir);
  const settings = store.loadSettings();
  assert.strictEqual(settings.work, 25);
  assert.strictEqual(settings.shortBreak, 5);
  assert.strictEqual(settings.longBreak, 15);
  assert.strictEqual(settings.longBreakInterval, 4);
  assert.strictEqual(settings.theme, 'warm');
  assert.strictEqual(settings.clockStyle, 'ring');
  assert.deepStrictEqual(settings.notifications, { system: true, sound: true, alwaysOnTop: false });
});

test('saveSettings 保存后可重新读取', () => {
  const store = new Store(tmpDir);
  const modified = { work: 30, shortBreak: 10, longBreak: 20, longBreakInterval: 2, theme: 'dark', clockStyle: 'big', notifications: { system: false, sound: true, alwaysOnTop: true } };
  store.saveSettings(modified);
  const loaded = store.loadSettings();
  assert.strictEqual(loaded.work, 30);
  assert.strictEqual(loaded.theme, 'dark');
  assert.strictEqual(loaded.clockStyle, 'big');
});

test('loadTasks 首次返回空数组', () => {
  const store = new Store(tmpDir);
  const tasks = store.loadTasks();
  assert.deepStrictEqual(tasks, []);
});

test('saveTasks 保存后可重新读取', () => {
  const store = new Store(tmpDir);
  const tasks = [{ id: '1', title: '测试任务', estimated: 4, completed: 2, done: false }];
  store.saveTasks(tasks);
  const loaded = store.loadTasks();
  assert.strictEqual(loaded.length, 1);
  assert.strictEqual(loaded[0].title, '测试任务');
});

test('loadStats 首次返回空对象', () => {
  const store = new Store(tmpDir);
  const stats = store.loadStats();
  assert.deepStrictEqual(stats, {});
});

test('recordPomodoro 正确记录统计并更新任务', () => {
  const store = new Store(tmpDir);
  store.saveTasks([{ id: 't1', title: '任务A', estimated: 4, completed: 0, done: false }]);

  const result = store.recordPomodoro('t1');
  const today = new Date().toISOString().split('T')[0];

  assert.strictEqual(result.stats[today].total, 1);
  assert.strictEqual(result.stats[today].tasks['t1'], 1);
  assert.strictEqual(result.tasks[0].completed, 1);
});

test('recordPomodoro 无任务时也能正常记录', () => {
  const store = new Store(tmpDir + '-2');
  const result = store.recordPomodoro(null);
  const today = new Date().toISOString().split('T')[0];
  assert.strictEqual(result.stats[today].total, 1);
});

test('损坏的 JSON 文件回退到默认值', () => {
  const badDir = path.join(tmpDir, 'pomodoro-bad');
  fs.mkdirSync(badDir, { recursive: true });
  fs.writeFileSync(path.join(badDir, 'settings.json'), '这不是合法的 JSON{{{');
  // 需要一个新的 Store 实例指向不同的目录
  const store = new Store(tmpDir + '-broken');
  // 手动写入损坏文件
  const dd = path.join(tmpDir + '-broken', 'pomodoro');
  fs.writeFileSync(path.join(dd, 'settings.json'), 'broken');
  const settings = store.loadSettings();
  assert.strictEqual(settings.work, 25); // 回退到默认值
});

// 清理
test.after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(tmpDir + '-2', { recursive: true, force: true });
  fs.rmSync(tmpDir + '-broken', { recursive: true, force: true });
});
```

- [ ] **步骤 2：运行测试确认失败**

```bash
npm test
```

预期：部分测试失败（store 模块尚不存在或功能不完整）。

- [ ] **步骤 3：编写 `electron/store.js`**

```js
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
    if (taskId) {
      stats[today].tasks[taskId] = (stats[today].tasks[taskId] || 0) + 1;
    }

    const tasks = this.loadTasks();
    if (taskId) {
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
```

- [ ] **步骤 4：运行测试验证通过**

```bash
npm test
```

预期：全部 8 个测试通过。

---

### 任务 4：计时引擎

**文件：**
- 创建：`src/timer.js`
- 创建：`tests/timer.test.js`

- [ ] **步骤 1：编写计时引擎测试 `tests/timer.test.js`**

```js
const { test } = require('node:test');
const assert = require('node:assert');

// timer.js 既支持浏览器也支持 Node.js
const PomodoroTimer = require('../src/timer.js');

test('初始状态为 work 阶段', () => {
  const settings = { work: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 };
  const timer = new PomodoroTimer(settings);
  const state = timer.getState();
  assert.strictEqual(state.phase, 'work');
  assert.strictEqual(state.isRunning, false);
  assert.strictEqual(state.remaining, 25 * 60);
  assert.strictEqual(state.workCount, 0);
});

test('start 后 isRunning 为 true', () => {
  const settings = { work: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 };
  const timer = new PomodoroTimer(settings);
  timer.start();
  assert.strictEqual(timer.getState().isRunning, true);
  timer.pause();
});

test('pause 后 isRunning 为 false', () => {
  const settings = { work: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 };
  const timer = new PomodoroTimer(settings);
  timer.start();
  timer.pause();
  assert.strictEqual(timer.getState().isRunning, false);
});

test('skip 进入短休阶段（第 1 个工作会话后）', (t, done) => {
  const settings = { work: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 };
  const timer = new PomodoroTimer(settings);
  timer.skip();
  const state = timer.getState();
  assert.strictEqual(state.phase, 'shortBreak');
  assert.strictEqual(state.remaining, 5 * 60);
  assert.strictEqual(state.isRunning, false);
  done();
});

test('4 个工作会话后进入长休', (t, done) => {
  const settings = { work: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 };
  const timer = new PomodoroTimer(settings);
  // 跳过 3 个工作 + 3 个短休
  for (let i = 0; i < 3; i++) {
    timer.skip(); // work → shortBreak
    timer.skip(); // shortBreak → work
  }
  // 第 4 个 work
  timer.skip(); // work → longBreak (因为 workCount=4, 4%4===0)
  const state = timer.getState();
  assert.strictEqual(state.phase, 'longBreak');
  assert.strictEqual(state.remaining, 15 * 60);
  done();
});

test('长休后进入工作阶段', (t, done) => {
  const settings = { work: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 };
  const timer = new PomodoroTimer(settings);
  for (let i = 0; i < 7; i++) {
    timer.skip(); // 4 work + 3 break = 7 skips
  }
  // 现在在 longBreak，再 skip
  timer.skip(); // longBreak → work
  assert.strictEqual(timer.getState().phase, 'work');
  done();
});

test('onTick 回调每秒触发', (t, done) => {
  const settings = { work: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 };
  const timer = new PomodoroTimer(settings);
  // 覆写 _runTimer 使用更快的 tick 来加速测试
  let tickCount = 0;
  timer.onTick(() => { tickCount++; });

  // 直接手动调用 tick 模拟
  timer.start();
  timer.pause();
  // 手动操作内部状态
  timer.remaining = 10;
  timer._runTimerWithInterval(10); // 10ms 间隔

  setTimeout(() => {
    timer.pause();
    assert.ok(tickCount >= 2, '应该触发了至少 2 次 tick');
    done();
  }, 50);
});

test('倒计时到 0 触发 onComplete', (t, done) => {
  const settings = { work: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 };
  const timer = new PomodoroTimer(settings);
  let completed = false;
  timer.onComplete(() => { completed = true; });
  timer.remaining = 1;
  timer.start();

  setTimeout(() => {
    assert.ok(completed, '应该触发 onComplete');
    assert.strictEqual(timer.getState().phase, 'shortBreak');
    assert.strictEqual(timer.getState().isRunning, false);
    done();
  }, 1200);
});

test('updateSettings 更新配置并重置', () => {
  const settings = { work: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 };
  const timer = new PomodoroTimer(settings);
  timer.start();
  timer.updateSettings({ work: 30, shortBreak: 10, longBreak: 20, longBreakInterval: 3 });
  const state = timer.getState();
  assert.strictEqual(state.isRunning, false);
  assert.strictEqual(state.remaining, 30 * 60);
  assert.strictEqual(state.phase, 'work');
  assert.strictEqual(state.workCount, 0);
});

test('reset 重置所有状态', () => {
  const settings = { work: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 };
  const timer = new PomodoroTimer(settings);
  timer.skip();
  timer.skip();
  timer.reset();
  const state = timer.getState();
  assert.strictEqual(state.phase, 'work');
  assert.strictEqual(state.workCount, 0);
  assert.strictEqual(state.remaining, 25 * 60);
  assert.strictEqual(state.isRunning, false);
});
```

- [ ] **步骤 2：运行测试确认失败**

```bash
npm test
```

预期：timer.js 尚不存在，测试失败。

- [ ] **步骤 3：编写 `src/timer.js`**

```js
class PomodoroTimer {
  constructor(settings) {
    this.settings = settings;
    this._timerId = null;
    this._tickCbs = [];
    this._completeCbs = [];
    this.reset();
  }

  reset() {
    this._clearTimer();
    this.phase = 'work';
    this.workCount = 0;
    this.remaining = this.settings.work * 60;
    this.total = this.remaining;
    this.isRunning = false;
  }

  updateSettings(settings) {
    this.settings = settings;
    this.reset();
  }

  _phaseDuration() {
    switch (this.phase) {
      case 'work': return this.settings.work * 60;
      case 'shortBreak': return this.settings.shortBreak * 60;
      case 'longBreak': return this.settings.longBreak * 60;
      default: return 1500;
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this._runTimerWithInterval(1000);
  }

  pause() {
    this._clearTimer();
    this.isRunning = false;
  }

  skip() {
    this._clearTimer();
    this._advance();
    this._fireComplete();
  }

  _advance() {
    if (this.phase === 'work') {
      this.workCount++;
      if (this.workCount % this.settings.longBreakInterval === 0) {
        this.phase = 'longBreak';
      } else {
        this.phase = 'shortBreak';
      }
    } else {
      this.phase = 'work';
    }
    this.remaining = this._phaseDuration();
    this.total = this.remaining;
    this.isRunning = false;
  }

  _runTimerWithInterval(ms) {
    this._clearTimer();
    this._timerId = setInterval(() => {
      this.remaining--;
      this._fireTick();
      if (this.remaining <= 0) {
        this._clearTimer();
        this._advance();
        this._fireComplete();
      }
    }, ms);
  }

  _clearTimer() {
    if (this._timerId !== null) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
  }

  _fireTick() {
    this._tickCbs.forEach(cb => cb(this.getState()));
  }

  _fireComplete() {
    this._completeCbs.forEach(cb => cb(this.getState()));
  }

  onTick(cb) { this._tickCbs.push(cb); }
  onComplete(cb) { this._completeCbs.push(cb); }

  getState() {
    return {
      phase: this.phase,
      workCount: this.workCount,
      remaining: this.remaining,
      total: this.total,
      isRunning: this.isRunning,
    };
  }

  // 显示用的轮次（从 1 开始）
  get round() {
    return this.workCount + 1;
  }

  // 当前循环内的番茄计数（1-4，到 4 后下一个为长休）
  get tomatoesInCycle() {
    return ((this.workCount - 1) % this.settings.longBreakInterval) + 1;
  }

  // 格式化剩余时间为 mm:ss
  get formattedTime() {
    const m = Math.floor(this.remaining / 60);
    const s = this.remaining % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  // 进度百分比（0-100）
  get progress() {
    if (this.total === 0) return 0;
    return ((this.total - this.remaining) / this.total) * 100;
  }

  get phaseLabel() {
    switch (this.phase) {
      case 'work': return '工作中';
      case 'shortBreak': return '短休';
      case 'longBreak': return '长休';
      default: return '';
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PomodoroTimer;
}
```

- [ ] **步骤 4：运行测试验证通过**

```bash
npm test
```

预期：全部测试通过。

---

### 任务 5：CSS 主题系统与布局

**文件：**
- 创建：`src/style.css`

- [ ] **步骤 1：编写完整 CSS `src/style.css`**

```css
/* ===== CSS 变量默认值（温馨复古） ===== */
:root,
[data-theme="warm"] {
  --bg: #fef9f0;
  --bg-secondary: #fff5eb;
  --surface: #ffffff;
  --text: #5c3d2e;
  --text-secondary: #8b6f5c;
  --text-muted: #c4a06e;
  --primary: #c95a3d;
  --primary-hover: #b04a33;
  --primary-light: #f0d5c0;
  --border: #d4b896;
  --danger: #e74c3c;
  --success: #4CAF50;
  --radius: 8px;
  --shadow: 0 2px 8px rgba(0,0,0,0.06);
}

[data-theme="light"] {
  --bg: #f5f6fa;
  --bg-secondary: #eef0f5;
  --surface: #ffffff;
  --text: #2d3436;
  --text-secondary: #636e72;
  --text-muted: #b2bec3;
  --primary: #4A90D9;
  --primary-hover: #357ABD;
  --primary-light: #d6e8fa;
  --border: #dfe6e9;
  --radius: 12px;
  --shadow: 0 2px 12px rgba(0,0,0,0.08);
}

[data-theme="dark"] {
  --bg: #1a1a2e;
  --bg-secondary: #16213e;
  --surface: #0f3460;
  --text: #e0e0e0;
  --text-secondary: #a0a0b8;
  --text-muted: #5a5a7a;
  --primary: #00d4aa;
  --primary-hover: #00b894;
  --primary-light: #1a3a3a;
  --border: #2a2a4a;
  --danger: #ff6b6b;
  --success: #00d4aa;
  --radius: 4px;
  --shadow: 0 2px 16px rgba(0,0,0,0.3);
}

[data-theme="forest"] {
  --bg: #f0f5f1;
  --bg-secondary: #e8f0e9;
  --surface: #ffffff;
  --text: #2d3a2d;
  --text-secondary: #5a6b5a;
  --text-muted: #8a9a8a;
  --primary: #4CAF50;
  --primary-hover: #388E3C;
  --primary-light: #c8e6c9;
  --border: #c8d6c8;
  --radius: 10px;
  --shadow: 0 2px 8px rgba(0,0,0,0.06);
}

[data-theme="lavender"] {
  --bg: #f8f5ff;
  --bg-secondary: #f0ebff;
  --surface: #ffffff;
  --text: #3d2a4d;
  --text-secondary: #6b5a7a;
  --text-muted: #9a8aaa;
  --primary: #7C3AED;
  --primary-hover: #6D28D9;
  --primary-light: #ddd6fe;
  --border: #d4c8e8;
  --radius: 12px;
  --shadow: 0 2px 8px rgba(0,0,0,0.06);
}

[data-theme="sunset"] {
  --bg: #fff8f0;
  --bg-secondary: #fff0e0;
  --surface: #ffffff;
  --text: #5c3d1e;
  --text-secondary: #8b6b3c;
  --text-muted: #c4a06e;
  --primary: #F59E0B;
  --primary-hover: #D97706;
  --primary-light: #fde68a;
  --border: #e8d5b0;
  --radius: 8px;
  --shadow: 0 2px 8px rgba(0,0,0,0.06);
}

/* ===== 全局样式 ===== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  overflow: hidden;
  user-select: none;
  -webkit-app-region: drag;
}

button, input, select {
  -webkit-app-region: no-drag;
  font-family: inherit;
}

#app {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ===== Tab 导航 ===== */
.tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 4px;
  margin-bottom: 20px;
}

.tab-btn {
  flex: 1;
  padding: 8px 0;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  border-radius: calc(var(--radius) - 2px);
  transition: all 0.2s;
}

.tab-btn.active {
  background: var(--surface);
  color: var(--primary);
  font-weight: 600;
  box-shadow: var(--shadow);
}

/* ===== 按钮样式 ===== */
.btn {
  padding: 10px 28px;
  border: none;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-primary {
  background: var(--primary);
  color: #fff;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

.btn-outline:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.btn-sm {
  padding: 6px 14px;
  font-size: 12px;
}

.btn-group {
  display: flex;
  gap: 10px;
  justify-content: center;
}

/* ===== 输入框 ===== */
.input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.input:focus {
  border-color: var(--primary);
}

/* ===== 卡片 ===== */
.card {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 14px;
  box-shadow: var(--shadow);
  margin-bottom: 10px;
}

.card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* ===== 时钟显示区 ===== */
.clock-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

/* 圆环进度环 */
.clock-ring {
  position: relative;
  width: 200px;
  height: 200px;
}

.clock-ring svg {
  transform: rotate(-90deg);
  width: 200px;
  height: 200px;
}

.clock-ring .bg-circle {
  fill: none;
  stroke: var(--primary-light);
  stroke-width: 6;
}

.clock-ring .progress-circle {
  fill: none;
  stroke: var(--primary);
  stroke-width: 6;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear;
}

.clock-ring .time-display {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.clock-ring .time-text {
  font-size: 42px;
  font-weight: bold;
  color: var(--text);
}

.clock-ring .phase-text {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* 大号数字 */
.clock-big {
  text-align: center;
}

.clock-big .time-text {
  font-size: 72px;
  font-weight: 300;
  color: var(--text);
  letter-spacing: 4px;
}

.clock-big .phase-text {
  font-size: 14px;
  color: var(--text-muted);
  margin-top: 4px;
}

.clock-big .progress-bar-mini {
  width: 200px;
  height: 3px;
  background: var(--primary-light);
  border-radius: 2px;
  margin: 12px auto 0;
  overflow: hidden;
}

.clock-big .progress-bar-mini-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 2px;
  transition: width 1s linear;
}

/* 横向进度条 + 数字 */
.clock-bar {
  width: 100%;
  text-align: center;
}

.clock-bar .progress-bar {
  width: 100%;
  height: 8px;
  background: var(--primary-light);
  border-radius: 4px;
  margin-bottom: 16px;
  overflow: hidden;
}

.clock-bar .progress-bar-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 4px;
  transition: width 1s linear;
}

.clock-bar .time-text {
  font-size: 52px;
  font-weight: bold;
  color: var(--text);
}

.clock-bar .phase-text {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* 模拟钟面 */
.clock-analog {
  position: relative;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  border: 4px solid var(--primary);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.clock-analog .hand {
  position: absolute;
  bottom: 50%;
  left: 50%;
  transform-origin: bottom center;
  background: var(--primary);
  border-radius: 2px;
}

.clock-analog .hand-minute {
  width: 3px;
  height: 60px;
  margin-left: -1.5px;
}

.clock-analog .hand-second {
  width: 1px;
  height: 70px;
  margin-left: -0.5px;
  background: var(--danger);
}

.clock-analog .center-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--primary);
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.clock-analog .time-text {
  position: absolute;
  bottom: 30px;
  width: 100%;
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  color: var(--text);
}

/* ===== 选中任务指示 ===== */
.selected-task {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.selected-task span {
  color: var(--text-secondary);
  font-weight: 500;
}

/* ===== 番茄进度点 ===== */
.tomato-dots {
  font-size: 16px;
  letter-spacing: 4px;
  color: var(--primary);
}

.tomato-dots .empty {
  opacity: 0.25;
}

/* ===== 任务列表 ===== */
.task-input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--surface);
  border-radius: var(--radius);
  margin-bottom: 6px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.15s;
  box-shadow: var(--shadow);
}

.task-item:hover {
  border-left-color: var(--primary-light);
}

.task-item.selected {
  border-left-color: var(--primary);
  background: var(--bg-secondary);
}

.task-item.done {
  opacity: 0.5;
}

.task-item.done .task-title {
  text-decoration: line-through;
}

.task-title {
  font-size: 13px;
  color: var(--text);
}

.task-pomos {
  font-size: 11px;
  color: var(--text-muted);
}

.task-delete {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
}

.task-delete:hover {
  color: var(--danger);
  background: var(--bg-secondary);
}

/* ===== 统计页 ===== */
.stat-cards {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.stat-card {
  flex: 1;
  text-align: center;
  background: var(--surface);
  border-radius: var(--radius);
  padding: 14px 10px;
  box-shadow: var(--shadow);
}

.stat-card .stat-num {
  font-size: 28px;
  font-weight: bold;
  color: var(--primary);
}

.stat-card .stat-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.bar-chart {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  justify-content: center;
  height: 100px;
  margin-bottom: 4px;
}

.bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.bar-fill {
  width: 28px;
  background: var(--primary);
  border-radius: 4px 4px 0 0;
  transition: height 0.3s;
  min-height: 4px;
}

.bar-fill.empty {
  background: var(--primary-light);
}

.bar-label {
  font-size: 10px;
  color: var(--text-muted);
}

/* ===== 设置页 ===== */
.setting-group {
  margin-bottom: 16px;
}

.setting-group h3 {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  font-weight: 600;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
}

.setting-row label {
  color: var(--text);
  flex: 1;
}

.setting-row input[type="number"] {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  text-align: center;
  font-size: 13px;
}

.setting-row input[type="checkbox"] {
  accent-color: var(--primary);
  width: 16px;
  height: 16px;
}

.setting-row select {
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
}

.theme-preview {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.theme-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s;
}

.theme-dot:hover {
  transform: scale(1.15);
}

.theme-dot.active {
  border-color: var(--text);
  box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--text);
}

/* ===== 滚动条 ===== */
.scroll-area {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.scroll-area::-webkit-scrollbar {
  width: 4px;
}

.scroll-area::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}

/* ===== 隐藏面板 ===== */
.hidden {
  display: none !important;
}

/* ===== Toast 提示 ===== */
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--text);
  color: var(--bg);
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 12px;
  z-index: 100;
  opacity: 0;
  transition: opacity 0.3s;
}

.toast.show {
  opacity: 0.9;
}
```

- [ ] **步骤 2：npm start 确认无 CSS 加载报错**

```bash
npm start
```

预期：窗口正常打开，背景呈暖米色（温馨复古主题默认色）。

---

### 任务 6：HTML 界面结构

**文件：**
- 修改：`src/index.html`

- [ ] **步骤 1：编写完整 HTML `src/index.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN" data-theme="warm">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>番茄钟</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app" x-data="pomodoroApp" x-init="init()">

    <!-- Tab 导航 -->
    <nav class="tabs">
      <button class="tab-btn" :class="{ active: tab === 'timer' }" @click="tab = 'timer'">🍅 计时</button>
      <button class="tab-btn" :class="{ active: tab === 'tasks' }" @click="tab = 'tasks'">📋 任务</button>
      <button class="tab-btn" :class="{ active: tab === 'stats' }" @click="tab = 'stats'">📊 统计</button>
      <button class="tab-btn" :class="{ active: tab === 'settings' }" @click="tab = 'settings'">⚙ 设置</button>
    </nav>

    <!-- ===== 计时页 ===== -->
    <div class="clock-area" x-show="tab === 'timer'" x-cloak>

      <!-- 选中任务名 -->
      <div class="selected-task" x-show="selectedTask">
        📌 <span x-text="selectedTask?.title"></span>
      </div>

      <!-- 圆环进度环 -->
      <div class="clock-ring" x-show="settings.clockStyle === 'ring'">
        <svg viewBox="0 0 200 200">
          <circle class="bg-circle" cx="100" cy="100" r="90"/>
          <circle class="progress-circle" cx="100" cy="100" r="90"
            :stroke-dasharray="2 * Math.PI * 90"
            :stroke-dashoffset="2 * Math.PI * 90 * (1 - timerState.remaining / timerState.total)"/>
        </svg>
        <div class="time-display">
          <span class="time-text" x-text="formattedTime"></span>
          <span class="phase-text" x-text="phaseLabel"></span>
        </div>
      </div>

      <!-- 大号数字 -->
      <div class="clock-big" x-show="settings.clockStyle === 'big'">
        <span class="time-text" x-text="formattedTime"></span>
        <span class="phase-text" x-text="phaseLabel"></span>
        <div class="progress-bar-mini">
          <div class="progress-bar-mini-fill" :style="{ width: timerState.remaining / timerState.total * 100 + '%' }"></div>
        </div>
      </div>

      <!-- 横向进度条 + 数字 -->
      <div class="clock-bar" x-show="settings.clockStyle === 'bar'">
        <div class="progress-bar">
          <div class="progress-bar-fill" :style="{ width: timerState.remaining / timerState.total * 100 + '%' }"></div>
        </div>
        <span class="time-text" x-text="formattedTime"></span>
        <span class="phase-text" x-text="phaseLabel"></span>
      </div>

      <!-- 模拟钟面 -->
      <div class="clock-analog" x-show="settings.clockStyle === 'analog'">
        <div class="hand hand-minute" :style="{ transform: 'rotate(' + analogHandAngle + 'deg)' }"></div>
        <div class="center-dot"></div>
        <div class="time-text" x-text="formattedTime"></div>
      </div>

      <!-- 控制按钮 -->
      <div class="btn-group">
        <button class="btn btn-primary" @click="toggleTimer" x-text="timerState.isRunning ? '暂停' : '开始'"></button>
        <button class="btn btn-outline" @click="skipPhase">跳过</button>
      </div>

      <!-- 番茄进度点 -->
      <div class="tomato-dots">
        <template x-for="i in settings.longBreakInterval">
          <span :class="{ empty: i > (timerState.workCount % settings.longBreakInterval) }">
            🍅
          </span>
        </template>
        <span style="font-size:12px;color:var(--text-muted);margin-left:6px;" x-text="'第 ' + (timerState.workCount % settings.longBreakInterval || settings.longBreakInterval) + '/' + settings.longBreakInterval + ' 个'"></span>
      </div>
    </div>

    <!-- ===== 任务页 ===== -->
    <div x-show="tab === 'tasks'" x-cloak>
      <div class="task-input-row">
        <input class="input" type="text" placeholder="添加新任务..." x-model="newTaskTitle" @keyup.enter="addTask">
        <button class="btn btn-primary btn-sm" @click="addTask">+</button>
      </div>
      <div class="scroll-area" style="max-height:380px;">
        <template x-for="task in sortedTasks" :key="task.id">
          <div class="task-item"
            :class="{ selected: selectedTask?.id === task.id, done: task.done }"
            @click="selectTask(task)">
            <span class="task-title" x-text="task.title"></span>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="task-pomos" x-text="(task.completed || 0) + '/' + task.estimated + ' 🍅'"></span>
              <button class="task-delete" @click.stop="deleteTask(task.id)">✕</button>
            </div>
          </div>
        </template>
        <p style="text-align:center;color:var(--text-muted);font-size:12px;margin-top:12px;" x-show="sortedTasks.length === 0">
          还没有任务，添加一个吧
        </p>
      </div>
    </div>

    <!-- ===== 统计页 ===== -->
    <div x-show="tab === 'stats'" x-cloak>
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-num" x-text="statsData.today"></div>
          <div class="stat-label">今日</div>
        </div>
        <div class="stat-card">
          <div class="stat-num" x-text="statsData.week"></div>
          <div class="stat-label">本周</div>
        </div>
        <div class="stat-card">
          <div class="stat-num" x-text="statsData.total"></div>
          <div class="stat-label">总计</div>
        </div>
      </div>

      <div class="card">
        <div style="font-size:12px;color:var(--text-muted);text-align:center;margin-bottom:8px;">本周番茄趋势</div>
        <div class="bar-chart">
          <template x-for="(count, day) in statsData.weekBars">
            <div class="bar-col">
              <div class="bar-fill" :class="{ empty: count === 0 }"
                :style="{ height: Math.max(count / statsData.maxBar * 80, 4) + 'px' }"></div>
              <span class="bar-label" x-text="day"></span>
            </div>
          </template>
        </div>
      </div>

      <div class="card" x-show="statsData.taskBreakdown.length > 0">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">按任务统计</div>
        <template x-for="tb in statsData.taskBreakdown">
          <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;color:var(--text-secondary);">
            <span x-text="tb.title"></span>
            <span x-text="tb.count + ' 🍅'"></span>
          </div>
        </template>
      </div>
    </div>

    <!-- ===== 设置页 ===== -->
    <div x-show="tab === 'settings'" x-cloak>
      <div class="scroll-area" style="max-height:420px;">

        <div class="setting-group">
          <h3>时长设置（分钟）</h3>
          <div class="setting-row">
            <label>工作时间</label>
            <input type="number" min="1" max="120" x-model.number="settings.work" @change="saveSettingsDebounced">
          </div>
          <div class="setting-row">
            <label>短休时间</label>
            <input type="number" min="1" max="60" x-model.number="settings.shortBreak" @change="saveSettingsDebounced">
          </div>
          <div class="setting-row">
            <label>长休时间</label>
            <input type="number" min="1" max="120" x-model.number="settings.longBreak" @change="saveSettingsDebounced">
          </div>
          <div class="setting-row">
            <label>长休间隔（轮）</label>
            <input type="number" min="1" max="10" x-model.number="settings.longBreakInterval" @change="saveSettingsDebounced">
          </div>
        </div>

        <div class="setting-group">
          <h3>主题配色</h3>
          <div class="theme-preview">
            <template x-for="t in themes" :key="t.id">
              <div class="theme-dot"
                :class="{ active: settings.theme === t.id }"
                :style="{ background: t.color }"
                :title="t.name"
                @click="settings.theme = t.id; applyTheme(t.id)"></div>
            </template>
          </div>
        </div>

        <div class="setting-group">
          <h3>时钟样式</h3>
          <div class="setting-row">
            <label>样式</label>
            <select x-model="settings.clockStyle" @change="saveSettingsDebounced">
              <option value="ring">圆环进度环</option>
              <option value="big">大号数字</option>
              <option value="bar">横向进度条</option>
              <option value="analog">模拟钟面</option>
            </select>
          </div>
        </div>

        <div class="setting-group">
          <h3>通知方式</h3>
          <div class="setting-row">
            <label>系统通知</label>
            <input type="checkbox" x-model="settings.notifications.system" @change="saveSettingsDebounced">
          </div>
          <div class="setting-row">
            <label>提示音</label>
            <input type="checkbox" x-model="settings.notifications.sound" @change="saveSettingsDebounced">
          </div>
          <div class="setting-row">
            <label>窗口置顶</label>
            <input type="checkbox" x-model="settings.notifications.alwaysOnTop" @change="saveSettingsDebounced">
          </div>
        </div>

        <div class="setting-group">
          <h3>数据管理</h3>
          <div class="btn-group">
            <button class="btn btn-outline btn-sm" @click="exportData">导出数据</button>
            <button class="btn btn-outline btn-sm" @click="confirmReset" style="color:var(--danger);border-color:var(--danger);">重置数据</button>
          </div>
        </div>

      </div>
    </div>

    <!-- Toast -->
    <div class="toast" :class="{ show: toastVisible }" x-text="toastMsg"></div>

  </div>

  <script src="timer.js"></script>
  <script src="alpine.min.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **步骤 2：npm start 确认界面结构正常渲染**

```bash
npm start
```

预期：四个 Tab 可点击切换，控件布局显示正常。

---

### 任务 7：Alpine.js 应用逻辑

**文件：**
- 创建：`src/app.js`

- [ ] **步骤 1：编写 `src/app.js`**

```js
document.addEventListener('alpine:init', () => {
  Alpine.data('pomodoroApp', () => ({
    tab: 'timer',
    newTaskTitle: '',
    tasks: [],
    selectedTask: null,
    stats: {},
    toastVisible: false,
    toastMsg: '',
    toastTimer: null,
    saveTimer: null,

    settings: {
      work: 25,
      shortBreak: 5,
      longBreak: 15,
      longBreakInterval: 4,
      theme: 'warm',
      clockStyle: 'ring',
      notifications: { system: true, sound: true, alwaysOnTop: false },
    },

    timer: null,
    timerState: {
      phase: 'work',
      workCount: 0,
      remaining: 25 * 60,
      total: 25 * 60,
      isRunning: false,
    },

    themes: [
      { id: 'warm', name: '温馨复古', color: '#c95a3d' },
      { id: 'light', name: '极简白', color: '#4A90D9' },
      { id: 'dark', name: '暗夜专注', color: '#00d4aa' },
      { id: 'forest', name: '森林绿', color: '#4CAF50' },
      { id: 'lavender', name: '薰衣草', color: '#7C3AED' },
      { id: 'sunset', name: '日暮橙', color: '#F59E0B' },
    ],

    get formattedTime() {
      let r = this.timerState.remaining;
      if (r < 0) r = 0;
      const m = Math.floor(r / 60);
      const s = r % 60;
      return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    },

    get phaseLabel() {
      switch (this.timerState.phase) {
        case 'work': return '工作中';
        case 'shortBreak': return '短休';
        case 'longBreak': return '长休';
        default: return '';
      }
    },

    get analogHandAngle() {
      return (this.timerState.remaining / this.timerState.total) * 360;
    },

    get sortedTasks() {
      return [...this.tasks].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return (b.completed || 0) - (a.completed || 0);
      });
    },

    get statsData() {
      const stats = this.stats || {};
      const today = new Date().toISOString().split('T')[0];
      const todayStats = stats[today] || { total: 0, tasks: {} };

      const weekBars = {};
      let weekTotal = 0;
      let maxBar = 1;
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + mondayOffset + i);
        const key = d.toISOString().split('T')[0];
        const dayLabel = ['一','二','三','四','五','六','日'][i];
        const count = (stats[key] || {}).total || 0;
        weekBars[dayLabel] = count;
        weekTotal += count;
        if (count > maxBar) maxBar = count;
      }

      let totalAll = 0;
      for (const [, dayStats] of Object.entries(stats)) {
        totalAll += dayStats.total || 0;
      }

      const taskMap = {};
      for (const [, dayStats] of Object.entries(stats)) {
        if (dayStats.tasks) {
          for (const [tid, count] of Object.entries(dayStats.tasks)) {
            taskMap[tid] = (taskMap[tid] || 0) + count;
          }
        }
      }
      const taskBreakdown = Object.entries(taskMap)
        .map(([tid, count]) => {
          const task = this.tasks.find(t => t.id === tid);
          return { title: task ? task.title : '(已删除)', count };
        })
        .sort((a, b) => b.count - a.count);

      return { today: todayStats.total, week: weekTotal, total: totalAll, weekBars, maxBar, taskBreakdown };
    },

    async init() {
      if (window.api) {
        const saved = await window.api.loadSettings();
        if (saved) Object.assign(this.settings, saved);
        this.tasks = await window.api.loadTasks();
        this.stats = await window.api.loadStats();
      }
      this.applyTheme(this.settings.theme);
      this.initTimer();
      this.applyTimerSettings();
    },

    initTimer() {
      let prevPhase = 'work';
      this.timer = new PomodoroTimer({
        work: this.settings.work,
        shortBreak: this.settings.shortBreak,
        longBreak: this.settings.longBreak,
        longBreakInterval: this.settings.longBreakInterval,
      });
      this.timer.onTick((state) => {
        prevPhase = this.timerState.phase;
        this.timerState = { ...state };
      });
      this.timer.onComplete(async (state) => {
        const wasPhase = prevPhase;
        this.timerState = { ...state };
        if (wasPhase === 'work') {
          await this.recordCompletedPomodoro();
        }
        await this.triggerNotification();
      });
      this.timerState = this.timer.getState();
    },

    applyTimerSettings() {
      if (this.timer) {
        this.timer.updateSettings({
          work: this.settings.work,
          shortBreak: this.settings.shortBreak,
          longBreak: this.settings.longBreak,
          longBreakInterval: this.settings.longBreakInterval,
        });
        this.timerState = this.timer.getState();
      }
    },

    toggleTimer() {
      if (this.timerState.isRunning) {
        this.timer.pause();
      } else {
        this.timer.start();
      }
      this.timerState = this.timer.getState();
    },

    skipPhase() {
      this.timer.skip();
      this.timerState = this.timer.getState();
    },

    async recordCompletedPomodoro() {
      const taskId = this.selectedTask?.id || null;
      if (window.api) {
        const result = await window.api.recordPomodoro(taskId);
        this.stats = result.stats;
        if (result.tasks) this.tasks = result.tasks;
      }
    },

    async triggerNotification() {
      const msgs = {
        shortBreak: '工作完成！休息一下吧 ☕',
        longBreak: '干得好！该长休了 🌟',
        work: '休息结束，开始专注！💪',
      };
      const msg = msgs[this.timerState.phase] || '时间到！';
      if (window.api) {
        window.api.notify({
          ...this.settings.notifications,
          title: '番茄钟',
          body: msg,
        });
      }
      this.showToast(msg);
    },

    addTask() {
      const title = this.newTaskTitle.trim();
      if (!title) return;
      this.tasks.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        title,
        estimated: 4,
        completed: 0,
        done: false,
        createdAt: new Date().toISOString(),
      });
      this.newTaskTitle = '';
      this.saveTasks();
    },

    selectTask(task) {
      if (task.done) return;
      this.selectedTask = this.selectedTask?.id === task.id ? null : task;
    },

    async deleteTask(taskId) {
      if (this.selectedTask?.id === taskId) this.selectedTask = null;
      this.tasks = this.tasks.filter(t => t.id !== taskId);
      await this.saveTasks();
    },

    async saveTasks() {
      if (window.api) await window.api.saveTasks(this.tasks);
    },

    applyTheme(themeId) {
      document.documentElement.setAttribute('data-theme', themeId);
    },

    async saveSettingsDebounced() {
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.saveSettings(), 300);
    },

    async saveSettings() {
      this.applyTheme(this.settings.theme);
      this.applyTimerSettings();
      if (window.api) await window.api.saveSettings(this.settings);
    },

    async exportData() {
      if (window.api) {
        await window.api.exportData();
        this.showToast('数据已导出');
      }
    },

    async confirmReset() {
      if (confirm('确定要重置所有数据吗？此操作不可撤销。')) {
        if (window.api) {
          await window.api.resetData();
          this.tasks = [];
          this.stats = {};
          this.settings = {
            work: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4,
            theme: 'warm', clockStyle: 'ring',
            notifications: { system: true, sound: true, alwaysOnTop: false },
          };
          this.applyTheme('warm');
          this.applyTimerSettings();
        }
        this.showToast('数据已重置');
      }
    },

    showToast(msg) {
      this.toastMsg = msg;
      this.toastVisible = true;
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => { this.toastVisible = false; }, 2500);
    },
  }));
});
```

- [ ] **步骤 2：npm start 手动验证应用功能**

验证清单：
- [ ] Tab 切换正常
- [ ] 开始/暂停/跳过按钮响应
- [ ] 添加/选中/删除任务
- [ ] 主题切换预览圆点变色
- [ ] 时钟样式切换显示不同形态

---

### 任务 8：通知模块与 IPC 通道完善

**文件：**
- 创建：`electron/notifier.js`
- 修改：`electron/main.js`（添加 IPC 和 Store/Notifier 集成）

- [ ] **步骤 1：编写 `electron/notifier.js`**

```js
const { Notification } = require('electron');

class Notifier {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
  }

  notify(options) {
    const { system, sound, alwaysOnTop, title, body } = options;

    if (system && Notification.isSupported()) {
      new Notification({ title, body, silent: true }).show();
    }

    if (sound) {
      this.mainWindow.webContents.executeJavaScript(`
        (function() {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
          } catch(e) { /* 静默处理 */ }
        })();
      `).catch(() => {});
    }

    if (alwaysOnTop) {
      this.mainWindow.setAlwaysOnTop(true);
      setTimeout(() => {
        this.mainWindow.setAlwaysOnTop(false);
      }, 5000);
    }
  }
}

module.exports = Notifier;
```

- [ ] **步骤 2：更新 `electron/main.js` 集成存储和通知**

```js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('./store');
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
    store.saveSettings({
      work: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4,
      theme: 'warm', clockStyle: 'ring',
      notifications: { system: true, sound: true, alwaysOnTop: false },
    });
    store.saveTasks([]);
    store.saveStats({});
  });
}

app.whenReady().then(() => {
  store = new Store(app.getPath('userData'));
  notifier = new Notifier(mainWindow);
  createWindow();
  setupIPC();
});

app.on('window-all-closed', () => {
  app.quit();
});
```

- [ ] **步骤 3：npm start 验证通知功能**

```bash
npm start
```

验证清单：
- [ ] 完成一个倒计时后系统通知弹出
- [ ] 提示音播放
- [ ] 窗口置顶选项勾选后倒计时结束窗口弹到最前
- [ ] 导出数据可保存 JSON 文件
- [ ] 重置数据后恢复默认

---

### 任务 9：最终测试与完善

- [ ] **步骤 1：运行全套单元测试**

```bash
npm test
```

预期：所有测试通过。

- [ ] **步骤 2：完整功能走查**

按以下流程手动验证：

1. 启动应用 → 温馨复古主题 + 圆环进度环
2. 切换到设置页 → 修改工作时长为 5 分钟（方便测试）
3. 切换到暗夜专注主题 → 确认颜色变化
4. 切换到大号数字样式 → 确认时钟形态变化
5. 添加一个任务"测试任务"
6. 点击任务选中
7. 回到计时页 → 确认任务名显示
8. 开始计时 → 确认倒计时递减
9. 暂停 → 确认计时停止
10. 恢复 → 确认继续倒计时
11. 等待计时结束 → 通知触发 → 自动进入短休
12. 短休结束后自动进入工作
13. 查看统计页 → 确认番茄数已记录
14. 查看任务页 → 确认任务番茄数 +1
15. 导出数据 → 确认 JSON 文件内容正确

- [ ] **步骤 3：修复发现的问题**

有问题随时修复，不做假设。

---

### 任务 10：打包配置（可选）

- [ ] **步骤 1：安装 electron-builder**

```bash
npm install electron-builder --save-dev
```

- [ ] **步骤 2：在 package.json 添加打包配置**

```json
{
  "build": {
    "appId": "com.pomodoro.timer",
    "productName": "番茄钟",
    "directories": {
      "output": "dist"
    },
    "files": [
      "electron/**/*",
      "src/**/*",
      "node_modules/alpinejs/**"
    ],
    "win": {
      "target": "nsis",
      "icon": null
    }
  },
  "scripts": {
    "start": "electron .",
    "test": "node --test tests/*.test.js",
    "build": "electron-builder"
  }
}
```

- [ ] **步骤 3：构建安装包**

```bash
npm run build
```

预期：在 `dist/` 目录生成 Windows 安装包。
