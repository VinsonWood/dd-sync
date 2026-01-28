# dd视频同步 - 视频同步工具

类似 [bili-sync](https://github.com/amtoaer/bili-sync) 的视频同步工具，基于 Next.js 全栈架构。

## 功能特性

- ✅ **订阅管理**：订阅账号并自动同步最新作品
- ✅ **自动调度**：每 10 分钟自动检查并同步所有启用的订阅
- ✅ **时间范围过滤**：支持全部、最近半年、最近1月三种时间范围
- ✅ **点赞数过滤**：可设置最低点赞数，只下载热门作品
- ✅ **服务端下载**：在服务器端下载视频，避免浏览器 CORS 限制
- ✅ **图集支持**：自动识别并下载图集类型的作品
- ✅ **数据持久化**：使用 SQLite 数据库保存所有数据
- ✅ **自定义设置**：配置下载目录、文件命名格式、API 地址等
- ✅ **深色模式**：支持浅色/深色/跟随系统三种主题模式
- ✅ **导入导出**：支持订阅配置的批量导入导出（JSON 格式）
- ✅ **移动端 App**：支持打包成 Android 和 iOS 原生应用

## 技术栈

### 前端
- **Next.js 14** - React 全栈框架
- **React 19** - UI 框架
- **Tailwind CSS** - 样式框架
- **TypeScript** - 类型安全

### 后端
- **Next.js API Routes** - 服务端 API
- **Better-SQLite3** - SQLite 数据库
- **Node-cron** - 定时任务调度
- **Axios** - HTTP 客户端

### 外部依赖
- **TikTokDownloader API** - 数据获取接口

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 TikTokDownloader API

确保 TikTokDownloader API 服务正在运行：
- 默认地址：http://192.168.60.20:5555
- API 文档：http://192.168.60.20:5555/docs

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 生产环境部署

使用 Docker Compose 部署（推荐）。

**docker-compose.yml**

```yaml
version: "3.8"

services:
    dd-sync:
        build: .
        container_name: dd-sync
        ports:
            - "3088:3000"
        volumes:
            - ./data:/app/data
            - ./downloads:/app/downloads
        environment:
            - NODE_ENV=production
            - USER_UID=${USER_UID:-1001}
            - USER_GID=${USER_GID:-1001}
            - API_BASE_URL=http://192.168.60.20:5555
        restart: unless-stopped
```

**.env 文件**

```bash
# 用户 UID/GID（避免文件权限问题）
USER_UID=1000
USER_GID=1000

# API 地址
API_BASE_URL=http://192.168.60.20:5555
```

**启动服务**

```bash
docker-compose up -d
```

访问 http://localhost:3088

## 📱 移动端 App 构建

本项目支持打包成 Android 和 iOS 原生应用。详细说明请查看 [MOBILE.md](./MOBILE.md)。

### 快速开始

```bash
# 构建并打开 Android Studio
npm run mobile:android

# 构建并打开 Xcode (macOS)
npm run mobile:ios
```

### 可用命令

| 命令 | 说明 |
|------|------|
| `npm run mobile:build` | 构建移动端静态文件 |
| `npm run mobile:sync` | 构建并同步到原生项目 |
| `npm run mobile:android` | 构建、同步并打开 Android Studio |
| `npm run mobile:ios` | 构建、同步并打开 Xcode |

更多详细信息请查看 [移动端构建指南](./MOBILE.md)。

### CI/CD 自动构建

支持通过 GitHub Actions 自动构建 APK 和 IPA：

```bash
# 推送 tag 触发自动构建和发布
git tag v1.0.0
git push origin v1.0.0
```

详细配置请查看 [CI/CD 指南](./CI-CD.md)。

## 使用指南

### 订阅管理（推荐）

1. 进入"订阅管理"页面
2. 点击"添加订阅"
3. 输入 sec_user_id
4. 配置订阅选项：
   - **时间范围**：选择同步的时间范围（全部/最近半年/最近1月）
   - **最低点赞数**：可选，只同步点赞数达到此值的作品
   - **自动下载**：是否自动下载新发现的作品
5. 点击"确定"添加订阅
6. 调度器会每 10 分钟自动检查并同步所有启用的订阅

**订阅功能说明**：
- 调度器每 10 分钟运行一次，自动同步所有启用的订阅
- 增量同步：只获取上次同步后的新作品，避免重复
- 自动下载：开启后会自动将新作品添加到下载队列并开始下载
- 可随时手动点击"立即同步"按钮触发同步

### 配置设置

在"设置"页面可以配置：

- **下载目录**：视频保存路径（默认：项目根目录/downloads）
- **API 地址**：TikTokDownloader API 地址
- **文件夹命名格式**：支持变量 {uid}、{nickname}、{type}
- **文件命名格式**：支持变量 {desc}、{id}、{create_time} 等
- **显示作品封面图片**：是否在页面中显示封面和图片

## 项目结构

```
dd-sync/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── subscriptions/ # 订阅管理 API
│   │   ├── schedules/     # 调度管理 API
│   │   ├── videos/        # 视频相关 API
│   │   ├── downloads/     # 下载相关 API
│   │   └── settings/      # 设置相关 API
│   ├── subscriptions/     # 订阅管理页面
│   ├── schedules/         # 调度日志页面
│   ├── downloads/         # 下载管理页面
│   ├── settings/          # 设置页面
│   ├── page.tsx           # 首页
│   ├── layout.tsx         # 全局布局
│   └── globals.css        # 全局样式
├── lib/                   # 工具库
│   ├── db.ts              # 数据库初始化
│   ├── scheduler.ts       # 调度器
│   ├── sync-subscription.ts # 订阅同步逻辑
│   ├── naming.ts          # 文件命名工具
│   └── logger.ts          # 日志工具
├── components/            # React 组件
│   ├── Sidebar.tsx        # 侧边栏导航
│   └── Toast.tsx          # 通知组件
├── data/                  # 数据目录（自动创建）
│   └── dd-sync.db         # SQLite 数据库
├── downloads/             # 下载目录（自动创建）
├── next.config.js         # Next.js 配置
├── tailwind.config.js     # Tailwind CSS 配置
└── package.json           # 项目配置
```


### Q: 如何查看调度日志？
A: 在"调度日志"页面可以查看所有调度任务的执行记录和详细信息。

### Q: 下载失败怎么办？
A: 在"下载管理"页面点击"重试"按钮，或检查下载链接是否有效。

### Q: 如何修改下载目录？
A: 在"设置"页面修改"下载目录"配置，必须是服务器上的绝对路径。

### Q: 为什么获取不到视频？
A: 检查 TikTokDownloader API 是否正常运行，以及 sec_user_id 是否正确。

### Q: 数据库文件在哪里？
A: 数据库文件位于项目根目录的 `data/dd-sync.db`。

### Q: 如何自定义文件命名？
A: 在"设置"页面配置文件夹和文件命名格式，支持变量如 {uid}、{nickname}、{desc}、{id}、{create_time} 等。


## 许可证

MIT License

## 相关项目

- [TikTokDownloader](https://github.com/JoeanAmier/TikTokDownloader) - 抖音数据获取工具
- [bili-sync](https://github.com/amtoaer/bili-sync) - B站视频同步工具

---

## ⚠️ 免责声明

**本项目仅供个人学习、研究和技术交流使用，严禁用于任何商业用途。**

### 重要提示

1. **数据来源**
   - 本项目不存储、不托管任何视频或图片数据
   - 所有内容均通过第三方 API（TikTokDownloader）获取
   - 本项目仅作为技术工具，不对第三方 API 的合法性负责

2. **版权声明**
   - 使用本项目下载的所有内容，版权归原作者所有
   - 下载的内容仅供个人学习研究，不得用于商业用途
   - 不得将下载内容进行二次传播、售卖或用于其他侵权行为
   - 请在下载后 24 小时内删除，如需长期保存请购买正版

3. **法律责任**
   - 用户使用本项目所产生的一切法律责任，由用户本人承担
   - 本项目开发者不对用户的任何违法违规行为负责
   - 本项目不鼓励、不支持任何侵犯版权的行为
   - 使用本项目即表示您已阅读并同意本免责声明

4. **使用限制**
   - 请遵守《中华人民共和国著作权法》及相关法律法规
   - 请遵守内容平台的用户协议和服务条款
   - 请尊重内容创作者的劳动成果和知识产权
   - 不得使用本项目进行大规模爬取、数据挖掘等行为
   - 不得将本项目用于任何违法违规用途

5. **侵权处理**
   - 如发现本项目侵犯了您的合法权益，请及时联系删除
   - 我们将在收到通知后尽快处理相关内容
   - 联系方式：请通过 GitHub Issues 提交

### 风险提示

- 使用本项目可能违反目标平台的服务条款，可能导致账号被封禁
- 频繁请求可能触发平台的反爬虫机制
- 下载的内容可能存在版权风险，请谨慎使用
- 本项目不保证服务的稳定性和可用性

**再次强调：本项目仅供学习研究，请勿用于任何商业或非法用途！**
