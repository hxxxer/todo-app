import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Grid3x3, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { Todo } from "@/lib/commands";
import { cn } from "@/lib/utils";

// ============================================
// 组件属性接口
// ============================================
interface CalendarMonthViewProps {
  selectedDate: Date | undefined;  // 当前选中的日期
  onSelectDate: (date: Date) => void;  // 选择日期时的回调函数
  todos: Todo[];  // 所有待办事项数组
  mobile?: boolean;  // 是否为移动端模式（蓝色覆盖层）
  viewMode?: "month" | "year";  // 当前视图模式
  onViewModeChange?: (mode: "month" | "year") => void;  // 视图模式切换回调
}

// ============================================
// 星期标题 - 周一到周日
// ============================================
const weekDays = ["一", "二", "三", "四", "五", "六", "日"];

// ============================================
// 待办事项颜色主题
// 可以修改这些颜色来改变横条的颜色
// 格式：bg-{颜色}-{深浅度}/{透明度}
// ============================================
const todoColors = [
  "bg-blue-400/70",    // 蓝色
  "bg-green-400/70",   // 绿色
  "bg-purple-400/70",  // 紫色
  "bg-orange-400/70",  // 橙色
  "bg-pink-400/70",    // 粉色
  "bg-cyan-400/70",    // 青色
];

/**
 * 根据待办数量获取颜色深浅类名（移动端使用）
 */
function getIntensityClass(count: number): string {
  if (count === 0) return "bg-muted/20";
  if (count <= 1) return "bg-blue-400/40";
  if (count <= 2) return "bg-blue-400/60";
  if (count <= 3) return "bg-blue-400/80";
  return "bg-blue-400";
}

export function CalendarMonthView({
  selectedDate,
  onSelectDate,
  todos,
  mobile = false,
  viewMode = "month",
  onViewModeChange
}: CalendarMonthViewProps) {
  // ============================================
  // 状态管理
  // ============================================
  // currentMonth: 当前显示的月份
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate || new Date());

  // 触摸滑动相关（移动端切换月份）
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const SWIPE_THRESHOLD = 50; // 滑动阈值（px）

  // 当选中的日期变化时，更新当前显示的月份
  // useEffect(() => {
  //   if (selectedDate) {
  //     setCurrentMonth(selectedDate);
  //   }
  // }, [selectedDate]);

  // ============================================
  // 计算日历日期
  // ============================================
  const monthStart = startOfMonth(currentMonth);  // 本月第一天
  const monthEnd = endOfMonth(currentMonth);      // 本月最后一天
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });  // 日历开始日期（周一）
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });        // 日历结束日期（周日）

  // 生成日历所有日期
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  // ============================================
  // 获取指定日期的待办事项
  // ============================================
  const getTodosForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");  // 格式化日期为 YYYY-MM-DD
    return todos.filter(todo => todo.date === dateStr);  // 筛选该日期的待办
  };

  // ============================================
  // 事件处理函数
  // ============================================
  // 切换到上一个月
  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  // 切换到下一个月
  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // 切换到今天
  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onSelectDate(today);
  };

  // 触摸开始（移动端滑动切换月份）
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  // 触摸结束（移动端滑动切换月份）
  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - endX;
    const diffY = touchStartY.current - endY;

    // 只有水平滑动距离大于阈值且大于垂直滑动距离时才触发
    if (Math.abs(diffX) > SWIPE_THRESHOLD && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        // 向左滑 → 下个月
        handleNextMonth();
      } else {
        // 向右滑 → 上个月
        handlePrevMonth();
      }
    }
  };

  // ============================================
  // 渲染日历组件
  // ============================================
  return (
    // 根容器：占满整个高度，垂直布局
    <div className="h-full flex flex-col">
      
      {/* ========== 头部区域 ========== */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-4 px-2">
        {/* 视图切换按钮（左侧） */}
        <Toggle
          pressed={viewMode === "month"}
          onPressedChange={() => onViewModeChange?.(viewMode === "month" ? "year" : "month")}
          size="sm"
          className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground justify-self-start"
        >
          {viewMode === "month" ? (
            <span className="flex items-center gap-2">
              <Grid3x3 className="h-4 w-4" />
              年
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              月
            </span>
          )}
        </Toggle>

        {/* 左侧：切换月份按钮（仅桌面端） */}
        <div className="flex items-center justify-between gap-2">
          {/* 左侧：上一月按钮 - 中等屏幕显示，小屏幕隐藏 */}
          <div className="hidden md:block">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          
          {/* 中间：月份标题 - 始终显示 */}
          <h2 className="text-xl font-semibold text-center truncate px-2 flex-1">
            {currentMonth.toLocaleDateString("zh-CN", { year: "numeric", month: "long" })}
          </h2>
          
          {/* 右侧：下一月按钮 - 中等屏幕显示，小屏幕隐藏 */}
          <div className="hidden md:block">
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 今天按钮（右侧） */}
        <Button variant="outline" size="sm" onClick={handleToday} className="md:block justify-self-end h-9">
          今天
        </Button>
      </div>

      {/* ========== 星期标题行 ========== */}
      <div className="grid grid-cols-7 gap-1 mb-2 px-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="h-8 flex items-center justify-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* ========== 日历网格 ========== */}
      {/*
        - flex-1: 占满剩余空间
        - grid grid-cols-7: 7 列网格
        - grid-rows-6: 6 行网格（确保所有日期都能显示）
        - gap-1: 格子之间的间距
        - min-h-0: 确保网格可以正确缩放
        - touch-pan-y: 允许垂直滚动
      */}
      <div
        className="flex-1 grid grid-cols-7 grid-rows-6 gap-1.5 px-2 pb-2 min-h-0"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {calendarDays.map((day) => {
          const dayTodos = getTodosForDate(day);  // 该日期的待办
          const isToday = isSameDay(day, new Date());  // 是否是今天
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;  // 是否被选中
          const isCurrentMonth = isSameMonth(day, currentMonth);  // 是否是当前月份的日期

          return (
            // 日历格子按钮
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={cn(
                // 基础样式：相对定位、垂直布局、内边距、圆角、边框、过渡效果
                "relative flex flex-col items-start justify-start p-2 rounded-md border transition-all hover:bg-accent/15 min-h-[37px]",
                // 非当前月份的日期：灰色文字、浅灰色背景
                !isCurrentMonth && "text-muted-foreground bg-muted/30",
                // 选中的日期：主色边框、强调背景
                isSelected && "ring-1 ring-primary bg-accent/20",
                // 今天：主色背景、主色边框
                isToday && "border-2 border-accent",
                // 移动端：减小内边距
                mobile && "p-1.5"
              )}
            >
              {/* 移动端蓝色覆盖层背景（使用条件渲染） */}
              {mobile && (
                <div
                  className={cn(
                    "absolute inset-0 rounded-md pointer-events-none",
                    getIntensityClass(dayTodos.length)
                  )}
                  style={{ zIndex: 0, borderRadius: '0.375rem' }}
                />
              )}

              {/* 日期数字 */}
              <span
                className={cn(
                  "text-sm font-medium mb-1 flex-shrink-0 relative",  // 基础样式：字体大小、粗细、底部间距
                  isToday && "font-semibold",     // 今天的样式：主色、加粗
                  mobile && "text-xs"             // 移动端：更小的字体
                )}
                style={{ zIndex: 1 }}
              >
                {day.getDate()}
              </span>

              {/* ========== 待办事项横条区域（仅桌面端显示）========== */}
              {!mobile && (
                <div className="w-full flex-1 min-h-0 overflow-hidden relative" style={{ zIndex: 1 }}>
                  <div className="space-y-1 h-full">
                    {/* 显示最多 5 个待办横条 */}
                    {dayTodos.slice(0, 5).map((todo, index) => (
                      <div
                        key={todo.id}
                        className={cn(
                          "h-4.5 rounded text-[12px] text-left px-2 truncate text-black overflow-hidden w-full relative",
                          todoColors[index % todoColors.length],
                          todo.completed && "grayscale brightness-75 after:content-[''] after:absolute after:inset-0 after:bg-gray-700/20"
                        )}
                        title={todo.title}
                      >
                        {todo.title}
                      </div>
                    ))}
                    {/* 如果待办超过 5 个，显示剩余数量 */}
                    {dayTodos.length > 5 && (
                      <div className="text-[9px] text-muted-foreground text-center">
                        +{dayTodos.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
