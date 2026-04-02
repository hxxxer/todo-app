# TodoApp Android 构建指南

## 环境配置

### 1. 确认已安装的组件

确保你已经完成了以下安装：

- ✅ Android Studio
- ✅ Android SDK API 31
- ✅ Android NDK (版本 26 或更高)
- ✅ Rust Android 目标平台 (`aarch64-linux-android`, `armv7-linux-androideabi`)
- ✅ cargo-ndk

### 2. 配置环境变量（必需）

在 Windows 系统环境变量中添加以下变量：

```
ANDROID_HOME = C:\Users\你的用户名\AppData\Local\Android\Sdk
ANDROID_NDK_HOME = %ANDROID_HOME%\ndk\你的 NDK 版本号
```

**配置步骤**：
1. 右键"此电脑" → "属性" → "高级系统设置"
2. 点击"环境变量"
3. 在"系统变量"下点击"新建"
4. 添加上述变量

**注意**：
- 将"你的用户名"替换为你的实际 Windows 用户名
- 将"你的 NDK 版本号"替换为实际安装的 NDK 版本（如 `26.1.10909125`）
- 配置后需要**重启终端**或**重新登录 Windows** 才能生效

### 3. 验证环境变量

打开**新的**命令行窗口，运行以下命令验证：

```bash
# 验证 ANDROID_HOME
echo %ANDROID_HOME%

# 验证 NDK 版本
echo %ANDROID_NDK_HOME%

# 应该显示正确的路径
```

### 4. 配置 NDK 工具链（可选，如果 cargo-ndk 无法自动找到 NDK）

如果构建时提示找不到 NDK 工具链，需要编辑 `src-tauri/.cargo/config.toml` 文件：

**找到你的 NDK 路径**：
1. 打开文件资源管理器
2. 导航到 `C:\Users\你的用户名\AppData\Local\Android\Sdk\ndk\`
3. 查看里面的文件夹名称（如 `26.1.10909125`）

**编辑 `.cargo/config.toml`**：
```toml
[target.aarch64-linux-android]
linker = "C:/Users/你的用户名/AppData/Local/Android/Sdk/ndk/版本号/toolchains/llvm/prebuilt/windows-x86_64/bin/aarch64-linux-android24-clang.cmd"
ar = "C:/Users/你的用户名/AppData/Local/Android/Sdk/ndk/版本号/toolchains/llvm/prebuilt/windows-x86_64/bin/llvm-ar.exe"

[target.armv7-linux-androideabi]
linker = "C:/Users/你的用户名/AppData/Local/Android/Sdk/ndk/版本号/toolchains/llvm/prebuilt/windows-x86_64/bin/armv7a-linux-androideabi24-clang.cmd"
ar = "C:/Users/你的用户名/AppData/Local/Android/Sdk/ndk/版本号/toolchains/llvm/prebuilt/windows-x86_64/bin/llvm-ar.exe"
```

**重要**：
- 将路径中的 `你的用户名` 替换为你的实际 Windows 用户名
- 将 `版本号` 替换为你实际安装的 NDK 版本号
- Windows 路径使用正斜杠 `/` 或双反斜杠 `\\`

### 5. 验证 Rust Android 目标平台

```bash
# 检查已安装的 Rust Android 目标平台
rustup target list --installed

# 应该看到：
# aarch64-linux-android
# armv7-linux-androideabi

# 如果没有，运行以下命令安装：
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
```

### 6. 验证 cargo-ndk

```bash
cargo ndk --version
```

---

## 初始化 Android 项目

首次构建前需要初始化 Android 项目：

```bash
cd D:\DIY\tauri-app\todo-app

# 初始化 Android 项目
pnpm tauri android init
```

**注意**：如果提示找不到 Android SDK，请确保：
1. 环境变量已正确配置
2. 已重启终端或重新登录 Windows

---

## 开始开发

### 开发模式（连接手机或启动模拟器）

```bash
# 确保手机已连接并开启 USB 调试，或启动 Android 模拟器
pnpm tauri android dev
```

### 构建 APK

```bash
# 构建 Debug APK
pnpm tauri android build --apk

# 构建 Release APK（需要配置签名）
pnpm tauri android build --apk --release
```

---

## 常见问题

### 1. 找不到 Android SDK

错误信息：`Android SDK not found at ...`

**解决方案**：
- 确认环境变量 `ANDROID_HOME` 已正确配置
- 确认路径 `C:\Users\你的用户名\AppData\Local\Android\Sdk` 存在
- 重启终端或重新登录 Windows

### 2. 找不到 NDK 工具链

错误信息：`failed to find tool "aarch64-linux-android-clang"`

**解决方案**：
- 确认 NDK 已安装
- 配置环境变量 `ANDROID_NDK_HOME`
- 或者在 `.cargo/config.toml` 中配置链接器路径（见步骤 4）

### 3. OpenSSL 编译错误

错误信息：`Could not find directory of OpenSSL installation`

**解决方案**：
- 项目已配置使用 rustls 替代 OpenSSL，无需额外安装
- 确保 `Cargo.toml` 中 `reqwest` 的配置包含 `default-features = false` 和 `rustls-tls`

### 4. 签名配置（Release 版本）

构建 Release 版本需要配置签名：

1. 生成 keystore：
```bash
keytool -genkey -v -keystore my-release-key.keystore -alias todoapp -keyalg RSA -keysize 2048 -validity 10000
```

2. 在 `src-tauri/tauri.conf.json` 中配置（Tauri 会自动处理）：
- 将 keystore 文件放在 `src-tauri/` 目录下
- 构建时会提示输入密码

### 5. 手机端前端没有样式

**症状**：在 Android 手机上运行应用时，界面没有 CSS 样式，只有纯文本和基础布局。

**原因**：
- 开发模式下，Vite 开发服务器监听的网络接口不正确
- 手机无法通过正确的 IP 访问 CSS 资源文件

**解决方案**：

**方法 A：使用 adb reverse（推荐，最简单）**
```bash
# 连接手机到电脑（USB 调试模式）
# 运行以下命令转发端口：
adb reverse tcp:5177 tcp:5177
adb reverse tcp:5178 tcp:5178

# 然后运行开发服务器
pnpm tauri android dev
```

**方法 B：禁用 VPN 网络适配器**
1. 打开 **控制面板** → **网络和共享中心** → **更改适配器设置**
2. 找到 **Famatech Radmin VPN** 或其他 VPN 适配器
3. 右键 → **禁用**
4. 运行 `pnpm tauri android dev`
5. 完成后重新启用

**方法 C：设置环境变量（如果 Tauri CLI 支持）**
```powershell
# PowerShell
$env:TAURI_DEV_HOST="192.168.x.x"  # 替换为你的真实局域网 IP
pnpm tauri android dev
```

### 6. Windows 符号链接权限错误

错误信息：`Creation symbolic link is not allowed for this system`

**解决方案**：
- 启用 Windows 开发者模式
- 设置 → 更新和安全 → 开发者选项 → 启用开发者模式

### 7. Tauri CLI 选择了错误的网络 IP（VPN IP）

**症状**：
```
Info Using 26.2.117.91 to access the development server.
```
这个 IP 是 VPN 适配器的，不是真实局域网 IP。

**解决方案**：
1. **使用 adb reverse（推荐）**：
   ```bash
   adb reverse tcp:5177 tcp:5177
   adb reverse tcp:5178 tcp:5178
   pnpm tauri android dev
   ```

2. **临时禁用 VPN 适配器**：
   - 控制面板 → 网络和共享中心 → 更改适配器设置
   - 禁用 VPN 适配器
   - 运行开发服务器
   - 完成后重新启用

### 8. 构建 Release APK 时缺少库文件

错误信息：`Library artifact not found at .../armv7-linux-androideabi/release/libtodo_app_lib.so`

**原因**：
- 构建时默认会编译所有 Android 架构（arm64-v8a, armeabi-v7a, x86, x86_64）
- 但开发时可能只编译了部分架构

**解决方案**：
1. 编辑 `src-tauri/gen/android/app/build.gradle.kts`
2. 在 `buildTypes > debug` 和 `buildTypes > release` 中添加：
   ```kotlin
   ndk {
       abiFilters += listOf("arm64-v8a", "x86_64")  // 构建 arm64 和 x86_64（模拟器）
   }
   ```
3. 重新运行构建：
   ```bash
   # 构建 arm64 APK（真机）
   pnpm tauri android build --apk --target aarch64
   
   # 构建 x86_64 APK（模拟器）
   pnpm tauri android build --apk --target x86_64
   ```

**架构说明**：
- `arm64-v8a`：现代 Android 手机（推荐）
- `armeabi-v7a`：老旧 Android 手机（可选）
- `x86_64`：Android 模拟器（推荐）
- `x86`：老旧模拟器（可选）

### 9. 开发模式下 Tauri API 不可用（Android 12 模拟器）

**症状**：
```
TypeError: window.__TAURI_INTERNALS__.invoke is not a function
Uncaught SyntaxError: Invalid left-hand side in assignment
```

控制台查看生成的 `<script>` 标签，发现大量 HTML 转义字符：
- `&` 变成 `&amp;`
- `<` 变成 `&lt;`
- `>` 变成 `&gt;`

**根本原因**：
- Android 12 系统镜像中的 WebView 版本较低，存在 bug
- Tauri 使用 `WebViewCompat.addDocumentStartJavaScript()` 注入脚本时，脚本内容被 HTML 转义
- 此问题在 **wry 0.54.4+** 版本中已修复（https://github.com/tauri-apps/wry/pull/1326）

**解决方案**：

**方法 A：更新 wry 依赖（推荐）**

1. 编辑 `src-tauri/Cargo.toml`，确保没有锁定旧版本：
```bash
cd src-tauri
del Cargo.lock
cargo update -p wry
```

2. 确认 `Cargo.lock` 中 wry 版本 ≥ 0.54.4：
```bash
grep -A 2 "name = \"wry\"" Cargo.lock
# 应该显示 version = "0.54.4" 或更高
```

3. 重新生成 Android 项目并构建：
```bash
cd ..
rd /s /q src-tauri\gen\android
pnpm tauri android init
pnpm tauri android dev
```

**方法 B：使用更高版本的 Android 系统镜像**

- Android 13+ 的系统镜像包含较新版本的 WebView
- 在 Android Studio 的 SDK Manager 中下载更新的系统镜像

**方法 C：使用真机测试**

- 真机通常有较新的 WebView 版本
- 通过 USB 调试模式连接真机进行开发

**注意事项**：
- 此问题仅影响 Android 开发模式
- 生产模式（Release APK）使用不同的脚本注入方式，不受影响
- 桌面端开发模式正常工作

### 10. Android 硬件返回键功能

**功能说明**：
- 在知识库文档编辑页面，按 Android 硬件返回键会返回列表视图
- 其他页面按返回键会退出应用（默认行为）

**实现方式**：

1. **安装前端插件**：
```bash
pnpm add @tauri-apps/plugin-app
```

2. **前端代码**（`src/KnowledgePage.tsx`）：
```tsx
import { onBackButtonPress } from "@tauri-apps/api/app";
import { useEffect } from "react";

// 在组件内添加
useEffect(() => {
  if (!isEditing) return;

  let listener: PluginListener | null = null;
  let cancelled = false;

  onBackButtonPress(() => {
    handleBackToList();
  }).then(fn => {
    if (cancelled) {
      fn.unregister(); // 已取消则立即移除
    } else {
      listener = fn;
    }
  });

  return () => {
    cancelled = true;
    listener?.unregister();
  };
}, [isEditing, handleBackToList]);
```

**注意事项**：
- `@tauri-apps/api/app` 的 `onBackButtonPress` API **不需要配置额外权限**
- 仅在 Android 平台生效，桌面端无影响
- 回调函数返回 `true` 可以阻止默认行为（可选）

**开发模式控制台警告**：

开发模式下可能会看到以下警告：
```
[TAURI] Couldn't find callback id 1409702328. This might happen when 
the app is reloaded while Rust is running an asynchronous operation.
```

**原因**：
- 这是 Tauri 内部的警告，与 useEffect 清理逻辑无关
- 根源在于 React StrictMode 的双重渲染机制（开发模式下故意执行两次以帮助发现副作用问题）
- `onBackButtonPress` 返回的 Promise 在组件卸载时可能还未 resolve，导致回调 ID 找不到

**解决方案**：
- 无需处理，这是正常现象
- 生产模式（Release APK）下不会出现此警告
- 如需消除警告，可以在 `main.tsx` 中移除 `<React.StrictMode>`

**完整示例代码**：
```tsx
import { onBackButtonPress } from "@tauri-apps/api/app";
import { useEffect } from "react";

function KnowledgePage() {
  const [isEditing, setIsEditing] = useState(false);
  
  const handleBackToList = () => {
    setIsEditing(false);
    // 其他清理逻辑...
  };

  useEffect(() => {
    if (!isEditing) return;

    let listener: PluginListener | null = null;
    let cancelled = false;

    onBackButtonPress(() => {
      handleBackToList();
    }).then(fn => {
      if (cancelled) {
        fn.unregister();
      } else {
        listener = fn;
      }
    });

    return () => {
      cancelled = true;
      listener?.unregister();
    };
  }, [isEditing, handleBackToList]);

  return <div>...</div>;
}
```

### 11. Android 开发模式下前端缺失样式（Mixed Content 阻止）

**症状**：
- 模拟器浏览器访问 `http://localhost:5177` 有完整样式
- Tauri 应用内前端页面没有 CSS 样式，只有基础 HTML 结构
- 数据交互正常（invoke 可用）

**根本原因**：
- Android 5.0+ WebView 默认阻止 **Mixed Content**（HTTPS 页面加载 HTTP 资源）
- Tauri Android 使用 `tauri://localhost` 协议（类似 HTTPS），但 Vite 开发服务器使用 `http://localhost`
- 低版本 WebView 对 localhost 的 HTTP 请求有严格限制

**解决方案**：

**步骤 1：修改 MainActivity.kt 配置 Mixed Content**

编辑 `src-tauri/gen/android/app/src/main/java/com/tauri_app/todo_app/MainActivity.kt`：

```kotlin
package com.tauri_app.todo_app

import android.os.Bundle
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    
    // 配置 WebView 允许 Mixed Content（开发模式必需）
    // 这允许 HTTPS 页面加载 HTTP 资源（如 Vite 开发服务器）
    val webView = findViewById<WebView>(R.id.webview)
    if (webView != null) {
      webView.settings.mixedContentMode = WebView.MIXED_CONTENT_ALWAYS_ALLOW
    }
  }
}
```

**步骤 2：确认 usesCleartextTraffic 已启用**

编辑 `src-tauri/gen/android/app/build.gradle.kts`，确保 debug 模式下允许明文流量：

```kotlin
buildTypes {
    getByName("debug") {
        manifestPlaceholders["usesCleartextTraffic"] = "true"
        // ...
    }
}
```

**步骤 3：重新生成并运行**

```bash
# 重新生成 Android 项目
rd /s /q src-tauri\gen\android
pnpm tauri android init

# 设置 adb reverse 端口转发
adb reverse tcp:5177 tcp:5177
adb reverse tcp:5178 tcp:5178

# 运行开发模式
pnpm tauri android dev
```

**注意事项**：
- 此配置仅用于开发模式
- 生产模式（Release APK）使用打包后的资源，不需要 Mixed Content
- 如果使用的是 Android 13+ 或新版 WebView，可能不需要此配置

---

## 移动端功能说明

### 底部导航栏
- 移动端（屏幕宽度 < 768px）自动显示底部导航栏
- 桌面端保持左侧边栏

### 响应式布局
- 日历页面：移动端隐藏右侧待办列表
- 所有页面：底部留出导航栏空间

### 数据库路径
- Android 自动使用应用数据目录：`/data/data/com.tauri-app.todo-app/files/todo_app.db`

### 权限配置
- 已配置权限：INTERNET、ACCESS_NETWORK_STATE、WRITE_EXTERNAL_STORAGE、READ_EXTERNAL_STORAGE
- 权限在 AndroidManifest.xml 中自动配置

---

## 下一步

1. 完成环境配置后，运行 `pnpm tauri android dev` 在模拟器或真机上测试
2. 测试所有功能是否正常
3. 构建 Release 版本进行发布

## 构建 Android APK

### 方法 1：使用 cargo-ndk（推荐）

```bash
cd src-tauri

# 构建 Debug 版本
cargo ndk -t arm64-v8a -o ../app/src/main/jniLibs build

# 构建 Release 版本
cargo ndk -t arm64-v8a -o ../app/src/main/jniLibs build --release
```

### 方法 2：使用 Tauri CLI

```bash
# 确保已安装 Tauri CLI
pnpm tauri android init

# 开发模式运行
pnpm tauri android dev

# 构建 Release APK
pnpm tauri android build --apk
```

## 常见问题

### 1. 找不到 Android NDK 工具链

错误信息：`failed to find tool "aarch64-linux-android-clang"`

**解决方案**：
- 确认 NDK 已正确安装
- 检查 `.cargo/config.toml` 中的路径是否正确
- 或者将 NDK 的 `toolchains/llvm/prebuilt/windows-x86_64/bin` 目录添加到 PATH 环境变量

### 2. OpenSSL 编译错误

错误信息：`Could not find directory of OpenSSL installation`

**解决方案**：
- 项目已配置使用 rustls 替代 OpenSSL，无需额外安装
- 确保 `Cargo.toml` 中 `reqwest` 的配置包含 `default-features = false` 和 `rustls-tls`

### 3. 签名配置

构建 Release 版本需要配置签名：

1. 生成 keystore：
```bash
keytool -genkey -v -keystore my-release-key.keystore -alias todoapp -keyalg RSA -keysize 2048 -validity 10000
```

2. 在 `src-tauri/tauri.conf.json` 中配置：
```json
{
  "bundle": {
    "android": {
      "keystorePath": "path/to/my-release-key.keystore",
      "keystorePassword": "your-password",
      "keyAlias": "todoapp",
      "keyPassword": "your-key-password"
    }
  }
}
```

## 移动端功能说明

### 底部导航栏
- 移动端（屏幕宽度 < 768px）自动显示底部导航栏
- 桌面端保持左侧边栏

### 响应式布局
- 日历页面：移动端隐藏右侧待办列表
- 所有页面：底部留出导航栏空间

### 数据库路径
- Android 自动使用应用数据目录：`/data/data/com.tauri-app.todo-app/files/todo_app.db`

## 下一步

1. 完成环境配置后，运行 `pnpm tauri android dev` 在模拟器或真机上测试
2. 测试所有功能是否正常
3. 构建 Release 版本进行发布
