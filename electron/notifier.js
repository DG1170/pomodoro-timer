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
