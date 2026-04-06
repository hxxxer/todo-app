# TodoApp

一个基于 Tauri v2 + React 19 开发的跨平台待办清单工具，集成了日历、待办管理和知识库三大核心功能。

![版本](https://img.shields.io/badge/version-v2.2.1-blue)
![Tauri](https://img.shields.io/badge/Tauri-v2-blue)
![React](https://img.shields.io/badge/React-v19-blue)
![Rust](https://img.shields.io/badge/Rust-stable-orange)
![平台](https://img.shields.io/badge/platform-Windows%20%7C%20Android-green)

## ✨ 功能特性

### 📅 日历页面
- **年/月视图切换**：支持年视图和月视图两种展示方式
- **点击创建待办**：直接在日历上点击日期创建待办事项
- **待办颜色标记**：
  - 蓝色：未完成待办
  - 灰黑色：已完成待办
- **待办操作**：编辑、删除、标记完成
- **关联文档**：每个待办可关联多个知识库文档，点击可快速跳转

### 📝 所有待办页面
- **按日期分组**：待办事项按日期倒序排列，组间用横线分隔
- **日期标签**：智能显示"今天"、"昨天"或具体日期
- **搜索功能**：支持按标题、备注、截止日期搜索
- **隐藏已完成**：一键隐藏/显示已完成的待办
- **编辑备注**：每个待办可编辑备注内容

### 📚 知识库页面
- **文档管理**：创建、编辑、删除 Markdown 文档
- **按时间排序**：文档按最后修改时间倒序排列
- **日期分组**：今天/昨天/具体日期分组显示
- **外部编辑器**：支持使用系统默认程序打开 .md 文件
- **文档关联**：可与待办事项关联

### ☁️ WebDAV 同步
- **配置管理**：保存 WebDAV 服务器地址、账号、密码和远程路径
- **上传/下载**：手动上传或下载数据库文件
- **连接测试**：测试 WebDAV 服务器连接是否正常
- **自动备份**：下载前自动备份本地数据库

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| UI 框架 | Tailwind CSS v4 + Shadcn/ui |
| 后端框架 | Tauri v2 + Rust |
| 数据库 | SQLite (rusqlite) |
| 构建工具 | Vite + pnpm |
| 移动端 | Android (arm64-v8a, x86_64) |

## ✨ 2.0 新功能

### 📱 移动端支持
- **底部导航栏**：移动端专属的底部导航，快速切换页面
- **响应式布局**：
  - 日历页面：移动端蓝色覆盖层显示待办数量，底部显示待办列表
  - 知识库页面：移动端列表/详情分离布局
  - 年视图：移动端 3 列布局，桌面端 4 列布局
- **滑动操作**：日历页面支持左右滑动切换月份
- **硬件返回键**：文档编辑页面按返回键返回列表视图
- **WebDAV 同步**：移动端优化布局，按钮垂直排列

### 🔧 其他改进
- **搜索功能**：知识库页面添加搜索框（标题 + 内容）
- **UI 优化**：所有卡片添加统一边框样式
- **开发体验**：添加 Android 构建指南文档

## TODO

- [ ] 添加移动端通知支持
- [ ] 添加数据自动备份功能
- [ ] 添加主题切换功能（深色/浅色）

## 📦 安装和编译

### 前置要求

确保已安装以下工具：

- [Node.js](https://nodejs.org/) (v18 或更高版本)
- [pnpm](https://pnpm.io/) (v8 或更高版本)
- [Rust](https://www.rust-lang.org/tools/install) (最新稳定版)

### 1. 克隆项目

```bash
cd D:\DIY\tauri-app\todo-app
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 开发模式运行

```bash
pnpm tauri dev
```

### 4. 构建生产版本

```bash
# Windows
pnpm tauri build

# Android
pnpm tauri android build --apk
```

## 📁 项目结构

```
todo-app/
├── src/                          # 前端源代码
│   ├── components/               # React 组件
│   │   ├── ui/                   # Shadcn/ui 基础组件
│   │   ├── CalendarMonthView.tsx # 月视图日历组件
│   │   └── YearView.tsx          # 年视图日历组件
│   ├── lib/                      # 工具库
│   │   ├── commands.ts           # Tauri 命令调用
│   │   └── utils.ts              # 工具函数
│   ├── AllTodosPage.tsx          # 所有待办页面
│   ├── CalendarPage.tsx          # 日历页面
│   ├── KnowledgePage.tsx         # 知识库页面
│   ├── WebDavSettingsPage.tsx    # WebDAV 设置页面
│   └── App.tsx                   # 主应用组件
├── src-tauri/                    # Rust 后端源代码
│   ├── src/
│   │   ├── commands.rs           # 待办相关命令
│   │   ├── document_commands.rs  # 文档管理命令
│   │   ├── webdav_sync.rs        # WebDAV 同步
│   │   └── lib.rs                # 入口文件
│   └── capabilities/             # Tauri 权限配置
├── CHANGELOG.md                  # 更新日志
├── ANDROID_BUILD.md              # Android 构建指南
├── BUG_PATTERNS.md               # 常见 Bug 模式记录
└── package.json                  # 前端依赖配置
```

## 💾 数据存储

### 数据库位置
```
C:\Users\{用户名}\AppData\Roaming\com.tauri-app.todo-app\todo_app.db
```

### 数据库表结构

**todos 表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| title | TEXT | 标题 |
| date | TEXT | 日期 |
| deadline | TEXT | 截止日期 |
| notes | TEXT | 备注 |
| completed | INTEGER | 完成状态 (0/1) |
| created_at | TEXT | 创建时间 |

**documents 表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| title | TEXT | 文档标题（唯一） |
| content | TEXT | 文档内容 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 最后修改时间 |

**todo_documents 表**
| 字段 | 类型 | 说明 |
|------|------|------|
| todo_id | INTEGER | 待办 ID |
| document_id | INTEGER | 文档 ID |

## 🎯 使用指南

### 创建待办
1. 在日历页面点击日期
2. 点击"新建待办"按钮
3. 输入标题、截止日期、备注
4. 点击"创建"

### 编辑备注
1. 点击待办卡片备注区域右上角的 ✏️ 图标
2. 在弹出的对话框中编辑内容
3. 点击"保存"

### 关联文档
1. 在待办卡片中点击"选择文档"
2. 勾选要关联的文档
3. 点击"完成"
4. 点击文档旁的 🔗 图标可跳转到文档

### 创建知识库文档
1. 进入知识库页面
2. 点击右上角的 ➕ 按钮
3. 输入文档标题
4. 点击"创建"
5. 在右侧编辑器中编写内容

## 📚 其它文档

- [更新日志](CHANGELOG.md) - 查看所有版本的更新记录
- [Android 构建指南](ANDROID_BUILD.md) - Android 平台构建指南

## 📄 许可证

MIT License

## 🙏 致谢

- [Tauri](https://tauri.app/) - 跨平台桌面应用框架
- [React](https://react.dev/) - 前端 UI 库
- [Shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [Tailwind CSS](https://tailwindcss.com/) - 原子化 CSS 框架
