import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp, Wallet, Target, Edit3, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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

const formatPercentage = (value: number) => Math.round(value) + '%';

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

  // Prefill suggestions for inline form (based on actuals + buffer)
  const suggestedIncome = totalIncome > 0 ? Math.round(totalIncome * 1.1) : 0; // 10% buffer over actual
  const suggestedExpenses = totalExpenses > 0 ? Math.round(totalExpenses * 1.2) : 50000; // Conservative estimate if no data

  const handleInlineSave = async () => {
    const income = parseFloat(tempIncome) || 0;
    const expenses = parseFloat(tempExpenses) || 0;
    if (income === 0 && expenses === 0) {
      showError('Set at least one budget amount.');
      return;
    }
    if (income < 0 || expenses < 0) {
      showError('Budget amounts must be positive.');
      return;
    }
    if (!profile?.id) {
      showError('User profile not found. Please refresh the page.');
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
        const { data: existing, error: existingError } = await supabase
          .from('categories')
          .select('id')
          .eq('user_id', profile.id)
          .eq('name', cat.name)
          .eq('type', cat.type)
          .single();

        if (existingError && existingError.code !== 'PGRST116') { // Ignore "no rows" error
          console.error(`Error checking existing ${cat.name}:`, existingError);
          continue;
        }

        if (!existing) {
          const { data: inserted, error: insertError } = await supabase
            .from('categories')
            .insert({ name: cat.name, user_id: profile.id, type: cat.type })
            .select('id')
            .single();
          if (insertError) {
            console.error(`Failed to create ${cat.name}:`, insertError);
            showError(`Failed to create ${cat.name.toLowerCase()} category.`);
            return;
          }
          if (inserted) {
            if (cat.name === 'TOTAL_INCOME') totalIncomeCategoryId = inserted.id;
            if (cat.name === 'TOTAL_EXPENSE') totalExpenseCategoryId = inserted.id;
          }
        } else {
          if (cat.name === 'TOTAL_INCOME') totalIncomeCategoryId = existing.id;
          if (cat.name === 'TOTAL_EXPENSE') totalExpenseCategoryId = existing.id;
        }
      }

      if (!totalIncomeCategoryId && income > 0) {
        showError('Failed to set up income category.');
        return;
      }
      if (!totalExpenseCategoryId && expenses > 0) {
        showError('Failed to set up expense category.');
        return;
      }

      // Delete existing budgets for this month
      if (totalIncomeCategoryId) {
        const { error: deleteIncomeError } = await supabase
          .from('budgets')
          .delete()
          .eq('user_id', profile.id)
          .eq('category_id', totalIncomeCategoryId)
          .eq('year', currentYear)
          .eq('month', currentMonthNum);
        if (deleteIncomeError) console.error('Error deleting income budget:', deleteIncomeError);
      }
      if (totalExpenseCategoryId) {
        const { error: deleteExpenseError } = await supabase
          .from('budgets')
          .delete()
          .eq('user_id', profile.id)
          .eq('category_id', totalExpenseCategoryId)
          .eq('year', currentYear)
          .eq('month', currentMonthNum);
        if (deleteExpenseError) console.error('Error deleting expense budget:', deleteExpenseError);
      }

      // Insert new budgets if > 0
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

      if (inserts.length > 0) {
        const { error: insertError } = await supabase.from('budgets').insert(inserts);
        if (insertError) {
          console.error('Failed to insert budgets:', insertError);
          showError(`Failed to save budgets: ${insertError.message}`);
          return;
        }
      }

      showSuccess(`Budgets set for ${month}! Income: ${formatCurrency(income)}, Expenses: ${formatCurrency(expenses)}`);
      onBudgetUpdate(income, expenses);
      setTempIncome('');
      setTempExpenses('');
    } catch (err: any) {
      console.error('Unexpected error in handleInlineSave:', err);
      showError(`Failed to save budgets: ${err.message || 'Unknown error. Please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  const getProgressColor = (progress: number, isIncome: boolean) => {
    if (progress === 0) return 'bg-gray-200';
    if (isIncome) {
      return progress >= 100 ? 'bg-green-500' : progress >= 80 ? 'bg-yellow-500' : 'bg-red-500';
    } else {
      return progress <= 100 ? 'bg-green-500' : progress <= 120 ? 'bg-yellow-500' : 'bg-red-500';
    }
  };

  const getProgressStatus = (progress: number, isIncome: boolean) => {
    if (progress === 0) return 'N/A';
    if (isIncome) {
      return progress >= 100 ? 'On track' : progress >= 80 ? 'Slightly behind' : 'Behind target';
    } else {
      return progress <= 100 ? 'Under budget' : progress <= 120 ? 'Slightly over' : 'Over budget';
    }
  };

  const renderSummaryTiles = () => (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-sm font-medium">Budgeted Income</CardTitle>
            <CardDescription className="text-xs">Target for {month}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            {onEditClick && !hasNoBudgets && (
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
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold">{formatCurrency(budgetedIncome)}</div>
          {budgetedIncome > 0 && (
            <div className="space-y-1">
              <Progress value={incomeVsBudget} className={getProgressColor(incomeVsBudget, true)} />
              <p className="text-xs text-muted-foreground">{getProgressStatus(incomeVsBudget, true)} ({formatPercentage(incomeVsBudget)})</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-sm font-medium">Actual Income</CardTitle>
            <CardDescription className="text-xs">for {month}</CardDescription>
          </div>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
          {budgetedIncome > 0 && (
            <div className="space-y-1">
              <Progress value={incomeVsBudget} className={getProgressColor(incomeVsBudget, true)} />
              <p className="text-xs text-muted-foreground">{getProgressStatus(incomeVsBudget, true)} ({formatPercentage(incomeVsBudget)})</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-sm font-medium">Budgeted Expenses</CardTitle>
            <CardDescription className="text-xs">Limit for {month}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            {onEditClick && !hasNoBudgets && (
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
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold">{formatCurrency(budgetedExpenses)}</div>
          {budgetedExpenses > 0 && (
            <div className="space-y-1">
              <Progress value={expensesVsBudget} className={getProgressColor(expensesVsBudget, false)} />
              <p className="text-xs text-muted-foreground">{getProgressStatus(expensesVsBudget, false)} ({formatPercentage(expensesVsBudget)})</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-sm font-medium">Actual Expenses</CardTitle>
            <CardDescription className="text-xs">for {month}</CardDescription>
          </div>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
          {budgetedExpenses > 0 && (
            <div className="space-y-1">
              <Progress value={expensesVsBudget} className={getProgressColor(expensesVsBudget, false)} />
              <p className="text-xs text-muted-foreground">{getProgressStatus(expensesVsBudget, false)} ({formatPercentage(expensesVsBudget)})</p>
            </div>
          )}
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
          {onEditClick && !hasNoBudgets && (
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
  );

  if (hasNoBudgets && profile) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                No budgets set for {month}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                Set your income target and expense limit to track progress thoroughly. Suggestions based on your actuals.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Budgeted Income (NPR)</Label>
                  <Input
                    type="number"
                    value={tempIncome}
                    onChange={(e) => setTempIncome(e.target.value)}
                    placeholder={formatCurrency(suggestedIncome)}
                    min="0"
                    step="0.01"
                    className="text-right font-mono"
                  />
                  {suggestedIncome > 0 && (
                    <p className="text-xs text-muted-foreground">Suggested: {formatCurrency(suggestedIncome)}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Budgeted Expenses (NPR)</Label>
                  <Input
                    type="number"
                    value={tempExpenses}
                    onChange={(e) => setTempExpenses(e.target.value)}
                    placeholder={formatCurrency(suggestedExpenses)}
                    min="0"
                    step="0.01"
                    className="text-right font-mono"
                  />
                  {suggestedExpenses > 0 && (
                    <p className="text-xs text-muted-foreground">Suggested: {formatCurrency(suggestedExpenses)}</p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleInlineSave}
                disabled={saving || (tempIncome === '' && tempExpenses === '')}
                className="mt-3 w-full md:w-auto"
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : `Set Budget for ${month}`}
              </Button>
            </div>
          </div>
        </div>
        {renderSummaryTiles()}
      </div>
    );
  }

  // Normal summary when budgets exist
  return (
    <div className="space-y-4">
      {renderSummaryTiles()}
    </div>
  );
};