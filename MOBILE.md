# 📱 移动端 App 构建指南

本项目已集成 Capacitor，可以将 Web 应用打包成原生 Android 和 iOS App。

## ⚠️ 重要说明

**架构模式：客户端-服务器模式**

- 移动应用作为**客户端**，连接到运行中的服务器
- 服务器需要单独部署（本地或远程）
- 移动应用不包含后端逻辑和数据库
- 需要在 `capacitor.config.ts` 中配置服务器地址

**配置服务器地址：**
```typescript
// capacitor.config.ts
server: {
  url: 'http://192.168.60.20:3000', // 修改为你的服务器地址
  cleartext: true,
  androidScheme: 'http'
}
```

## 📋 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [构建流程](#构建流程)
- [开发调试](#开发调试)
- [发布打包](#发布打包)
- [CI/CD 自动构建](#cicd-自动构建)
- [常见问题](#常见问题)

## 🔧 环境要求

### Android 开发环境

1. **安装 Android Studio**
   - 下载地址: https://developer.android.com/studio
   - 安装 Android SDK (API 33 或更高)
   - 配置 ANDROID_HOME 环境变量

2. **配置环境变量** (Linux/macOS)
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

3. **验证安装**
   ```bash
   adb --version
   ```

### iOS 开发环境 (仅 macOS)

1. **安装 Xcode**
   - 从 App Store 安装 Xcode
   - 安装 Command Line Tools:
     ```bash
     xcode-select --install
     ```

2. **安装 CocoaPods**
   ```bash
   sudo gem install cocoapods
   ```

3. **验证安装**
   ```bash
   xcodebuild -version
   pod --version
   ```

## 🚀 快速开始

### 1. 构建并打开 Android Studio

```bash
npm run mobile:android
```

这个命令会：
1. 使用移动端配置构建 Next.js 项目
2. 同步代码到 Android 项目
3. 打开 Android Studio

### 2. 构建并打开 Xcode (macOS)

```bash
npm run mobile:ios
```

这个命令会：
1. 使用移动端配置构建 Next.js 项目
2. 同步代码到 iOS 项目
3. 打开 Xcode

## 🔨 构建流程

### 完整构建步骤

```bash
# 1. 使用移动端配置构建 Next.js
npm run mobile:build

# 2. 同步代码到原生项目
npx cap sync

# 3. 打开原生 IDE
npx cap open android  # Android
npx cap open ios      # iOS
```

### 快捷命令

| 命令 | 说明 |
|------|------|
| `npm run mobile:build` | 构建移动端静态文件 |
| `npm run mobile:sync` | 构建并同步到原生项目 |
| `npm run mobile:android` | 构建、同步并打开 Android Studio |
| `npm run mobile:ios` | 构建、同步并打开 Xcode |
| `npm run mobile:run:android` | 构建、同步并运行到 Android 设备 |
| `npm run mobile:run:ios` | 构建、同步并运行到 iOS 设备 |

## 🐛 开发调试

### 使用本地开发服务器

在开发阶段，可以让 App 连接到本地开发服务器，实现热重载：

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **修改 capacitor.config.ts**
   ```typescript
   server: {
     url: 'http://192.168.1.100:3000',  // 替换为你的本机 IP
     cleartext: true
   }
   ```

3. **同步并运行**
   ```bash
   npx cap sync
   npx cap run android  # 或 ios
   ```

4. **调试完成后记得恢复配置**
   ```typescript
   server: {
     androidScheme: 'https'
   }
   ```

### Chrome DevTools 调试 (Android)

1. 在 Android 设备上运行 App
2. 在 Chrome 浏览器打开: `chrome://inspect`
3. 找到你的设备和 WebView，点击 "inspect"

### Safari 调试 (iOS)

1. 在 iOS 设备上运行 App
2. 在 Mac 上打开 Safari
3. 菜单栏 → 开发 → [你的设备] → [你的 App]

## 📦 发布打包

### Android APK/AAB

1. **在 Android Studio 中打开项目**
   ```bash
   npm run mobile:android
   ```

2. **生成签名密钥** (首次)
   ```bash
   keytool -genkey -v -keystore dd-sync.keystore -alias dd-sync -keyalg RSA -keysize 2048 -validity 10000
   ```

3. **配置签名** (android/app/build.gradle)
   ```gradle
   android {
       signingConfigs {
           release {
               storeFile file("../../dd-sync.keystore")
               storePassword "your-password"
               keyAlias "dd-sync"
               keyPassword "your-password"
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
           }
       }
   }
   ```

4. **构建 APK**
   - Android Studio → Build → Build Bundle(s) / APK(s) → Build APK(s)
   - 或命令行:
     ```bash
     cd android
     ./gradlew assembleRelease
     ```
   - APK 位置: `android/app/build/outputs/apk/release/app-release.apk`

5. **构建 AAB** (Google Play)
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
   - AAB 位置: `android/app/build/outputs/bundle/release/app-release.aab`

### iOS IPA

1. **在 Xcode 中打开项目**
   ```bash
   npm run mobile:ios
   ```

2. **配置签名**
   - Xcode → Signing & Capabilities
   - 选择你的 Team
   - 配置 Bundle Identifier

3. **构建 Archive**
   - Xcode → Product → Archive
   - 等待构建完成

4. **导出 IPA**
   - Window → Organizer
   - 选择 Archive → Distribute App
   - 选择发布方式 (App Store / Ad Hoc / Enterprise)

## ❓ 常见问题

### 1. Android Studio 找不到 SDK

**解决方案**:
```bash
# 设置环境变量
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### 2. iOS 构建失败: CocoaPods 错误

**解决方案**:
```bash
cd ios/App
pod install --repo-update
```

### 3. 白屏或加载失败

**检查清单**:
- ✅ 确认已运行 `npm run mobile:build`
- ✅ 确认 `out/` 目录存在且有内容
- ✅ 确认已运行 `npx cap sync`
- ✅ 检查 Chrome DevTools 控制台错误

### 4. 图片无法加载

**原因**: 静态导出模式下，Next.js Image 组件需要特殊配置

**解决方案**: 已在 `next.config.mobile.js` 中配置 `images.unoptimized: true`

### 5. API 请求失败

**原因**: App 中的 API 请求需要使用完整 URL

**解决方案**: 
- 开发环境: 使用 `server.url` 配置指向本地服务器
- 生产环境: 修改 API 请求使用完整的服务器地址

### 6. 权限问题 (相机、存储等)

**Android**: 在 `android/app/src/main/AndroidManifest.xml` 添加权限
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

**iOS**: 在 `ios/App/App/Info.plist` 添加权限说明
```xml
<key>NSCameraUsageDescription</key>
<string>需要访问相机以拍摄照片</string>
```

## 🚀 CI/CD 自动构建

本项目支持通过 GitHub Actions 自动构建 APK 和 IPA。详细说明请查看 [CI-CD.md](./CI-CD.md)。

### 快速使用

1. **推送 Tag 触发构建**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **手动触发构建**:
   - 进入 GitHub 仓库 → Actions
   - 选择 "Build and Release Mobile Apps"
   - 点击 "Run workflow"
   - 输入版本号并运行

3. **下载产物**:
   - 从 Actions 页面下载 Artifacts
   - 或从 Releases 页面下载（tag 触发时）

### 配置签名 (可选)

为了生成已签名的 APK/IPA，需要在 GitHub 仓库配置 Secrets：

**Android**:
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

**iOS**:
- `IOS_CERTIFICATE_BASE64`
- `IOS_CERTIFICATE_PASSWORD`
- `IOS_PROVISIONING_PROFILE_BASE64`
- `IOS_TEAM_ID`
- `IOS_KEYCHAIN_PASSWORD`

详细配置步骤请查看 [CI-CD.md](./CI-CD.md#配置-secrets)。

## 📚 更多资源

- [Capacitor 官方文档](https://capacitorjs.com/docs)
- [Android 开发者文档](https://developer.android.com/)
- [iOS 开发者文档](https://developer.apple.com/documentation/)
- [Next.js 静态导出](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)

## 🔄 更新流程

当你修改了 Web 代码后，需要重新构建并同步：

```bash
# 快速更新
npm run mobile:sync

# 或分步执行
npm run mobile:build
npx cap sync
```

## 📝 注意事项

1. **服务器端功能限制**: 
   - 移动端 App 是纯静态应用，无法使用 Next.js 的服务器端功能
   - API 路由、数据库操作等需要部署独立的后端服务器

2. **文件路径**:
   - 使用相对路径而非绝对路径
   - 避免使用 Node.js 特定的 API

3. **性能优化**:
   - 压缩图片和资源
   - 使用懒加载
   - 减少包体积

4. **测试**:
   - 在真机上测试，模拟器可能有差异
   - 测试不同屏幕尺寸和系统版本

## 🎉 完成

现在你可以开始构建你的移动端 App 了！如有问题，请查看上述常见问题或访问官方文档。
