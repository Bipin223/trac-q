import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp, Wallet, Target } from "lucide-react";

interface MonthlySummaryProps {
  totalIncome: number;
  totalExpenses: number;
  budgetedIncome?: number;
  budgetedExpenses?: number;
  month: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR' }).format(amount);
};

export const MonthlySummary = ({ 
  totalIncome, 
  totalExpenses, 
  budgetedIncome = 0, 
  budgetedExpenses = 0, 
  month 
}: MonthlySummaryProps) => {
  const netSavings = totalIncome - totalExpenses;
  const incomeVsBudget = budgetedIncome > 0 ? ((totalIncome / budgetedIncome) * 100) : 0;
  const expensesVsBudget = budgetedExpenses > 0 ? ((totalExpenses / budgetedExpenses) * 100) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Budgeted Income</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(budgetedIncome)}</div>
          <p className="text-xs text-muted-foreground">Target for {month}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Actual Income</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
          {budgetedIncome > 0 && (
            <p className={`text-xs ${incomeVsBudget >= 100 ? 'text-green-600' : 'text-yellow-600'}`}>
              {incomeVsBudget >= 100 ? 'On track' : 'Below target'} ({Math.round(incomeVsBudget)}%)
            </p>
          )}
          <p className="text-xs text-muted-foreground">for {month}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Budgeted Expenses</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(budgetedExpenses)}</div>
          <p className="text-xs text-muted-foreground">Limit for {month}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Actual Expenses</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
          {budgetedExpenses > 0 && (
            <p className={`text-xs ${expensesVsBudget <= 100 ? 'text-green-600' : 'text-red-600'}`}>
              {expensesVsBudget <= 100 ? 'Under budget' : 'Over budget'} ({Math.round(expensesVsBudget)}%)
            </p>
          )}
          <p className="text-xs text-muted-foreground">for {month}</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${netSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(netSavings)}
          </div>
          <p className="text-xs text-muted-foreground">Your balance for {month}</p>
        </CardContent>
      </Card>
    </div>
  );
};