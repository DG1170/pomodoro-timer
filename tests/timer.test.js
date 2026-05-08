const { test } = require('node:test');
const assert = require('node:assert');

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
  for (let i = 0; i < 3; i++) {
    timer.skip(); // work → shortBreak
    timer.skip(); // shortBreak → work
  }
  timer.skip(); // work → longBreak (workCount=4, 4%4===0)
  const state = timer.getState();
  assert.strictEqual(state.phase, 'longBreak');
  assert.strictEqual(state.remaining, 15 * 60);
  done();
});

test('长休后进入工作阶段', (t, done) => {
  const settings = { work: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 };
  const timer = new PomodoroTimer(settings);
  for (let i = 0; i < 7; i++) {
    timer.skip();
  }
  timer.skip(); // longBreak → work
  assert.strictEqual(timer.getState().phase, 'work');
  done();
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
