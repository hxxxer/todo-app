import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

export function CalendarMonthView({ selectedDate, onSelectDate, todos }: CalendarMonthViewProps) {
  // ============================================
  // 状态管理
  // ============================================
  // currentMonth: 当前显示的月份
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate || new Date());

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

  // ============================================
  // 渲染日历组件
  // ============================================
  return (
    // 根容器：占满整个高度，垂直布局
    <div className="h-full flex flex-col">
      
      {/* ========== 头部区域 ========== */}
      <div className="flex items-center justify-between mb-4 px-2">
        {/* 左右箭头按钮 */}
        <div className="flex items-center gap-2">
          {/* 上个月按钮 */}
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {/* 下个月按钮 */}
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* 月份标题 */}
        <h2 className="text-xl font-semibold">
          {currentMonth.toLocaleDateString("zh-CN", { year: "numeric", month: "long" })}
        </h2>
        
        {/* 今天按钮 */}
        <Button variant="outline" size="sm" onClick={handleToday}>
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
      */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-1 px-2 pb-2 min-h-0">
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
                "relative flex flex-col items-start justify-start p-3 rounded-md border transition-all hover:bg-accent/15 min-h-0",
                // 非当前月份的日期：灰色文字、浅灰色背景
                !isCurrentMonth && "text-muted-foreground bg-muted/30",
                // 选中的日期：主色边框、强调背景
                isSelected && "ring-1 ring-primary bg-accent/20",
                // 今天：主色背景、主色边框
                isToday && "border-2 border-accent"
              )}
            >
              {/* 日期数字 */}
              <span
                className={cn(
                  "text-m font-medium mb-1 flex-shrink-0",  // 基础样式：字体大小、粗细、底部间距
                  isToday && "font-semibold"     // 今天的样式：主色、加粗
                )}
              >
                {day.getDate()}
              </span>

              {/* ========== 待办事项横条区域 ========== */}
              {/* 
                - w-full: 占满宽度
                - flex-1: 占满剩余高度
                - min-h-0: 确保可以正确缩放
                - overflow-hidden: 隐藏溢出内容
              */}
              <div className="w-full flex-1 min-h-0 overflow-hidden">
                {/* 
                  横条列表容器
                  - space-y-1.5: 横条之间的垂直间距（可以改大这个数字来增加间距）
                  - h-full: 占满高度
                */}
                <div className="space-y-1 h-full">
                  {/* 显示最多 5 个待办横条 */}
                  {dayTodos.slice(0, 5).map((todo, index) => (
                    <div
                      key={todo.id}
                      // 横条样式
                      className={cn(
                        // 基础样式：
                        // - h-3.5: 横条高度（可以改大这个数字来增加高度）
                        // - rounded-full: 圆角
                        // - text-[9px]: 文字大小
                        // - text-left px-2: 左对齐、左右内边距
                        // - truncate overflow-hidden w-full: 文字超出省略
                        // - text-black: 黑色文字
                        // - relative: 相对定位用于伪元素
                        "h-4.5 rounded text-[12px] text-left px-2 truncate text-black overflow-hidden w-full relative",
                        // 横条背景颜色（从 todoColors 数组循环选择）
                        todoColors[index % todoColors.length],
                        // 已完成的待办：灰黑色覆盖样式
                        todo.completed && "grayscale brightness-75 after:content-[''] after:absolute after:inset-0 after:bg-gray-700/20"
                      )}
                      title={todo.title}  // 鼠标悬停时显示完整标题
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
