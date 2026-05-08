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

  get round() {
    return this.workCount + 1;
  }

  get tomatoesInCycle() {
    return ((this.workCount - 1) % this.settings.longBreakInterval) + 1;
  }

  get formattedTime() {
    const m = Math.floor(this.remaining / 60);
    const s = this.remaining % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

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
