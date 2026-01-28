# 🚀 CI/CD 自动构建指南

本项目使用 GitHub Actions 自动构建 Android APK 和 iOS IPA。

## 📋 目录

- [工作流说明](#工作流说明)
- [配置 Secrets](#配置-secrets)
- [触发构建](#触发构建)
- [下载产物](#下载产物)
- [常见问题](#常见问题)

## 🔄 工作流说明

项目包含 3 个 GitHub Actions 工作流：

### 1. `build-android.yml` - Android 构建
- **触发条件**: 
  - 推送 tag (如 `v1.0.0`)
  - 手动触发
- **产物**: 
  - Debug APK (未签名)
  - Release APK (已签名/未签名)

### 2. `build-ios.yml` - iOS 构建
- **触发条件**: 
  - 推送 tag (如 `v1.0.0`)
  - 手动触发
- **产物**: 
  - IPA 文件 (需要配置签名)
- **注意**: 需要 macOS runner，构建时间较长

### 3. `release.yml` - 统一发布
- **触发条件**: 
  - 推送 tag (如 `v1.0.0`)
  - 手动触发（可选择构建平台）
- **功能**: 
  - 同时构建 Android 和 iOS
  - 自动创建 GitHub Release
  - 上传所有产物到 Release

## 🔐 配置 Secrets

### Android 签名配置 (可选)

如果不配置，将生成未签名的 APK。

1. **生成签名密钥**:
   ```bash
   keytool -genkey -v -keystore dd-sync.keystore \
     -alias dd-sync \
     -keyalg RSA \
     -keysize 2048 \
     -validity 10000
   ```

2. **转换为 Base64**:
   ```bash
   base64 -i dd-sync.keystore -o keystore.base64.txt
   ```

3. **在 GitHub 仓库配置 Secrets**:
   
   进入仓库 → Settings → Secrets and variables → Actions → New repository secret

   | Secret 名称 | 说明 | 获取方式 |
   |------------|------|---------|
   | `ANDROID_KEYSTORE_BASE64` | Keystore 文件的 Base64 编码 | `base64 -i dd-sync.keystore` |
   | `ANDROID_KEYSTORE_PASSWORD` | Keystore 密码 | 创建 keystore 时设置的密码 |
   | `ANDROID_KEY_ALIAS` | Key 别名 | 创建 keystore 时设置的别名 |
   | `ANDROID_KEY_PASSWORD` | Key 密码 | 创建 keystore 时设置的密码 |

### iOS 签名配置 (可选)

如果不配置，将只构建模拟器版本。

1. **导出证书**:
   - 打开 Xcode → Preferences → Accounts
   - 选择你的 Apple ID → Manage Certificates
   - 右键证书 → Export → 保存为 `.p12` 文件

2. **导出 Provisioning Profile**:
   - 访问 [Apple Developer](https://developer.apple.com/account/resources/profiles/list)
   - 下载对应的 Provisioning Profile (`.mobileprovision`)

3. **转换为 Base64**:
   ```bash
   base64 -i certificate.p12 -o certificate.base64.txt
   base64 -i profile.mobileprovision -o profile.base64.txt
   ```

4. **在 GitHub 仓库配置 Secrets**:

   | Secret 名称 | 说明 | 获取方式 |
   |------------|------|---------|
   | `IOS_CERTIFICATE_BASE64` | 证书文件的 Base64 编码 | `base64 -i certificate.p12` |
   | `IOS_CERTIFICATE_PASSWORD` | 证书密码 | 导出证书时设置的密码 |
   | `IOS_PROVISIONING_PROFILE_BASE64` | Provisioning Profile 的 Base64 编码 | `base64 -i profile.mobileprovision` |
   | `IOS_TEAM_ID` | Apple Team ID | 在 Apple Developer 账号中查看 |
   | `IOS_KEYCHAIN_PASSWORD` | 临时 Keychain 密码 | 任意设置一个强密码 |

## 🎯 触发构建

### 方式 1: 推送 Tag (推荐)

```bash
# 创建并推送 tag
git tag v1.0.0
git push origin v1.0.0
```

这将自动触发 `release.yml` 工作流，构建 Android 和 iOS，并创建 GitHub Release。

### 方式 2: 手动触发

1. 进入仓库 → Actions
2. 选择工作流:
   - `Build Android APK` - 只构建 Android
   - `Build iOS IPA` - 只构建 iOS
   - `Build and Release Mobile Apps` - 构建两个平台
3. 点击 "Run workflow"
4. 输入版本号（如 `1.0.0`）
5. 点击 "Run workflow" 确认

### 方式 3: 通过 API 触发

```bash
curl -X POST \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/YOUR_USERNAME/dd-sync/actions/workflows/release.yml/dispatches \
  -d '{"ref":"main","inputs":{"version":"1.0.0"}}'
```

## 📦 下载产物

### 从 Actions 下载

1. 进入仓库 → Actions
2. 选择对应的工作流运行记录
3. 在 "Artifacts" 部分下载:
   - `android-apk` - Android APK 文件
   - `ios-ipa` - iOS IPA 文件

### 从 Release 下载

如果是通过 tag 触发的构建，产物会自动上传到 GitHub Release：

1. 进入仓库 → Releases
2. 选择对应的版本
3. 在 "Assets" 部分下载文件

## 📝 文件命名规则

构建产物会按以下规则命名：

- **Android Debug**: `dd-sync-{version}-debug.apk`
- **Android Release (已签名)**: `dd-sync-{version}-release.apk`
- **Android Release (未签名)**: `dd-sync-{version}-release-unsigned.apk`
- **iOS**: `dd-sync-{version}.ipa`

示例：
- `dd-sync-v1.0.0-debug.apk`
- `dd-sync-v1.0.0-release.apk`
- `dd-sync-v1.0.0.ipa`

## ❓ 常见问题

### 1. Android 构建失败: Gradle 错误

**可能原因**:
- Gradle 版本不兼容
- 依赖下载失败

**解决方案**:
```bash
# 本地测试构建
cd android
./gradlew clean
./gradlew assembleDebug
```

### 2. iOS 构建失败: Code Signing 错误

**可能原因**:
- 证书或 Provisioning Profile 过期
- Team ID 不正确
- 证书密码错误

**解决方案**:
1. 检查证书是否有效
2. 重新导出证书和 Provisioning Profile
3. 确认 Secrets 配置正确

### 3. 构建成功但没有 IPA 文件

**原因**: iOS 签名 Secrets 未配置

**解决方案**: 
- 配置所有 iOS 相关的 Secrets
- 或者接受只构建模拟器版本（无法在真机安装）

### 4. Release 创建失败

**可能原因**:
- `GITHUB_TOKEN` 权限不足
- Tag 已存在

**解决方案**:
1. 检查仓库 Settings → Actions → General → Workflow permissions
2. 确保选择 "Read and write permissions"
3. 删除已存在的 tag 和 release 后重试

### 5. 构建时间过长

**正常情况**:
- Android: 5-10 分钟
- iOS: 15-25 分钟

**优化建议**:
- 使用缓存（已配置）
- 只在需要时构建 iOS（手动触发时可选择）

### 6. 未签名的 APK 无法安装

**原因**: Android 要求 APK 必须签名

**解决方案**:
1. 配置 Android 签名 Secrets
2. 或者使用 Debug APK（自动签名）
3. 或者手动签名:
   ```bash
   jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
     -keystore dd-sync.keystore \
     app-release-unsigned.apk dd-sync
   ```

## 🔧 高级配置

### 自定义构建配置

编辑 `.github/workflows/release.yml`，可以修改：

- Node.js 版本
- Java 版本
- 构建命令
- 产物保留时间
- Release 配置

### 添加构建通知

可以添加 Slack、Discord、Email 等通知：

```yaml
- name: Send notification
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 多环境构建

可以为不同环境（开发、测试、生产）创建不同的工作流：

```yaml
on:
  push:
    branches:
      - main        # 生产环境
      - develop     # 开发环境
```

## 📚 更多资源

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Android 签名文档](https://developer.android.com/studio/publish/app-signing)
- [iOS 代码签名指南](https://developer.apple.com/support/code-signing/)
- [Capacitor CI/CD](https://capacitorjs.com/docs/guides/ci-cd)

## 🎉 完成

现在你可以通过 GitHub Actions 自动构建和发布移动端 App 了！

**推荐工作流**:
1. 开发完成后，推送代码到 `main` 分支
2. 创建并推送 tag: `git tag v1.0.0 && git push origin v1.0.0`
3. GitHub Actions 自动构建 APK 和 IPA
4. 自动创建 GitHub Release 并上传产物
5. 从 Release 页面下载安装包
