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
  onBudgetUpdate: (newExpenses: number) => Promise<void>; // Now async for refetch
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
      console.log(`Saving budget for user ${profile.id}: NPR ${expenses} for ${month} (year ${currentYear}, month ${currentMonthNum})`);
      
      // Find/create TOTAL_EXPENSE category (this will be included in the dynamic sum from Supabase)
      const { data: existing, error: existingError } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', profile.id)
        .eq('name', 'TOTAL_EXPENSE')
        .eq('type', 'expense')
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error checking existing TOTAL_EXPENSE:', existingError);
        showError('Failed to check budget setup. See console.');
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
          showError(`Failed to create budget category: ${insertError.message}`);
          return;
        }
        totalExpenseCategoryId = inserted.id;
        console.log('Created new TOTAL_EXPENSE category ID:', totalExpenseCategoryId);
      } else {
        totalExpenseCategoryId = existing.id;
        console.log('Using existing TOTAL_EXPENSE category ID:', totalExpenseCategoryId);
      }

      if (!totalExpenseCategoryId) {
        showError('Failed to set up budget category.');
        return;
      }

      // Delete existing TOTAL_EXPENSE budget for this month (to avoid duplicates)
      const { error: deleteError } = await supabase
        .from('budgets')
        .delete()
        .eq('user_id', profile.id)
        .eq('category_id', totalExpenseCategoryId)
        .eq('year', currentYear)
        .eq('month', currentMonthNum);
      if (deleteError) {
        console.error('Error deleting existing TOTAL_EXPENSE budget:', deleteError);
        // Don't fail on delete—proceed to insert
      }

      // Insert/update the TOTAL_EXPENSE budget (persistent in Supabase, included in sum)
      const { error: insertError } = await supabase.from('budgets').insert({
        user_id: profile.id,
        category_id: totalExpenseCategoryId,
        year: currentYear,
        month: currentMonthNum,
        budgeted_amount: expenses,
      });

      if (insertError) {
        console.error('Failed to insert budget:', insertError);
        showError(`Failed to save budget to Supabase: ${insertError.message}. It won't persist.`);
        return;
      }

      console.log('Budget saved successfully to Supabase - now refetching to update tile');
      // Trigger refetch in parent (Dashboard) to sync tile with DB sum (ensures persistence visible immediately)
      await onBudgetUpdate(expenses);
      setTempExpenses('');
    } catch (err: any) {
      console.error('Unexpected error in handleInlineSave:', err);
      showError(`Failed to save budget to Supabase: ${err.message || 'Unknown error. It may not persist.'}`);
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
            <CardDescription className="text-xs">Sum of all expense categories (persistent in Supabase)</CardDescription>
          </div>
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
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold">{formatCurrency(budgetedExpenses)}</div>
          {budgetedExpenses > 0 && (
            <div className="space-y-1">
              <Progress value={expensesVsBudget} className={getProgressColor(expensesVsBudget)} />
              <p className="text-xs text-muted-foreground">{getProgressStatus(expensesVsBudget)} ({formatPercentage(expensesVsBudget)})</p>
            </div>
          )}
          {budgetedExpenses === 0 && (
            <p className="text-xs text-muted-foreground">Set budgets in the Budgets page or use the form below to see your total here. It persists across logins.</p>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className={`text-2xl font-bold ${netSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(netSavings)}
          </div>
          <p className="text-xs text-muted-foreground">Your balance for {month}</p>
          {onEditClick && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onEditClick}
              className="mt-2 w-full"
            >
              Manage Budgets
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (hasNoBudget && profile) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold">{month} {currentYear}</CardTitle>
            <CardDescription>Set your overall monthly spending limit (saved to Supabase as TOTAL_EXPENSE, included in sum. Persists across logouts/logins).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Overall Budget for {month} (NPR)</Label>
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
                <p className="text-xs text-muted-foreground">Suggested: {formatCurrency(suggestedExpenses)} (based on your expenses + 20% buffer)</p>
              )}
              <p className="text-xs text-muted-foreground">Tip: For detailed category budgets, visit the Budgets page. This total will update the tile above.</p>
            </div>
            <Button
              onClick={handleInlineSave}
              disabled={saving || tempExpenses === ''}
              className="w-full"
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving to Supabase...' : `Set Overall Budget for ${month} (Persists)`}
            </Button>
          </CardContent>
        </Card>
        {renderSummaryTiles()}
      </div>
    );
  }

  // Normal summary when budget exists (sum > 0, fetched from Supabase)
  return (
    <div className="space-y-4">
      {renderSummaryTiles()}
    </div>
  );
};