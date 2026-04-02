# TodoApp Android 签名密钥备份说明

## ⚠️ 重要提示

**请务必备份以下文件！** 如果丢失密钥库文件，你将无法更新已发布的应用。

## 需要备份的文件

1. **密钥库文件**：`src-tauri/todoapp-release-key.keystore`
2. **签名配置**：`src-tauri/gen/android/app/keystore.properties`

## 密钥信息

- **别名 (Alias)**: todoapp
- **密钥库密码**: todoapp2024
- **密钥密码**: todoapp2024
- **有效期**: 10000 天（约 27 年）
- **算法**: RSA 2048 位

## 建议的备份方式

1. **云存储备份**：复制到 Google Drive、Dropbox、OneDrive 等
2. **密码管理器**：将密码信息保存到 1Password、Bitwarden 等
3. **物理备份**：复制到加密的 USB 驱动器

## 安全建议

### 生产环境发布前，建议：

1. **修改默认密码**：
   ```bash
   # 重新生成密钥库（使用强密码）
   keytool -genkey -v -keystore todoapp-release-key.keystore \
     -alias todoapp -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **更新 keystore.properties**：
   ```properties
   storeFile=todoapp-release-key.keystore
   storePassword=你的强密码
   keyAlias=todoapp
   keyPassword=你的强密码
   ```

3. **设置文件权限**（Linux/Mac）：
   ```bash
   chmod 600 todoapp-release-key.keystore
   chmod 600 keystore.properties
   ```

## 如果密钥丢失

如果丢失了密钥库文件或忘记密码：
- ❌ 无法更新已发布到应用商店的应用
- ❌ 需要更改应用包名（applicationId）重新发布
- ❌ 现有用户无法直接更新

## 验证签名

构建 Release APK 后，可以使用以下命令验证签名：

```bash
# 查看 APK 签名信息
jarsigner -verify -verbose -certs app-release.apk

# 查看密钥库内容
keytool -list -v -keystore todoapp-release-key.keystore
```
