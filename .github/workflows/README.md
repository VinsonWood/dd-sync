# GitHub Actions 自动推送到 Docker Hub

本项目使用 GitHub Actions 自动构建并推送 Docker 镜像到 Docker Hub。

## 配置步骤

### 1. 在 GitHub 仓库中设置 Secrets

进入你的 GitHub 仓库：`Settings` → `Secrets and variables` → `Actions` → `New repository secret`

添加以下两个 Secrets：

| Name | Value | 说明 |
|------|-------|------|
| `DOCKER_USERNAME` | 你的 Docker Hub 用户名 | 例如：vinsonwood |
| `DOCKER_PASSWORD` | 你的 Docker Hub 密码或 Token | 建议使用 Access Token |

**如何创建 Docker Hub Access Token：**
1. 登录 [Docker Hub](https://hub.docker.com/)
2. 点击右上角头像 → `Account Settings`
3. 选择 `Security` → `New Access Token`
4. 输入 Token 名称（如 `github-actions`）
5. 复制生成的 Token（只显示一次）
6. 将 Token 作为 `DOCKER_PASSWORD` 添加到 GitHub Secrets

### 2. 触发方式

GitHub Actions 会在以下情况自动运行：

#### 自动触发

1. **推送到 main 分支**
   ```bash
   git push origin main
   ```
   - 自动构建并推送 `latest` 标签

2. **创建版本标签**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
   - 自动构建并推送多个标签：
     - `v1.0.0`
     - `1.0.0`
     - `1.0`
     - `1`
     - `latest`

3. **Pull Request**
   - 只构建，不推送（用于测试）

#### 手动触发

在 GitHub 仓库页面：
1. 点击 `Actions` 标签
2. 选择 `Build and Push to Docker Hub` workflow
3. 点击 `Run workflow` 按钮
4. 选择分支并运行

## 镜像标签规则

| 触发方式 | 生成的标签 |
|---------|-----------|
| 推送到 main 分支 | `latest`, `main` |
| 推送标签 v1.0.0 | `v1.0.0`, `1.0.0`, `1.0`, `1`, `latest` |
| 推送标签 v2.1.3 | `v2.1.3`, `2.1.3`, `2.1`, `2`, `latest` |
| Pull Request #123 | `pr-123` (不推送) |

## 支持的平台

GitHub Actions 会自动构建多平台镜像：
- `linux/amd64` - x86_64 架构（常规服务器、PC）
- `linux/arm64` - ARM64 架构（树莓派、Apple Silicon）

## 查看构建状态

### 在 GitHub 上查看

1. 进入仓库的 `Actions` 标签
2. 查看最近的 workflow 运行记录
3. 点击具体的运行查看详细日志

### 添加状态徽章

在 `README.md` 中添加构建状态徽章：

```markdown
[![Docker Build](https://github.com/VinsonWood/dd-sync/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/VinsonWood/dd-sync/actions/workflows/docker-publish.yml)
```

## 使用发布的镜像

### 拉取最新版本

```bash
docker pull vinsonwood/dd-sync:latest
```

### 拉取指定版本

```bash
docker pull vinsonwood/dd-sync:1.0.0
```

### 使用 docker-compose

```yaml
version: "3.8"

services:
  dd-sync:
    image: vinsonwood/dd-sync:latest
    container_name: dd-sync
    ports:
      - "3088:3000"
    volumes:
      - ./data:/app/data
      - ./downloads:/app/downloads
    environment:
      - USER_UID=${USER_UID:-1000}
      - USER_GID=${USER_GID:-1000}
      - API_BASE_URL=${API_BASE_URL:-http://192.168.60.20:5555}
    restart: unless-stopped
```

## 发布新版本的流程

### 方式一：使用 Git 标签（推荐）

```bash
# 1. 确保代码已提交
git add .
git commit -m "feat: 添加新功能"

# 2. 创建版本标签
git tag v1.0.0

# 3. 推送代码和标签
git push origin main
git push origin v1.0.0

# 4. GitHub Actions 自动构建并推送镜像
```

### 方式二：只推送代码

```bash
# 推送到 main 分支
git push origin main

# 自动构建并推送 latest 标签
```

## 优势

相比手动推送，GitHub Actions 有以下优势：

1. ✅ **自动化** - 推送代码即自动构建和发布
2. ✅ **多平台** - 自动构建 amd64 和 arm64 两种架构
3. ✅ **版本管理** - 自动根据 Git 标签生成版本号
4. ✅ **缓存优化** - 使用 GitHub Actions 缓存加速构建
5. ✅ **免费** - GitHub Actions 对公开仓库完全免费
6. ✅ **可追溯** - 每次构建都有完整的日志记录
7. ✅ **安全** - 密码存储在 GitHub Secrets 中，不会泄露

## 故障排查

### 问题：构建失败

**查看日志：**
1. 进入 GitHub 仓库的 `Actions` 标签
2. 点击失败的 workflow
3. 查看详细错误信息

**常见原因：**
- Docker Hub 登录失败 → 检查 Secrets 是否正确
- 构建超时 → 检查 Dockerfile 是否有问题
- 网络问题 → 重新运行 workflow

### 问题：Secrets 未设置

```
Error: Username and password required
```

**解决方法：** 按照上面的步骤设置 `DOCKER_USERNAME` 和 `DOCKER_PASSWORD`

### 问题：权限不足

```
Error: denied: requested access to the resource is denied
```

**解决方法：** 
- 确认 Docker Hub 用户名正确
- 确认 Access Token 有推送权限
- 确认仓库名称正确

## 本地测试

如果想在本地测试 GitHub Actions workflow：

```bash
# 安装 act 工具
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# 运行 workflow
act -s DOCKER_USERNAME=vinsonwood -s DOCKER_PASSWORD=your-token
```

## 参考资料

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Docker Hub 文档](https://docs.docker.com/docker-hub/)
- [docker/build-push-action](https://github.com/docker/build-push-action)
- [docker/metadata-action](https://github.com/docker/metadata-action)
