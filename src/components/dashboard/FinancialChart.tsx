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
import { format } from "date-fns";

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
  const monthAbbr = format(today, 'MMM'); // e.g., "Sep"

  // Filter data to only include dates up to today
  const filteredData = data.filter(item => {
    const itemDate = new Date(currentYear, currentMonth, parseInt(item.day));
    return itemDate <= today;
  });

  // Compute cumulative values (running totals) for filtered data
  const processedData = filteredData.map((item, index) => {
    const cumulativeIncome = filteredData
      .slice(0, index + 1)
      .reduce((sum, d) => sum + d.income, 0);
    const cumulativeExpenses = filteredData
      .slice(0, index + 1)
      .reduce((sum, d) => sum + d.expenses, 0);

    return {
      ...item,
      cumulativeIncome,
      cumulativeExpenses,
    };
  });

  const hasData = processedData.some(d => d.cumulativeIncome > 0 || d.cumulativeExpenses > 0);

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

  // X-Axis formatter: Show "Sep 1", "Sep 2", etc. (month abbr + day, no leading zero)
  const formatXAxis = (value: string) => {
    const dayNum = parseInt(value);
    return `${monthAbbr} ${dayNum}`;
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
          <LineChart data={processedData}>
            {/* No grid lines - fully transparent/invisible */}
            <CartesianGrid stroke="none" />
            
            <XAxis 
              dataKey="day" 
              tickFormatter={formatXAxis}  // "Sep 1", "Sep 2", etc.
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