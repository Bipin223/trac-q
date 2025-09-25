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

  // Create full month data (up to actual days in month)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const fullMonthData = Array.from({ length: daysInMonth }, (_, i) => ({
    day: (i + 1).toString(),
    income: 0,
    expenses: 0,
    cumulativeIncome: 0,
    cumulativeExpenses: 0,
  }));

  // Populate actual data from input (only up to today)
  data.forEach(item => {
    const dayIndex = parseInt(item.day) - 1;
    if (dayIndex >= 0 && dayIndex < fullMonthData.length) {
      fullMonthData[dayIndex].income = item.income;
      fullMonthData[dayIndex].expenses = item.expenses;
    }
  });

  // Compute cumulatives: Only accumulate up to today, stay flat after
  let runningIncome = 0;
  let runningExpenses = 0;
  fullMonthData.forEach((item, index) => {
    const dayNum = parseInt(item.day);
    if (dayNum <= currentDay) {
      // Accumulate only up to today
      runningIncome += item.income;
      runningExpenses += item.expenses;
    }
    // After today, stay flat (no further accumulation)
    item.cumulativeIncome = runningIncome;
    item.cumulativeExpenses = runningExpenses;
  });

  const hasData = fullMonthData.some(d => d.cumulativeIncome > 0 || d.cumulativeExpenses > 0);

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
        <CardDescription>Your income and expenses for {month}.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={fullMonthData}>
            {/* No grid lines - fully transparent/invisible */}
            <CartesianGrid stroke="none" />
            
            <XAxis 
              dataKey="day" 
              tickFormatter={(value) => value}  // Plain day numbers (e.g., "1", "15", "30")
              label={{ value: 'Day of Month', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              tickFormatter={formatAxisValue}
              label={{ value: 'Amount (NPR)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Cumulative Income (Green) */}
            <Line 
              type="monotone" 
              dataKey="cumulativeIncome" 
              stroke="#22c55e" 
              name="Income"
              activeDot={{ r: 6, stroke: '#22c55e', strokeWidth: 2 }}
              strokeWidth={2}
            />
            
            {/* Cumulative Expenses (Red) */}
            <Line 
              type="monotone" 
              dataKey="cumulativeExpenses" 
              stroke="#ef4444" 
              name="Expenses"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};