import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp, Wallet, Target, Save, AlertCircle, RefreshCw, Play } from "lucide-react";
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
  const [categoryId, setCategoryId] = useState<string | null>(null); // Track category ID for logging

  // Suggestion for expenses budget (based on actuals + buffer)
  const suggestedExpenses = totalExpenses > 0 ? Math.round(totalExpenses * 1.2) : 50000; // 20% buffer over actual or default

  // Auto-refetch when form loads (to rule out stale data)
  useEffect(() => {
    if (hasNoBudget && profile?.id) {
      const quickCheck = async () => {
        try {
          console.log('Form loaded with budget=0 - quick-checking Supabase for stale data...');
          const catId = await getTotalExpenseCategoryId(profile.id);
          const verified = await fetchAndVerifyBudget(catId);
          if (verified && verified > 0) {
            console.log('Stale data found! Updating tile to', verified);
            await onBudgetUpdate(verified);
          } else {
            console.log('No stale budget found - form is correct.');
          }
        } catch (err) {
          console.error('Quick check failed:', err);
        }
      };
      quickCheck();
    }
  }, [hasNoBudget, profile, currentYear, currentMonthNum, onBudgetUpdate]);

  // Helper to fetch/verify the single overall budget directly (for immediate sync after save)
  const fetchAndVerifyBudget = async (catId: string) => {
    try {
      console.log('Verifying budget with category_id:', catId, 'for user', profile.id);
      const { data: budgetData, error } = await supabase
        .from('budgets')
        .select('budgeted_amount')
        .eq('user_id', profile.id)
        .eq('category_id', catId)
        .eq('year', currentYear)
        .eq('month', currentMonthNum)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Direct budget verification error:', error);
        showError(`Failed to verify budget: ${error.message}. Check console (F12) for details and try refresh.`);
        return null;
      }

      const verifiedAmount = budgetData?.budgeted_amount || 0;
      console.log('Verification successful: Budget in Supabase is', verifiedAmount);
      return verifiedAmount;
    } catch (err: any) {
      console.error('Unexpected verification error:', err);
      showError(`Verification failed: ${err.message}. Check console and try manual refresh.`);
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
      console.log(`=== SAVE START: Overall budget for user ${profile.id}: NPR ${expenses} for ${month} (year ${currentYear}, month ${currentMonthNum}) ===`);
      
      // Step 1: Get/create TOTAL_EXPENSE category ID
      let totalExpenseCategoryId: string;
      const { data: existing, error: existingError } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', profile.id)
        .eq('name', 'TOTAL_EXPENSE')
        .eq('type', 'expense')
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('STEP 1 ERROR - Checking TOTAL_EXPENSE:', existingError);
        showError(`Failed to check category: ${existingError.message}. Check console (F12).`);
        return;
      }

      if (!existing) {
        console.log('Creating new TOTAL_EXPENSE category...');
        const { data: inserted, error: insertError } = await supabase
          .from('categories')
          .insert({ name: 'TOTAL_EXPENSE', user_id: profile.id, type: 'expense' })
          .select('id')
          .single();
        if (insertError) {
          console.error('STEP 1 ERROR - Creating TOTAL_EXPENSE:', insertError);
          showError(`Failed to create category: ${insertError.message}. Check console.`);
          return;
        }
        totalExpenseCategoryId = inserted.id;
        setCategoryId(totalExpenseCategoryId); // Track for logging
        console.log('STEP 1 SUCCESS: Created new TOTAL_EXPENSE category ID:', totalExpenseCategoryId);
      } else {
        totalExpenseCategoryId = existing.id;
        setCategoryId(totalExpenseCategoryId);
        console.log('STEP 1 SUCCESS: Using existing TOTAL_EXPENSE category ID:', totalExpenseCategoryId);
      }

      // Step 2: Delete existing budget for this month (to avoid duplicates)
      console.log('STEP 2: Deleting existing budget if any...');
      const { error: deleteError } = await supabase
        .from('budgets')
        .delete()
        .eq('user_id', profile.id)
        .eq('category_id', totalExpenseCategoryId)
        .eq('year', currentYear)
        .eq('month', currentMonthNum);
      if (deleteError) {
        console.error('STEP 2 WARNING - Delete failed (non-critical):', deleteError);
      } else {
        console.log('STEP 2 SUCCESS: Cleared existing budget.');
      }

      // Step 3: Insert the new budget
      console.log('STEP 3: Inserting budget with category_id:', totalExpenseCategoryId);
      const { error: insertError } = await supabase.from('budgets').insert({
        user_id: profile.id,
        category_id: totalExpenseCategoryId,
        year: currentYear,
        month: currentMonthNum,
        budgeted_amount: expenses,
      });

      if (insertError) {
        console.error('STEP 3 ERROR - Insert failed:', insertError);
        showError(`Failed to save budget to Supabase: ${insertError.message}. Check console (F12) for details. It won't persist.`);
        return;
      }
      console.log('STEP 3 SUCCESS: Budget inserted to Supabase.');

      // Step 4: Verify the insert immediately
      console.log('STEP 4: Verifying insert...');
      const verifiedAmount = await fetchAndVerifyBudget(totalExpenseCategoryId);
      if (verifiedAmount === expenses) {
        console.log('STEP 4 SUCCESS: Verified! Updating tile immediately.');
        // Trigger parent refetch for full sync (tile updates via props)
        await onBudgetUpdate(expenses);
        setTempExpenses('');
        showSuccess(`Overall budget of ${formatCurrency(expenses)} saved and verified for ${month}! Tile updated (persists across logouts/logins).`);
      } else {
        console.error('STEP 4 FAILURE: Verification mismatch! Expected', expenses, 'but got', verifiedAmount);
        showError(`Saved to Supabase, but tile verification failed (expected ${formatCurrency(expenses)}, got ${formatCurrency(verifiedAmount || 0)}). Check console (F12), try manual refresh below, or refresh page.`);
        await onBudgetUpdate(0); // Force full refetch
      }
      console.log('=== SAVE COMPLETE ===');
    } catch (err: any) {
      console.error('UNEXPECTED SAVE ERROR:', err);
      showError(`Unexpected error saving budget: ${err.message || 'Unknown'}. Check console (F12) and try again. It may not persist.`);
    } finally {
      setSaving(false);
    }
  };

  const handleManualRefresh = async () => {
    if (!profile?.id || !categoryId) return;
    setRefreshing(true);
    try {
      console.log('Manual refresh requested - fetching with category_id:', categoryId);
      const verifiedAmount = await fetchAndVerifyBudget(categoryId);
      if (verifiedAmount !== null) {
        await onBudgetUpdate(verifiedAmount); // Sync parent
        showSuccess(`Budget refreshed from Supabase: ${formatCurrency(verifiedAmount)} for ${month}. Tile synced!`);
      } else {
        showError('Refresh failed—no budget found in Supabase. Check console.');
      }
    } catch (err: any) {
      console.error('Manual refresh error:', err);
      showError(`Refresh failed: ${err.message}. Check console.`);
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
              <p className="text-xs text-muted-foreground italic">Tip: Enter amount and click Save. Check console (F12) if issues.</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleInlineSave}
                disabled={saving || tempExpenses === ''}
                className="flex-1"
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving to Supabase...' : `Set Overall Budget for ${month} (Persists & Updates Tile)`}
              </Button>
              {/* Temporary debug button - remove later if not needed */}
              <Button
                variant="outline"
                onClick={handleInlineSave}
                disabled={saving || tempExpenses === ''}
                className="flex-0"
                size="sm"
                title="Test Save (logs to console)"
              >
                <Play className="h-4 w-4 mr-2" />
                Test
              </Button>
            </div>
            {categoryId && (
              <p className="text-xs text-muted-foreground">Debug: Using category ID {categoryId} (check console for full logs).</p>
            )}
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
          {categoryId && (
            <p className="text-xs text-muted-foreground">Debug: Using category ID {categoryId}.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};