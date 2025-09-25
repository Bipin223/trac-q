import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp, Wallet, Target, Edit3, Save, AlertCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  budgetedExpenses?: number;
  month: string;
  currentYear: number;
  currentMonthNum: number;
  profile: any; // Profile from context
  onBudgetUpdate: (newExpenses: number) => void;
  onEditClick?: () => void; // For edit buttons
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR' }).format(amount);
};

const formatPercentage = (value: number) => Math.round(value) + '%';

export const MonthlySummary = ({ 
  totalIncome, 
  totalExpenses, 
  budgetedExpenses = 0, 
  month,
  currentYear,
  currentMonthNum,
  profile,
  onBudgetUpdate,
  onEditClick
}: MonthlySummaryProps) => {
  const netSavings = totalIncome - totalExpenses;
  const expensesVsBudget = budgetedExpenses > 0 ? ((totalExpenses / budgetedExpenses) * 100) : 0;
  const hasNoBudget = budgetedExpenses === 0;
  const [tempExpenses, setTempExpenses] = useState('');
  const [saving, setSaving] = useState(false);

  // Suggestion for expenses budget (based on actuals + buffer)
  const suggestedExpenses = totalExpenses > 0 ? Math.round(totalExpenses * 1.2) : 50000; // 20% buffer over actual or default

  const handleInlineSave = async () => {
    const expenses = parseFloat(tempExpenses) || 0;
    if (expenses === 0) {
      showError('Set a budget amount for this month.');
      return;
    }
    if (expenses < 0) {
      showError('Budget amount must be positive.');
      return;
    }
    if (!profile?.id) {
      showError('User profile not found. Please refresh the page.');
      return;
    }
    setSaving(true);

    try {
      // Find/create TOTAL_EXPENSE category
      const { data: existing, error: existingError } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', profile.id)
        .eq('name', 'TOTAL_EXPENSE')
        .eq('type', 'expense')
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error checking existing TOTAL_EXPENSE:', existingError);
        showError('Failed to check budget setup.');
        return;
      }

      let totalExpenseCategoryId: string | null = null;
      if (!existing) {
        const { data: inserted, error: insertError } = await supabase
          .from('categories')
          .insert({ name: 'TOTAL_EXPENSE', user_id: profile.id, type: 'expense' })
          .select('id')
          .single();
        if (insertError) {
          console.error('Failed to create TOTAL_EXPENSE:', insertError);
          showError('Failed to create budget category.');
          return;
        }
        totalExpenseCategoryId = inserted.id;
      } else {
        totalExpenseCategoryId = existing.id;
      }

      if (!totalExpenseCategoryId) {
        showError('Failed to set up budget category.');
        return;
      }

      // Delete existing budget for this month
      const { error: deleteError } = await supabase
        .from('budgets')
        .delete()
        .eq('user_id', profile.id)
        .eq('category_id', totalExpenseCategoryId)
        .eq('year', currentYear)
        .eq('month', currentMonthNum);
      if (deleteError) console.error('Error deleting expense budget:', deleteError);

      // Insert new budget
      const { error: insertError } = await supabase.from('budgets').insert({
        user_id: profile.id,
        category_id: totalExpenseCategoryId,
        year: currentYear,
        month: currentMonthNum,
        budgeted_amount: expenses,
      });

      if (insertError) {
        console.error('Failed to insert budget:', insertError);
        showError(`Failed to save budget: ${insertError.message}`);
        return;
      }

      showSuccess(`Budget set for ${month}! Limit: ${formatCurrency(expenses)}`);
      onBudgetUpdate(expenses);
      setTempExpenses('');
    } catch (err: any) {
      console.error('Unexpected error in handleInlineSave:', err);
      showError(`Failed to save budget: ${err.message || 'Unknown error. Please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress === 0) return 'bg-gray-200';
    return progress <= 100 ? 'bg-green-500' : progress <= 120 ? 'bg-yellow-500' : 'bg-red-500';
  };

  const getProgressStatus = (progress: number) => {
    if (progress === 0) return 'N/A';
    return progress <= 100 ? 'Under budget' : progress <= 120 ? 'Slightly over' : 'Over budget';
  };

  const renderSummaryTiles = () => (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-sm font-medium">Budget for {month}</CardTitle>
            <CardDescription className="text-xs">Spending limit</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            {onEditClick && !hasNoBudget && (
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
              <Progress value={expensesVsBudget} className={getProgressColor(expensesVsBudget)} />
              <p className="text-xs text-muted-foreground">{getProgressStatus(expensesVsBudget)} ({formatPercentage(expensesVsBudget)})</p>
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
              <Progress value={expensesVsBudget} className={getProgressColor(expensesVsBudget)} />
              <p className="text-xs text-muted-foreground">{getProgressStatus(expensesVsBudget)} ({formatPercentage(expensesVsBudget)})</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-4">
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
          {onEditClick && !hasNoBudget && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onEditClick}
              className="shrink-0"
            >
              Update Budget
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (hasNoBudget && profile) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                No budget set for {month}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                Set a monthly spending limit to track your expenses better. You can update it later in detail.
              </p>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Budget for {month} (NPR)</Label>
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
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <Button
                  onClick={handleInlineSave}
                  disabled={saving || tempExpenses === ''}
                  className="flex-1"
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : `Set Budget for ${month}`}
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="flex-1"
                  size="sm"
                >
                  <Link to="/budgets">
                    <Calendar className="h-4 w-4 mr-2" />
                    Update Later
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
        {renderSummaryTiles()}
      </div>
    );
  }

  // Normal summary when budget exists
  return (
    <div className="space-y-4">
      {renderSummaryTiles()}
    </div>
  );
};