// ============================================
// 知识库页面组件
// 列表/详情分离模式：
// - 列表视图：显示所有文档
// - 编辑视图：点击文档后进入编辑模式
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
import { Document, createDocument, listDocuments, updateDocument, deleteDocument } from "@/lib/commands";
import { Trash2, Plus, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { onBackButtonPress } from "@tauri-apps/api/app";
import { PluginListener } from "@tauri-apps/api/core";

interface KnowledgePageProps {
  selectedDocumentId?: number | null;
  onDocumentSelected?: (docId: number | null) => void;
}

export function KnowledgePage({ selectedDocumentId, onDocumentSelected }: KnowledgePageProps) {
  // ============================================
  // 状态管理
  // ============================================
  // 所有文档列表
  const [documents, setDocuments] = useState<Document[]>([]);

  // 当前选中的文档（列表视图选中）
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  // 是否进入编辑模式
  const [isEditing, setIsEditing] = useState(false);

  // 创建文档对话框是否打开
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // 新建文档的标题
  const [newDocTitle, setNewDocTitle] = useState("");

  // 编辑中的文档标题和内容
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // ============================================
  // 数据加载
  // ============================================
  // 组件挂载时加载所有文档
  useEffect(() => {
    loadDocuments();
  }, []);

  // 当外部传入选中文档 ID 时，自动选中该文档并进入编辑模式
  useEffect(() => {
    if (selectedDocumentId) {
      const doc = documents.find(d => d.id === selectedDocumentId);
      if (doc) {
        setSelectedDoc(doc);
        setEditTitle(doc.title);
        setEditContent(doc.content);
        setIsEditing(true);
        onDocumentSelected?.(null);  // 通知父组件已处理
      }
    }
  }, [selectedDocumentId, documents]);

  // 加载文档列表
  const loadDocuments = async () => {
    try {
      const docs = await listDocuments();
      // 按最后修改时间倒序排序
      const sorted = docs.sort((a, b) => {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
      setDocuments(sorted);
      // 如果之前选中了文档，更新选中的文档信息
      if (selectedDoc) {
        const updated = sorted.find(d => d.id === selectedDoc.id);
        setSelectedDoc(updated || null);
      }
    } catch (error) {
      console.error("加载文档失败:", error);
    }
  };

  // ============================================
  // 按日期分组文档
  // ============================================
  const groupedDocuments = documents.reduce((acc, doc) => {
    const date = doc.updated_at.split("T")[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  // 获取排序后的日期列表
  const sortedDates = Object.keys(groupedDocuments).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  // ============================================
  // 事件处理函数
  // ============================================
  // 创建新文档
  const handleCreateDocument = async () => {
    if (!newDocTitle.trim()) return;  // 标题不能为空

    try {
      const doc = await createDocument(newDocTitle, "");  // 创建空内容文档
      setDocuments([doc, ...documents]);  // 更新文档列表
      setNewDocTitle("");  // 清空输入框
      setIsCreateDialogOpen(false);  // 关闭对话框

      // 自动选中并进入编辑模式
      setSelectedDoc(doc);
      setEditTitle(doc.title);
      setEditContent(doc.content);
      setIsEditing(true);
    } catch (error) {
      console.error("创建文档失败:", error);
    }
  };

  // 选择文档（进入编辑模式）
  const handleSelectDocument = (doc: Document) => {
    setSelectedDoc(doc);
    setEditTitle(doc.title);
    setEditContent(doc.content);
    setIsEditing(true);
  };

  // 返回列表视图
  const handleBackToList = () => {
    setIsEditing(false);
    setSelectedDoc(null);
  };

  // 保存文档
  const handleSaveDocument = async () => {
    if (!selectedDoc) return;

    try {
      await updateDocument(selectedDoc.id, editTitle, editContent);
      // 重新加载文档列表以获取最新信息
      const docs = await listDocuments();
      // 按最后修改时间倒序排序
      const sorted = docs.sort((a, b) => {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
      setDocuments(sorted);
      // 使用 ID 查找更新后的文档（因为标题可能已更改）
      const updatedDoc = sorted.find(d => d.id === selectedDoc.id);
      if (updatedDoc) {
        setSelectedDoc(updatedDoc);
        setEditTitle(updatedDoc.title);
        setEditContent(updatedDoc.content);
      }
    } catch (error) {
      console.error("保存文档失败:", error);
    }
  };

  // 删除文档
  const handleDeleteDocument = async (id: number) => {
    try {
      await deleteDocument(id);
      // 重新加载文档列表
      await loadDocuments();
      // 如果删除的是当前选中的文档，返回列表视图
      if (selectedDoc?.id === id) {
        handleBackToList();
      }
    } catch (error) {
      console.error("删除文档失败:", error);
    }
  };

  // ============================================
  // 渲染页面
  // ============================================
  
  // ============================================
  // 桌面端：左右分栏布局（列表 + 编辑器同时显示）
  // ============================================
  const DesktopSplitView = () => (
    <div className="hidden md:flex h-full">
      {/* 左侧：文档列表 */}
      <div className="w-80 border-r overflow-y-auto flex-shrink-0">
        {/* 标题和新建按钮 */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-background z-10">
          <h2 className="text-lg font-semibold">知识库</h2>

          {/* 新建文档对话框 */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建文档</DialogTitle>
              </DialogHeader>

              {/* 创建文档表单 */}
              <div className="space-y-4 py-4">
                {/* 标题输入框 */}
                <div>
                  <label className="text-sm font-medium mb-1 block">标题</label>
                  <Input
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    placeholder="输入文档标题"
                  />
                </div>

                {/* 创建按钮 */}
                <Button onClick={handleCreateDocument} className="w-full">
                  创建
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 文档列表 */}
        <div className="p-6 space-y-6">
          {documents.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              还没有文档，点击右上角创建
            </p>
          ) : (
            sortedDates.map((date) => {
              const dateDocs = groupedDocuments[date];
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
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {dateLabel} · {dateDocs.length} 个文档
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div className="space-y-2">
                    {dateDocs.map((doc) => (
                      <Card
                        key={doc.id}
                        className={cn(
                          "cursor-pointer hover:bg-accent/15 transition-colors border",
                          selectedDoc?.id === doc.id ? "bg-accent/20" : ""
                        )}
                        onClick={() => handleSelectDocument(doc)}
                      >
                        <CardContent className="p-3">
                          <h3 className="font-medium truncate">{doc.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(doc.updated_at), "HH:mm")}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 右侧：编辑器 */}
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        {selectedDoc ? (
          <div className="h-full flex flex-col border rounded-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xl font-semibold border-none focus-visible:ring-0 px-0"
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveDocument}>保存</Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDeleteDocument(selectedDoc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="开始编写文档内容..."
              className="flex-1 resize-none border-0 focus-visible:ring-0 p-4 text-base leading-relaxed"
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground border rounded-lg p-8">
            <p>选择或创建一个文档开始编写</p>
          </div>
        )}
      </div>
    </div>
  );

  // ============================================
  // 移动端：列表/详情分离布局
  // ============================================

  // 监听 Android 硬件返回键（仅编辑模式下）
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

  // 编辑视图（仅移动端）
  if (isEditing && selectedDoc) {
    return (
      <>
        {/* 桌面端隐藏此视图 */}
        <div className="md:hidden flex h-full flex-col overflow-hidden p-3">
          {/* 顶部导航栏：返回按钮 + 标题 + 操作按钮 */}
          <div className="flex items-center justify-between pt-3 pb-3 pr-3 flex-shrink-0">
            {/* 左侧：返回按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToList}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            {/* 中间：标题输入 */}
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-base font-semibold border-none focus-visible:ring-0 px-2 text-center max-w-[180px]"
              placeholder="文档标题"
            />

            {/* 右侧：保存和删除按钮 */}
            <div className="flex gap-1">
              <Button onClick={handleSaveDocument} size="sm" className="h-9">保存</Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => handleDeleteDocument(selectedDoc.id)}
                className="h-9 w-9"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 内容编辑区域：占满剩余空间，带边框和内边距 */}
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="开始编写文档内容..."
            className="flex-1 resize-none border-x border-b rounded-b-lg focus-visible:ring-0 p-3 text-base leading-relaxed"
          />
        </div>

        {/* 桌面端：在编辑视图时也显示分栏布局 */}
        <div className="hidden md:block h-full">
          <DesktopSplitView />
        </div>
      </>
    );
  }

  // 列表视图（仅移动端）
  return (
    <>
      {/* 桌面端隐藏此视图 */}
      <div className="md:hidden flex h-full flex-col overflow-hidden">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h2 className="text-2xl font-semibold">知识库</h2>

          {/* 新建文档按钮 */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" className="h-10 w-10">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建文档</DialogTitle>
              </DialogHeader>

              {/* 创建文档表单 */}
              <div className="space-y-4 py-4">
                {/* 标题输入框 */}
                <div>
                  <label className="text-sm font-medium mb-1 block">标题</label>
                  <Input
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    placeholder="输入文档标题"
                  />
                </div>

                {/* 创建按钮 */}
                <Button onClick={handleCreateDocument} className="w-full">
                  创建
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 文档列表：可滚动区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {documents.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p className="text-center">
                还没有文档<br />
                点击右上角创建
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((date) => {
                const dateDocs = groupedDocuments[date];
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
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {dateLabel} · {dateDocs.length} 个文档
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <div className="space-y-2">
                      {dateDocs.map((doc) => (
                        <Card
                          key={doc.id}
                          className={cn(
                            "cursor-pointer hover:bg-accent/15 transition-colors border",
                            selectedDoc?.id === doc.id ? "bg-accent/20" : ""
                          )}
                          onClick={() => handleSelectDocument(doc)}
                        >
                          <CardContent className="p-4">
                            <h3 className="font-medium text-base">{doc.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(doc.updated_at), "yyyy-MM-dd HH:mm")}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 桌面端：始终显示分栏布局 */}
      <div className="hidden md:block h-full">
        <DesktopSplitView />
      </div>
    </>
  );
}

// ============================================
// 工具函数：合并类名
// ============================================
