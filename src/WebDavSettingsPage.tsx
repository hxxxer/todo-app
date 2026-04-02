import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, CloudUpload, CloudDownload, RefreshCw, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import type { WebDavConfig } from "@/lib/commands";
import {
  getWebDavConfig,
  saveWebDavConfig,
  deleteWebDavConfig,
  testWebDavConnection,
  uploadToWebDav,
  downloadFromWebDav,
  syncWithWebDav,
} from "@/lib/commands";

export function WebDavSettings() {
  // 配置状态
  const [config, setConfig] = useState<WebDavConfig | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remotePath, setRemotePath] = useState("");

  // UI 状态
  const [isEditing, setIsEditing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ syncing: boolean; message: string; type: "idle" | "success" | "error" }>({
    syncing: false,
    message: "",
    type: "idle",
  });

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const savedConfig = await getWebDavConfig();
    if (savedConfig) {
      setConfig(savedConfig);
      setServerUrl(savedConfig.server_url);
      setUsername(savedConfig.username);
      setPassword(savedConfig.password);
      setRemotePath(savedConfig.remote_path);
    }
  };

  // 保存配置
  const handleSave = async () => {
    if (!serverUrl || !username || !password || !remotePath) {
      setTestResult({ success: false, message: "请填写所有必填项" });
      return;
    }

    try {
      await saveWebDavConfig(serverUrl, username, password, remotePath);
      setConfig({ server_url: serverUrl, username, password, remote_path: remotePath });
      setIsEditing(false);
      setTestResult({ success: true, message: "配置已保存" });
    } catch (error) {
      setTestResult({ success: false, message: `保存失败：${error}` });
    }
  };

  // 测试连接
  const handleTest = async () => {
    if (!serverUrl || !username || !password || !remotePath) {
      setTestResult({ success: false, message: "请先填写所有配置项" });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testWebDavConnection();
      setTestResult({ success: true, message: result });
    } catch (error) {
      setTestResult({ success: false, message: `${error}` });
    } finally {
      setIsTesting(false);
    }
  };

  // 删除配置
  const handleDelete = async () => {
    if (!confirm("确定要删除 WebDAV 配置吗？")) return;

    try {
      await deleteWebDavConfig();
      setConfig(null);
      setServerUrl("");
      setUsername("");
      setPassword("");
      setRemotePath("");
      setIsEditing(false);
      setTestResult({ success: true, message: "配置已删除" });
    } catch (error) {
      setTestResult({ success: false, message: `删除失败：${error}` });
    }
  };

  // 同步操作
  const handleSync = async (action: "upload" | "download" | "sync") => {
    setSyncStatus({ syncing: true, message: "正在同步...", type: "idle" });

    try {
      let result: string;
      switch (action) {
        case "upload":
          result = await uploadToWebDav();
          break;
        case "download":
          result = await downloadFromWebDav();
          break;
        case "sync":
          result = await syncWithWebDav();
          break;
        default:
          return;
      }
      setSyncStatus({ syncing: false, message: result, type: "success" });
    } catch (error) {
      setSyncStatus({ syncing: false, message: `${error}`, type: "error" });
    }
  };

  const hasConfig = config !== null;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 pt-8 md:pt-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Cloud className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">WebDAV 同步设置</h1>
        </div>

        {/* 同步操作卡片 */}
        {hasConfig && (
          <Card className="mb-6 border">
            <CardHeader>
              <CardTitle>数据同步</CardTitle>
              <CardDescription>
                手动上传或下载数据库文件
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 同步按钮：移动端垂直排列，桌面端水平排列 */}
              <div className="flex flex-col md:flex-row gap-2">
                <Button
                  onClick={() => handleSync("upload")}
                  disabled={syncStatus.syncing}
                  className="w-full md:w-auto"
                >
                  <CloudUpload className="h-4 w-4 md:mr-2" />
                  <span className="md:inline">上传到云端</span>
                </Button>
                <Button
                  onClick={() => handleSync("download")}
                  disabled={syncStatus.syncing}
                  variant="outline"
                  className="w-full md:w-auto"
                >
                  <CloudDownload className="h-4 w-4 md:mr-2" />
                  <span className="md:inline">从云端下载</span>
                </Button>
                <Button
                  onClick={() => handleSync("sync")}
                  disabled={syncStatus.syncing}
                  variant="outline"
                  className="w-full md:w-auto"
                >
                  <RefreshCw className={`h-4 w-4 md:mr-2 ${syncStatus.syncing ? "animate-spin" : ""}`} />
                  <span className="md:inline">同步</span>
                </Button>
              </div>

              {/* 同步状态 */}
              {syncStatus.message && (
                <div
                  className={`flex items-center gap-2 text-sm ${
                    syncStatus.type === "success"
                      ? "text-green-600"
                      : syncStatus.type === "error"
                      ? "text-red-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {syncStatus.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : syncStatus.type === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}
                  {syncStatus.message}
                </div>
              )}

              {/* 提示信息 */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• 上传：将本地数据库上传到 WebDAV（会覆盖云端文件）</p>
                <p>• 下载：从 WebDAV 下载数据库（会覆盖本地文件，下载前会自动备份）</p>
                <p>• 同步：先上传本地更改，再下载云端更改</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 配置卡片 */}
        <Card className="mb-6 border">
        <CardHeader>
          <CardTitle>WebDAV 配置</CardTitle>
          <CardDescription>
            配置 WebDAV 服务器信息以进行数据同步
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 服务器地址 */}
          <div className="space-y-2">
            <Label htmlFor="serverUrl">服务器地址 *</Label>
            <Input
              id="serverUrl"
              placeholder="https://dav.jianguoyun.com/dav/"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              disabled={!isEditing}
            />
            <p className="text-xs text-muted-foreground">
              例如：坚果云 WebDAV 地址 https://dav.jianguoyun.com/dav/
            </p>
          </div>

          {/* 用户名 */}
          <div className="space-y-2">
            <Label htmlFor="username">用户名 *</Label>
            <Input
              id="username"
              placeholder="你的 WebDAV 用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!isEditing}
            />
          </div>

          {/* 密码 */}
          <div className="space-y-2">
            <Label htmlFor="password">密码 *</Label>
            <Input
              id="password"
              type="password"
              placeholder="你的 WebDAV 密码或应用专用密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!isEditing}
            />
            <p className="text-xs text-muted-foreground">
              建议使用应用专用密码而非账户主密码
            </p>
          </div>

          {/* 远程路径 */}
          <div className="space-y-2">
            <Label htmlFor="remotePath">远程文件夹路径 *</Label>
            <Input
              id="remotePath"
              placeholder="/apps/todo-app"
              value={remotePath}
              onChange={(e) => setRemotePath(e.target.value)}
              disabled={!isEditing}
            />
            <p className="text-xs text-muted-foreground">
              远程服务器上存储数据库的文件夹路径
            </p>
          </div>

          {/* 测试连接结果 */}
          {testResult && (
            <div
              className={`flex items-center gap-2 text-sm ${
                testResult.success ? "text-green-600" : "text-red-600"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {testResult.message}
            </div>
          )}

          {/* 操作按钮：移动端垂直排列，桌面端水平排列 */}
          <div className="flex flex-col md:flex-row gap-2 pt-4">
            {!isEditing ? (
              <>
                <Button onClick={() => setIsEditing(true)} className="w-full md:w-auto">
                  编辑配置
                </Button>
                {hasConfig && (
                  <Button variant="outline" onClick={handleDelete} className="w-full md:w-auto">
                    <Trash2 className="h-4 w-4 mr-2" />
                    删除配置
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button onClick={handleSave} className="w-full md:w-auto">
                  保存配置
                </Button>
                <Button variant="outline" onClick={handleTest} disabled={isTesting} className="w-full md:w-auto">
                  {isTesting ? "测试中..." : "测试连接"}
                </Button>
                <Button variant="ghost" onClick={() => {
                  setIsEditing(false);
                  if (config) {
                    setServerUrl(config.server_url);
                    setUsername(config.username);
                    setPassword(config.password);
                    setRemotePath(config.remote_path);
                  }
                }} className="w-full md:w-auto">
                  取消
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
