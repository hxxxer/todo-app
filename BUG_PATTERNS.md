# 常见 Bug 模式记录

本文档记录影响全端的常见 Bug 模式及其解决方案，供开发时参考。

---

## 1. 组件内部定义导致页面闪烁

### 症状
- 输入框每输入一个字符，页面就闪烁一下
- 输入框内容不丢失，光标保持
- 调试时不稳定复现

### 根本原因
在组件函数内部定义子组件，导致每次父组件重新渲染时，子组件被重新定义和挂载：

```tsx
// ❌ 错误模式
export function ParentComponent() {
  const [value, setValue] = useState("");

  // 每次渲染都重新定义 ChildComponent
  const ChildComponent = () => (
    <div>{value}</div>
  );

  return <ChildComponent />;
}
```

**执行流程**：
1. `value` 变化 → `ParentComponent` 重新执行
2. `ChildComponent` 被重新定义为新函数
3. React 认为是新组件 → 卸载旧组件 → 挂载新组件
4. **页面闪烁**

### 解决方案

#### 方案 A：移到组件外部（推荐）
```tsx
// ✅ 正确模式
function ChildComponent({ value }: { value: string }) {
  return <div>{value}</div>;
}

export function ParentComponent() {
  const [value, setValue] = useState("");
  return <ChildComponent value={value} />;
}
```

#### 方案 B：使用 useMemo 缓存
```tsx
// ✅ 正确模式
export function ParentComponent() {
  const [value, setValue] = useState("");

  const ChildComponent = useMemo(() => (
    <div>{value}</div>
  ), [value]);

  return ChildComponent;
}
```

### 影响范围
- **全端影响**：桌面端和移动端都会出现
- **性能影响**：每次状态变化都触发完整挂载/卸载循环

### 实际案例
**文件**：`src/KnowledgePage.tsx`
**问题**：`DesktopSplitView` 在 `KnowledgePage` 内部定义
**修复**：移到外部，通过 props 传递数据

---

## 2. 异步监听器内存泄漏

### 症状
- 内存占用持续上涨，不会自动回收
- 组件卸载后监听器仍在后台运行
- 长时间使用后应用变慢

### 根本原因
异步 Promise 的 `.then()` 回调中赋值，组件同步清理时变量还是初始值：

```tsx
// ❌ 错误模式
useEffect(() => {
  let listener: PluginListener | null = null;

  someAsyncListener(() => {
    // 回调逻辑
  }).then(fn => {
    listener = fn;  // ← 异步赋值
  });

  return () => {
    listener?.unregister();  // ← 清理时 listener 可能还是 null！
  };
}, [dependency]);
```

**执行流程**：
1. 组件挂载 → 调用异步监听器
2. 组件卸载 → 清理函数同步执行
3. 此时 Promise 还没 resolve → `listener` 还是 `null`
4. **监听器没有被注销** → 内存泄漏

### 解决方案
使用 `cancelled` 标志，在 Promise resolve 后检查是否已取消：

```tsx
// ✅ 正确模式
useEffect(() => {
  let cancelled = false;
  let listener: PluginListener | null = null;

  someAsyncListener(() => {
    // 回调逻辑
  }).then(fn => {
    if (cancelled) {
      fn.unregister(); // 已取消则立即清理
    } else {
      listener = fn;
    }
  });

  return () => {
    cancelled = true;
    listener?.unregister();
  };
}, [dependency]);
```

### 影响范围
- **全端影响**：所有使用异步监听器的平台
- **内存影响**：每次组件挂载/卸载都会泄漏一个监听器

### 实际案例
**文件**：`src/KnowledgePage.tsx`
**问题**：`onBackButtonPress` 监听器未正确清理
**修复**：添加 `cancelled` 标志

---

## 3. 表单提交导致页面刷新

### 症状
- 输入框按 Enter 键时页面刷新
- 表单内容丢失

### 根本原因
`Input` 在 `<form>` 内按 Enter 会触发表单默认提交行为：

```tsx
// ❌ 错误模式
<form>
  <Input value={value} onChange={...} />
  <Button onClick={handleSubmit}>提交</Button>
</form>
```

### 解决方案

#### 方案 A：阻止默认提交
```tsx
// ✅ 正确模式
<form onSubmit={(e) => e.preventDefault()}>
  <Input
    value={value}
    onChange={...}
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    }}
  />
  <Button type="button" onClick={handleSubmit}>提交</Button>
</form>
```

#### 方案 B：修改 Button 类型
```tsx
// ✅ 正确模式
<Button type="button" onClick={handleSubmit}>提交</Button>
```

### 影响范围
- **全端影响**：所有包含表单的页面
- **用户体验**：按 Enter 时意外刷新

---

## 4. 响应式布局中桌面端功能缺失

### 症状
- 移动端功能正常，桌面端缺少某些功能
- 响应式断点切换时功能丢失

### 根本原因
在实现响应式布局时，只考虑了移动端，忘记保留桌面端功能：

```tsx
// ❌ 错误模式
<div className="flex">
  {/* 移动端 Toggle */}
  <Toggle className="md:hidden">切换</Toggle>
  
  {/* 标题 */}
  <h2>标题</h2>
  
  {/* 桌面端按钮忘记添加！ */}
</div>
```

### 解决方案
确保桌面端和移动端都有对应的功能：

```tsx
// ✅ 正确模式
<div className="flex items-center justify-between">
  {/* 桌面端按钮 */}
  <div className="hidden md:flex gap-2">
    <Button onClick={handlePrev}>←</Button>
    <Button onClick={handleNext}>→</Button>
  </div>
  
  {/* 移动端 Toggle */}
  <Toggle className="md:hidden">切换</Toggle>
  
  {/* 标题 */}
  <h2>标题</h2>
  
  {/* 桌面端今天按钮 */}
  <Button className="hidden md:flex">今天</Button>
</div>
```

### 影响范围
- **平台影响**：仅桌面端受影响
- **功能影响**：缺少关键操作按钮

---

## 5. 日历网格尺寸被压缩

### 症状
- 日历网格宽度只有预期的一半
- 右侧出现大量空白区域

### 根本原因
父容器宽度被错误设置为百分比：

```tsx
// ❌ 错误模式
<div className="md:w-1/2">  {/* 只占 50% 宽度 */}
  <CalendarGrid />
</div>
```

### 解决方案
使用 `flex-1` 和最大宽度限制（可选）：

```tsx
// ✅ 正确模式
<div className="md:flex-1 md:max-w-[600px]">
  <CalendarGrid />
</div>
```

### 影响范围
- **平台影响**：桌面端
- **视觉影响**：布局不美观，浪费空间

---

## 总结

| Bug 模式 | 影响范围 | 严重程度 | 解决方案 |
|---------|---------|---------|---------|
| 组件内部定义 | 全端 | 高 | 移到外部或用 useMemo |
| 异步监听器泄漏 | 全端 | 高 | 添加 cancelled 标志 |
| 表单提交刷新 | 全端 | 中 | 阻止默认行为 |
| 响应式功能缺失 | 桌面端 | 中 | 确保双端都有功能 |
| 日历网格压缩 | 桌面端 | 低 | 使用 flex-1 + max-w |
