// ============================================
// 主应用组件
// 负责整个应用的布局和页面切换
// ============================================

import { useState } from "react";
import { CalendarPage } from "./CalendarPage";
import { KnowledgePage } from "./KnowledgePage";
import { AllTodosPage } from "./AllTodosPage";
import { WebDavSettings } from "./WebDavSettingsPage";
import { MobileNavBar } from "./MobileNavBar";
import { CalendarIcon, BookIcon, ListTodoIcon, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// 页面类型定义
type Page = "calendar" | "all-todos" | "knowledge" | "webdav";

export default function App() {
  // ============================================
  // 状态管理
  // ============================================
  // currentPage: 当前显示的页面（日历 / 所有待办 / 知识库）
  const [currentPage, setCurrentPage] = useState<Page>("calendar");

  // isCollapsed: 侧边栏是否收起（true=收起，false=展开）
  const [isCollapsed, setIsCollapsed] = useState(true);

  // 知识库页面选中的文档 ID（用于从日历页面跳转）
  const [selectedKnowledgeDocId, setSelectedKnowledgeDocId] = useState<number | null>(null);

  // ============================================
  // 事件处理函数
  // ============================================
  // 跳转到知识库页面并选中文档
  const handleNavigateToKnowledge = (docId: number) => {
    setSelectedKnowledgeDocId(docId);
    setCurrentPage("knowledge");
  };

  return (
    // 根容器：占满整个屏幕，水平布局
    // 添加 overflow-hidden 防止横向拉伸
    <div className="flex h-screen w-full overflow-hidden">

      {/* ========== 侧边栏（桌面端）========== */}
      {/*
        侧边栏容器：
        - flex flex-col: 垂直布局
        - border-r: 右边框
        - bg-sidebar: 侧边栏背景色
        - transition-all duration-300 ease-in-out: 平滑过渡动画
        - w-16: 收起时宽度（仅图标）
        - w-56: 展开时宽度（图标 + 文字）
        - hidden md:flex: 移动端隐藏，桌面端显示
      */}
      <div
        className={cn(
          "hidden md:flex flex-col border-r transition-all duration-300 ease-in-out",
          isCollapsed ? "w-15" : "w-56"
        )}
      >
        {/* 侧边栏头部 */}
        <div className="flex items-center justify-between h-14 px-3 border-b">
          {/* 应用标题（仅在展开时显示） */}
          {!isCollapsed && (
            <h1 className="text-lg font-semibold truncate">TodoApp</h1>
          )}

          {/* 展开/收起按钮 */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-md hover:bg-accent transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />  // 收起时显示右箭头
            ) : (
              <ChevronLeft className="h-4 w-4" />   // 展开时显示左箭头
            )}
          </button>
        </div>

        {/* ========== 功能菜单 ========== */}
        <div className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            {/* 日历页面按钮 */}
            <button
              onClick={() => setCurrentPage("calendar")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
                // 当前页面的样式：强调背景
                currentPage === "calendar"
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"  // 非当前页面：悬停效果
              )}
              title="日历"  // 鼠标悬停提示（收起时显示）
            >
              <CalendarIcon className="h-5 w-5 flex-shrink-0" />  {/* 日历图标 */}
              {!isCollapsed && <span>日历</span>}  {/* 文字（仅展开时显示） */}
            </button>

            {/* 所有待办页面按钮 */}
            <button
              onClick={() => setCurrentPage("all-todos")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
                currentPage === "all-todos"
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
              title="所有待办"
            >
              <ListTodoIcon className="h-5 w-5 flex-shrink-0" />  {/* 列表图标 */}
              {!isCollapsed && <span>所有待办</span>}
            </button>

            {/* 知识库页面按钮 */}
            <button
              onClick={() => setCurrentPage("knowledge")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
                currentPage === "knowledge"
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
              title="知识库"
            >
              <BookIcon className="h-5 w-5 flex-shrink-0" />  {/* 书本图标 */}
              {!isCollapsed && <span>知识库</span>}
            </button>

            {/* WebDAV 设置按钮 */}
            <button
              onClick={() => setCurrentPage("webdav")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
                currentPage === "webdav"
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
              title="WebDAV 同步"
            >
              <Settings className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>WebDAV 同步</span>}
            </button>
          </nav>
        </div>

        {/* ========== 侧边栏底部 ========== */}
        <div className="p-3 border-t">
          <div className={cn(
            "text-xs text-muted-foreground text-center",
            !isCollapsed && "text-left"
          )}>
            {!isCollapsed && "TodoApp v2.2.0"}  {/* 版本号（仅展开时显示） */}
          </div>
        </div>
      </div>

      {/* ========== 主内容区域 ========== */}
      {/* 根据 currentPage 显示不同的页面组件 */}
      {/*
        pb-16 md:pb-0: 移动端底部留白给导航栏，桌面端不留白
        pt-8 md:pt-0: 移动端顶部留白一行，桌面端不留白
        flex-shrink-0: 防止内容区域被压缩导致导航栏变形
      */}
      <main className="flex-1 overflow-hidden pb-16 md:pb-0 pt-8 md:pt-0 flex-shrink-0">
        {currentPage === "calendar" ? (
          <CalendarPage onNavigateToKnowledge={handleNavigateToKnowledge} />
        ) : currentPage === "all-todos" ? (
          <AllTodosPage />
        ) : currentPage === "knowledge" ? (
          <KnowledgePage
            selectedDocumentId={selectedKnowledgeDocId}
            onDocumentSelected={setSelectedKnowledgeDocId}
          />
        ) : (
          <WebDavSettings />
        )}
      </main>

      {/* ========== 移动端底部导航栏 ========== */}
      <MobileNavBar currentPage={currentPage} onNavigate={setCurrentPage} />
    </div>
  );
}


