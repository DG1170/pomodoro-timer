window.__pomodoroFactory = () => ({
    tab: 'timer',
    newTaskTitle: '',
    tasks: [],
    selectedTask: null,
    stats: {},
    toastVisible: false,
    toastMsg: '',
    toastTimer: null,
    saveTimer: null,
    _statsCache: null,
    _statsDirty: true,

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
      return this.timer ? this.timer.formattedTime : '25:00';
    },

    get phaseLabel() {
      return this.timer ? this.timer.phaseLabel : '工作中';
    },

    get analogHandAngle() {
      return (this.timerState.remaining / this.timerState.total) * 360;
    },

    get cycleTomatoes() {
      const interval = this.settings.longBreakInterval;
      const wc = this.timerState.workCount;
      let filled = wc % interval;
      if (this.timerState.phase !== 'work' && filled === 0 && wc > 0) filled = interval;
      return Array.from({ length: interval }, (_, i) => ({ filled: i < filled }));
    },

    get sortedTasks() {
      return [...this.tasks].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return (b.completed || 0) - (a.completed || 0);
      });
    },

    _markStatsDirty() { this._statsDirty = true; },

    get statsData() {
      if (!this._statsDirty && this._statsCache) return this._statsCache;
      this._statsDirty = false;

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

      return (this._statsCache = { today: todayStats.total, week: weekTotal, total: totalAll, weekBars, maxBar, taskBreakdown });
    },

    _initCalled: false,
    async init() {
      if (this._initCalled) return;
      this._initCalled = true;
      try {
      if (window.api) {
        const [saved, tasks, stats] = await Promise.all([
          window.api.loadSettings(),
          window.api.loadTasks(),
          window.api.loadStats(),
        ]);
        if (saved) Object.assign(this.settings, saved);
        this.tasks = tasks;
        this.stats = stats;
      }
      } catch (e) { console.warn('加载数据失败，使用默认值:', e.message); }
      this._markStatsDirty();
      this.applyTheme(this.settings.theme);
      this.initTimer();
      this.applyTimerSettings();
    },

    initTimer() {
      this.timer = new PomodoroTimer({
        work: this.settings.work,
        shortBreak: this.settings.shortBreak,
        longBreak: this.settings.longBreak,
        longBreakInterval: this.settings.longBreakInterval,
      });
      this.timer.onTick((state) => {
        this.timerState = { ...state };
      });
      this.timer.onComplete(async (state) => {
        const wasWorkPhase = this.timerState.phase === 'work';
        this.timerState = { ...state };
        if (wasWorkPhase) {
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
        this._markStatsDirty();
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
      this._markStatsDirty();
      this.saveTasks();
    },

    selectTask(task) {
      if (task.done) return;
      this.selectedTask = this.selectedTask?.id === task.id ? null : task;
    },

    async deleteTask(taskId) {
      if (this.selectedTask?.id === taskId) this.selectedTask = null;
      this.tasks = this.tasks.filter(t => t.id !== taskId);
      this._markStatsDirty();
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
          this._markStatsDirty();
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
  });



