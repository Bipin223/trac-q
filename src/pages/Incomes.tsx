import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddTransactionDialog } from '@/components/transactions/AddTransactionDialog';
import { TransactionsDataTable } from '@/components/transactions/TransactionsDataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showError } from '@/utils/toast';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { SubcategoryManager } from '@/components/SubcategoryManager';
import {
  Briefcase,
  Laptop,
  Send,
  Leaf,
  TrendingUp,
  Home,
  Coins,
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
  Trash2,
  Star,
  Repeat,
  Settings,
  FileCheck,
  Utensils,
  ShoppingCart,
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
  { name: 'Business Profit', type: 'income' as const, icon: <Coins className="h-5 w-5" /> },
  { name: 'Tourism', type: 'income' as const, icon: <Plane className="h-5 w-5" /> },
  { name: 'Pension', type: 'income' as const, icon: <Shield className="h-5 w-5" /> },
  { name: 'Government Allowance', type: 'income' as const, icon: <Landmark className="h-5 w-5" /> },
  { name: 'Pocket Money', type: 'income' as const, icon: <PiggyBank className="h-5 w-5" /> },
  { name: 'Tutoring', type: 'income' as const, icon: <BookOpen className="h-5 w-5" /> },
  { name: 'Content Creation', type: 'income' as const, icon: <Monitor className="h-5 w-5" /> },
  { name: 'Coaching Classes', type: 'income' as const, icon: <Users className="h-5 w-5" /> },
  { name: 'Typing', type: 'income' as const, icon: <Type className="h-5 w-5" /> },
  { name: 'Paper Checking', type: 'income' as const, icon: <FileCheck className="h-5 w-5" /> },
  { name: 'Food', type: 'income' as const, icon: <Utensils className="h-5 w-5" /> },
  { name: 'Groceries', type: 'income' as const, icon: <ShoppingCart className="h-5 w-5" /> },
];

interface QuickIncome {
  name: string;
  categoryId: string;
  icon: React.ReactNode;
  isPredefined: boolean; // Added to distinguish predefined from custom
  is_favorite: boolean;
}

interface Subcategory {
  id: string;
  name: string;
  parent_category_id: string;
  parent_category_name: string;
  is_favorite: boolean;
}

export default function Incomes() {
  const { profile } = useProfile();
  const [incomes, setIncomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [quickIncomes, setQuickIncomes] = useState<QuickIncome[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedQuickCategory, setSelectedQuickCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'recurring'>('all');
  const [subcategoryManagerOpen, setSubcategoryManagerOpen] = useState(false);
  const [selectedCategoryForSubcategories, setSelectedCategoryForSubcategories] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const fetchIncomes = async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('incomes')
      .select('*, category:categories(name), subcategory:subcategories(name)')
      .eq('user_id', profile.id)
      .order('income_date', { ascending: false });

    if (data) {
      const formattedData = data.map(d => ({ ...d, date: d.income_date }));
      // Sort: favorites first, then by date
      formattedData.sort((a, b) => {
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
        return new Date(b.income_date).getTime() - new Date(a.income_date).getTime();
      });
      setIncomes(formattedData);
    }
    setLoading(false);
  };

  const fetchSubcategories = async () => {
    if (!profile) return;

    // First get all income category IDs for this user
    const { data: incomeCategories } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', profile.id)
      .eq('type', 'income');

    if (!incomeCategories || incomeCategories.length === 0) {
      setSubcategories([]);
      return;
    }

    const categoryIds = incomeCategories.map(cat => cat.id);

    const { data, error } = await supabase
      .from('subcategories')
      .select('id, name, parent_category_id, is_favorite, parent_category:categories!parent_category_id(name)')
      .in('parent_category_id', categoryIds)
      .order('is_favorite', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching subcategories:', error);
      return;
    }

    if (data) {
      const formattedSubcategories = data.map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        parent_category_id: sub.parent_category_id,
        parent_category_name: sub.parent_category?.name || 'Unknown',
        is_favorite: sub.is_favorite || false,
      }));
      setSubcategories(formattedSubcategories);
    }
  };

  const toggleFavorite = async (id: string, currentStatus: boolean): Promise<void> => {
    if (!profile) return;

    const { error } = await supabase
      .from('incomes')
      .update({ is_favorite: !currentStatus })
      .eq('id', id)
      .eq('user_id', profile.id);

    if (error) {
      showError('Failed to update favorite status');
    } else {
      showSuccess(currentStatus ? 'Removed from favorites' : 'Added to favorites');
      fetchIncomes();
    }
  };

  const toggleCategoryFavorite = async (categoryId: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (!profile) return;

    // Add animation class to the card
    const cardElement = (e.currentTarget as HTMLElement).closest('.category-card');
    if (cardElement) {
      cardElement.classList.add('favoriting-animation');
    }

    const { error } = await supabase
      .from('categories')
      .update({ is_favorite: !currentStatus })
      .eq('id', categoryId)
      .eq('user_id', profile.id);

    if (error) {
      showError('Failed to update category favorite status');
      if (cardElement) {
        cardElement.classList.remove('favoriting-animation');
      }
    } else {
      showSuccess(currentStatus ? '⭐ Removed from favorites' : '⭐ Added to favorites!');

      // Remove animation after a brief delay, then refresh
      setTimeout(() => {
        if (cardElement) {
          cardElement.classList.remove('favoriting-animation');
        }
        ensureAndFetchAllCategories();
      }, 300);
    }
  };

  const toggleSubcategoryFavorite = async (subcategoryId: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile) return;

    const { error } = await supabase
      .from('subcategories')
      .update({ is_favorite: !currentStatus })
      .eq('id', subcategoryId);

    if (error) {
      showError('Failed to update subcategory favorite status');
    } else {
      showSuccess(currentStatus ? '⭐ Removed from favorites' : '⭐ Added to favorites!');
      fetchSubcategories();
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string, subcategoryName: string) => {
    if (!profile) return;

    try {
      // Check if subcategory is in use
      const { count, error: countError } = await supabase
        .from('incomes')
        .select('id', { count: 'exact' })
        .eq('user_id', profile.id)
        .eq('subcategory_id', subcategoryId);

      if (countError) throw countError;

      if (count && count > 0) {
        showError(
          `Cannot delete "${subcategoryName}". There are ${count} income(s) using it. Please reassign them first.`
        );
        return;
      }

      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', subcategoryId)
        .eq('user_id', profile.id);

      if (error) throw error;

      showSuccess(`Subcategory "${subcategoryName}" deleted successfully.`);
      fetchSubcategories();
    } catch (error: any) {
      console.error('Error deleting subcategory:', error);
      showError(error.message || 'Failed to delete subcategory.');
    }
  };

  const ensureAndFetchAllCategories = async () => {
    if (!profile) return;

    const { data: existingCategories, error: fetchError } = await supabase
      .from('categories')
      .select('*')
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
        const category = existingCategories?.find(c => c.id === categoryId);
        allQuickIncomes.push({
          name: source.name,
          categoryId: categoryId,
          icon: source.icon,
          isPredefined: true,
          is_favorite: category?.is_favorite || false,
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
          isPredefined: false,
          is_favorite: cat.is_favorite || false,
        });
      }
    });

    // Sort: favorites first, then alphabetically
    allQuickIncomes.sort((a, b) => {
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      return a.name.localeCompare(b.name);
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
      fetchSubcategories();

      // Set up real-time subscription for incomes
      const incomesSubscription = supabase
        .channel(`incomes_${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'incomes',
            filter: `user_id=eq.${profile.id}`,
          },
          () => {
            fetchIncomes();
          }
        )
        .subscribe();

      // Set up real-time subscription for income categories
      const categoriesSubscription = supabase
        .channel(`income_categories_${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'categories',
            filter: `user_id=eq.${profile.id},type=eq.income`,
          },
          () => {
            ensureAndFetchAllCategories();
            fetchSubcategories();
          }
        )
        .subscribe();

      return () => {
        incomesSubscription.unsubscribe();
        categoriesSubscription.unsubscribe();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const handleSuccess = () => {
    fetchIncomes();
    ensureAndFetchAllCategories();
    fetchSubcategories();
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
          Add Custom Income (रु )
        </Button>
      </div>

      {/* Subcategories Section */}
      {subcategories.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-muted-foreground">Custom Subcategories:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {subcategories.map((sub) => (
              <Card
                key={sub.id}
                className={`category-card relative cursor-pointer hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 flex flex-col items-center justify-center text-center p-4 ${sub.is_favorite ? 'ring-2 ring-yellow-400 dark:ring-yellow-500 shadow-yellow-200 dark:shadow-yellow-900/50' : ''
                  }`}
                onClick={() => {
                  setSelectedQuickCategory(sub.parent_category_id);
                  setIsAddDialogOpen(true);
                }}
                style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 left-1 h-7 w-7 z-10 transition-all hover:scale-110"
                  onClick={(e) => toggleSubcategoryFavorite(sub.id, sub.is_favorite, e)}
                >
                  <Star
                    className={`h-4 w-4 transition-all duration-200 ${sub.is_favorite
                      ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg'
                      : 'text-muted-foreground hover:text-yellow-400 hover:scale-110'
                      }`}
                  />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="sr-only">Delete {sub.name}</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete subcategory?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the subcategory "{sub.name}". This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteSubcategory(sub.id, sub.name)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <CardContent className="p-0 flex flex-col items-center justify-center">
                  <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-full text-green-600 dark:text-green-400 mb-2">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-sm font-medium">{sub.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{sub.parent_category_name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Income Cards */}
      {quickIncomes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-muted-foreground">Quick Add Income Sources:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {quickIncomes.map((qi) => (
              <Card
                key={qi.categoryId}
                className={`category-card relative cursor-pointer hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 flex flex-col items-center justify-center text-center p-4 ${qi.is_favorite ? 'ring-2 ring-yellow-400 dark:ring-yellow-500 shadow-yellow-200 dark:shadow-yellow-900/50' : ''
                  }`}
                onClick={() => handleQuickIncomeClick(qi.categoryId)}
                style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 left-1 h-7 w-7 z-10 transition-all hover:scale-110"
                  onClick={(e) => toggleCategoryFavorite(qi.categoryId, qi.is_favorite, e)}
                >
                  <Star
                    className={`h-4 w-4 transition-all duration-200 ${qi.is_favorite
                      ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg'
                      : 'text-muted-foreground hover:text-yellow-400 hover:scale-110'
                      }`}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-8 h-7 w-7 z-10 transition-all hover:scale-110"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCategoryForSubcategories({ id: qi.categoryId, name: qi.name });
                    setSubcategoryManagerOpen(true);
                  }}
                  title="Manage subcategories"
                >
                  <Settings className="h-4 w-4 text-muted-foreground hover:text-blue-600" />
                </Button>
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

      {selectedCategoryForSubcategories && (
        <SubcategoryManager
          categoryId={selectedCategoryForSubcategories.id}
          categoryName={selectedCategoryForSubcategories.name}
          categoryType="income"
          open={subcategoryManagerOpen}
          onOpenChange={(open) => {
            setSubcategoryManagerOpen(open);
            if (!open) {
              setSelectedCategoryForSubcategories(null);
            }
          }}
          onSubcategoryChange={fetchSubcategories}
        />
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'recurring')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            All Incomes ({incomes.length})
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            Recurring ({incomes.filter(i => i.is_recurring).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <TransactionsDataTable data={incomes} onToggleFavorite={toggleFavorite} />
          )}
        </TabsContent>

        <TabsContent value="recurring" className="mt-6">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <TransactionsDataTable
              data={incomes.filter(i => i.is_recurring)}
              onToggleFavorite={toggleFavorite}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}