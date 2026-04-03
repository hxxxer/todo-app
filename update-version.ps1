# 更新项目版本号脚本
# 用法: .\update-version.ps1 <新版本号>
# 示例: .\update-version.ps1 2.2.0

param(
    [Parameter(Mandatory=$true)]
    [string]$NewVersion
)

# 验证版本号格式
if ($NewVersion -notmatch '^\d+\.\d+\.\d+$') {
    Write-Host "错误: 版本号格式不正确，应为 X.Y.Z (例如: 2.2.0)" -ForegroundColor Red
    exit 1
}

Write-Host "更新版本号: $NewVersion" -ForegroundColor Cyan

# 1. 更新 package.json
$packageJsonPath = Join-Path $PSScriptRoot "package.json"
if (Test-Path $packageJsonPath) {
    $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
    $packageJson.version = $NewVersion
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath
    Write-Host "✓ package.json 已更新" -ForegroundColor Green
} else {
    Write-Host "✗ package.json 不存在" -ForegroundColor Red
    exit 1
}

# 2. 更新 tauri.conf.json
$tauriConfPath = Join-Path $PSScriptRoot "src-tauri\tauri.conf.json"
if (Test-Path $tauriConfPath) {
    $tauriConf = Get-Content $tauriConfPath -Raw | ConvertFrom-Json
    $tauriConf.version = $NewVersion
    $tauriConf | ConvertTo-Json -Depth 10 | Set-Content $tauriConfPath
    Write-Host "✓ tauri.conf.json 已更新" -ForegroundColor Green
} else {
    Write-Host "✗ tauri.conf.json 不存在" -ForegroundColor Red
    exit 1
}

# 3. 更新 Cargo.toml
$cargoTomlPath = Join-Path $PSScriptRoot "src-tauri\Cargo.toml"
if (Test-Path $cargoTomlPath) {
    $cargoContent = Get-Content $cargoTomlPath -Raw
    # 只替换第一行的 version = "X.Y.Z"
    $cargoContent = $cargoContent -replace '(^version\s*=\s*)"[^"]+"', "`$1`"$NewVersion`""
    $cargoContent | Set-Content $cargoTomlPath
    Write-Host "✓ Cargo.toml 已更新" -ForegroundColor Green
} else {
    Write-Host "✗ Cargo.toml 不存在" -ForegroundColor Red
    exit 1
}

# 4. 更新 App.tsx 中的版本号
$appTsxPath = Join-Path $PSScriptRoot "src\App.tsx"
if (Test-Path $appTsxPath) {
    $appContent = Get-Content $appTsxPath -Raw
    # 替换 TodoApp vX.Y.Z 格式的版本号
    $appContent = $appContent -replace 'TodoApp v\d+\.\d+\.\d+', "TodoApp v$NewVersion"
    $appContent | Set-Content $appTsxPath
    Write-Host "✓ App.tsx 已更新" -ForegroundColor Green
} else {
    Write-Host "✗ App.tsx 不存在" -ForegroundColor Red
    exit 1
}

Write-Host "`n版本号已成功更新为 $NewVersion" -ForegroundColor Green
