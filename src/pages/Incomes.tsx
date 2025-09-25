import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AddTransactionDialog } from '@/components/transactions/AddTransactionDialog';
import { TransactionsDataTable } from '@/components/transactions/TransactionsDataTable';
import { Skeleton } from '@/components/ui/skeleton';

export default function Incomes() {
  const [incomes, setIncomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const fetchIncomes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('incomes')
      .select('*, category:categories(name), account:accounts(name)')
      .order('income_date', { ascending: false });
    
    if (data) {
      const formattedData = data.map(d => ({ ...d, date: d.income_date }));
      setIncomes(formattedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIncomes();
  }, []);

  const handleSuccess = () => {
    fetchIncomes();
    setIsAddDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Incomes</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>Add Income</Button>
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