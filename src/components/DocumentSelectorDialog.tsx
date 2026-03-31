// ============================================
// 文档选择器弹窗组件
// 支持多选和搜索功能
// ============================================

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Document } from "@/lib/commands";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: Document[];
  selectedDocumentIds: number[];
  onConfirm: (documentIds: number[]) => void;
}

export function DocumentSelectorDialog({
  open,
  onOpenChange,
  documents,
  selectedDocumentIds,
  onConfirm,
}: DocumentSelectorDialogProps) {
  // ============================================
  // 状态管理
  // ============================================
  // 搜索关键词
  const [searchQuery, setSearchQuery] = useState("");

  // 本地选中的文档 ID 列表（用于多选）
  const [localSelectedIds, setLocalSelectedIds] = useState<number[]>([]);

  // ============================================
  // 初始化选中状态
  // ============================================
  useEffect(() => {
    if (open) {
      setLocalSelectedIds(selectedDocumentIds);
      setSearchQuery("");
    }
  }, [open, selectedDocumentIds]);

  // ============================================
  // 搜索过滤和排序
  // ============================================
  // 过滤并排序文档（按创建时间倒序，越新的越上面）
  const filteredDocuments = documents
    .filter(doc => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        doc.title.toLowerCase().includes(query) ||
        doc.content.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      // 按创建时间倒序排序
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // ============================================
  // 事件处理函数
  // ============================================
  // 切换文档选中状态
  const toggleDocument = (docId: number) => {
    setLocalSelectedIds(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (localSelectedIds.length === filteredDocuments.length) {
      // 取消全选
      setLocalSelectedIds([]);
    } else {
      // 全选当前过滤后的文档
      setLocalSelectedIds(filteredDocuments.map(d => d.id));
    }
  };

  // 确认选择
  const handleConfirm = () => {
    onConfirm(localSelectedIds);
    onOpenChange(false);
  };

  // 取消选择
  const handleCancel = () => {
    onOpenChange(false);
  };

  // ============================================
  // 渲染组件
  // ============================================
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>选择关联文档</DialogTitle>
        </DialogHeader>

        {/* ========== 搜索区域 ========== */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索文档标题或内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        {/* ========== 分隔线 ========== */}
        <div className="my-4 border-t" />

        {/* ========== 文档列表 ========== */}
        <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px]">
          {/* 全选按钮 */}
          <div className="sticky top-0 bg-background z-10 pb-2 mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="w-full justify-between"
            >
              <span>
                {localSelectedIds.length === filteredDocuments.length && filteredDocuments.length > 0
                  ? "取消全选"
                  : "全选"}
              </span>
              <span className="text-muted-foreground">
                已选 {localSelectedIds.length} / {filteredDocuments.length}
              </span>
            </Button>
          </div>

          {/* 文档列表 */}
          {filteredDocuments.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              {searchQuery ? "没有找到匹配的文档" : "还没有文档"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocuments.map((doc) => {
                const isSelected = localSelectedIds.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      isSelected && "bg-accent/20 border-accent"
                    )}
                    onClick={() => toggleDocument(doc.id)}
                  >
                    {/* 复选框 */}
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleDocument(doc.id)}
                      className="flex-shrink-0"
                    />

                    {/* 文档信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{doc.title}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {new Date(doc.updated_at).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========== 底部按钮 ========== */}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button onClick={handleConfirm}>
            确认
            {localSelectedIds.length > 0 && (
              <span className="ml-1 text-xs">({localSelectedIds.length})</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
