import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  day: string;
  income: number;
  expenses: number;
}

interface FinancialChartProps {
  data: ChartData[];
  month: string;
}

export const FinancialChart = ({ data, month }: FinancialChartProps) => {
  const hasData = data.some(d => d.income > 0 || d.expenses > 0);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
    }).format(value);

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
          <p>No financial activity yet. Add incomes or expenses to see your daily progress!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Financial Overview</CardTitle>
        <CardDescription>Your income and expenses by day for {month}.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis 
              dataKey="day" 
              tickFormatter={(value) => `#${value}`}  // e.g., "#15" for day 15
              label={{ value: 'Day of Month', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              tickFormatter={formatCurrency}
              label={{ value: 'Amount (NPR)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Daily Income (Green Bar) */}
            <Bar 
              dataKey="income" 
              fill="#22c55e" 
              name="Daily Income"
              radius={[4, 4, 0, 0]}  // Rounded top corners for clean look
            />
            
            {/* Daily Expenses (Red Bar) */}
            <Bar 
              dataKey="expenses" 
              fill="#ef4444" 
              name="Daily Expenses"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};