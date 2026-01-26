# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

dd视频同步 是一个类似 [bili-sync](https://github.com/amtoaer/bili-sync) 的视频同步工具。

- **技术栈**：Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **数据库**：SQLite (better-sqlite3)
- **调度器**：node-cron
- **后端 API**：[TikTokDownloader](https://github.com/JoeanAmier/TikTokDownloader)
- **API 地址**：http://192.168.60.20:5555
- **API 文档**：http://192.168.60.20:5555/docs

## 常用命令

### 开发
```bash
npm install          # 安装依赖
npm run dev          # 启动开发服务器（http://localhost:3000）
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # 代码检查
```

### 测试
```bash
npm test             # 运行基础 Selenium 测试
npm run test:api     # 运行 API 测试（推荐优先运行）
npm run test:advanced # 运行高级 Selenium 测试
npm run test:headed  # 有头模式运行测试（可视化）
npm run test:all     # 运行所有测试
```

## 项目架构

### 整体架构图

```
┌─────────────────────────────────────────────────┐
│  浏览器 (http://localhost:3000)                 │
│  Next.js 全栈应用                                │
│  - 首页（作品列表）                              │
│  - 订阅管理                                      │
│  - 下载管理                                      │
│  - 设置                                          │
└──────────────────┬──────────────────────────────┘
                   │
                   │ Next.js API Routes (/api/*)
                   ↓
┌─────────────────────────────────────────────────┐
│  Next.js 后端                                    │
│  - RESTful API (/app/api/*)                     │
│  - SQLite 数据库 (data/dd-sync.db)              │
│  - node-cron 定时调度器                         │
└──────────────────┬──────────────────────────────┘
                   │
                   │ HTTP 调用
                   ↓
┌─────────────────────────────────────────────────┐
│  TikTokDownloader API                           │
│  (http://192.168.60.20:5555)                    │
│  - 抖音数据爬取服务                              │
└─────────────────────────────────────────────────┘
```

### 目录结构

```
dd-sync/
├── app/                          # Next.js App Router
│   ├── api/                      # API 路由
│   │   ├── downloads/            # 下载管理 API
│   │   │   ├── route.ts          # GET/POST 下载任务
│   │   │   └── start/route.ts    # POST 开始下载
│   │   ├── schedules/            # 调度管理 API
│   │   │   ├── route.ts          # GET/POST 调度任务
│   │   │   ├── control/route.ts  # POST 启动/停止调度器
│   │   │   └── logs/route.ts     # GET/POST 调度日志
│   │   ├── settings/route.ts     # GET/PATCH 设置
│   │   ├── subscriptions/        # 订阅管理 API
│   │   │   ├── route.ts          # GET/POST/DELETE 订阅
│   │   │   └── [id]/
│   │   │       ├── route.ts      # PATCH 更新订阅
│   │   │       └── sync/route.ts # POST 同步订阅
│   │   └── videos/route.ts       # POST 获取视频列表
│   ├── downloads/page.tsx        # 下载管理页面
│   ├── subscriptions/page.tsx    # 订阅管理页面
│   ├── settings/page.tsx         # 设置页面
│   ├── page.tsx                  # 首页
│   └── layout.tsx                # 根布局
├── lib/                          # 服务端库
│   ├── db.ts                     # 数据库初始化和连接
│   ├── scheduler.ts              # node-cron 调度器
│   ├── naming.ts                 # 文件命名工具
│   └── file-watcher.ts           # 文件监听器
├── components/                   # React 组件
│   └── Toast.tsx                 # 通知组件
├── test/                         # 测试文件
│   ├── selenium.test.cjs         # 基础 Selenium 测试
│   ├── selenium.advanced.cjs     # 高级 Selenium 测试
│   ├── api.test.cjs              # API 测试
│   └── README.md                 # 测试文档
├── screenshots/                  # 测试截图（自动生成）
├── data/                         # 数据目录（运行时生成）
│   └── dd-sync.db                # SQLite 数据库
├── downloads/                    # 下载目录（运行时生成）
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript 配置
├── tailwind.config.ts            # Tailwind CSS 配置
├── next.config.ts                # Next.js 配置
├── README.md                     # 项目说明
└── CLAUDE.md                     # 本文件
```

## 数据库设计

**重要变更**：项目已移除 `videos` 表，所有视频信息直接存储在 `download_tasks` 表中。

### 1. download_tasks 表 - 下载任务（包含所有视频信息）
```sql
CREATE TABLE download_tasks (
  id TEXT PRIMARY KEY,               -- 任务 ID
  video_id TEXT NOT NULL UNIQUE,     -- 视频 ID
  sec_user_id TEXT NOT NULL,         -- 用户 ID
  type TEXT NOT NULL,                -- 类型: '视频' 或 '图集'
  desc TEXT,                         -- 视频描述
  author_nickname TEXT,              -- 作者昵称
  author_uid TEXT,                   -- 作者 UID
  cover_url TEXT,                    -- 封面 URL
  download_url TEXT,                 -- 下载 URL（单个）
  all_download_urls TEXT,            -- 所有下载 URL（逗号分隔，图集用）
  duration TEXT,                     -- 时长
  digg_count INTEGER DEFAULT 0,      -- 点赞数
  comment_count INTEGER DEFAULT 0,   -- 评论数
  share_count INTEGER DEFAULT 0,     -- 分享数
  create_time TEXT,                  -- 创建时间
  status TEXT NOT NULL DEFAULT 'pending',  -- pending/downloading/completed/failed
  progress INTEGER DEFAULT 0,        -- 进度 0-100
  error TEXT,                        -- 错误信息
  file_path TEXT,                    -- 文件路径
  file_size INTEGER DEFAULT 0,       -- 文件大小（字节）
  created_at INTEGER NOT NULL,       -- 创建时间戳
  completed_at INTEGER               -- 完成时间戳
);
```

**物理删除机制**：
- 删除任务时，直接从数据库中删除记录（DELETE FROM）
- 可选择同时删除对应的文件
- 删除后任务无法恢复

### 2. subscriptions 表 - 订阅配置
```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,               -- 订阅 ID
  sec_user_id TEXT NOT NULL UNIQUE,  -- 抖音用户 ID
  nickname TEXT,                     -- 昵称
  avatar TEXT,                       -- 头像 URL
  enabled INTEGER DEFAULT 1,         -- 是否启用 (1/0)
  sync_interval INTEGER DEFAULT 60,  -- 同步间隔（分钟）
  time_range TEXT DEFAULT 'one-month', -- 时间范围: all/half-year/one-month
  min_digg_count INTEGER,            -- 最低点赞数过滤
  auto_download INTEGER DEFAULT 1,   -- 自动下载 (1/0)
  last_sync_time INTEGER,            -- 上次同步时间戳
  last_video_id TEXT,                -- 上次同步的最新视频 ID
  created_at INTEGER NOT NULL,       -- 创建时间戳
  updated_at INTEGER NOT NULL,       -- 更新时间戳
  total_videos INTEGER DEFAULT 0,    -- 发现的视频总数
  downloaded_count INTEGER DEFAULT 0 -- 已下载数量
);
```

### 4. sync_histories 表 - 同步历史
```sql
CREATE TABLE sync_histories (
  id TEXT PRIMARY KEY,               -- 历史记录 ID
  subscription_id TEXT NOT NULL,     -- 关联订阅 ID
  sync_time INTEGER NOT NULL,        -- 同步时间戳
  status TEXT NOT NULL,              -- success/failed/partial
  new_videos_count INTEGER DEFAULT 0,-- 新视频数量
  downloaded_count INTEGER DEFAULT 0,-- 下载数量
  error TEXT,                        -- 错误信息
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);
```

### 5. schedule_tasks 表 - 调度任务
```sql
CREATE TABLE schedule_tasks (
  id TEXT PRIMARY KEY,               -- 任务 ID
  name TEXT NOT NULL,                -- 任务名称
  type TEXT NOT NULL,                -- 任务类型
  cron_expression TEXT,              -- Cron 表达式
  enabled INTEGER DEFAULT 1,         -- 是否启用
  last_run_time INTEGER,             -- 上次运行时间
  next_run_time INTEGER,             -- 下次运行时间
  created_at INTEGER NOT NULL,       -- 创建时间戳
  updated_at INTEGER NOT NULL        -- 更新时间戳
);
```

### 6. schedule_logs 表 - 调度日志
```sql
CREATE TABLE schedule_logs (
  id TEXT PRIMARY KEY,               -- 日志 ID
  task_id TEXT NOT NULL,             -- 关联任务 ID
  start_time INTEGER NOT NULL,       -- 开始时间戳
  end_time INTEGER,                  -- 结束时间戳
  status TEXT NOT NULL,              -- success/failed/running
  message TEXT,                      -- 日志消息
  details TEXT,                      -- 详细信息（JSON）
  FOREIGN KEY (task_id) REFERENCES schedule_tasks(id) ON DELETE CASCADE
);
```

### 7. settings 表 - 应用设置
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,              -- 设置键
  value TEXT NOT NULL,               -- 设置值
  updated_at INTEGER NOT NULL        -- 更新时间戳
);
```

**默认设置：**
- `download_dir`: 下载目录路径
- `api_base_url`: TikTokDownloader API 地址
- `api_token`: API 令牌（可选）
- `folderNameFormat`: 文件夹名称格式
- `fileNameFormat`: 文件名格式
- `mark`: 水印设置
- `showImages`: 是否显示图片

## API 文档

### 订阅管理

#### GET /api/subscriptions
获取所有订阅

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sec_user_id": "MS4wLjABAAAA...",
      "nickname": "用户昵称",
      "avatar": "https://...",
      "enabled": 1,
      "sync_interval": 60,
      "time_range": "one-month",
      "min_digg_count": null,
      "auto_download": 1,
      "last_sync_time": 1737619200000,
      "last_video_id": "7566208722012278051",
      "created_at": 1737619200000,
      "updated_at": 1737619200000,
      "total_videos": 42,
      "downloaded_count": 15
    }
  ]
}
```

#### POST /api/subscriptions
创建订阅

**请求：**
```json
{
  "sec_user_id": "MS4wLjABAAAA...",
  "syncInterval": 60,
  "timeRange": "one-month",
  "minDiggCount": 1000,
  "autoDownload": true
}
```

**响应：**
```json
{
  "success": true,
  "data": { /* 订阅对象 */ }
}
```

#### PATCH /api/subscriptions/[id]
更新订阅配置

**请求：**
```json
{
  "enabled": true,
  "syncInterval": 120,
  "timeRange": "half-year",
  "minDiggCount": 2000,
  "autoDownload": false
}
```

#### DELETE /api/subscriptions?id=[id]
删除订阅

#### POST /api/subscriptions/[id]/sync
手动同步订阅

**响应：**
```json
{
  "success": true,
  "data": {
    "newVideos": [ /* 视频数组 */ ],
    "totalFetched": 25,
    "filteredByLikes": 3
  }
}
```

### 调度管理

#### GET /api/schedules
获取调度任务列表

#### POST /api/schedules
创建调度任务

#### GET /api/schedules/logs?limit=50&offset=0
获取调度日志

#### POST /api/schedules/control
控制调度器

**请求：**
```json
{
  "action": "start" // 或 "stop"
}
```

### 设置管理

#### GET /api/settings
获取所有设置

#### PATCH /api/settings
更新设置

**请求：**
```json
{
  "download_dir": "/path/to/downloads",
  "api_base_url": "http://192.168.60.20:5555",
  "folderNameFormat": "{uid}_{nickname}_{type}",
  "fileNameFormat": "{desc}_{id}",
  "mark": "",
  "showImages": "true"
}
```

### 下载管理

#### GET /api/downloads
获取所有下载任务

#### POST /api/downloads
创建下载任务

#### POST /api/downloads/start?taskId=[id]
开始下载任务

### 视频管理

#### POST /api/videos
获取账号视频列表

**请求：**
```json
{
  "sec_user_id": "MS4wLjABAAAA...",
  "cursor": 0,
  "count": 18,
  "earliest": "2025/01/01",
  "latest": "2026/01/23"
}
```

## 核心业务流程

### 1. 添加订阅流程

```
用户输入 sec_user_id 和配置
  ↓
调用 POST /api/subscriptions
  ↓
调用 TikTokDownloader API 获取账号信息
  ↓
保存订阅到 subscriptions 表
  ↓
返回订阅信息
```

### 2. 自动同步流程

```
node-cron 调度器每 10 分钟运行一次
  ↓
遍历所有 enabled=1 的订阅
  ↓
检查是否到达同步时间 (now >= last_sync_time + sync_interval)
  ↓
调用 POST /api/subscriptions/[id]/sync
  ↓
增量同步算法（见下）
  ↓
记录日志到 schedule_logs 表
```

### 3. 增量同步算法

```
读取订阅配置（lastVideoId, timeRange, minDiggCount, autoDownload）
  ↓
初始化: allVideos = [], foundLast = false
  ↓
调用 TikTokDownloader API 一次性获取所有视频（不使用分页）
  - 只传递 sec_user_id 和时间范围参数
  - 不传递 cursor 和 count 参数
  - API 返回该账号在时间范围内的所有视频
  ↓
遍历返回的视频:
    检查是否已下载（status='completed' 且文件存在）:
        如果已下载，跳过该视频
    ↓
    if (video.id === lastVideoId):
        foundLast = true
        break
    ↓
    allVideos.push(video)
  ↓
应用过滤规则（minDiggCount）
  ↓
如果 autoDownload=1，直接创建下载任务到 download_tasks 表
  ↓
  处理 downloads 字段（可能是数组或逗号分隔字符串）:
    - 存储所有 URL 到 all_download_urls（逗号分隔）
    - 选择第一个 URL 作为 download_url
  ↓
  使用 ON CONFLICT DO UPDATE 更新已存在的任务:
    - 更新 type、download_url、all_download_urls 等字段
  ↓
  异步触发下载: POST /api/downloads/start
  ↓
检查已完成任务的文件是否存在:
  - 如果文件丢失，重置状态为 'downloading'
  - 异步触发重新下载
  ↓
更新订阅: lastVideoId, lastSyncTime, totalVideos, downloadedCount
  ↓
创建同步历史记录到 sync_histories 表
```

**关键特性**：
- **无分页模式**：一次性获取所有视频，不使用 cursor 和 count 参数
- **图集支持**：`type='图集'` 的任务会下载多张图片（从 `all_download_urls` 解析）
- **增量同步**：通过 `last_video_id` 避免重复处理
- **跳过已下载**：检查文件是否存在，避免重复下载
- **文件完整性检查**：自动重新下载文件丢失的任务
- **ON CONFLICT 策略**：使用 upsert 更新已存在任务的元数据

### 4. 手动同步流程

```
用户点击"立即同步"按钮
  ↓
调用 POST /api/subscriptions/[id]/sync
  ↓
执行增量同步算法
  ↓
返回同步结果（新视频数、过滤数）
  ↓
刷新订阅列表显示
```

### 5. 下载流程

**视频下载**：
```
POST /api/downloads/start { task_id }
  ↓
查询任务信息（从 download_tasks 表）
  ↓
检查 type 字段:
  - 如果是 '视频': 下载单个 MP4 文件
  - 如果是 '图集': 下载多张图片
  ↓
创建目标目录（根据 folderNameFormat）
  ↓
下载文件（使用 axios stream）
  ↓
更新进度到数据库
  ↓
完成后更新 status='completed', file_path, file_size
  ↓
添加文件监听（file-watcher）
```

**图集下载特殊处理**：
- 解析 `all_download_urls`（逗号分隔）
- 依次下载每张图片
- 文件命名：`{fileNamePrefix}_1.jpeg`, `{fileNamePrefix}_2.jpeg`, ...
- 更新进度：`Math.round((imageIndex / totalImages) * 100)`
- 保存第一张图片路径到 `file_path`
- 累计所有图片大小到 `file_size`

## 调度器实现

**文件：** lib/scheduler.ts

**Cron 表达式：** `*/10 * * * *` (每 10 分钟)

**核心逻辑：**
```typescript
import cron from 'node-cron';
import db from './db';
import axios from 'axios';

let schedulerTask: cron.ScheduledTask | null = null;

export function startScheduler() {
  if (schedulerTask) {
    console.log('调度器已在运行');
    return;
  }

  schedulerTask = cron.schedule('*/10 * * * *', async () => {
    console.log('开始检查订阅同步...');

    const now = Date.now();
    const subscriptions = db.prepare(
      'SELECT * FROM subscriptions WHERE enabled = 1'
    ).all();

    for (const sub of subscriptions) {
      const nextSyncTime = (sub.last_sync_time || sub.created_at) +
                           sub.sync_interval * 60 * 1000;

      if (now >= nextSyncTime) {
        console.log(`同步订阅: ${sub.nickname}`);

        try {
          await axios.post(
            `http://localhost:3000/api/subscriptions/${sub.id}/sync`
          );
          console.log(`✓ 同步成功: ${sub.nickname}`);
        } catch (error: any) {
          console.error(`✗ 同步失败: ${sub.nickname}`, error.message);
        }

        // 延迟 2 秒，避免 API 频率限制
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  });

  console.log('✓ 订阅同步调度器已启动');
}

export function stopScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log('✓ 调度器已停止');
  }
}
```

**启动方式：**
调度器在 `lib/db.ts` 中自动启动（应用初始化后 5 秒）：

```typescript
if (typeof window === 'undefined') {
    import('./scheduler').then(({ startScheduler }) => {
        setTimeout(() => {
            console.log('启动订阅同步调度器...');
            startScheduler();
        }, 5000);
    });
}
```

## TikTokDownloader API 使用

### 请求格式
```typescript
POST /douyin/{endpoint}
Headers: {
  "Content-Type": "application/json",
  "token": "..." // 可选
}
Body: { ...params }
```

### 响应格式
所有接口统一响应格式：
```typescript
{
  "message": "获取数据成功！",
  "data": ...,  // 列表接口返回数组，详情接口返回对象
  "params": {...},
  "time": "2026-01-23 17:00:00"
}
```

### 主要端点

#### 1. 获取账号作品
```typescript
POST /douyin/account
{
  "sec_user_id": "MS4wLjABAAAA...",
  "cursor": 0,
  "count": 18,
  "tab": "post",
  "cookie": "",
  "source": false
}
```

#### 2. 获取作品详情
```typescript
POST /douyin/detail
{
  "detail_id": "7566208722012278051",
  "cookie": "",
  "source": false
}
```

## 开发注意事项

### 1. API 响应处理
判断成功的方式：
```typescript
if (response.message && response.message.includes('成功')) {
  // 处理 response.data
}
```

### 2. sec_user_id 获取方式
访问抖音用户主页：`https://www.douyin.com/user/MS4wLjABAAAA...`
URL 中的 `MS4wLjABAAAA...` 就是 sec_user_id

### 3. 数据库操作
使用 better-sqlite3 同步 API：
```typescript
import db from '@/lib/db';

// 查询
const subs = db.prepare('SELECT * FROM subscriptions').all();

// 插入
db.prepare('INSERT INTO subscriptions (...) VALUES (...)').run(...);

// 更新
db.prepare('UPDATE subscriptions SET ... WHERE id = ?').run(id);

// 删除
db.prepare('DELETE FROM subscriptions WHERE id = ?').run(id);
```

### 4. 日志规范

**重要**：禁止使用 `console.log()` 和 `console.error()` 进行日志输出。

- ❌ **禁止使用** `console.log()` / `console.error()` - 缺少时间戳和日志等级
- ✅ **必须使用** Logger 工具 - 统一的日志格式，包含时间戳和日志等级

**Logger 特性**：
- 时间戳：精确到毫秒（`YYYY-MM-DD HH:mm:ss.SSS`）
- 日志等级：DEBUG、INFO、WARN、ERROR
- 可配置：通过环境变量 `LOG_LEVEL` 设置最低日志等级
- 自动路由：ERROR 使用 console.error，WARN 使用 console.warn，其他使用 console.log

**使用方法**：
```typescript
import logger from '@/lib/logger';

// 调试信息（开发环境）
logger.debug('调试信息', { data: someData });

// 一般信息（默认等级）
logger.info('操作成功', result);

// 警告信息
logger.warn('配置缺失，使用默认值');

// 错误信息
logger.error('操作失败', error);
```

**日志等级说明**：
- **DEBUG (0)**: 详细的调试信息，仅在开发环境使用
- **INFO (1)**: 一般信息，记录正常操作流程（默认等级）
- **WARN (2)**: 警告信息，不影响功能但需要注意
- **ERROR (3)**: 错误信息，操作失败或异常情况

**环境变量配置**：
```bash
# 开发环境 - 显示所有日志
LOG_LEVEL=DEBUG npm run dev

# 生产环境 - 只显示 INFO 及以上
LOG_LEVEL=INFO npm run start

# 只显示错误
LOG_LEVEL=ERROR npm run start
```

**日志输出示例**：
```
[2026-01-24 15:30:45.123] [INFO] 开始同步订阅: sub_123
[2026-01-24 15:30:45.456] [INFO] API 请求地址: http://192.168.60.20:5555/douyin/account
[2026-01-24 15:30:46.789] [INFO] 返回视频数量: 25
[2026-01-24 15:30:47.012] [ERROR] 同步失败: 网络超时
```

### 5. 用户通知规范

**重要**：禁止使用 `alert()` 进行用户通知。

- ❌ **禁止使用** `alert()` - 阻塞式弹窗，用户体验差
- ✅ **必须使用** Toast 通知组件 - 左下角非阻塞式通知

**Toast 使用方法**：

```typescript
import { useToast, ToastContainer } from '@/components/Toast';

function MyComponent() {
  const { toasts, toast, removeToast } = useToast();

  // 成功通知
  toast.success('操作成功！');

  // 错误通知
  toast.error('操作失败：错误信息');

  // 信息通知
  toast.info('提示信息');

  // 警告通知
  toast.warning('警告信息');

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {/* 其他内容 */}
    </div>
  );
}
```

**Toast 特性**：
- 位置：左下角（`bottom-4 left-4`）
- 自动消失：默认 3 秒
- 可手动关闭：点击 × 按钮
- 支持多个通知同时显示
- 类型：success（绿色）、error（红色）、info（蓝色）、warning（黄色）

### 5. 错误处理
- 所有 API 调用使用 try-catch 捕获错误
- 错误信息通过 `{ success: false, error: "..." }` 返回
- 前端使用 Toast 通知显示错误（不使用 alert）

### 6. 文件命名
下载文件时清理非法字符：
```typescript
filename.replace(/[/\\?%*:|"<>]/g, '_')
```

## 配置说明

### 端口配置
- **应用访问地址**: http://localhost:3000
- **API 访问地址**: http://localhost:3000/api/*
- **TikTokDownloader**: http://192.168.60.20:5555

### 启动流程
1. 运行 `npm run dev`
2. Next.js 启动在 3000 端口
3. 数据库自动初始化（lib/db.ts）
4. 5 秒后调度器自动启动（lib/scheduler.ts）

### 故障排查
**问题：** 调度器未运行
**解决：** 检查 Next.js 日志，确认 "启动订阅同步调度器..." 消息

**问题：** 数据库锁定
**解决：** SQLite 使用 WAL 模式，支持并发读写

## 自动化测试

项目包含完整的自动化测试套件，位于 `test/` 目录。

### 测试类型

1. **API 测试** (`test/api.test.cjs`)
   - 测试所有 API 端点
   - 验证物理删除功能
   - 运行：`npm run test:api`

2. **基础 Selenium 测试** (`test/selenium.test.cjs`)
   - 页面加载测试
   - 导航功能测试
   - 控制台错误检查
   - 运行：`npm test`

3. **高级 Selenium 测试** (`test/selenium.advanced.cjs`)
   - 用户交互测试
   - 响应式设计测试
   - 性能测试
   - 物理删除 UI 测试
   - 运行：`npm run test:advanced`

### 测试覆盖的关键功能

- ✅ 订阅管理（创建、更新、删除、同步）
- ✅ 下载任务管理（创建、启动、删除）
- ✅ **物理删除**（永久删除任务和文件）
- ✅ 图集下载（多图片下载）
- ✅ 视频下载（单文件下载）
- ✅ 设置管理
- ✅ 页面导航和响应式设计

### 运行所有测试

```bash
npm run test:all  # 依次运行 API、基础、高级测试
```

测试会自动生成截图到 `screenshots/` 目录，便于调试和验证。

## 关键实现细节

### 1. 物理删除机制

**实现位置**：
- DELETE 端点：`app/api/downloads/route.ts`

**工作原理**：
```typescript
// 删除时
// 1. 获取任务信息（用于删除文件）
const task = db.prepare('SELECT file_path FROM download_tasks WHERE id = ?').get(taskId);

// 2. 物理删除：直接从数据库删除记录
db.prepare('DELETE FROM download_tasks WHERE id = ?').run(taskId);

// 3. 可选：删除对应的文件
if (task?.file_path && fs.existsSync(task.file_path)) {
  fs.unlinkSync(task.file_path);
}
```

**特点**：
- 永久删除，无法恢复
- 可选择同时删除文件
- 简化了数据库查询逻辑

### 2. 图集 vs 视频处理

**类型识别**：
- API 返回的 `type` 字段：`'图集'` 或 `'视频'`
- 存储在 `download_tasks.type` 字段

**下载差异**：
```typescript
if (task.type === '图集') {
  // 解析 all_download_urls（逗号分隔）
  const imageUrls = task.all_download_urls.split(',');

  // 依次下载每张图片
  for (let i = 0; i < imageUrls.length; i++) {
    const imagePath = `${fileNamePrefix}_${i + 1}.jpeg`;
    // 下载并保存
  }
} else {
  // 下载单个视频文件
  const filePath = `${fileName}.mp4`;
  // 下载并保存
}
```

### 3. ON CONFLICT 策略

同步时使用 upsert 模式更新已存在的任务：

```typescript
INSERT INTO download_tasks (...) VALUES (...)
ON CONFLICT(video_id) DO UPDATE SET
  type = excluded.type,
  all_download_urls = excluded.all_download_urls,
  download_url = excluded.download_url,
  digg_count = excluded.digg_count,
  comment_count = excluded.comment_count,
  share_count = excluded.share_count
```

这确保：
- 元数据始终是最新的
- 已存在的任务会更新统计数据
- 不会创建重复的任务

## 沟通语言

请使用中文回答所有问题和进行代码注释。

## 文档管理规则

**重要**：项目中只保留以下两个文档文件：
- `README.md` - 项目说明文档
- `CLAUDE.md` - Claude Code 工作指南（本文件）

**严格禁止**：
- ❌ 不要创建任何总结文档（如 SUMMARY.md、CHANGELOG.md 等）
- ❌ 不要创建功能说明文档（如 FEATURE_*.md、*_GUIDE.md 等）
- ❌ 不要创建实现细节文档（如 IMPLEMENTATION.md、ARCHITECTURE.md 等）
- ❌ 完成任务后不要生成任何形式的总结或说明文件

**允许的操作**：
- ✅ 更新 README.md 中的项目说明
- ✅ 更新 CLAUDE.md 中的开发指南
- ✅ 在代码中添加必要的注释

所有实现细节、功能说明、变更记录都应该通过代码注释和 Git 提交信息来记录，而不是创建额外的文档文件。
