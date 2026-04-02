// 直接使用导入的 invoke（推荐方式）
// @tauri-apps/api/core 会自动处理 window.__TAURI__ 和 window.__TAURI_INTERNALS__
import { invoke } from "@tauri-apps/api/core";

// ============================================
// 待办事项接口
// ============================================
export interface Todo {
  id: number;           // 待办 ID
  title: string;        // 标题
  date: string;         // 日期（YYYY-MM-DD 格式）
  deadline: string | null;  // 截止日期
  notes: string | null;     // 备注
  completed: boolean;       // 是否已完成
  created_at: string;       // 创建时间
}

// ============================================
// 文档接口
// ============================================
export interface Document {
  id: number;           // 文档 ID
  title: string;        // 标题
  content: string;      // 内容
  created_at: string;   // 创建时间
  updated_at: string;   // 最后更新时间
}

// ============================================
// 初始化数据库
// ============================================
export async function initDb(): Promise<string> {
  return invoke("init_db");
}

// ============================================
// Todo API
// ============================================

/**
 * 创建新的待办事项
 */
export async function createTodo(
  title: string,
  date: string,
  deadline?: string | null,
  notes?: string | null,
  completed?: boolean
): Promise<Todo> {
  return invoke("create_todo", { title, date, deadline, notes, completed });
}

/**
 * 获取指定日期的待办事项（如果不传日期，获取所有待办）
 */
export async function listTodos(date?: string | null): Promise<Todo[]> {
  return invoke("list_todos", { date });
}

/**
 * 更新待办事项
 */
export async function updateTodo(
  id: number,
  title?: string | null,
  deadline?: string | null,
  notes?: string | null,
  completed?: boolean | null
): Promise<void> {
  return invoke("update_todo", { id, title, deadline, notes, completed });
}

/**
 * 切换待办事项的完成状态
 * @returns 新的完成状态
 */
export async function toggleTodo(id: number): Promise<boolean> {
  return invoke("toggle_todo", { id });
}

/**
 * 获取所有待办事项（按日期倒序排列）
 */
export async function getAllTodosOrdered(): Promise<Todo[]> {
  return invoke("get_all_todos_ordered");
}

/**
 * 删除待办事项
 */
export async function deleteTodo(id: number): Promise<void> {
  return invoke("delete_todo", { id });
}

// ============================================
// Document API
// ============================================

/**
 * 创建新文档
 */
export async function createDocument(
  title: string,
  content: string
): Promise<Document> {
  return invoke("create_document", { title, content });
}

/**
 * 获取所有文档列表
 */
export async function listDocuments(): Promise<Document[]> {
  return invoke("list_documents");
}

/**
 * 获取单个文档
 */
export async function getDocument(title: string): Promise<Document> {
  return invoke("get_document", { title });
}

/**
 * 更新文档
 */
export async function updateDocument(
  id: number,
  title?: string | null,
  content?: string | null
): Promise<void> {
  return invoke("update_document", { id, title, content });
}

/**
 * 删除文档
 */
export async function deleteDocument(id: number): Promise<void> {
  return invoke("delete_document", { id });
}

// ============================================
// Todo-Document Link API
// ============================================

/**
 * 关联文档到待办
 */
export async function linkDocumentToTodo(
  todoId: number,
  documentId: number
): Promise<void> {
  return invoke("link_document_to_todo", { todoId, documentId });
}

/**
 * 取消关联文档
 */
export async function unlinkDocumentFromTodo(
  todoId: number,
  documentId: number
): Promise<void> {
  return invoke("unlink_document_from_todo", { todoId, documentId });
}

/**
 * 获取待办关联的所有文档
 */
export async function getLinkedDocuments(todoId: number): Promise<Document[]> {
  return invoke("get_linked_documents", { todoId });
}

/**
 * 获取所有文档用于下拉选择
 */
export async function getAllDocumentsForSelection(): Promise<Document[]> {
  return invoke("get_all_documents_for_selection");
}

/**
 * 获取指定月份每天的待办数量
 * @param year 年份（如 2026）
 * @param month 月份（1-12）
 * @returns 对象，key 为日期（"01"-"31"），value 为待办数量
 */
export async function getTodosCountByMonth(
  year: number,
  month: number
): Promise<Record<string, number>> {
  return invoke("get_todos_count_by_month", { year, month });
}

/**
 * 用外部编辑器打开文档（暂未启用）
 */
// export async function openDocumentWithEditor(id: number): Promise<void> {
//   return invoke("open_document_with_editor", { id });
// }

// ============================================
// WebDAV 同步 API
// ============================================

/**
 * WebDAV 配置接口
 */
export interface WebDavConfig {
  server_url: string;     // 服务器地址
  username: string;       // 用户名
  password: string;       // 密码
  remote_path: string;    // 远程文件夹路径
}

/**
 * 同步状态接口
 */
export interface SyncStatus {
  is_syncing: boolean;
  last_sync_time: string | null;
  last_sync_result: string | null;
}

/**
 * 获取 WebDAV 配置
 */
export async function getWebDavConfig(): Promise<WebDavConfig | null> {
  return invoke("get_webdav_config");
}

/**
 * 保存 WebDAV 配置
 */
export async function saveWebDavConfig(
  serverUrl: string,
  username: string,
  password: string,
  remotePath: string
): Promise<void> {
  return invoke("save_webdav_config", { serverUrl, username, password, remotePath });
}

/**
 * 删除 WebDAV 配置
 */
export async function deleteWebDavConfig(): Promise<void> {
  return invoke("delete_webdav_config");
}

/**
 * 测试 WebDAV 连接
 */
export async function testWebDavConnection(): Promise<string> {
  return invoke("test_webdav_connection");
}

/**
 * 上传到 WebDAV
 */
export async function uploadToWebDav(): Promise<string> {
  return invoke("upload_to_webdav");
}

/**
 * 从 WebDAV 下载
 */
export async function downloadFromWebDav(): Promise<string> {
  return invoke("download_from_webdav");
}

/**
 * 同步到 WebDAV
 */
export async function syncWithWebDav(): Promise<string> {
  return invoke("sync_with_webdav");
}

/**
 * 获取同步状态
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  return invoke("get_sync_status");
}
