// ============================================
// 知识库页面组件
// 左侧显示文档列表，右侧显示文档编辑器
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
import { Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  
  // 当前选中的文档
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  
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

  // 当外部传入选中文档 ID 时，自动选中该文档
  useEffect(() => {
    if (selectedDocumentId) {
      const doc = documents.find(d => d.id === selectedDocumentId);
      if (doc) {
        setSelectedDoc(doc);
        setEditTitle(doc.title);
        setEditContent(doc.content);
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
      
      // 自动选中新创建的文档
      setSelectedDoc(doc);
      setEditTitle(doc.title);
      setEditContent(doc.content);
    } catch (error) {
      console.error("创建文档失败:", error);
    }
  };

  // 选择文档
  const handleSelectDocument = (doc: Document) => {
    setSelectedDoc(doc);
    setEditTitle(doc.title);
    setEditContent(doc.content);
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
      // 如果删除的是当前选中的文档，清空选中状态
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
      }
    } catch (error) {
      console.error("删除文档失败:", error);
    }
  };

  // ============================================
  // 渲染页面
  // ============================================
  return (
    // 根容器：水平布局，左侧文档列表 + 右侧编辑器
    <div className="flex h-full">
      
      {/* ========== 左侧：文档列表 ========== */}
      <div className="w-96 border-r p-6 overflow-y-auto">
        {/* 标题和新建按钮 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">知识库</h2>
          
          {/* 新建文档对话框 */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon">
                <Plus className="h-4 w-4" />  {/* 加号图标 */}
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

        {/* ========== 文档列表：按日期分组 ========== */}
        <div className="space-y-4">
          {documents.length === 0 ? (
            // 空状态提示
            <p className="text-muted-foreground text-sm text-center py-8">
              还没有文档，点击右上角创建
            </p>
          ) : (
            // 按日期分组显示文档
            sortedDates.map((date) => {
              const dateDocs = groupedDocuments[date];
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
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {dateLabel} · {dateDocs.length} 个文档
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* 该日期的文档卡片 */}
                  <div className="space-y-2">
                    {dateDocs.map((doc) => (
                      <Card
                        key={doc.id}
                        // 卡片样式：可点击、悬停效果、选中高亮
                        className={cn(
                          "cursor-pointer hover:bg-accent/15",
                          selectedDoc?.id === doc.id ? "bg-accent/20" : ""
                        )}
                        onClick={() => handleSelectDocument(doc)}
                      >
                        <CardContent className="p-3">
                          {/* 文档标题 */}
                          <h3 className="font-medium truncate">{doc.title}</h3>
                          {/* 最后更新时间 */}
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

      {/* ========== 右侧：文档编辑器 ========== */}
      <div className="flex-1 p-6 overflow-y-auto">
        {selectedDoc ? (
          // 编辑器区域
          <div className="h-full flex flex-col">
            {/* 标题输入和保存/删除/打开按钮 */}
            <div className="flex items-center justify-between mb-4">
              {/* 标题输入框 */}
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xl font-semibold border-none focus-visible:ring-0 px-0"
              />

              {/* 操作按钮 */}
              <div className="flex gap-2">
                {/* 用 Notepad4 打开（暂未启用） */}
                {/* <Button
                  variant="outline"
                  onClick={() => openDocumentWithEditor(selectedDoc.id)}
                  title="用外部编辑器打开"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  用 Notepad4 打开
                </Button> */}

                {/* 保存按钮 */}
                <Button onClick={handleSaveDocument}>保存</Button>

                {/* 删除按钮 */}
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDeleteDocument(selectedDoc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 内容编辑区域 */}
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="开始编写文档内容..."
              className="text-xl focus-visible:ring-0 flex-1 resize-none leading-relaxed"
            />
          </div>
        ) : (
          // 未选择文档时的提示
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p>选择或创建一个文档开始编写</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// 工具函数：合并类名
// ============================================
