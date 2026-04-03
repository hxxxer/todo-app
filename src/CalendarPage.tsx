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
import { Trash2, Link, Unlink, ExternalLink, FileText, Pencil, Plus } from "lucide-react";
import { CalendarMonthView } from "@/components/CalendarMonthView";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { DocumentSelectorDialog } from "@/components/DocumentSelectorDialog";
import { YearView } from "@/components/YearView";

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
  const [newTodoStartTime, setNewTodoStartTime] = useState("");  // 开始时间（HH:mm）
  const [newTodoDeadline, setNewTodoDeadline] = useState("");  // 截止时间（YYYY-MM-DDTHH:mm）
  const [newTodoNotes, setNewTodoNotes] = useState("");        // 备注

  // 编辑待办对话框状态
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editNotes, setEditNotes] = useState("");

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
    if (!selectedDate || !newTodoTitle.trim() || !newTodoStartTime.trim()) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    
    // 将截止时间从 "YYYY-MM-DDTHH:mm" 转换为 "YYYY-MM-DD HH:mm"
    let deadlineStr: string | null = null;
    if (newTodoDeadline) {
      deadlineStr = newTodoDeadline.replace("T", " ");
    }
    
    try {
      const todo = await createTodo(
        newTodoTitle,
        dateStr,
        newTodoStartTime,
        deadlineStr,
        newTodoNotes || null
      );
      setAllTodos([todo, ...allTodos]);  // 更新所有待办列表
      setNewTodoTitle("");
      setNewTodoStartTime("");
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

  // 打开编辑待办对话框
  const handleOpenEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setEditTitle(todo.title);
    setEditStartTime(todo.start_time);
    // deadline 从 "YYYY-MM-DD HH:mm" 转为 "YYYY-MM-DDTHH:mm"
    setEditDeadline(todo.deadline ? todo.deadline.replace(" ", "T") : "");
    setEditNotes(todo.notes || "");
    setIsEditDialogOpen(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingTodo || !editTitle.trim() || !editStartTime.trim()) return;

    try {
      const deadlineStr = editDeadline ? editDeadline.replace("T", " ") : null;

      await updateTodo(
        editingTodo.id,
        editTitle,
        editStartTime,
        deadlineStr,
        editNotes || null
      );

      const updatedTodo = {
        ...editingTodo,
        title: editTitle,
        start_time: editStartTime,
        deadline: deadlineStr,
        notes: editNotes || null
      };

      // 更新当前待办列表
      setTodos(todos.map(t =>
        t.id === editingTodo.id ? updatedTodo : t
      ));
      // 更新所有待办列表
      setAllTodos(allTodos.map(t =>
        t.id === editingTodo.id ? updatedTodo : t
      ));

      setIsEditDialogOpen(false);
      setEditingTodo(null);
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  // 关联文档到待办（支持多选）
  const handleLinkDocuments = async (todoId: number, documentIds: number[]) => {
    try {
      // 获取当前已关联的文档 ID 列表
      const currentLinkedDocs = linkedDocsMap.get(todoId) || [];
      const currentLinkedIds = currentLinkedDocs.map(d => d.id);

      // 计算需要新增和删除的文档 ID
      const idsToAdd = documentIds.filter(id => !currentLinkedIds.includes(id));
      const idsToRemove = currentLinkedIds.filter(id => !documentIds.includes(id));

      // 执行关联操作
      for (const id of idsToAdd) {
        await linkDocumentToTodo(todoId, id);
      }

      // 执行取消关联操作
      for (const id of idsToRemove) {
        await unlinkDocumentFromTodo(todoId, id);
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
  const handleUnlinkDocument = async (todoId: number, documentId: number) => {
    try {
      await unlinkDocumentFromTodo(todoId, documentId);
      // 只更新这个待办的关联文档
      const updated = await getLinkedDocuments(todoId);
      setLinkedDocsMap(prev => new Map(prev).set(todoId, updated));
    } catch (error) {
      console.error("取消关联失败:", error);
    }
  };

  // 跳转到文档页面
  const handleNavigateToDocument = (docId: number) => {
    if (onNavigateToKnowledge) {
      onNavigateToKnowledge(docId);
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
    // 根容器：水平布局（桌面端）/ 垂直布局（移动端）
    <div className="flex h-full md:flex-row flex-col">

      {/* ========== 日历区域 ========== */}
      <div className={cn(
        "p-4 flex flex-col",
        // 移动端：占满宽度
        "md:w-full w-full",
        "md:h-full", 
        // 移动端：月视图时高度约 50%，年视图时占满
        viewMode === "month" ? "md:h-full h-[50vh]" : "md:h-full h-full",
        // 桌面端：根据视图模式调整宽度
        // viewMode === "month" ? "md:w-1/2" : "md:w-full"
      )}>
        {/* 日历视图 */}
        <div className="flex-1 overflow-hidden">
          {viewMode === "month" ? (
            <>
              {/* 桌面端月视图 */}
              <div className="hidden md:block h-full">
                <CalendarMonthView
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  todos={allTodos}
                  mobile={false}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                />
              </div>
              {/* 移动端月视图 */}
              <div className="md:hidden h-full">
                <CalendarMonthView
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  todos={allTodos}
                  mobile={true}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                />
              </div>
            </>
          ) : (
            <YearView
              selectedYear={selectedYear}
              onYearChange={handleYearChange}
              onMonthSelect={handleMonthSelect}
              onViewModeChange={setViewMode}
            />
          )}
        </div>
      </div>

      {/* ========== 右侧：待办事项列表（桌面端）========== */}
      {viewMode === "month" && (
        <div className="hidden md:block w-96 border-l p-6 overflow-y-auto">
          {selectedDate ? (
            <div className="space-y-4">
              {/* 日期标题和新建按钮 */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {format(selectedDate, "yyyy 年 MM 月 dd 日")}
                </h2>
              
              {/* 新建待办对话框 */}
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">新建待办</Button>
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

                    {/* 开始时间输入框 */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">开始时间 *</label>
                      <Input
                        type="time"
                        value={newTodoStartTime}
                        onChange={(e) => setNewTodoStartTime(e.target.value)}
                      />
                    </div>

                    {/* 截止时间输入框 */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">截止时间</label>
                      <Input
                        type="datetime-local"
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
                    todo.completed ? "opacity-60 grayscale" : "", 
                    "cursor-pointer border"
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

                      {/* 开始时间 */}
                      <p className="text-sm text-muted-foreground">
                        开始：{todo.start_time}
                      </p>

                      {/* 截止时间 */}
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
                          onClick={() => handleOpenEdit(todo)}
                          title="编辑待办"
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
                                    onClick={() => handleNavigateToDocument(doc.id)}
                                    title="跳转到文档"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => handleUnlinkDocument(todo.id, doc.id)}
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

      {/* ========== 移动端：底部待办列表 ========== */}
      {viewMode === "month" && (
        <div className="md:hidden flex flex-col border-t flex-1 overflow-hidden">
          {selectedDate ? (
            <>
              {/* 标题栏：日期 + 新建按钮 */}
              <div className="flex items-center justify-between p-4 flex-shrink-0 mb-2">
                <h2 className="text-lg font-semibold">
                  {format(selectedDate, "MM 月 dd 日")}
                </h2>

                {/* 新建待办对话框 */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
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

                      {/* 开始时间输入框 */}
                      <div>
                        <label className="text-sm font-medium mb-1 block">开始时间 *</label>
                        <Input
                          type="time"
                          value={newTodoStartTime}
                          onChange={(e) => setNewTodoStartTime(e.target.value)}
                        />
                      </div>

                      {/* 截止时间输入框 */}
                      <div>
                        <label className="text-sm font-medium mb-1 block">截止时间</label>
                        <Input
                          type="datetime-local"
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

              {/* 待办列表区域 */}
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="space-y-2">
                  {todos.length === 0 ? (
                    // 空状态提示
                    <p className="text-muted-foreground text-sm text-center py-8">
                      这一天还没有待办事项
                    </p>
                  ) : (
                    // 待办卡片列表
                    todos.map((todo) => (
                      <Card key={todo.id} className={cn(
                        todo.completed ? "opacity-60 grayscale" : "", 
                        "cursor-pointer border"
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

                          {/* 开始时间 */}
                          <p className="text-sm text-muted-foreground">
                            开始：{todo.start_time}
                          </p>

                          {/* 截止时间 */}
                          {todo.deadline && (
                            <p className="text-sm text-muted-foreground">
                              截止：{todo.deadline}
                            </p>
                          )}

                          {/* 备注区域 */}
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
                              onClick={() => handleOpenEdit(todo)}
                              title="编辑待办"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* 关联文档区域 */}
                          <div className="pt-2 border-t">
                            <div className="flex items-center gap-2 mb-2">
                              <Link className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">关联文档</span>
                            </div>

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
                                        onClick={() => handleNavigateToDocument(doc.id)}
                                        title="跳转到文档"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5"
                                        onClick={() => handleUnlinkDocument(todo.id, doc.id)}
                                        title="断开关联"
                                      >
                                        <Unlink className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

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
            </>
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
        selectedDocumentIds={currentTodoIdForLink ? (linkedDocsMap.get(currentTodoIdForLink)?.map(d => d.id) || []) : []}
        onConfirm={(ids) => {
          if (currentTodoIdForLink) {
            handleLinkDocuments(currentTodoIdForLink, ids);
          }
        }}
      />

      {/* ========== 编辑待办对话框 ========== */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑待办</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 标题 */}
            <div>
              <label className="text-sm font-medium mb-1 block">标题</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="输入待办标题"
              />
            </div>

            {/* 开始时间 */}
            <div>
              <label className="text-sm font-medium mb-1 block">开始时间 *</label>
              <Input
                type="time"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
              />
            </div>

            {/* 截止时间 */}
            <div>
              <label className="text-sm font-medium mb-1 block">截止时间</label>
              <Input
                type="datetime-local"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
              />
            </div>

            {/* 备注 */}
            <div>
              <label className="text-sm font-medium mb-1 block">备注</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="输入备注信息"
                rows={3}
              />
            </div>

            {/* 按钮 */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSaveEdit}>
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
