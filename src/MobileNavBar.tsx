import { CalendarIcon, BookIcon, ListTodoIcon, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type Page = "calendar" | "all-todos" | "knowledge" | "webdav";

interface MobileNavBarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

/**
 * 移动端底部导航栏
 * 仅在移动设备上显示（屏幕宽度 < 768px）
 */
export function MobileNavBar({ currentPage, onNavigate }: MobileNavBarProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t flex items-center justify-around z-50 pb-safe">
      <MobileNavBarButton
        icon={CalendarIcon}
        label="日历"
        isActive={currentPage === "calendar"}
        onClick={() => onNavigate("calendar")}
      />
      <MobileNavBarButton
        icon={ListTodoIcon}
        label="待办"
        isActive={currentPage === "all-todos"}
        onClick={() => onNavigate("all-todos")}
      />
      <MobileNavBarButton
        icon={BookIcon}
        label="知识库"
        isActive={currentPage === "knowledge"}
        onClick={() => onNavigate("knowledge")}
      />
      <MobileNavBarButton
        icon={Settings}
        label="设置"
        isActive={currentPage === "webdav"}
        onClick={() => onNavigate("webdav")}
      />
    </nav>
  );
}

interface MobileNavBarButtonProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function MobileNavBarButton({ icon: Icon, label, isActive, onClick }: MobileNavBarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center w-full h-full gap-1",
        isActive ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "fill-current opacity-20")} />
      <span className="text-xs flex-shrink-0 whitespace-nowrap">{label}</span>
    </button>
  );
}
