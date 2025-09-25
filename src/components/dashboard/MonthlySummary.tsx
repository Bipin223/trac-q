"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp, Wallet, Target, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from "@/utils/toast";
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
  const [currentBudget, setCurrentBudget] = useState(budgetedExpenses || 0);
  const [tempExpenses, setTempExpenses] = useState(currentBudget.toString());
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Suggestion for expenses budget (based on actuals + buffer)
  const suggestedExpenses = totalExpenses > 0 ? Math.round(totalExpenses * 1.2) : 50000; // 20% buffer over actual or default

  // Re-fetch budget on mount to ensure latest from DB (prevents reset on refresh)
  useEffect(() => {
    if (profile?.id) {
      const refetchBudget = async () => {
        try {
          console.log('MonthlySummary: Refetching budget for user', profile.id, 'year', currentYear, 'month', currentMonthNum);
          const totalExpenseCategoryId = await getTotalExpenseCategoryId(profile.id);
          console.log('MonthlySummary: Found TOTAL_EXPENSE category ID:', totalExpenseCategoryId);
          
          const { data: budgetData, error } = await supabase
            .from('budgets')
            .select('budgeted_amount')
            .eq('user_id', profile.id)
            .eq('category_id', totalExpenseCategoryId)
            .eq('year', currentYear)
            .eq('month', currentMonthNum)
            .single();

          if (error) {
            if (error.code === 'PGRST116') { // No rows
              console.log('MonthlySummary: No budget found, setting to 0');
              setCurrentBudget(0);
              setTempExpenses('0');
            } else {
              console.error('MonthlySummary: Fetch error:', error);
              showError('Failed to fetch budget. Using cached value.');
            }
          } else {
            const fetchedBudget = budgetData?.budgeted_amount || 0;
            console.log('MonthlySummary: Fetched budget:', fetchedBudget);
            setCurrentBudget(fetchedBudget);
            setTempExpenses(fetchedBudget.toString());
            await onBudgetUpdate(fetchedBudget); // Sync parent
          }
        } catch (err: any) {
          console.error('MonthlySummary: Refetch error:', err);
          showError('Could not sync budget. Please refresh.');
        }
      };
      refetchBudget();
    }
  }, [profile, currentYear, currentMonthNum, onBudgetUpdate]);

  const handleSaveBudget = async () => {
    const expenses = parseFloat(tempExpenses) || 0;
    if (expenses === 0) {
      showError('Please enter a budget amount greater than 0.');
      return;
    }
    if (expenses < 0) {
      showError('Budget amount must be positive.');
      return;
    }
    if (!profile?.id) {
      showError('User session invalid. Please refresh the page.');
      return;
    }
    setSaving(true);

    try {
      console.log('MonthlySummary: Saving budget', expenses, 'for user', profile.id);
      
      // Get/create TOTAL_EXPENSE category ID
      const totalExpenseCategoryId = await getTotalExpenseCategoryId(profile.id);
      console.log('MonthlySummary: Using category ID for save:', totalExpenseCategoryId);

      // Delete any existing budget for this month (ensures single row)
      const { error: deleteError } = await supabase
        .from('budgets')
        .delete()
        .eq('user_id', profile.id)
        .eq('category_id', totalExpenseCategoryId)
        .eq('year', currentYear)
        .eq('month', currentMonthNum);

      if (deleteError && deleteError.code !== 'PGRST116') { // Ignore "no rows" error
        console.error('MonthlySummary: Delete error:', deleteError);
        throw new Error(`Failed to clear old budget: ${deleteError.message}`);
      }

      // Insert new budget
      const { error: insertError } = await supabase.from('budgets').insert({
        user_id: profile.id,
        category_id: totalExpenseCategoryId,
        year: currentYear,
        month: currentMonthNum,
        budgeted_amount: expenses,
      });

      if (insertError) {
        console.error('MonthlySummary: Insert error:', insertError);
        throw new Error(`Failed to save budget: ${insertError.message}`);
      }

      // Verify insert by re-fetching immediately
      const verified = await getTotalExpenseCategoryId(profile.id); // Reuse to get ID
      const { data: verifyData, error: verifyError } = await supabase
        .from('budgets')
        .select('budgeted_amount')
        .eq('user_id', profile.id)
        .eq('category_id', verified)
        .eq('year', currentYear)
        .eq('month', currentMonthNum)
        .single();

      if (verifyError || verifyData?.budgeted_amount !== expenses) {
        console.error('MonthlySummary: Verification failed:', verifyError, verifyData);
        showError('Budget saved but could not verify. Please refresh.');
        await onBudgetUpdate(0); // Trigger full refetch
      } else {
        console.log('MonthlySummary: Budget verified successfully:', expenses);
        setCurrentBudget(expenses);
        await onBudgetUpdate(expenses); // Sync parent and prevent reset
        setTempExpenses(expenses.toString());
        showSuccess(`Overall budget of ${formatCurrency(expenses)} set for ${month}.`);
      }
    } catch (err: any) {
      console.error('MonthlySummary: Save error:', err);
      showError(err.message || 'Failed to save budget. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleManualRefresh = async () => {
    if (!profile?.id) return;
    setRefreshing(true);
    try {
      console.log('MonthlySummary: Manual refresh triggered');
      const totalExpenseCategoryId = await getTotalExpenseCategoryId(profile.id);
      const { data: budgetData, error } = await supabase
        .from('budgets')
        .select('budgeted_amount')
        .eq('user_id', profile.id)
        .eq('category_id', totalExpenseCategoryId)
        .eq('year', currentYear)
        .eq('month', currentMonthNum)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const refreshedBudget = budgetData?.budgeted_amount || 0;
      console.log('MonthlySummary: Refreshed budget:', refreshedBudget);
      setCurrentBudget(refreshedBudget);
      setTempExpenses(refreshedBudget.toString());
      await onBudgetUpdate(refreshedBudget);
      showSuccess(`Budget refreshed for ${month}: ${formatCurrency(refreshedBudget)}`);
    } catch (err: any) {
      console.error('MonthlySummary: Refresh error:', err);
      showError('Refresh failed. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  // Helper to get/create TOTAL_EXPENSE category ID
  const getTotalExpenseCategoryId = async (userId: string): Promise<string> => {
    try {
      const { data: existing, error: existingError } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .eq('name', 'TOTAL_EXPENSE')
        .eq('type', 'expense')
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        throw existingError;
      }

      if (existing) {
        return existing.id;
      }

      // Create if missing
      const { data: inserted, error: insertError } = await supabase
        .from('categories')
        .insert({ name: 'TOTAL_EXPENSE', user_id: userId, type: 'expense' })
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      console.log('MonthlySummary: Created new TOTAL_EXPENSE category ID:', inserted.id);
      return inserted.id;
    } catch (err: any) {
      console.error('MonthlySummary: Category error:', err);
      throw new Error(`Failed to get/create category: ${err.message}`);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress === 0) return 'bg-gray-200';
    return progress <= 100 ? 'bg-green-500' : progress <= 120 ? 'bg-yellow-500' : 'bg-red-500';
  };

  const getProgressStatus = (progress: number) => {
    if (progress === 0) return 'No budget set';
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
            <CardDescription className="text-xs">Your monthly spending limit</CardDescription>
          </div>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold">{formatCurrency(currentBudget)}</div>
          {currentBudget > 0 && (
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
          {currentBudget > 0 && (
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

  // Unified form: Always show, prefilled with current (0 if none), label adapts
  const formTitle = currentBudget > 0 ? `Update Overall Budget for ${month}` : `Set Overall Budget for ${month}`;
  const buttonText = saving ? 'Saving...' : (currentBudget > 0 ? 'Update Budget' : 'Set Budget');
  const placeholder = currentBudget > 0 ? formatCurrency(currentBudget) : formatCurrency(suggestedExpenses);

  return (
    <div className="space-y-4">
      {renderSummaryTiles()}
      
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold">{formTitle}</CardTitle>
          <CardDescription>Enter your monthly spending limit in NPR. {currentBudget > 0 ? `Current: ${formatCurrency(currentBudget)}` : `Suggested: ${formatCurrency(suggestedExpenses)}`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Overall Budget (NPR)</Label>
            <Input
              type="number"
              value={tempExpenses}
              onChange={(e) => setTempExpenses(e.target.value)}
              placeholder={placeholder}
              min="0"
              step="0.01"
              className="text-right font-mono"
              disabled={saving}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSaveBudget}
              disabled={saving || parseFloat(tempExpenses || '0') === 0}
              className="flex-1"
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {buttonText}
            </Button>
            <Button
              variant="outline"
              onClick={handleManualRefresh}
              disabled={refreshing || saving}
              className="flex-0"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
          {currentBudget === 0 && (
            <p className="text-xs text-muted-foreground text-center">Setting a budget helps track spending progress!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};