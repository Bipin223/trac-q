import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { AddTransactionDialog } from '@/components/transactions/AddTransactionDialog';
import { TransactionsDataTable } from '@/components/transactions/TransactionsDataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showError } from '@/utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Briefcase,
  Laptop,
  Send,
  Leaf,
  TrendingUp,
  Home,
  DollarSign,
  Plane,
  Shield,
  Landmark,
  PlusCircle,
  Wallet,
  PiggyBank,
  BookOpen,
  Monitor,
  Users,
  Type,
  ClipboardCheck,
  Trash2, // Added Trash2 icon for delete
} from 'lucide-react';
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
} from '@/components/ui/alert-dialog'; // Added AlertDialog components

const PREDEFINED_INCOME_SOURCES = [
  { name: 'Salary', type: 'income' as const, icon: <Briefcase className="h-5 w-5" /> },
  { name: 'Freelance', type: 'income' as const, icon: <Laptop className="h-5 w-5" /> },
  { name: 'Remittance', type: 'income' as const, icon: <Send className="h-5 w-5" /> },
  { name: 'Agriculture', type: 'income' as const, icon: <Leaf className="h-5 w-5" /> },
  { name: 'Investments', type: 'income' as const, icon: <TrendingUp className="h-5 w-5" /> },
  { name: 'Rental Income', type: 'income' as const, icon: <Home className="h-5 w-5" /> },
  { name: 'Business Profit', type: 'income' as const, icon: <DollarSign className="h-5 w-5" /> },
  { name: 'Tourism', type: 'income' as const, icon: <Plane className="h-5 w-5" /> },
  { name: 'Pension', type: 'income' as const, icon: <Shield className="h-5 w-5" /> },
  { name: 'Government Allowance', type: 'income' as const, icon: <Landmark className="h-5 w-5" /> },
  { name: 'Pocket Money', type: 'income' as const, icon: <PiggyBank className="h-5 w-5" /> },
  { name: 'Tutoring', type: 'income' as const, icon: <BookOpen className="h-5 w-5" /> },
  { name: 'Content Creation', type: 'income' as const, icon: <Monitor className="h-5 w-5" /> },
  { name: 'Coaching Classes', type: 'income' as const, icon: <Users className="h-5 w-5" /> },
  { name: 'Typing', type: 'income' as const, icon: <Type className="h-5 w-5" /> },
  { name: 'Paper Checking', type: 'income' as const, icon: <ClipboardCheck className="h-5 w-5" /> },
];

interface QuickIncome {
  name: string;
  categoryId: string;
  icon: React.ReactNode;
  isPredefined: boolean; // Added to distinguish predefined from custom
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

  const ensureAndFetchAllCategories = async () => {
    if (!profile) return;

    const { data: existingCategories, error: fetchError } = await supabase
      .from('categories')
      .select('id, name, type')
      .eq('user_id', profile.id)
      .eq('type', 'income');

    if (fetchError) {
      console.error('Error fetching existing categories:', fetchError);
      showError('Failed to load income categories.');
      return;
    }

    const existingCategoryMap = new Map(existingCategories?.map(c => [c.name.toLowerCase(), c.id]));
    const newCategoriesToInsert = PREDEFINED_INCOME_SOURCES.filter(source => !existingCategoryMap.has(source.name.toLowerCase()));

    if (newCategoriesToInsert.length > 0) {
      const inserts = newCategoriesToInsert.map(source => ({
        name: source.name,
        user_id: profile.id,
        type: source.type,
      }));

      const { data: insertedData, error: insertError } = await supabase.from('categories').insert(inserts).select('id, name');
      if (insertError) {
        console.error('Error inserting predefined categories:', insertError);
        showError('Failed to add some predefined income sources.');
      } else if (insertedData) {
        insertedData.forEach(cat => existingCategoryMap.set(cat.name.toLowerCase(), cat.id));
        showSuccess(`Added ${newCategoriesToInsert.length} general income sources.`);
      }
    }

    const allQuickIncomes: QuickIncome[] = [];

    PREDEFINED_INCOME_SOURCES.forEach(source => {
      const categoryId = existingCategoryMap.get(source.name.toLowerCase());
      if (categoryId) {
        allQuickIncomes.push({
          name: source.name,
          categoryId: categoryId,
          icon: source.icon,
          isPredefined: true, // Mark as predefined
        });
      }
    });

    existingCategories?.forEach(cat => {
      const isPredefined = PREDEFINED_INCOME_SOURCES.some(source => source.name.toLowerCase() === cat.name.toLowerCase());
      if (!isPredefined) {
        allQuickIncomes.push({
          name: cat.name,
          categoryId: cat.id,
          icon: <Wallet className="h-5 w-5" />,
          isPredefined: false, // Mark as custom
        });
      }
    });

    setQuickIncomes(allQuickIncomes);
    setCategoriesLoaded(true);
  };

  const handleQuickIncomeClick = (categoryId: string) => {
    setSelectedQuickCategory(categoryId);
    setIsAddDialogOpen(true);
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string, isPredefined: boolean) => {
    if (!profile) return;

    if (isPredefined) {
      showError(`Cannot delete predefined income source: "${categoryName}".`);
      return;
    }

    try {
      // Check if there are any incomes associated with this category
      const { count, error: countError } = await supabase
        .from('incomes')
        .select('id', { count: 'exact' })
        .eq('user_id', profile.id)
        .eq('category_id', categoryId);

      if (countError) throw countError;

      if (count && count > 0) {
        showError(`Cannot delete "${categoryName}". There are ${count} income(s) associated with it. Please reassign or delete them first.`);
        return;
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', profile.id); // Ensure user can only delete their own categories

      if (error) {
        throw error;
      }

      showSuccess(`Income source "${categoryName}" deleted successfully.`);
      handleSuccess(); // Refresh both incomes and categories
    } catch (error: any) {
      console.error('Error deleting category:', error);
      showError(error.message || `Failed to delete income source "${categoryName}".`);
    }
  };

  useEffect(() => {
    if (profile) {
      ensureAndFetchAllCategories();
      fetchIncomes();
    }
  }, [profile]);

  const handleSuccess = () => {
    fetchIncomes();
    ensureAndFetchAllCategories();
    setIsAddDialogOpen(false);
    setSelectedQuickCategory(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Incomes</h1>
        <Button 
          onClick={() => { setSelectedQuickCategory(null); setIsAddDialogOpen(true); }}
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Add Custom Income (NPR)
        </Button>
      </div>

      {/* Quick Income Cards */}
      {quickIncomes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-muted-foreground">Quick Add Income Sources:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {quickIncomes.map((qi) => (
              <Card
                key={qi.categoryId}
                className="relative cursor-pointer hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200 flex flex-col items-center justify-center text-center p-4"
                onClick={() => handleQuickIncomeClick(qi.categoryId)}
              >
                <CardContent className="p-0 flex flex-col items-center justify-center">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-full text-purple-600 dark:text-purple-400 mb-2">
                    {qi.icon}
                  </div>
                  <CardTitle className="text-sm font-medium">{qi.name}</CardTitle>
                </CardContent>
                {!qi.isPredefined && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => e.stopPropagation()} // Prevent card click when deleting
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className="sr-only">Delete {qi.name}</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the income source "{qi.name}".
                          Any incomes previously associated with this source will become 'Uncategorized'.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteCategory(qi.categoryId, qi.name, qi.isPredefined)}>
                          Delete Source
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </Card>
            ))}
          </div>
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