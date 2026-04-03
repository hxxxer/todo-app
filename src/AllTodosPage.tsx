// ============================================
// 所有待办页面组件
// 显示所有待办事项，按日期倒序排列
// 不同日期之间用分隔线隔开
// 支持搜索功能
// ============================================

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Todo, getAllTodosOrdered, toggleTodo, deleteTodo, updateTodo } from "@/lib/commands";
import { format } from "date-fns";
import { Trash2, Search, CheckCircle2, Circle, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export function AllTodosPage() {
  // ============================================
  // 状态管理
  // ============================================
  // 所有待办事项
  const [todos, setTodos] = useState<Todo[]>([]);

  // 加载状态
  const [loading, setLoading] = useState(true);

  // 搜索关键词
  const [searchQuery, setSearchQuery] = useState("");

  // 是否隐藏已完成
  const [hideCompleted, setHideCompleted] = useState(true);

  // 编辑备注对话框状态
  const [isEditNotesDialogOpen, setIsEditNotesDialogOpen] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editNotesContent, setEditNotesContent] = useState("");

  // ============================================
  // 数据加载
  // ============================================
  useEffect(() => {
    loadTodos();
  }, []);

  // 加载所有待办
  const loadTodos = async () => {
    try {
      const allTodos = await getAllTodosOrdered();
      setTodos(allTodos);
    } catch (error) {
      console.error("加载待办失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // 事件处理函数
  // ============================================
  // 切换待办完成状态
  const handleToggleTodo = async (id: number) => {
    try {
      const newCompleted = await toggleTodo(id);
      setTodos(todos.map(t => t.id === id ? { ...t, completed: newCompleted } : t));
    } catch (error) {
      console.error("切换完成状态失败:", error);
    }
  };

  // 删除待办
  const handleDeleteTodo = async (id: number) => {
    try {
      await deleteTodo(id);
      setTodos(todos.filter(t => t.id !== id));
    } catch (error) {
      console.error("删除待办失败:", error);
    }
  };

  // 打开编辑备注对话框
  const handleOpenEditNotes = (todo: Todo) => {
    setEditingTodoId(todo.id);
    setEditNotesContent(todo.notes || "");
    setIsEditNotesDialogOpen(true);
  };

  // 保存备注
  const handleSaveNotes = async () => {
    if (!editingTodoId) return;

    try {
      const todo = todos.find(t => t.id === editingTodoId);
      if (!todo) return;

      await updateTodo(
        editingTodoId,
        todo.title,
        todo.start_time,
        todo.deadline || null,
        editNotesContent
      );

      // 更新待办列表
      setTodos(todos.map(t =>
        t.id === editingTodoId ? { ...t, notes: editNotesContent || null } : t
      ));

      setIsEditNotesDialogOpen(false);
      setEditingTodoId(null);
      setEditNotesContent("");
    } catch (error) {
      console.error("保存备注失败:", error);
    }
  };

  // ============================================
  // 搜索过滤
  // ============================================
  const filteredTodos = todos.filter(todo => {
    // 先过滤已完成
    if (hideCompleted && todo.completed) return false;

    // 再过滤搜索关键词
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      todo.title.toLowerCase().includes(query) ||
      (todo.notes && todo.notes.toLowerCase().includes(query)) ||
      (todo.deadline && todo.deadline.toLowerCase().includes(query))
    );
  });

  // ============================================
  // 按日期分组待办
  // ============================================
  const groupedTodos = filteredTodos.reduce((acc, todo) => {
    const date = todo.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(todo);
    return acc;
  }, {} as Record<string, Todo[]>);

  // 获取排序后的日期列表
  const sortedDates = Object.keys(groupedTodos).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  // 对每天内的待办按开始时间排序
  Object.keys(groupedTodos).forEach(date => {
    groupedTodos[date].sort((a, b) => {
      return a.start_time.localeCompare(b.start_time);
    });
  });

  // ============================================
  // 渲染页面
  // ============================================
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    // 根容器：滚动区域
    // 移动端 pt-4 顶部留白，桌面端 pt-6
    <div className="h-full overflow-y-auto p-4 md:p-6 pt-8 md:pt-6">
      {/* ========== 顶部区域：标题 + 搜索栏 + 隐藏已完成开关 ========== */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">所有待办</h2>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHideCompleted(!hideCompleted)}
            className="gap-2"
          >
            {hideCompleted ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                显示已完成
              </>
            ) : (
              <>
                <Circle className="h-4 w-4" />
                隐藏已完成
              </>
            )}
          </Button>
        </div>

        {/* 搜索栏 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索待办标题、备注或截止日期..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery("")}
            >
              ×
            </Button>
          )}
        </div>

        {/* 搜索结果提示 */}
        {searchQuery && (
          <p className="text-sm text-muted-foreground">
            找到 {filteredTodos.length} 个待办
            {filteredTodos.length === 0 && "，试试其他关键词吧"}
          </p>
        )}
      </div>
      
      {sortedDates.length === 0 ? (
        // 空状态
        <div className="h-full flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              {searchQuery ? "没有找到匹配的待办事项" : "还没有待办事项"}
            </p>
            {searchQuery && (
              <Button variant="link" onClick={() => setSearchQuery("")}>
                清除搜索
              </Button>
            )}
          </div>
        </div>
      ) : (
        // 待办列表
        <div className="space-y-4 max-w-3xl mx-auto">
          {sortedDates.map((date) => {
            const dateTodos = groupedTodos[date];
            // 格式化日期显示
            const dateObj = new Date(date + "T00:00:00");
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            let dateLabel: string;
            if (dateObj.toDateString() === today.toDateString()) {
              dateLabel = "今天";
            } else if (dateObj.toDateString() === yesterday.toDateString()) {
              dateLabel = "昨天";
            } else {
              dateLabel = format(dateObj, "yyyy 年 MM 月 dd 日");
            }

            return (
              <div key={date}>
                {/* 日期分隔线 */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    {dateLabel} · {dateTodos.length} 个待办
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* 该日期的待办卡片 */}
                <div className="space-y-2">
                  {dateTodos.map((todo) => (
                    <Card
                      key={todo.id}
                      className={cn(
                        "transition-all border",
                        todo.completed && "opacity-60 grayscale bg-muted/30"
                      )}
                    >
                      <CardContent className="p-4 space-y-2">
                        {/* 复选框和标题行 */}
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={todo.completed}
                            onCheckedChange={() => handleToggleTodo(todo.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <h3 className={cn(
                              "font-medium break-words",
                              todo.completed && "line-through text-muted-foreground"
                            )}>
                              {todo.title}
                            </h3>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={() => handleDeleteTodo(todo.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        {/* 开始时间 */}
                        <p className={cn(
                          "text-sm text-muted-foreground",
                          todo.completed && "text-muted-foreground"
                        )}>
                          开始：{todo.start_time}
                        </p>

                        {/* 截止时间 */}
                        {todo.deadline && (
                          <p className={cn(
                            "text-sm text-muted-foreground",
                            todo.completed && "text-muted-foreground"
                          )}>
                            截止：{todo.deadline}
                          </p>
                        )}

                        {/* 备注区域（始终保留一行空间用于编辑图标） */}
                        <div className="relative min-h-[1.25rem]">
                          {todo.notes && (
                            <p className={cn(
                              "text-sm text-muted-foreground pr-6 break-words",
                              todo.completed && "text-muted-foreground"
                            )}>
                              {todo.notes}
                            </p>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 absolute right-0 top-0"
                            onClick={() => handleOpenEditNotes(todo)}
                            title="编辑备注"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========== 编辑备注对话框 ========== */}
      <Dialog open={isEditNotesDialogOpen} onOpenChange={setIsEditNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑备注</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">备注内容</label>
              <Textarea
                value={editNotesContent}
                onChange={(e) => setEditNotesContent(e.target.value)}
                placeholder="输入备注内容..."
                className="min-h-[120px]"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditNotesDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSaveNotes}>
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
