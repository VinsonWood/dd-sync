import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "com.ddvideo.sync",
    appName: "dd视频同步",
    webDir: "public", // 使用简单的 HTML 页面作为入口
    server: {
        // 移动应用连接到服务器（需要修改为你的服务器地址）
        url: process.env.CAPACITOR_SERVER_URL || "http://192.168.60.20:3000",
        cleartext: true, // 允许 HTTP 连接
        androidScheme: "http",
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            launchAutoHide: true,
            backgroundColor: "#ffffff",
            androidSplashResourceName: "splash",
            androidScaleType: "CENTER_CROP",
            showSpinner: false,
            androidSpinnerStyle: "large",
            iosSpinnerStyle: "small",
            spinnerColor: "#3b82f6",
            splashFullScreen: true,
            splashImmersive: true,
        },
        StatusBar: {
            style: "LIGHT",
            backgroundColor: "#ffffff",
        },
    },
    android: {
        buildOptions: {
            keystorePath: undefined,
            keystorePassword: undefined,
            keystoreAlias: undefined,
            keystoreAliasPassword: undefined,
            releaseType: "APK",
        },
    },
    ios: {
        contentInset: "automatic",
    },
};

export default config;
