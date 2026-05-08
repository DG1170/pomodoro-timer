# 🍅 番茄钟

简洁高效的桌面番茄工作法计时器，基于 Electron 构建，支持 Windows。

## 功能

- **番茄计时** — 工作 / 短休息 / 长休息阶段自动循环，可自定义时长和长休间隔
- **任务管理** — 添加、选择、删除任务，记录每个任务完成的番茄数
- **统计面板** — 今日完成数、本周柱状图、总计完成数、按任务分布
- **6 种主题** — 温馨复古、极简白、暗夜专注、森林绿、薰衣草、日暮橙
- **通知提醒** — 系统原生通知 + Web Audio 提示音 + 可选窗口置顶（5 秒）
- **数据管理** — JSON 本地存储，支持一键导出 / 重置
- **时钟样式** — 数字倒计时 + 环形进度

## 下载

前往 [Releases](https://github.com/DG1170/pomodoro-timer/releases) 页面获取最新版本。

| 版本 | 说明 |
|------|------|
| `番茄钟 Setup x.x.x.exe` | NSIS 安装程序，带卸载 |
| `番茄钟-x.x.x-portable.zip` | 免安装便携版，解压即用 |

## 开发

```bash
# 克隆仓库
git clone https://github.com/DG1170/pomodoro-timer.git
cd pomodoro-timer

# 安装依赖
npm install

# 启动应用
npm start

# 运行测试
npm test

# 构建安装包
npm run build
```

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | [Electron](https://www.electronjs.org/) 42 |
| UI | [Alpine.js](https://alpinejs.dev/) 3 |
| 样式 | CSS Variables 主题系统 |
| 存储 | JSON 文件（Electron userData） |
| 构建 | [electron-builder](https://www.electron.build/) |
| 测试 | Node.js 原生 test runner |

## 项目结构

```
├── electron/          # Electron 主进程
│   ├── main.js        # 窗口创建 & IPC 注册
│   ├── preload.js     # contextBridge 安全桥接
│   ├── store.js       # JSON 文件存储
│   └── notifier.js    # 通知系统
├── src/               # 渲染进程
│   ├── index.html     # 单页面 UI
│   ├── app.js         # Alpine.js 应用逻辑
│   ├── timer.js       # 计时引擎（纯逻辑，无 DOM 依赖）
│   └── style.css      # 主题 & 样式
└── tests/             # 单元测试
    ├── store.test.js  # 存储模块测试 (10)
    └── timer.test.js  # 计时引擎测试 (9)
```

## License

MIT
