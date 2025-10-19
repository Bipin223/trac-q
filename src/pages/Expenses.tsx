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
  ShoppingCart, // Food & groceries
  Home, // Rent/Housing
  Zap, // Electricity
  Droplet, // Water
  Wifi, // Internet
  Car, // Transportation
  Shirt, // Clothing & accessories
  GraduationCap, // School/college fees
  Book, // School/college supplies
  HeartPulse, // Healthcare
  Dumbbell, // Fitness
  Gamepad, // Entertainment
  Coffee, // Cafes
  ShoppingBag, // Shopping
  Banknote, // Loan
  HandHelping, // Charity
  Gift, // Gifts
  AlertTriangle, // Unexpected expenses
  PlusCircle,
  Wallet, // Generic for custom
  Trash2,
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
} from '@/components/ui/alert-dialog';

const PREDEFINED_EXPENSE_CATEGORIES = [
  { name: 'Food & Groceries', type: 'expense' as const, icon: <ShoppingCart className="h-5 w-5" /> },
  { name: 'Rent/Housing', type: 'expense' as const, icon: <Home className="h-5 w-5" /> },
  { name: 'Electricity', type: 'expense' as const, icon: <Zap className="h-5 w-5" /> },
  { name: 'Water', type: 'expense' as const, icon: <Droplet className="h-5 w-5" /> },
  { name: 'Internet', type: 'expense' as const, icon: <Wifi className="h-5 w-5" /> },
  { name: 'Transportation', type: 'expense' as const, icon: <Car className="h-5 w-5" /> },
  { name: 'Clothing & Accessories', type: 'expense' as const, icon: <Shirt className="h-5 w-5" /> },
  { name: 'School/College Fees', type: 'expense' as const, icon: <GraduationCap className="h-5 w-5" /> },
  { name: 'School/College Supplies', type: 'expense' as const, icon: <Book className="h-5 w-5" /> },
  { name: 'Healthcare', type: 'expense' as const, icon: <HeartPulse className="h-5 w-5" /> },
  { name: 'Fitness', type: 'expense' as const, icon: <Dumbbell className="h-5 w-5" /> },
  { name: 'Entertainment', type: 'expense' as const, icon: <Gamepad className="h-5 w-5" /> },
  { name: 'Cafes', type: 'expense' as const, icon: <Coffee className="h-5 w-5" /> },
  { name: 'Shopping', type: 'expense' as const, icon: <ShoppingBag className="h-5 w-5" /> },
  { name: 'Loan', type: 'expense' as const, icon: <Banknote className="h-5 w-5" /> },
  { name: 'Charity', type: 'expense' as const, icon: <HandHelping className="h-5 w-5" /> },
  { name: 'Gifts', type: 'expense' as const, icon: <Gift className="h-5 w-5" /> },
  { name: 'Unexpected Expenses', type: 'expense' as const, icon: <AlertTriangle className="h-5 w-5" /> },
];

interface QuickExpense {
  name: string;
  categoryId: string;
  icon: React.ReactNode;
  isPredefined: boolean;
}

export default function Expenses() {
  const { profile } = useProfile();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [quickExpenses, setQuickExpenses] = useState<QuickExpense[]>([]);
  const [selectedQuickCategory, setSelectedQuickCategory] = useState<string | null>(null);

  const fetchExpenses = async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('expenses')
      .select('*, category:categories(name)')
      .eq('user_id', profile.id)
      .order('expense_date', { ascending: false });
    
    if (data) {
      const formattedData = data.map(d => ({ ...d, date: d.expense_date }));
      setExpenses(formattedData);
    }
    setLoading(false);
  };

  const ensureAndFetchAllCategories = async () => {
    if (!profile) return;

    const { data: existingCategories, error: fetchError } = await supabase
      .from('categories')
      .select('id, name, type')
      .eq('user_id', profile.id)
      .eq('type', 'expense');

    if (fetchError) {
      console.error('Error fetching existing categories:', fetchError);
      showError('Failed to load expense categories.');
      return;
    }

    const existingCategoryMap = new Map(existingCategories?.map(c => [c.name.toLowerCase(), c.id]));
    const newCategoriesToInsert = PREDEFINED_EXPENSE_CATEGORIES.filter(source => !existingCategoryMap.has(source.name.toLowerCase()));

    if (newCategoriesToInsert.length > 0) {
      const inserts = newCategoriesToInsert.map(source => ({
        name: source.name,
        user_id: profile.id,
        type: source.type,
      }));

      const { data: insertedData, error: insertError } = await supabase.from('categories').insert(inserts).select('id, name');
      if (insertError) {
        console.error('Error inserting predefined categories:', insertError);
        showError('Failed to add some predefined expense categories.');
      } else if (insertedData) {
        insertedData.forEach(cat => existingCategoryMap.set(cat.name.toLowerCase(), cat.id));
        showSuccess(`Added ${newCategoriesToInsert.length} general expense categories.`);
      }
    }

    const allQuickExpenses: QuickExpense[] = [];

    PREDEFINED_EXPENSE_CATEGORIES.forEach(source => {
      const categoryId = existingCategoryMap.get(source.name.toLowerCase());
      if (categoryId) {
        allQuickExpenses.push({
          name: source.name,
          categoryId: categoryId,
          icon: source.icon,
          isPredefined: true,
        });
      }
    });

    existingCategories?.forEach(cat => {
      const isPredefined = PREDEFINED_EXPENSE_CATEGORIES.some(source => source.name.toLowerCase() === cat.name.toLowerCase());
      if (!isPredefined) {
        allQuickExpenses.push({
          name: cat.name,
          categoryId: cat.id,
          icon: <Wallet className="h-5 w-5" />, // Generic icon for custom categories
          isPredefined: false,
        });
      }
    });

    setQuickExpenses(allQuickExpenses);
    setCategoriesLoaded(true);
  };

  const handleQuickExpenseClick = (categoryId: string) => {
    setSelectedQuickCategory(categoryId);
    setIsAddDialogOpen(true);
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string, isPredefined: boolean) => {
    if (!profile) return;

    if (isPredefined) {
      showError(`Cannot delete predefined expense category: "${categoryName}".`);
      return;
    }

    try {
      // Check if there are any expenses associated with this category
      const { count, error: countError } = await supabase
        .from('expenses')
        .select('id', { count: 'exact' })
        .eq('user_id', profile.id)
        .eq('category_id', categoryId);

      if (countError) throw countError;

      if (count && count > 0) {
        showError(`Cannot delete "${categoryName}". There are ${count} expense(s) associated with it. Please reassign or delete them first.`);
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

      showSuccess(`Expense category "${categoryName}" deleted successfully.`);
      handleSuccess(); // Refresh both expenses and categories
    } catch (error: any) {
      console.error('Error deleting category:', error);
      showError(error.message || `Failed to delete expense category "${categoryName}".`);
    }
  };

  useEffect(() => {
    if (profile) {
      ensureAndFetchAllCategories();
      fetchExpenses();
    }
  }, [profile]);

  const handleSuccess = () => {
    fetchExpenses();
    ensureAndFetchAllCategories();
    setIsAddDialogOpen(false);
    setSelectedQuickCategory(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
        <Button 
          onClick={() => { setSelectedQuickCategory(null); setIsAddDialogOpen(true); }}
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Add Custom Expense (NPR)
        </Button>
      </div>

      {/* Quick Expense Cards */}
      {quickExpenses.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-muted-foreground">Quick Add Expense Categories:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {quickExpenses.map((qe) => (
              <Card
                key={qe.categoryId}
                className="relative cursor-pointer hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200 flex flex-col items-center justify-center text-center p-4"
                onClick={() => handleQuickExpenseClick(qe.categoryId)}
              >
                <CardContent className="p-0 flex flex-col items-center justify-center">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-full text-purple-600 dark:text-purple-400 mb-2">
                    {qe.icon}
                  </div>
                  <CardTitle className="text-sm font-medium">{qe.name}</CardTitle>
                </CardContent>
                {!qe.isPredefined && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => e.stopPropagation()} // Prevent card click when deleting
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className="sr-only">Delete {qe.name}</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the expense category "{qe.name}".
                          Any expenses previously associated with this category will become 'Uncategorized'.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteCategory(qe.categoryId, qe.name, qe.isPredefined)}>
                          Delete Category
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
        type="expense"
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
        <TransactionsDataTable data={expenses} />
      )}
    </div>
  );
}