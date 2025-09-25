import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface ChartData {
  day: string;
  dayNum: number;  // Numeric for X-axis domain control
  income: number;
  expenses: number;
  cumulativeIncome: number;
  cumulativeExpenses: number;
}

interface FinancialChartProps {
  data: ChartData[];
  month: string;
}

export const FinancialChart = ({ data, month }: FinancialChartProps) => {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Get actual days in current month (e.g., 30 for Sep, 31 for Oct)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Create data ONLY for days 1 to TODAY (no future days)
  const chartData: ChartData[] = Array.from({ length: currentDay }, (_, i) => {
    const dayNum = i + 1;
    const dayStr = dayNum.toString();
    return {
      day: dayStr,
      dayNum,  // Numeric for X-axis
      income: 0,
      expenses: 0,
      cumulativeIncome: 0,
      cumulativeExpenses: 0,
    };
  });

  // Populate actual data from input (only for days <= today)
  data.forEach(item => {
    const dayIndex = parseInt(item.day) - 1;
    if (dayIndex >= 0 && dayIndex < currentDay) {
      chartData[dayIndex].income = item.income;
      chartData[dayIndex].expenses = item.expenses;
    }
  });

  // Compute cumulatives (running totals up to today only)
  let runningIncome = 0;
  let runningExpenses = 0;
  chartData.forEach((item) => {
    runningIncome += item.income;
    runningExpenses += item.expenses;
    item.cumulativeIncome = runningIncome;
    item.cumulativeExpenses = runningExpenses;
  });

  const hasData = chartData.some(d => d.cumulativeIncome > 0 || d.cumulativeExpenses > 0);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
    }).format(value);

  const formatAxisValue = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toString();
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white mb-2">Day {payload[0].payload.day} ({month})</p>
          {payload.map((entry: any, idx: number) => (
            <p key={idx} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
          <CardDescription>Your income and expenses for {month}.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          <p>No financial activity yet. Add incomes or expenses to see your progress!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Overview {month}</CardTitle>
        <CardDescription>Your income and expenses for {month} (up to today).</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ right: 30 }}>
            {/* No grid lines - fully transparent/invisible */}
            <CartesianGrid stroke="none" />
            
            <XAxis 
              dataKey="dayNum"  // Use numeric day for domain control
              type="number"
              domain={[1, daysInMonth]}  // Force full month ticks (1 to 30/31)
              ticks={Array.from({ length: daysInMonth }, (_, i) => i + 1)}  // Show all day ticks
              tickFormatter={(value) => value.toString()}  // Plain numbers ("1", "2", ..., "30")
              label={{ value: 'Day of Month', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              tickFormatter={formatAxisValue}
              label={{ value: 'Amount (NPR)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Cumulative Income (Green) - stops at today */}
            <Line 
              type="monotone" 
              dataKey="cumulativeIncome" 
              stroke="#22c55e" 
              name="Income"
              activeDot={{ r: 6, stroke: '#22c55e', strokeWidth: 2 }}
              strokeWidth={2}
              connectNulls={false}  // Don't connect across nulls (ensures clean stop)
            />
            
            {/* Cumulative Expenses (Red) - stops at today */}
            <Line 
              type="monotone" 
              dataKey="cumulativeExpenses" 
              stroke="#ef4444" 
              name="Expenses"
              strokeWidth={2}
              connectNulls={false}  // Don't connect across nulls (ensures clean stop)
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};