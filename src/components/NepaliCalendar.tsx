import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import {
  bsToAd,
  getCurrentBsDate,
  getDaysInBsMonth,
  getBsDayOfWeek,
  getHolidaysForMonth,
  isHoliday,
  nepaliMonths,
  nepaliMonthsEng,
  nepaliDays,
  nepaliDaysEng,
  type NepaliHoliday,
} from '@/utils/nepaliCalendar';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NepaliCalendarProps {
  useNepaliScript?: boolean;
  onDateSelect?: (year: number, month: number, day: number) => void;
}

export function NepaliCalendar({ useNepaliScript = false, onDateSelect }: NepaliCalendarProps) {
  const [currentBsDate, setCurrentBsDate] = useState(getCurrentBsDate());
  const [selectedDate, setSelectedDate] = useState<{ year: number; month: number; day: number } | null>(null);
  const [viewYear, setViewYear] = useState(currentBsDate.year);
  const [viewMonth, setViewMonth] = useState(currentBsDate.month);

  const monthNames = useNepaliScript ? nepaliMonths : nepaliMonthsEng;
  const dayNames = useNepaliScript ? nepaliDays : nepaliDaysEng;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBsDate(getCurrentBsDate());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const goToPreviousMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const goToToday = () => {
    const today = getCurrentBsDate();
    setViewYear(today.year);
    setViewMonth(today.month);
    setSelectedDate(today);
  };

  const daysInMonth = getDaysInBsMonth(viewYear, viewMonth);
  const firstDayOfMonth = getBsDayOfWeek({ year: viewYear, month: viewMonth, day: 1 });
  const holidays = getHolidaysForMonth(viewYear, viewMonth);

  // Generate calendar grid
  const calendarDays: (number | null)[] = [];
  
  // Add empty slots for days before the month starts
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const handleDateClick = (day: number) => {
    setSelectedDate({ year: viewYear, month: viewMonth, day });
    onDateSelect?.(viewYear, viewMonth, day);
  };

  const isToday = (day: number) => {
    return (
      day === currentBsDate.day &&
      viewMonth === currentBsDate.month &&
      viewYear === currentBsDate.year
    );
  };

  const isSelected = (day: number) => {
    return (
      selectedDate &&
      day === selectedDate.day &&
      viewMonth === selectedDate.month &&
      viewYear === selectedDate.year
    );
  };

  const getHolidayForDay = (day: number): NepaliHoliday | undefined => {
    return isHoliday(viewYear, viewMonth, day);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {useNepaliScript ? 'नेपाली पात्रो' : 'Nepali Calendar'}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Month/Year Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <h3 className="text-xl font-bold">
              {monthNames[viewMonth - 1]} {viewYear}
            </h3>
            <p className="text-xs text-muted-foreground">
              {useNepaliScript ? 'विक्रम संवत्' : 'Bikram Sambat'}
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-2">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 gap-1">
            {dayNames.map((day, index) => (
              <div
                key={index}
                className={cn(
                  'text-center text-xs font-semibold py-2',
                  index === 6 && 'text-blue-600 dark:text-blue-400' // Saturday
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const holiday = getHolidayForDay(day);
              const isTodayDate = isToday(day);
              const isSelectedDate = isSelected(day);
              const dayOfWeek = (index % 7);
              const isSaturday = dayOfWeek === 6;

              return (
                <TooltipProvider key={day} delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleDateClick(day)}
                        className={cn(
                          'aspect-square p-2 rounded-lg text-sm font-medium transition-all',
                          'hover:bg-primary/10 hover:scale-105',
                          isTodayDate && 'bg-primary text-primary-foreground font-bold',
                          isSelectedDate && !isTodayDate && 'ring-2 ring-primary',
                          holiday && !isTodayDate && 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
                          isSaturday && !holiday && !isTodayDate && 'text-blue-600 dark:text-blue-400',
                          !isTodayDate && !holiday && !isSelectedDate && 'hover:bg-muted'
                        )}
                      >
                        {day}
                      </button>
                    </TooltipTrigger>
                    {holiday && (
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="font-semibold">{holiday.name}</p>
                        {useNepaliScript && (
                          <p className="text-xs text-muted-foreground">{holiday.nameNepali}</p>
                        )}
                        <Badge variant="outline" className="mt-1 text-xs">
                          {holiday.type}
                        </Badge>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>

        {/* Holidays List for Current Month */}
        {holidays.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-2">
              {useNepaliScript ? 'यो महिनाका बिदाहरू' : 'Holidays This Month'}
            </h4>
            <div className="space-y-2">
              {holidays.map((holiday, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-2 bg-muted rounded-lg text-sm"
                >
                  <div className="flex-1">
                    <p className="font-medium">{holiday.name}</p>
                    {useNepaliScript && (
                      <p className="text-xs text-muted-foreground">{holiday.nameNepali}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {monthNames[holiday.month - 1]} {holiday.day}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Date Info */}
        <div className="border-t pt-4 text-center">
          <p className="text-sm text-muted-foreground">
            {useNepaliScript ? 'आज' : 'Today'}
          </p>
          <p className="text-lg font-bold">
            {monthNames[currentBsDate.month - 1]} {currentBsDate.day}, {currentBsDate.year}
          </p>
          <p className="text-xs text-muted-foreground">
            {bsToAd(currentBsDate).toLocaleDateString('en-GB', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
