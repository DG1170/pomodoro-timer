const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Use temp directory for tests
const tmpDir = path.join(os.tmpdir(), 'pomodoro-test-' + Date.now());

// Lazy-load store
let Store;
try {
  Store = require('../electron/store');
} catch (e) {
  // module may not exist yet
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
  const store = new Store(tmpDir + '-broken');
  const dd = path.join(tmpDir + '-broken', 'pomodoro');
  fs.writeFileSync(path.join(dd, 'settings.json'), 'broken');
  const settings = store.loadSettings();
  assert.strictEqual(settings.work, 25); // fallback to defaults
});

// Cleanup
test.after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(tmpDir + '-2', { recursive: true, force: true });
  fs.rmSync(tmpDir + '-broken', { recursive: true, force: true });
});
