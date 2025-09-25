import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  LineChart,
  Line,
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
  cumulativeIncome: number;
  cumulativeExpenses: number;
  cumulativeBudget?: number;  // Optional: Only if budget set
}

interface FinancialChartProps {
  data: ChartData[];
  month: string;
  budgetedExpenses?: number;  // New: Pass from Dashboard
}

export const FinancialChart = ({ data, month, budgetedExpenses = 0 }: FinancialChartProps) => {
  // Compute cumulative values (running totals) for better budget visualization
  const processedData = data.map((item, index) => {
    const cumulativeIncome = data
      .slice(0, index + 1)
      .reduce((sum, d) => sum + d.income, 0);
    const cumulativeExpenses = data
      .slice(0, index + 1)
      .reduce((sum, d) => sum + d.expenses, 0);
    
    // Cumulative budget: Linear projection (e.g., 50% by mid-month)
    const daysInMonth = data.length;
    const cumulativeBudget = budgetedExpenses > 0 
      ? Math.round((budgetedExpenses / daysInMonth) * (index + 1))
      : 0;

    return {
      ...item,
      cumulativeIncome,
      cumulativeExpenses,
      cumulativeBudget: cumulativeBudget > 0 ? cumulativeBudget : undefined,
    };
  });

  const hasBudget = budgetedExpenses > 0;
  const hasData = processedData.some(d => d.cumulativeIncome > 0 || d.cumulativeExpenses > 0);

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
          <p>No financial activity yet. Add incomes or expenses to see your progress!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Overview</CardTitle>
        <CardDescription>
          Cumulative progress for {month}.{hasBudget && ` Stay below the blue budget line to stay on track!`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={processedData}>
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
            
            {/* Cumulative Income (Green) */}
            <Line 
              type="monotone" 
              dataKey="cumulativeIncome" 
              stroke="#22c55e" 
              name="Cumulative Income"
              activeDot={{ r: 6, stroke: '#22c55e', strokeWidth: 2 }}
              strokeWidth={2}
            />
            
            {/* Cumulative Expenses (Red) */}
            <Line 
              type="monotone" 
              dataKey="cumulativeExpenses" 
              stroke="#ef4444" 
              name="Cumulative Expenses"
              strokeWidth={2}
            />
            
            {/* Cumulative Budget (Blue Dashed - Only if Set) */}
            {hasBudget && (
              <Line 
                type="monotone" 
                dataKey="cumulativeBudget" 
                stroke="#3b82f6" 
                name="Budget Projection"
                strokeDasharray="5 5"  // Dashed line for projection
                strokeWidth={2}
                connectNulls={false}  // Don't connect if undefined
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};