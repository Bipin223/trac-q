import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddTransactionDialog } from '@/components/transactions/AddTransactionDialog';
import { TransactionsDataTable } from '@/components/transactions/TransactionsDataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess } from '@/utils/toast';

const PREDEFINED_INCOME_SOURCES = [
  { name: 'Salary', type: 'income' as const },
  { name: 'Freelance', type: 'income' as const },
  { name: 'Remittance', type: 'income' as const },
  { name: 'Agriculture', type: 'income' as const },
  { name: 'Investments', type: 'income' as const },
  { name: 'Rental Income', type: 'income' as const },
  { name: 'Business Profit', type: 'income' as const },
  { name: 'Tourism', type: 'income' as const },
  { name: 'Pension', type: 'income' as const },
  { name: 'Government Allowance', type: 'income' as const },
];

interface QuickIncome {
  name: string;
  categoryId?: string;
}

export default function Incomes() {
  const { profile } = useProfile();
  const [incomes, setIncomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [quickIncomes, setQuickIncomes] = useState<QuickIncome[]>([]);
  const [selectedQuickCategory, setSelectedQuickCategory] = useState<string | null>(null);

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
      .select('name, id')
      .eq('user_id', profile.id)
      .eq('type', 'income');

    const existingNames = existingCategories?.map(c => c.name.toLowerCase()) || [];
    const toInsert = PREDEFINED_INCOME_SOURCES.filter(source => !existingNames.includes(source.name.toLowerCase()));

    let newCategoryIds: { [key: string]: string } = {};
    if (toInsert.length > 0) {
      const inserts = toInsert.map(source => ({
        name: source.name,
        user_id: profile.id,
        type: source.type,
      }));

      const { data: insertedData, error } = await supabase.from('categories').insert(inserts).select('id, name');
      if (!error && insertedData) {
        newCategoryIds = insertedData.reduce((acc: { [key: string]: string }, cat: any) => {
          acc[cat.name] = cat.id;
          return acc;
        }, {});
        showSuccess(`Added ${toInsert.length} general income sources. You can now use them or add custom ones.`);
      }
    }

    // Map all predefined to their IDs
    const allQuickIncomes = PREDEFINED_INCOME_SOURCES.map(source => ({
      name: source.name,
      categoryId: existingCategories?.find(c => c.name.toLowerCase() === source.name.toLowerCase())?.id || newCategoryIds[source.name],
    })).filter(qi => qi.categoryId);

    setQuickIncomes(allQuickIncomes);
    setCategoriesLoaded(true);
  };

  const handleQuickIncomeClick = (categoryId: string) => {
    setSelectedQuickCategory(categoryId);
    setIsAddDialogOpen(true);
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
    setSelectedQuickCategory(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Incomes</h1>
        <Button onClick={() => { setSelectedQuickCategory(null); setIsAddDialogOpen(true); }}>Add Custom Income (NPR)</Button>
      </div>

      {/* Quick Income Capsules */}
      {quickIncomes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Quick Add:</h3>
          {quickIncomes.map((qi) => (
            <Badge
              key={qi.categoryId}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 transition-colors px-3 py-1 rounded-full text-xs"
              onClick={() => handleQuickIncomeClick(qi.categoryId!)}
            >
              {qi.name}
            </Badge>
          ))}
        </div>
      )}

      <AddTransactionDialog
        type="income"
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={handleSuccess}
        defaultCategoryId={selectedQuickCategory}
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