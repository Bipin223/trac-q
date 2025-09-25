import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@supabase/auth-helpers-react';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showError } from '@/utils/toast';
import { format } from 'date-fns';
import { DollarSign, Calendar, Plus, Edit3, Save, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface CategoryBudget {
  id: string;
  name: string;
  budgeted_amount: number;
  actual_amount: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR' }).format(amount);
};

const formatPercentage = (value: number) => Math.round(value) + '%';

const Budgets = () => {
  const user = useUser();
  const { profile } = useProfile();
  const [categories, setCategories] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const year = currentMonth.getFullYear();
  const monthNum = currentMonth.getMonth() + 1;
  const monthStr = monthNum.toString().padStart(2, '0');

  const fetchData = async () => {
    if (!user || !profile) return;
    setLoading(true);

    try {
      // Fetch expense categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', profile.id)
        .eq('type', 'expense')
        .order('name');

      if (catError) throw catError;

      // Fetch budgets for this month
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('category_id, budgeted_amount')
        .eq('user_id', profile.id)
        .eq('year', year)
        .eq('month', monthNum);

      if (budgetError) throw budgetError;

      // Fetch expenses for this month
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('category_id, amount')
        .eq('user_id', profile.id)
        .gte('expense_date', `${year}-${monthStr}-01`)
        .lte('expense_date', `${year}-${monthStr}-31`);

      if (expenseError) throw expenseError;

      // Map budgets
      const budgetsMap = budgetData?.reduce((acc, b) => {
        acc[b.category_id] = b.budgeted_amount;
        return acc;
      }, {} as { [key: string]: number }) || {};

      // Map actual expenses
      const actualsMap = expenseData?.reduce((acc, e) => {
        acc[e.category_id] = (acc[e.category_id] || 0) + (e.amount || 0);
        return acc;
      }, {} as { [key: string]: number }) || {};

      const processedCategories: CategoryBudget[] = (catData || []).map(cat => ({
        id: cat.id,
        name: cat.name,
        budgeted_amount: budgetsMap[cat.id] || 0,
        actual_amount: actualsMap[cat.id] || 0,
      }));

      // Add total category if missing
      const totalExpenseCat = processedCategories.find(c => c.name === 'TOTAL_EXPENSE');
      if (!totalExpenseCat) {
        const totalActual = processedCategories.reduce((sum, c) => sum + c.actual_amount, 0);
        processedCategories.push({ 
          id: 'total-expense-placeholder', // Will be replaced with real ID before save
          name: 'TOTAL_EXPENSE', 
          budgeted_amount: budgetsMap['total-expense'] || 0, 
          actual_amount: totalActual 
        });
      }

      setCategories(processedCategories);
    } catch (error) {
      console.error('Error fetching budget data:', error);
      showError('Failed to load budget data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, profile, currentMonth]);

  const ensureTotalExpenseCategory = async () => {
    if (!profile) return null;
    const { data: existing, error: existingError } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', profile.id)
      .eq('name', 'TOTAL_EXPENSE')
      .eq('type', 'expense')
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking TOTAL_EXPENSE:', existingError);
      return null;
    }

    if (!existing) {
      const { data: inserted, error: insertError } = await supabase
        .from('categories')
        .insert({ name: 'TOTAL_EXPENSE', user_id: profile.id, type: 'expense' })
        .select('id')
        .single();
      if (insertError) {
        console.error('Failed to create TOTAL_EXPENSE:', insertError);
        return null;
      }
      return inserted.id;
    }
    return existing.id;
  };

  const handleBudgetChange = (catId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setCategories(prev => prev.map(cat => cat.id === catId ? { ...cat, budgeted_amount: numValue } : cat));
  };

  const saveAllBudgets = async () => {
    if (!user || !profile) return;
    setSaving(true);

    try {
      // Ensure TOTAL_EXPENSE exists and get its real ID
      const totalExpenseId = await ensureTotalExpenseCategory();
      if (!totalExpenseId) {
        showError('Failed to set up total expense category.');
        return;
      }

      // Update total row with real ID if it was placeholder
      setCategories(prev => prev.map(cat => 
        cat.name === 'TOTAL_EXPENSE' && cat.id === 'total-expense-placeholder' 
          ? { ...cat, id: totalExpenseId } 
          : cat
      ));

      const updates: any[] = [];
      categories.forEach(cat => {
        if (cat.budgeted_amount > 0) {
          updates.push({
            user_id: profile.id,
            category_id: cat.id,
            year,
            month: monthNum,
            budgeted_amount: cat.budgeted_amount,
          });
        }
      });

      // Delete existing budgets for this month
      const { error: deleteError } = await supabase
        .from('budgets')
        .delete()
        .eq('user_id', profile.id)
        .eq('year', year)
        .eq('month', monthNum);

      if (deleteError) console.error('Error deleting old budgets:', deleteError);

      // Insert new ones
      if (updates.length > 0) {
        const { error: insertError } = await supabase.from('budgets').insert(updates);
        if (insertError) throw insertError;
      }

      showSuccess(`Budgets saved for ${format(currentMonth, 'MMMM yyyy')}! Updated ${updates.length} categories.`);
      fetchData(); // Refresh to show actuals vs budgeted
    } catch (error: any) {
      console.error('Error saving budgets:', error);
      showError(`Failed to save budgets: ${error.message}`);
    } finally {
      setSaving(false);
      setShowSaveConfirm(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !profile) return;
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: newCategoryName.trim(), user_id: profile.id, type: 'expense' })
      .select('id, name')
      .single();

    if (error) {
      showError(`Failed to create category: ${error.message}`);
    } else if (data) {
      showSuccess(`Expense category "${newCategoryName}" created! Set a budget below.`);
      setNewCategoryName('');
      fetchData(); // Refresh list
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!profile) return;
    const { error } = await supabase.from('categories').delete().eq('id', catId).eq('user_id', profile.id);
    if (error) {
      showError(`Failed to delete category: ${error.message}`);
    } else {
      showSuccess('Category deleted.');
      fetchData();
    }
  };

  const progressForCat = (cat: CategoryBudget) => {
    if (cat.budgeted_amount === 0) return 0;
    const progress = (cat.actual_amount / cat.budgeted_amount) * 100;
    return Math.min(progress, 100); // Cap at 100%
  };

  const getProgressColor = (progress: number) => {
    if (progress === 0) return 'bg-gray-200';
    return progress <= 100 ? 'bg-green-500' : progress <= 120 ? 'bg-yellow-500' : 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-1/2" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Monthly Budgets</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
            Previous Month
          </Button>
          <Badge variant="secondary">
            <Calendar className="h-4 w-4 mr-1" />
            {format(currentMonth, 'MMMM yyyy')}
          </Badge>
          <Button variant="outline" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
            Next Month
          </Button>
        </div>
      </div>

      {/* Add New Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Expense Category
          </CardTitle>
          <CardDescription>Create a custom spending category.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Category name (e.g., Groceries, Rent)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expense Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-red-600" />
            Budget for {format(currentMonth, 'MMMM yyyy')}
          </CardTitle>
          <CardDescription>Set limits for your spending categories.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No expense categories. Create one above to get started.</p>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg space-x-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{cat.name}</h4>
                      <p className="text-sm text-muted-foreground">Actual: {formatCurrency(cat.actual_amount)}</p>
                    </div>
                    <Input
                      type="number"
                      value={cat.budgeted_amount || ''}
                      onChange={(e) => handleBudgetChange(cat.id, e.target.value)}
                      placeholder="Set limit"
                      min="0"
                      step="0.01"
                      className="w-32 text-right"
                    />
                  </div>
                  {cat.budgeted_amount > 0 && (
                    <div className="space-y-1 mt-2">
                      <Progress value={progressForCat(cat)} className={getProgressColor(progressForCat(cat))} />
                      <p className="text-xs text-muted-foreground">
                        {formatPercentage(progressForCat(cat))} of limit
                      </p>
                    </div>
                  )}
                </div>
                {cat.name !== 'TOTAL_EXPENSE' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {cat.name}?</AlertDialogTitle>
                        <AlertDialogDescription>This will remove the category and its data.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteCategory(cat.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save All Budgets?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update your spending limits for {format(currentMonth, 'MMMM yyyy')} across all categories.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveAllBudgets} disabled={saving}>
              {saving ? 'Saving...' : 'Save All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-end">
        <Button onClick={() => setShowSaveConfirm(true)} disabled={saving} className="w-full sm:w-auto">
          {saving ? 'Saving...' : 'Save All Budgets'}
        </Button>
      </div>
    </div>
  );
};

export default Budgets;