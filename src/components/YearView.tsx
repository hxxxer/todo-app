// ============================================
// 年视图日历组件
// 展示全年 12 个月的待办分布情况
// ============================================

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { getTodosCountByMonth } from "@/lib/commands";
import { cn } from "@/lib/utils";

interface YearViewProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  onMonthSelect: (year: number, month: number) => void;
  onViewModeChange?: (mode: "month" | "year") => void;  // 视图模式切换回调
}

interface MonthGridProps {
  year: number;
  month: number;
  todosCount: Record<string, number>;
  onClick: () => void;
}

// 星期标题（简写）
const WEEKDAY_HEADERS = ["一", "二", "三", "四", "五", "六", "日"];

// 月份名称
const MONTH_NAMES = ["1 月", "2 月", "3 月", "4 月", "5 月", "6 月", "7 月", "8 月", "9 月", "10 月", "11 月", "12 月"];

/**
 * 根据待办数量获取颜色深浅类名
 */
function getIntensityClass(count: number): string {
  if (count === 0) return "bg-muted/20";
  if (count <= 1) return "bg-blue-400/40";
  if (count <= 2) return "bg-blue-400/60";
  if (count <= 3) return "bg-blue-400/80";
  return "bg-blue-400";
}

/**
 * 单个月份网格组件
 */
function MonthGrid({ year, month, todosCount, onClick }: MonthGridProps) {
  // 获取该月第一天是星期几（0=周日，1=周一，...，6=周六）
  // 转换为中国的习惯（0=周一，1=周二，...，6=周日）
  const firstDay = new Date(year, month - 1, 1);
  let startWeekday = firstDay.getDay();
  startWeekday = startWeekday === 0 ? 6 : startWeekday - 1;  // 转换为周一为 0

  // 获取该月总天数
  const daysInMonth = new Date(year, month, 0).getDate();

  // 生成日历格子
  const cells: (number | null)[] = [];
  
  // 填充前面的空白
  for (let i = 0; i < startWeekday; i++) {
    cells.push(null);
  }
  
  // 填充日期
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
  }

  return (
    <div
      className="border rounded-lg p-1 md:p-1.5 hover:bg-accent/15 cursor-pointer transition-colors flex flex-col"
      onClick={onClick}
    >
      {/* 月份标题 */}
      <div className="text-xs md:text-sm font-medium mb-1 text-center shrink-0">{MONTH_NAMES[month - 1]}</div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-0.5 mb-0.5 shrink-0">
        {WEEKDAY_HEADERS.map((day, i) => (
          <div key={i} className="text-[8px] md:text-[9px] text-muted-foreground text-center">{day}</div>
        ))}
      </div>

      {/* 日期格子 */}
      {/* 使用 aspect-auto 让格子自适应高度，而不是强制正方形 */}
      <div className="grid grid-cols-7 gap-0.5 flex-1 min-h-0">
        {cells.map((day, i) => {
          const count = day !== null ? (todosCount[`${day}`.padStart(2, "0")] || 0) : 0;
          const colorClass = day !== null ? getIntensityClass(count) : "";

          return (
            <div
              key={i}
              className={cn(
                "rounded-sm text-[6px] md:text-[10px] flex items-center justify-center font-medium aspect-auto",
                colorClass,
                day === null && "invisible"
              )}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function YearView({
  selectedYear,
  onYearChange,
  onMonthSelect,
  onViewModeChange
}: YearViewProps) {
  // 每个月份的待办数量
  const [monthData, setMonthData] = useState<Record<number, Record<string, number>>>({});

  // 加载全年数据
  useEffect(() => {
    const loadData = async () => {
      const data: Record<number, Record<string, number>> = {};
      
      for (let month = 1; month <= 12; month++) {
        try {
          const count = await getTodosCountByMonth(selectedYear, month);
          data[month] = count;
        } catch (error) {
          console.error(`加载 ${selectedYear}年${month}月 数据失败:`, error);
          data[month] = {};
        }
      }
      
      setMonthData(data);
    };
    
    loadData();
  }, [selectedYear]);

  // 年份切换
  const handlePrevYear = () => onYearChange(selectedYear - 1);
  const handleNextYear = () => onYearChange(selectedYear + 1);

  // 点击月份
  const handleMonthClick = (month: number) => {
    onMonthSelect(selectedYear, month);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 顶部：年份切换 + 月视图按钮 */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center shrink-0 px-2 pb-4">
        {/* 切换到月视图按钮（左侧） */}
        <Toggle
          pressed={false}
          onPressedChange={() => onViewModeChange?.("month")}
          size="sm"
          className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground justify-self-start"
        >
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            月
          </span>
        </Toggle>

        {/* 年份切换（中间） */}
        <div className="flex items-center gap-2 justify-self-center">
          <Button variant="outline" size="icon" onClick={handlePrevYear}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xl font-semibold min-w-[100px] text-center">
            {selectedYear}年
          </span>
          <Button variant="outline" size="icon" onClick={handleNextYear}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* 右侧占位（保持对称） */}
        <div />
      </div>

      {/* 月份网格：桌面端 3 行 4 列，移动端 4 行 3 列 */}
      <div className="flex-1 grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 min-h-0 px-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
          <MonthGrid
            key={month}
            year={selectedYear}
            month={month}
            todosCount={monthData[month] || {}}
            onClick={() => handleMonthClick(month)}
          />
        ))}
      </div>
    </div>
  );
}
