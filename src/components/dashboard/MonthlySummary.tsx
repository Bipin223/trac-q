import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp, Wallet, Target, Edit3, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useProfile } from "@/contexts/ProfileContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from "@/utils/toast";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface MonthlySummaryProps {
  totalIncome: number;
  totalExpenses: number;
  budgetedIncome?: number;
  budgetedExpenses?: number;
  month: string;
  currentYear: number;
  currentMonthNum: number;
  profile: any; // Profile from context
  onBudgetUpdate: (newIncome: number, newExpenses: number) => void;
  onEditClick?: () => void; // For edit buttons
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR' }).format(amount);
};

export const MonthlySummary = ({ 
  totalIncome, 
  totalExpenses, 
  budgetedIncome = 0, 
  budgetedExpenses = 0, 
  month,
  currentYear,
  currentMonthNum,
  profile,
  onBudgetUpdate,
  onEditClick
}: MonthlySummaryProps) => {
  const netSavings = totalIncome - totalExpenses;
  const incomeVsBudget = budgetedIncome > 0 ? ((totalIncome / budgetedIncome) * 100) : 0;
  const expensesVsBudget = budgetedExpenses > 0 ? ((totalExpenses / budgetedExpenses) * 100) : 0;
  const hasNoBudgets = budgetedIncome === 0 && budgetedExpenses === 0;
  const [tempIncome, setTempIncome] = useState('');
  const [tempExpenses, setTempExpenses] = useState('');
  const [saving, setSaving] = useState(false);

  const handleInlineSave = async () => {
    const income = parseFloat(tempIncome) || 0;
    const expenses = parseFloat(tempExpenses) || 0;
    if (income === 0 && expenses === 0) {
      showError('Set at least one budget amount.');
      return;
    }
    setSaving(true);

    try {
      // Create/find special categories if needed
      const specialCategories = [
        { name: 'TOTAL_INCOME', type: 'income' },
        { name: 'TOTAL_EXPENSE', type: 'expense' },
      ];

      let totalIncomeCategoryId: string | null = null;
      let totalExpenseCategoryId: string | null = null;

      for (const cat of specialCategories) {
        const { data: existing } = await supabase
          .from('categories')
          .select('id')
          .eq('user_id', profile.id)
          .eq('name', cat.name)
          .eq('type', cat.type)
          .single();

        if (!existing) {
          const { data: inserted } = await supabase
            .from('categories')
            .insert({ name: cat.name, user_id: profile.id, type: cat.type })
            .select('id')
            .single();
          if (inserted) {
            if (cat.name === 'TOTAL_INCOME') totalIncomeCategoryId = inserted.id;
            if (cat.name === 'TOTAL_EXPENSE') totalExpenseCategoryId = inserted.id;
          }
        } else {
          if (cat.name === 'TOTAL_INCOME') totalIncomeCategoryId = existing.id;
          if (cat.name === 'TOTAL_EXPENSE') totalExpenseCategoryId = existing.id;
        }
      }

      if (!totalIncomeCategoryId && !totalExpenseCategoryId) {
        showError('Failed to set up budget categories.');
        return;
      }

      // Delete existing
      if (totalIncomeCategoryId) {
        await supabase
          .from('budgets')
          .delete()
          .eq('user_id', profile.id)
          .eq('category_id', totalIncomeCategoryId)
          .eq('year', currentYear)
          .eq('month', currentMonthNum);
      }
      if (totalExpenseCategoryId) {
        await supabase
          .from('budgets')
          .delete()
          .eq('user_id', profile.id)
          .eq('category_id', totalExpenseCategoryId)
          .eq('year', currentYear)
          .eq('month', currentMonthNum);
      }

      // Insert new if > 0
      const inserts: any[] = [];
      if (income > 0 && totalIncomeCategoryId) {
        inserts.push({
          user_id: profile.id,
          category_id: totalIncomeCategoryId,
          year: currentYear,
          month: currentMonthNum,
          budgeted_amount: income,
        });
      }
      if (expenses > 0 && totalExpenseCategoryId) {
        inserts.push({
          user_id: profile.id,
          category_id: totalExpenseCategoryId,
          year: currentYear,
          month: currentMonthNum,
          budgeted_amount: expenses,
        });
      }

      const { error } = await supabase.from('budgets').insert(inserts);
      if (error) {
        showError('Failed to save budgets.');
      } else {
        showSuccess(`Budgets set for ${month}!`);
        onBudgetUpdate(income, expenses);
        setTempIncome('');
        setTempExpenses('');
      }
    } catch (err) {
      showError('Failed to save budgets. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (hasNoBudgets && profile) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Edit3 className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                No budgets set for {month}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                Insert budget for this month to better track your finances.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Budgeted Income (NPR)</Label>
                  <Input
                    type="number"
                    value={tempIncome}
                    onChange={(e) => setTempIncome(e.target.value)}
                    placeholder="e.g., 100000"
                    min="0"
                    step="0.01"
                    className="text-right font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Budgeted Expenses (NPR)</Label>
                  <Input
                    type="number"
                    value={tempExpenses}
                    onChange={(e) => setTempExpenses(e.target.value)}
                    placeholder="e.g., 60000"
                    min="0"
                    step="0.01"
                    className="text-right font-mono"
                  />
                </div>
              </div>
              <Button
                onClick={handleInlineSave}
                disabled={saving || (!tempIncome && !tempExpenses)}
                className="mt-3 w-full md:w-auto"
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : `Set Budget for ${month}`}
              </Button>
            </div>
          </div>
        </div>

        {/* Still render the summary tiles below, but they'll show 0 until saved */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budgeted Income</CardTitle>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
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
              <p className="text-xs text-muted-foreground">for {month}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budgeted Expenses</CardTitle>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
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
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Normal summary when budgets exist
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budgeted Income</CardTitle>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              {onEditClick && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onEditClick}
                  className="h-6 w-6 p-0"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              )}
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
              {onEditClick && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onEditClick}
                  className="h-6 w-6 p-0"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              )}
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
            {onEditClick && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onEditClick}
                className="shrink-0"
              >
                Manage Budgets
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};