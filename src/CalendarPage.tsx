// ============================================
// 日历页面组件
// 显示日历视图和选中日期的待办事项
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Todo, Document, createTodo, listTodos, deleteTodo, toggleTodo, updateTodo, linkDocumentToTodo, unlinkDocumentFromTodo, getLinkedDocuments, getAllDocumentsForSelection } from "@/lib/commands";
import { format } from "date-fns";
import { Trash2, Link, Unlink, ExternalLink, FileText, Calendar, Grid3x3, Pencil } from "lucide-react";
import { CalendarMonthView } from "@/components/CalendarMonthView";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { DocumentSelectorDialog } from "@/components/DocumentSelectorDialog";
import { YearView } from "@/components/YearView";
import { Toggle } from "@/components/ui/toggle";

interface CalendarPageProps {
  onNavigateToKnowledge?: (docId: number) => void;
}

export function CalendarPage({ onNavigateToKnowledge }: CalendarPageProps) {
  // ============================================
  // 状态管理
  // ============================================
  // 视图模式：'month' = 月视图，'year' = 年视图
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  
  // 选中的日期（用户在日历上点击的日期）
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // 年视图选中的年份
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // 选中日期的待办事项（用于右侧列表显示）
  const [todos, setTodos] = useState<Todo[]>([]);
  
  // 所有待办事项（用于日历横条显示）
  const [allTodos, setAllTodos] = useState<Todo[]>([]);
  
  // 每个待办关联的文档列表（使用 Map 存储，key 为 todoId）
  const [linkedDocsMap, setLinkedDocsMap] = useState<Map<number, Document[]>>(new Map());

  // 所有文档（用于下拉选择）
  const [allDocs, setAllDocs] = useState<Document[]>([]);

  // 文档选择器弹窗状态
  const [isDocSelectorOpen, setIsDocSelectorOpen] = useState(false);
  const [currentTodoIdForLink, setCurrentTodoIdForLink] = useState<number | null>(null);

  // 创建待办对话框是否打开
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // 新建待办的表单数据
  const [newTodoTitle, setNewTodoTitle] = useState("");        // 标题
  const [newTodoDeadline, setNewTodoDeadline] = useState("");  // 截止日期
  const [newTodoNotes, setNewTodoNotes] = useState("");        // 备注

  // 编辑备注对话框状态
  const [isEditNotesDialogOpen, setIsEditNotesDialogOpen] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editNotesContent, setEditNotesContent] = useState("");

  // ============================================
  // 数据加载
  // ============================================
  // 加载所有文档（用于关联文档下拉选择）
  useEffect(() => {
    getAllDocumentsForSelection().then(setAllDocs).catch(console.error);
  }, []);

  // 加载所有待办（用于日历横条显示）
  useEffect(() => {
    listTodos().then(setAllTodos).catch(console.error);
  }, []);

  // 当选中的日期变化时，筛选该日期的待办
  useEffect(() => {
    if (selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const filtered = allTodos.filter(t => t.date === dateStr);
      setTodos(filtered);
    } else {
      setTodos([]);
    }
  }, [selectedDate, allTodos]);

  // 加载每个待办的关联文档
  useEffect(() => {
    if (selectedDate && todos.length > 0) {
      // 为每个待办加载关联文档
      const loadDocs = async () => {
        const newMap = new Map<number, Document[]>();
        for (const todo of todos) {
          try {
            const docs = await getLinkedDocuments(todo.id);
            newMap.set(todo.id, docs);
          } catch (error) {
            console.error(`加载待办 ${todo.id} 的关联文档失败:`, error);
            newMap.set(todo.id, []);
          }
        }
        setLinkedDocsMap(newMap);
      };
      loadDocs();
    } else {
      setLinkedDocsMap(new Map());
    }
  }, [selectedDate, todos]);

  // ============================================
  // 事件处理函数
  // ============================================
  // 创建待办
  const handleCreateTodo = async () => {
    if (!selectedDate || !newTodoTitle.trim()) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    try {
      const todo = await createTodo(
        newTodoTitle,
        dateStr,
        newTodoDeadline || null,
        newTodoNotes || null
      );
      setAllTodos([todo, ...allTodos]);  // 更新所有待办列表
      setNewTodoTitle("");
      setNewTodoDeadline("");
      setNewTodoNotes("");
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error("创建待办失败:", error);
    }
  };

  // 删除待办
  const handleDeleteTodo = async (id: number) => {
    try {
      await deleteTodo(id);
      setTodos(todos.filter(t => t.id !== id));      // 更新当前日期待办列表
      setAllTodos(allTodos.filter(t => t.id !== id)); // 更新所有待办列表
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
        todo.deadline || null,
        editNotesContent
      );

      // 更新当前待办列表
      setTodos(todos.map(t =>
        t.id === editingTodoId ? { ...t, notes: editNotesContent || null } : t
      ));
      // 更新所有待办列表
      setAllTodos(allTodos.map(t =>
        t.id === editingTodoId ? { ...t, notes: editNotesContent || null } : t
      ));

      setIsEditNotesDialogOpen(false);
      setEditingTodoId(null);
      setEditNotesContent("");
    } catch (error) {
      console.error("保存备注失败:", error);
    }
  };

  // 关联文档到待办（支持多选）
  const handleLinkDocuments = async (todoId: number, documentTitles: string[]) => {
    try {
      // 获取当前已关联的文档标题列表
      const currentLinkedDocs = linkedDocsMap.get(todoId) || [];
      const currentLinkedTitles = currentLinkedDocs.map(d => d.title);

      // 计算需要新增和删除的文档标题
      const titlesToAdd = documentTitles.filter(title => !currentLinkedTitles.includes(title));
      const titlesToRemove = currentLinkedTitles.filter(title => !documentTitles.includes(title));

      // 执行关联操作
      for (const title of titlesToAdd) {
        await linkDocumentToTodo(todoId, title);
      }

      // 执行取消关联操作
      for (const title of titlesToRemove) {
        await unlinkDocumentFromTodo(todoId, title);
      }

      // 更新关联文档列表
      const updated = await getLinkedDocuments(todoId);
      setLinkedDocsMap(prev => new Map(prev).set(todoId, updated));
    } catch (error) {
      console.error("关联文档失败:", error);
    }
  };

  // 打开文档选择器
  const handleOpenDocSelector = (todoId: number) => {
    setCurrentTodoIdForLink(todoId);
    setIsDocSelectorOpen(true);
  };

  // 取消关联文档
  const handleUnlinkDocument = async (todoId: number, documentTitle: string) => {
    try {
      await unlinkDocumentFromTodo(todoId, documentTitle);
      // 只更新这个待办的关联文档
      const updated = await getLinkedDocuments(todoId);
      setLinkedDocsMap(prev => new Map(prev).set(todoId, updated));
    } catch (error) {
      console.error("取消关联失败:", error);
    }
  };

  // 跳转到文档页面
  const handleNavigateToDocument = (docTitle: string) => {
    // 根据标题查找文档 ID
    const doc = allDocs.find(d => d.title === docTitle);
    if (doc && onNavigateToKnowledge) {
      onNavigateToKnowledge(doc.id);
    }
  };

  // 年视图：切换年份
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  // 年视图：点击月份跳转到月视图
  const handleMonthSelect = (year: number, month: number) => {
    // 跳转到月视图，并选中该月的第一天
    const newDate = new Date(year, month - 1, 1);
    setSelectedDate(newDate);
    setViewMode("month");
  };

  // 切换待办完成状态
  const handleToggleTodo = async (id: number) => {
    try {
      const newCompleted = await toggleTodo(id);
      // 更新所有待办列表
      setAllTodos(allTodos.map(t => t.id === id ? { ...t, completed: newCompleted } : t));
      // 更新当前日期待办列表
      setTodos(todos.map(t => t.id === id ? { ...t, completed: newCompleted } : t));
    } catch (error) {
      console.error("切换完成状态失败:", error);
    }
  };

  // ============================================
  // 渲染页面
  // ============================================
  return (
    // 根容器：水平布局，左侧日历 + 右侧待办列表
    <div className="flex h-full">

      {/* ========== 左侧：日历区域 ========== */}
      <div className="h-full w-full p-4 flex flex-col">
        {/* 视图切换按钮 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Toggle
              pressed={viewMode === "month"}
              onPressedChange={() => setViewMode(viewMode === "month" ? "year" : "month")}
              size="sm"
              className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            >
              {viewMode === "month" ? (
                <span className="flex items-center gap-2">
                  <Grid3x3 className="h-4 w-4" />
                  年视图
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  月视图
                </span>
              )}
            </Toggle>
          </div>
        </div>
        
        {/* 日历视图 */}
        <div className="flex-1 overflow-hidden">
          {viewMode === "month" ? (
            <CalendarMonthView
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              todos={allTodos}
            />
          ) : (
            <YearView
              selectedYear={selectedYear}
              onYearChange={handleYearChange}
              onMonthSelect={handleMonthSelect}
            />
          )}
        </div>
      </div>

      {/* ========== 右侧：待办事项列表 ========== */}
      {/* 年视图下隐藏右侧待办列表 */}
      {viewMode === "month" && (
        <div className="w-96 border-l p-6 overflow-y-auto">
          {selectedDate ? (
            <div className="space-y-4">
              {/* 日期标题和新建按钮 */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {format(selectedDate, "yyyy 年 MM 月 dd 日")}
                </h2>
              
              {/* 新建待办对话框 */}
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger>
                  <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>新建待办</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>创建待办事项</DialogTitle>
                  </DialogHeader>
                  
                  {/* 创建待办表单 */}
                  <div className="space-y-4 py-4">
                    {/* 标题输入框 */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">标题</label>
                      <Input
                        value={newTodoTitle}
                        onChange={(e) => setNewTodoTitle(e.target.value)}
                        placeholder="输入待办标题"
                      />
                    </div>
                    
                    {/* 截止日期输入框 */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">截止日期</label>
                      <Input
                        type="date"
                        value={newTodoDeadline}
                        onChange={(e) => setNewTodoDeadline(e.target.value)}
                      />
                    </div>
                    
                    {/* 备注输入框 */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">备注</label>
                      <Textarea
                        value={newTodoNotes}
                        onChange={(e) => setNewTodoNotes(e.target.value)}
                        placeholder="输入备注信息"
                        rows={3}
                      />
                    </div>
                    
                    {/* 创建按钮 */}
                    <Button onClick={handleCreateTodo} className="w-full">
                      创建
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* ========== 待办事项列表 ========== */}
            <div className="space-y-3">
              {todos.length === 0 ? (
                // 空状态提示
                <p className="text-muted-foreground text-sm text-center py-8">
                  这一天还没有待办事项
                </p>
              ) : (
                // 待办卡片列表
                todos.map((todo) => (
                  <Card key={todo.id} className={cn(
                    todo.completed ? "opacity-60 grayscale" : ""
                  )}>
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
                            "font-medium",
                            todo.completed && "line-through text-muted-foreground"
                          )}>{todo.title}</h3>
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

                      {/* 截止日期 */}
                      {todo.deadline && (
                        <p className="text-sm text-muted-foreground">
                          截止：{todo.deadline}
                        </p>
                      )}

                      {/* 备注区域（始终保留一行空间用于编辑图标） */}
                      <div className="relative min-h-[1.25rem]">
                        {todo.notes && (
                          <p className="text-sm text-muted-foreground pr-6 break-words">
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

                      {/* ========== 关联文档区域 ========== */}
                      <div className="pt-2 border-t">
                        {/* 标题 */}
                        <div className="flex items-center gap-2 mb-2">
                          <Link className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">关联文档</span>
                        </div>

                        {/* 已关联的文档列表 */}
                        {linkedDocsMap.get(todo.id) && linkedDocsMap.get(todo.id)!.length > 0 && (
                          <div className="space-y-1 mb-2">
                            {linkedDocsMap.get(todo.id)!.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between text-xs gap-1">
                                <span className="text-muted-foreground truncate flex-1">{doc.title}</span>
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => handleNavigateToDocument(doc.title)}
                                    title="跳转到文档"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => handleUnlinkDocument(todo.id, doc.title)}
                                    title="断开关联"
                                  >
                                    <Unlink className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 添加关联文档按钮 */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8"
                          onClick={() => handleOpenDocSelector(todo.id)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          选择文档
                          {linkedDocsMap.get(todo.id) && linkedDocsMap.get(todo.id)!.length > 0 && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({linkedDocsMap.get(todo.id)!.length})
                            </span>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : (
          // 未选择日期时的提示
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p>请选择一个日期</p>
          </div>
        )}
      </div>
      )}

      {/* ========== 文档选择器弹窗 ========== */}
      <DocumentSelectorDialog
        open={isDocSelectorOpen}
        onOpenChange={setIsDocSelectorOpen}
        documents={allDocs}
        selectedDocumentTitles={currentTodoIdForLink ? (linkedDocsMap.get(currentTodoIdForLink)?.map(d => d.title) || []) : []}
        onConfirm={(titles) => {
          if (currentTodoIdForLink) {
            handleLinkDocuments(currentTodoIdForLink, titles);
          }
        }}
      />

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
