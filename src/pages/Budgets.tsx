import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@supabase/auth-helpers-react';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showError } from '@/utils/toast';
import { format } from 'date-fns';
import { DollarSign } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

interface Budget {
  category_id: string;
  budgeted_amount: number;
}

const Budgets = () => {
  const user = useUser();
  const { profile } = useProfile();
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchData = async () => {
    if (!user || !profile) return;
    setLoading(true);

    // Fetch all categories for the user
    const { data: catData } = await supabase
      .from('categories')
      .select('id, name, type')
      .eq('user_id', profile.id);

    setCategories(catData || []);

    // Fetch existing budgets for current month
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const { data: budgetData } = await supabase
      .from('budgets')
      .select('category_id, budgeted_amount')
      .eq('user_id', profile.id)
      .eq('year', year)
      .eq('month', month);

    const budgetMap: { [key: string]: number } = {};
    budgetData?.forEach((b: Budget) => {
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

  const saveBudgets = async () => {
    if (!user || !profile) return;
    setSaving(true);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;

    // Delete existing budgets for the month
    await supabase
      .from('budgets')
      .delete()
      .eq('user_id', profile.id)
      .eq('year', year)
      .eq('month', month);

    // Insert new budgets for categories with amounts > 0
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">Set your monthly budgeted amounts in NPR for income sources and expense categories.</p>
        </div>
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
            <h3 className="text-lg font-semibold mb-2">No Categories Yet</h3>
            <p className="text-muted-foreground mb-4">Add some income sources or expense categories via the Incomes or Expenses pages to set budgets.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {incomeCategories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Income Budgets</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Income Source</TableHead>
                      <TableHead className="text-right">Budgeted Amount (NPR)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeCategories.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={budgets[cat.id] || ''}
                            onChange={(e) => handleBudgetChange(cat.id, e.target.value)}
                            placeholder="0.00"
                            className="w-32 text-right"
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {expenseCategories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Expense Budgets</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Expense Category</TableHead>
                      <TableHead className="text-right">Budgeted Amount (NPR)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseCategories.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={budgets[cat.id] || ''}
                            onChange={(e) => handleBudgetChange(cat.id, e.target.value)}
                            placeholder="0.00"
                            className="w-32 text-right"
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button onClick={saveBudgets} disabled={saving} className="w-48">
              {saving ? 'Saving...' : 'Save Budgets'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default Budgets;