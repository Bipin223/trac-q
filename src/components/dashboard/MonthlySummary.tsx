import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp, Wallet, Target, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useProfile } from "@/contexts/ProfileContext";

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
  const { profile } = useProfile();
  const netSavings = totalIncome - totalExpenses;
  const incomeVsBudget = budgetedIncome > 0 ? ((totalIncome / budgetedIncome) * 100) : 0;
  const expensesVsBudget = budgetedExpenses > 0 ? ((totalExpenses / budgetedExpenses) * 100) : 0;
  const hasNoBudgets = budgetedIncome === 0 && budgetedExpenses === 0;

  return (
    <div className="space-y-4">
      {/* Budget Management Prompt if no budgets set */}
      {hasNoBudgets && profile && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Edit3 className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                No budgets set for {month}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Set your income targets and expense limits to better track your finances. 
                <Link 
                  to="/budgets" 
                  className="underline font-semibold ml-1 hover:text-yellow-900 dark:hover:text-yellow-100"
                >
                  Manage now
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budgeted Income</CardTitle>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className="h-6 w-6 p-0"
              >
                <Link to="/budgets">
                  <Edit3 className="h-3 w-3" />
                </Link>
              </Button>
            </div>
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
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className="h-6 w-6 p-0"
              >
                <Link to="/budgets">
                  <Edit3 className="h-3 w-3" />
                </Link>
              </Button>
            </div>
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
          <CardContent className="flex justify-between items-center">
            <div>
              <div className={`text-2xl font-bold ${netSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netSavings)}
              </div>
              <p className="text-xs text-muted-foreground">Your balance for {month}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              asChild
              className="shrink-0"
            >
              <Link to="/budgets">
                Manage Budgets
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};