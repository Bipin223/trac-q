import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
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
}

export const FinancialChart = ({ data }: FinancialChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Overview</CardTitle>
        <CardDescription>Your income and expenses for the current month.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip
              formatter={(value: number) =>
                new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(value)
              }
            />
            <Legend />
            <Line type="monotone" dataKey="income" stroke="#22c55e" activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="expenses" stroke="#ef4444" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};