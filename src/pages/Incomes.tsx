import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { AddTransactionDialog } from '@/components/transactions/AddTransactionDialog';
import { TransactionsDataTable } from '@/components/transactions/TransactionsDataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess } from '@/utils/toast';

const PREDEFINED_INCOME_SOURCES = [
  { name: 'Salary', type: 'income' as const },
  { name: 'Freelance', type: 'income' as const },
  { name: 'Investments', type: 'income' as const },
  { name: 'Rental Income', type: 'income' as const },
  { name: 'Business Profit', type: 'income' as const },
];

export default function Incomes() {
  const { profile } = useProfile();
  const [incomes, setIncomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  const fetchIncomes = async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('incomes')
      .select('*, category:categories(name)')
      .eq('user_id', profile.id)
      .order('income_date', { ascending: false });
    
    if (data) {
      const formattedData = data.map(d => ({ ...d, date: d.income_date }));
      setIncomes(formattedData);
    }
    setLoading(false);
  };

  const ensurePredefinedCategories = async () => {
    if (!profile || categoriesLoaded) return;

    const { data: existingCategories } = await supabase
      .from('categories')
      .select('name')
      .eq('user_id', profile.id)
      .eq('type', 'income');

    const existingNames = existingCategories?.map(c => c.name.toLowerCase()) || [];
    const toInsert = PREDEFINED_INCOME_SOURCES.filter(source => !existingNames.includes(source.name.toLowerCase()));

    if (toInsert.length > 0) {
      const inserts = toInsert.map(source => ({
        name: source.name,
        user_id: profile.id,
        type: source.type,
      }));

      const { error } = await supabase.from('categories').insert(inserts);
      if (!error) {
        showSuccess(`Added ${toInsert.length} general income sources (e.g., Salary, Freelance). You can now use them or add custom ones.`);
      }
    }

    setCategoriesLoaded(true);
  };

  useEffect(() => {
    if (profile) {
      ensurePredefinedCategories();
      fetchIncomes();
    }
  }, [profile]);

  const handleSuccess = () => {
    fetchIncomes();
    setIsAddDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Incomes</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>Add Income (NPR)</Button>
      </div>

      <AddTransactionDialog
        type="income"
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={handleSuccess}
      />

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <TransactionsDataTable data={incomes} />
      )}
    </div>
  );
}