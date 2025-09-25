import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@supabase/auth-helpers-react';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showError } from '@/utils/toast';
import { format } from 'date-fns';
import { DollarSign } from 'lucide-react';
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

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

const Budgets = () => {
  const user = useUser();
  const { profile } = useProfile();
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fetchData = async () => {
    if (!user || !profile) return;
    setLoading(true);

    const { data: catData } = await supabase
      .from('categories')
      .select('id, name, type')
      .eq('user_id', profile.id);

    setCategories(catData || []);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const { data: budgetData } = await supabase
      .from('budgets')
      .select('category_id, budgeted_amount')
      .eq('user_id', profile.id)
      .eq('year', year)
      .eq('month', month);

    const budgetMap: { [key: string]: number } = {};
    budgetData?.forEach((b: any) => {
      budgetMap[b.category_id] = b.budgeted_amount;
    });
    setBudgets(budgetMap);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user, profile, currentMonth]);

  const handleBudgetChange = (categoryId: string, amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    setBudgets(prev => ({ ...prev, [categoryId]: numAmount }));
  };

  const getBudgetSummary = () => {
    const totalIncomeBudget = categories
      .filter(c => c.type === 'income')
      .reduce((sum, cat) => sum + (budgets[cat.id] || 0), 0);
    const totalExpenseBudget = categories
      .filter(c => c.type === 'expense')
      .reduce((sum, cat) => sum + (budgets[cat.id] || 0), 0);
    return { totalIncomeBudget, totalExpenseBudget };
  };

  const confirmSaveBudgets = () => {
    const summary = getBudgetSummary();
    if (summary.totalIncomeBudget === 0 && summary.totalExpenseBudget === 0) {
      showError('No budgets to save.');
      return;
    }
    setShowSaveConfirm(true);
  };

  const saveBudgets = async () => {
    if (!user || !profile) return;
    setSaving(true);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;

    await supabase
      .from('budgets')
      .delete()
      .eq('user_id', profile.id)
      .eq('year', year)
      .eq('month', month);

    const budgetEntries = Object.entries(budgets)
      .filter(([_, amount]) => amount > 0)
      .map(([category_id, budgeted_amount]) => ({
        user_id: profile.id,
        category_id,
        year,
        month,
        budgeted_amount,
      }));

    const { error } = await supabase.from('budgets').insert(budgetEntries);

    if (error) {
      showError('Failed to save budgets.');
    } else {
      showSuccess(`Budgets saved for ${format(currentMonth, 'MMMM yyyy')}!`);
    }
    setSaving(false);
    setShowSaveConfirm(false);
  };

  const confirmClearBudgets = () => {
    setShowClearConfirm(true);
  };

  const clearBudgets = async () => {
    if (!user || !profile) return;

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;

    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('user_id', profile.id)
      .eq('year', year)
      .eq('month', month);

    if (error) {
      showError('Failed to clear budgets.');
    } else {
      showSuccess('All budgets cleared for this month.');
      setBudgets({});
    }
    setShowClearConfirm(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR' }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-1/2" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
            Previous Month
          </Button>
          <Badge variant="secondary">{format(currentMonth, 'MMMM yyyy')}</Badge>
          <Button variant="outline" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
            Next Month
          </Button>
        </div>
      </div>

      {incomeCategories.length === 0 && expenseCategories.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Categories</h3>
          </CardContent>
        </Card>
      ) : (
        <>
          {incomeCategories.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Income Budgets
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {incomeCategories.map((cat) => (
                  <Card key={cat.id} className="border-2 border-border hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium truncate">{cat.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Budget (NPR)</Label>
                        <Input
                          type="number"
                          value={budgets[cat.id] || ''}
                          onChange={(e) => handleBudgetChange(cat.id, e.target.value)}
                          placeholder="0.00"
                          className="text-right font-mono"
                          min="0"
                          step="0.01"
                        />
                        {budgets[cat.id] > 0 && (
                          <p className="text-xs text-green-600 font-medium">
                            {formatCurrency(budgets[cat.id])}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {expenseCategories.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-red-600" />
                Expense Budgets
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {expenseCategories.map((cat) => (
                  <Card key={cat.id} className="border-2 border-border hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium truncate">{cat.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Budget (NPR)</Label>
                        <Input
                          type="number"
                          value={budgets[cat.id] || ''}
                          onChange={(e) => handleBudgetChange(cat.id, e.target.value)}
                          placeholder="0.00"
                          className="text-right font-mono"
                          min="0"
                          step="0.01"
                        />
                        {budgets[cat.id] > 0 && (
                          <p className="text-xs text-red-600 font-medium">
                            {formatCurrency(budgets[cat.id])}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Budgets?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all budgeted amounts for {format(currentMonth, 'MMMM yyyy')}. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className={cn(
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  )} onClick={clearBudgets}>
                    Clear Budgets
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button variant="outline" onClick={confirmClearBudgets} className="w-full sm:w-auto">
              Clear All Budgets
            </Button>

            <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Save Budgets?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will update your budgets for {format(currentMonth, 'MMMM yyyy')}. Total income budget: {formatCurrency(getBudgetSummary().totalIncomeBudget)}, total expense budget: {formatCurrency(getBudgetSummary().totalExpenseBudget)}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={saveBudgets} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Budgets'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button onClick={confirmSaveBudgets} disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Saving...' : 'Save Budgets'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default Budgets;