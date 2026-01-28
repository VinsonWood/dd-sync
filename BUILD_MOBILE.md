# 📱 移动端构建完整指南

## 当前状态

✅ Capacitor 已配置完成
✅ Android 项目已生成
✅ 代码已准备就绪

❌ 需要安装 Android SDK 才能构建 APK

## 架构说明

**客户端-服务器模式**

```
┌─────────────────────┐
│   移动应用 (APK)    │
│   - 只包含 UI       │
│   - 连接到服务器    │
└──────────┬──────────┘
           │ HTTP
           ↓
┌─────────────────────┐
│   服务器            │
│   - Next.js 应用    │
│   - SQLite 数据库   │
│   - 下载管理        │
└─────────────────────┘
```

## 方案选择

### 方案 1：本地构建 APK（推荐用于开发）

**步骤：**

1. **安装 Android Studio**
   ```bash
   # Arch Linux
   yay -S android-studio
   
   # 或下载安装包
   # https://developer.android.com/studio
   ```

2. **配置 Android SDK**
   - 打开 Android Studio
   - Tools → SDK Manager
   - 安装 Android SDK Platform 33 或更高
   - 安装 Android SDK Build-Tools
   - 安装 Android SDK Command-line Tools

3. **设置环境变量**
   ```bash
   # 添加到 ~/.bashrc 或 ~/.zshrc
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
   
   # 重新加载配置
   source ~/.bashrc  # 或 source ~/.zshrc
   ```

4. **创建 local.properties**
   ```bash
   cd /home/varshonwood/code/dd-sync/android
   echo "sdk.dir=$HOME/Android/Sdk" > local.properties
   ```

5. **构建 APK**
   ```bash
   cd /home/varshonwood/code/dd-sync/android
   ./gradlew assembleRelease
   ```

6. **签名 APK（可选）**
   ```bash
   # 使用你已创建的 keystore
   cd /home/varshonwood/code/dd-sync/android
   ./gradlew assembleRelease \
     -Pandroid.injected.signing.store.file=~/dd-sync.keystore \
     -Pandroid.injected.signing.store.password=你的密码 \
     -Pandroid.injected.signing.key.alias=dd-sync \
     -Pandroid.injected.signing.key.password=你的密码
   ```

7. **APK 位置**
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

### 方案 2：使用 GitHub Actions 自动构建（推荐用于生产）

**优点：**
- 无需本地安装 Android SDK
- 自动化构建和发布
- 支持代码签名

**步骤：**

1. **配置 GitHub Secrets**
   
   在 GitHub 仓库设置中添加：
   - `ANDROID_KEYSTORE_BASE64`: keystore 文件的 Base64 编码
   - `ANDROID_KEYSTORE_PASSWORD`: keystore 密码
   - `ANDROID_KEY_ALIAS`: dd-sync
   - `ANDROID_KEY_PASSWORD`: 密钥密码

   ```bash
   # 生成 Base64
   base64 -i ~/dd-sync.keystore -o ~/keystore.base64.txt
   cat ~/keystore.base64.txt
   ```

2. **推送代码并打标签**
   ```bash
   git add .
   git commit -m "feat: 配置移动端客户端-服务器模式"
   git tag v0.0.4
   git push origin main
   git push origin v0.0.4
   ```

3. **GitHub Actions 自动构建**
   - 推送标签后自动触发构建
   - 构建完成后自动创建 Release
   - 下载 APK 文件

### 方案 3：使用 Docker 构建（适合 CI/CD）

**创建 Dockerfile.android：**
```dockerfile
FROM openjdk:17-slim

# 安装依赖
RUN apt-get update && apt-get install -y \
    wget unzip git

# 安装 Android SDK
ENV ANDROID_HOME=/opt/android-sdk
RUN mkdir -p ${ANDROID_HOME}/cmdline-tools && \
    cd ${ANDROID_HOME}/cmdline-tools && \
    wget https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip && \
    unzip commandlinetools-linux-9477386_latest.zip && \
    rm commandlinetools-linux-9477386_latest.zip

ENV PATH=${PATH}:${ANDROID_HOME}/cmdline-tools/cmdline-tools/bin:${ANDROID_HOME}/platform-tools

# 接受许可并安装 SDK
RUN yes | sdkmanager --licenses && \
    sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"

WORKDIR /app
```

**构建命令：**
```bash
docker build -f Dockerfile.android -t dd-sync-android .
docker run -v $(pwd):/app dd-sync-android ./gradlew assembleRelease
```

## 配置服务器地址

在构建前，修改 `capacitor.config.ts` 中的服务器地址：

```typescript
server: {
  url: 'http://你的服务器IP:3000',  // 修改这里
  cleartext: true,
  androidScheme: 'http'
}
```

**注意事项：**
- 使用局域网 IP（如 192.168.x.x）用于本地测试
- 使用公网 IP 或域名用于生产环境
- 确保服务器防火墙允许 3000 端口访问
- 生产环境建议使用 HTTPS

## 测试移动应用

1. **启动服务器**
   ```bash
   cd /home/varshonwood/code/dd-sync
   npm run build
   npm run start
   ```

2. **安装 APK 到手机**
   ```bash
   # 通过 USB 连接手机，启用 USB 调试
   adb install android/app/build/outputs/apk/release/app-release.apk
   ```

3. **验证连接**
   - 打开应用
   - 检查是否能正常加载页面
   - 测试订阅、下载等功能

## 常见问题

### Q1: 应用无法连接到服务器

**解决方案：**
- 检查服务器是否运行：`curl http://服务器IP:3000`
- 检查防火墙设置
- 确保手机和服务器在同一网络（局域网测试）
- 检查 `capacitor.config.ts` 中的 URL 配置

### Q2: 构建失败：SDK location not found

**解决方案：**
- 安装 Android Studio 和 SDK
- 设置 ANDROID_HOME 环境变量
- 创建 `android/local.properties` 文件

### Q3: 签名失败

**解决方案：**
- 检查 keystore 文件路径
- 确认密码正确
- 确认 alias 名称正确

### Q4: 应用闪退

**解决方案：**
- 检查 Android 日志：`adb logcat | grep dd-sync`
- 确认服务器 URL 正确
- 检查网络权限配置

## 下一步

1. ✅ 选择构建方案（推荐方案 2：GitHub Actions）
2. ⬜ 配置服务器地址
3. ⬜ 构建 APK
4. ⬜ 测试应用
5. ⬜ 发布到应用商店（可选）

## 相关文档

- [MOBILE.md](./MOBILE.md) - 详细的移动端开发指南
- [CI-CD.md](./CI-CD.md) - CI/CD 配置指南
- [Capacitor 官方文档](https://capacitorjs.com/docs)
