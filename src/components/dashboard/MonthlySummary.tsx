import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp, Wallet, Target, Save, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  onBudgetUpdate: (newExpenses: number) => Promise<void>; // Async for refetch
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
  onBudgetUpdate
}: MonthlySummaryProps) => {
  const netSavings = totalIncome - totalExpenses;
  const expensesVsBudget = budgetedExpenses > 0 ? ((totalExpenses / budgetedExpenses) * 100) : 0;
  const hasNoBudget = budgetedExpenses === 0;
  const [tempExpenses, setTempExpenses] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Suggestion for expenses budget (based on actuals + buffer)
  const suggestedExpenses = totalExpenses > 0 ? Math.round(totalExpenses * 1.2) : 50000; // 20% buffer over actual or default

  // Helper to fetch/verify the single overall budget directly (for immediate sync after save)
  const fetchAndVerifyBudget = async (categoryId: string) => {
    try {
      const { data: budgetData, error } = await supabase
        .from('budgets')
        .select('budgeted_amount')
        .eq('user_id', profile.id)
        .eq('category_id', categoryId)
        .eq('year', currentYear)
        .eq('month', currentMonthNum)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Direct budget verification error:', error);
        showError(`Failed to verify saved budget: ${error.message}. Try manual refresh.`);
        return null;
      }

      const verifiedAmount = budgetData?.budgeted_amount || 0;
      console.log('Direct verification: Budget in Supabase is now', verifiedAmount);
      return verifiedAmount;
    } catch (err: any) {
      console.error('Unexpected verification error:', err);
      showError(`Verification failed: ${err.message}`);
      return null;
    }
  };

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
      console.log(`Saving overall budget for user ${profile.id}: NPR ${expenses} for ${month} (year ${currentYear}, month ${currentMonthNum})`);
      
      // Get TOTAL_EXPENSE category ID (create if missing)
      let totalExpenseCategoryId: string;
      const { data: existing, error: existingError } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', profile.id)
        .eq('name', 'TOTAL_EXPENSE')
        .eq('type', 'expense')
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error checking TOTAL_EXPENSE:', existingError);
        showError('Failed to check budget setup. See console.');
        return;
      }

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

      // Delete existing overall budget for this month (to update)
      const { error: deleteError } = await supabase
        .from('budgets')
        .delete()
        .eq('user_id', profile.id)
        .eq('category_id', totalExpenseCategoryId)
        .eq('year', currentYear)
        .eq('month', currentMonthNum);
      if (deleteError) {
        console.error('Error deleting existing budget:', deleteError);
        // Don't fail on delete—proceed to insert
      }

      // Insert the overall budget (persistent in Supabase)
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

      console.log('Overall budget inserted to Supabase - now verifying and syncing tile');
      
      // Direct verification: Query the exact entry we just saved to ensure connection to tile
      const verifiedAmount = await fetchAndVerifyBudget(totalExpenseCategoryId);
      if (verifiedAmount === expenses) {
        // Trigger parent refetch for full sync (tile updates via props)
        await onBudgetUpdate(expenses);
        setTempExpenses('');
        showSuccess(`Overall budget of ${formatCurrency(expenses)} saved and verified for ${month}! Tile updated (persists across logouts/logins).`);
      } else {
        showError(`Saved to Supabase, but verification failed (expected ${formatCurrency(expenses)}, got ${formatCurrency(verifiedAmount || 0)}). Try manual refresh below.`);
        await onBudgetUpdate(0); // Force re-fetch to try syncing
      }
    } catch (err: any) {
      console.error('Unexpected error saving budget:', err);
      showError(`Failed to save budget to Supabase: ${err.message || 'Unknown error. It may not persist.'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleManualRefresh = async () => {
    if (!profile?.id) return;
    setRefreshing(true);
    try {
      // Re-fetch category ID and budget (same logic as Dashboard's fetchExpenseBudget)
      const totalExpenseCategoryId = await getTotalExpenseCategoryId(profile.id);
      const verifiedAmount = await fetchAndVerifyBudget(totalExpenseCategoryId);
      if (verifiedAmount !== null) {
        await onBudgetUpdate(verifiedAmount); // Sync to parent/tile
        showSuccess(`Budget refreshed from Supabase: ${formatCurrency(verifiedAmount)} for ${month}.`);
      } else {
        showError('Refresh failed—check console.');
      }
    } catch (err: any) {
      console.error('Manual refresh error:', err);
      showError(`Refresh failed: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  // Helper to get TOTAL_EXPENSE category ID (create if missing) - shared with Dashboard
  const getTotalExpenseCategoryId = async (userId: string): Promise<string> => {
    const { data: existing, error: existingError } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .eq('name', 'TOTAL_EXPENSE')
      .eq('type', 'expense')
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking TOTAL_EXPENSE category:', existingError);
      throw existingError;
    }

    if (!existing) {
      const { data: inserted, error: insertError } = await supabase
        .from('categories')
        .insert({ name: 'TOTAL_EXPENSE', user_id: userId, type: 'expense' })
        .select('id')
        .single();
      if (insertError) {
        console.error('Failed to create TOTAL_EXPENSE category:', insertError);
        throw insertError;
      }
      return inserted.id;
    }
    return existing.id;
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
          <DollarSign className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-sm font-medium">Overall Budget for {month}</CardTitle>
            <CardDescription className="text-xs">Your single monthly spending limit (persistent in Supabase)</CardDescription>
          </div>
          <Target className="h-4 w-4 text-muted-foreground" />
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
            <CardDescription>Set your overall monthly spending limit (saved to Supabase, persists across logouts/logins for the entire month—updates the tile below).</CardDescription>
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
            </div>
            <Button
              onClick={handleInlineSave}
              disabled={saving || tempExpenses === ''}
              className="w-full"
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving to Supabase...' : `Set Overall Budget for ${month} (Persists & Updates Tile)`}
            </Button>
          </CardContent>
        </Card>
        {renderSummaryTiles()}
      </div>
    );
  }

  // Normal summary when budget exists (fetched from Supabase)
  return (
    <div className="space-y-4">
      {renderSummaryTiles()}
      {/* Show update form if budget exists but user might want to change it */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold">Update Overall Budget for {month}</CardTitle>
          <CardDescription>Change your monthly spending limit (updates the tile above and persists in Supabase).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">New Overall Budget (NPR)</Label>
            <Input
              type="number"
              value={tempExpenses}
              onChange={(e) => setTempExpenses(e.target.value)}
              placeholder={formatCurrency(budgetedExpenses)} // Pre-fill current
              min="0"
              step="0.01"
              className="text-right font-mono"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleInlineSave}
              disabled={saving || tempExpenses === ''}
              className="flex-1"
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Updating...' : 'Update Overall Budget'}
            </Button>
            <Button
              variant="outline"
              onClick={handleManualRefresh}
              disabled={refreshing || saving}
              className="flex-0"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Tile'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};