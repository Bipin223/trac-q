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
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface CategoryBudget {
  id: string;
  name: string;
  type: 'income' | 'expense';
  budgeted_amount: number;
  actual_amount: number;
}

const Budgets = () => {
  const user = useUser();
  const { profile } = useProfile();
  const [categories, setCategories] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('expense');

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const fetchData = async () => {
    if (!user || !profile) return;
    setLoading(true);

    try {
      // Fetch categories with existing budgets and actuals
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select(`
          id, name, type,
          budgets!inner (
            budgeted_amount
          !budgets_year_eq: ${year}
          !budgets_month_eq: ${month}
          ),
          incomes!inner (amount !incomes_category_id_eq: id !incomes_income_date_gte: ${year}-${month.toString().padStart(2, '0')}-01 !incomes_income_date_lte: ${year}-${month.toString().padStart(2, '0')}-31),
          expenses!inner (amount !expenses_category_id_eq: id !expenses_expense_date_gte: ${year}-${month.toString().padStart(2, '0')}-01 !expenses_expense_date_lte: ${year}-${month.toString().padStart(2, '0')}-31)
        `)
        .eq('user_id', profile.id)
        .order('type')
        .order('name');

      if (catError) throw catError;

      const processedCategories: CategoryBudget[] = (catData || []).map(cat => {
        const budgeted = cat.budgets?.[0]?.budgeted_amount || 0;
        const actualIncome = cat.incomes?.reduce((sum, inc) => sum + (inc.amount || 0), 0) || 0;
        const actualExpense = cat.expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
        const actual = cat.type === 'income' ? actualIncome : actualExpense;

        return {
          id: cat.id,
          name: cat.name,
          type: cat.type,
          budgeted_amount: budgeted,
          actual_amount: actual,
        };
      });

      // Add total categories if missing
      const totalIncomeCat = processedCategories.find(c => c.name === 'TOTAL_INCOME' && c.type === 'income');
      const totalExpenseCat = processedCategories.find(c => c.name === 'TOTAL_EXPENSE' && c.type === 'expense');
      if (!totalIncomeCat) {
        processedCategories.unshift({ id: 'total-income', name: 'TOTAL_INCOME', type: 'income', budgeted_amount: 0, actual_amount: processedCategories.filter(c => c.type === 'income').reduce((sum, c) => sum + c.actual_amount, 0) });
      }
      if (!totalExpenseCat) {
        processedCategories.push({ id: 'total-expense', name: 'TOTAL_EXPENSE', type: 'expense', budgeted_amount: 0, actual_amount: processedCategories.filter(c => c.type === 'expense').reduce((sum, c) => sum + c.actual_amount, 0) });
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

  const handleBudgetChange = (catId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setCategories(prev => prev.map(cat => cat.id === catId ? { ...cat, budgeted_amount: numValue } : cat));
  };

  const saveAllBudgets = async () => {
    if (!user || !profile) return;
    setSaving(true);

    try {
      const updates: any[] = [];
      categories.forEach(cat => {
        if (cat.budgeted_amount > 0) {
          updates.push({
            user_id: profile.id,
            category_id: cat.id,
            year,
            month,
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
        .eq('month', month);

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
      .insert({ name: newCategoryName.trim(), user_id: profile.id, type: newCategoryType })
      .select('id, name, type')
      .single();

    if (error) {
      showError(`Failed to create category: ${error.message}`);
    } else if (data) {
      showSuccess(`Category "${newCategoryName}" created! Set a budget below.`);
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

  const getProgressColor = (cat: CategoryBudget) => {
    const progress = progressForCat(cat);
    if (progress === 0) return 'bg-gray-200';
    if (cat.type === 'income') {
      return progress >= 100 ? 'bg-green-500' : progress >= 80 ? 'bg-yellow-500' : 'bg-red-500';
    } else {
      return progress <= 100 ? 'bg-green-500' : progress <= 120 ? 'bg-yellow-500' : 'bg-red-500';
    }
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

  const incomeCats = categories.filter(c => c.type === 'income');
  const expenseCats = categories.filter(c => c.type === 'expense');

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
            Add New Category
          </CardTitle>
          <CardDescription>Create a custom income source or expense category.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              placeholder="Category name (e.g., Salary, Groceries)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <select
              value={newCategoryType}
              onChange={(e) => setNewCategoryType(e.target.value as 'income' | 'expense')}
              className="border rounded-md p-2"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <Button onClick={handleCreateCategory} disabled={!newCategoryName.trim()} className="w-full md:w-auto">
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Income Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Income Categories
          </CardTitle>
          <CardDescription>Set targets for your income sources.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {incomeCats.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No income categories. Create one above.</p>
          ) : (
            incomeCats.map((cat) => (
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
                      placeholder="Set budget"
                      min="0"
                      step="0.01"
                      className="w-32 text-right"
                    />
                  </div>
                  {cat.budgeted_amount > 0 && (
                    <div className="space-y-1 mt-2">
                      <Progress value={progressForCat(cat)} className={getProgressColor(cat)} />
                      <p className="text-xs text-muted-foreground">
                        {formatPercentage(progressForCat(cat))} of target
                      </p>
                    </div>
                  )}
                </div>
                {cat.name !== 'TOTAL_INCOME' && (
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

      {/* Expense Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-red-600" />
            Expense Categories
          </CardTitle>
          <CardDescription>Set limits for your spending areas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {expenseCats.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No expense categories. Create one above.</p>
          ) : (
            expenseCats.map((cat) => (
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
                      <Progress value={progressForCat(cat)} className={getProgressColor(cat)} />
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
              This will update budgets for {format(currentMonth, 'MMMM yyyy')} across all categories.
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