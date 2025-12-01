import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Info, ChevronDown, ChevronUp, BarChart3, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface FinancialData {
  period: string;
  income: number;
  expense: number;
  net: number;
}

interface YearComparison {
  year: number;
  totalIncome: number;
  totalExpense: number;
}

interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

const NEPAL_AVERAGE_DATA = {
  monthlyIncome: 45000,
  monthlyExpense: 35000,
  categories: {
    'Food & Groceries': 12000,
    'Rent/Housing': 15000,
    'Transportation': 3000,
    'Utilities': 2500,
    'Healthcare': 2000,
    'Education': 1500,
    'Entertainment': 1500,
    'Others': 2500,
  }
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7c7c'];

export default function Comparison() {
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [selectedYear1, setSelectedYear1] = useState<number>(new Date().getFullYear());
  const [selectedYear2, setSelectedYear2] = useState<number>(new Date().getFullYear());
  const [selectedMonth1, setSelectedMonth1] = useState<number | null>(null);
  const [selectedMonth2, setSelectedMonth2] = useState<number | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  const [yearComparisons, setYearComparisons] = useState<YearComparison[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [showComparisonInfo, setShowComparisonInfo] = useState(false);
  const [isComparisonInfoDialogOpen, setIsComparisonInfoDialogOpen] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    if (profile) {
      fetchAvailableYears();
      fetchFinancialData();
      fetchYearComparison();
      fetchCategoryBreakdown();
    }
  }, [profile, periodType, selectedYear1, selectedYear2, selectedMonth1, selectedMonth2]);

  const fetchAvailableYears = async () => {
    if (!profile) return;
    
    try {
      const { data: incomes } = await supabase
        .from('incomes')
        .select('income_date')
        .eq('user_id', profile.id);
      
      const { data: expenses } = await supabase
        .from('expenses')
        .select('expense_date')
        .eq('user_id', profile.id);
      
      const years = new Set<number>();
      incomes?.forEach(i => years.add(new Date(i.income_date).getFullYear()));
      expenses?.forEach(e => years.add(new Date(e.expense_date).getFullYear()));
      
      const sortedYears = Array.from(years).sort((a, b) => b - a);
      setAvailableYears(sortedYears.length > 0 ? sortedYears : [new Date().getFullYear()]);
    } catch (error) {
      console.error('Error fetching available years:', error);
    }
  };

  const fetchFinancialData = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      const currentYear = selectedYear1;
      const startDate = new Date(currentYear, 0, 1);
      const endDate = new Date(currentYear, 11, 31);

      const [incomesRes, expensesRes] = await Promise.all([
        supabase
          .from('incomes')
          .select('amount, income_date')
          .eq('user_id', profile.id)
          .gte('income_date', startDate.toISOString())
          .lte('income_date', endDate.toISOString()),
        supabase
          .from('expenses')
          .select('amount, expense_date')
          .eq('user_id', profile.id)
          .gte('expense_date', startDate.toISOString())
          .lte('expense_date', endDate.toISOString()),
      ]);

      const incomes = incomesRes.data || [];
      const expenses = expensesRes.data || [];

      // Process data based on period type
      const processedData = processDataByPeriod(incomes, expenses, periodType, currentYear);
      setFinancialData(processedData);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      showError('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const processDataByPeriod = (incomes: any[], expenses: any[], period: PeriodType, year: number): FinancialData[] => {
    const dataMap = new Map<string, { income: number; expense: number }>();

    incomes.forEach(item => {
      const key = getPeriodKey(new Date(item.income_date), period);
      const existing = dataMap.get(key) || { income: 0, expense: 0 };
      existing.income += item.amount;
      dataMap.set(key, existing);
    });

    expenses.forEach(item => {
      const key = getPeriodKey(new Date(item.expense_date), period);
      const existing = dataMap.get(key) || { income: 0, expense: 0 };
      existing.expense += item.amount;
      dataMap.set(key, existing);
    });

    // Generate all periods for the year
    const allPeriods = generatePeriodsForYear(year, period);
    
    return allPeriods.map(periodKey => {
      const data = dataMap.get(periodKey) || { income: 0, expense: 0 };
      return {
        period: periodKey,
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
      };
    });
  };

  const getPeriodKey = (date: Date, period: PeriodType): string => {
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    
    switch (period) {
      case 'daily':
        return `${date.getDate()} ${month}`;
      case 'weekly': {
        const weekNum = Math.ceil(date.getDate() / 7);
        return `Week ${weekNum}, ${month}`;
      }
      case 'monthly':
        return month;
      case 'yearly':
        return year.toString();
      default:
        return month;
    }
  };

  const generatePeriodsForYear = (year: number, period: PeriodType): string[] => {
    if (period === 'yearly') {
      return [year.toString()];
    }
    
    if (period === 'monthly') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    }
    
    if (period === 'weekly') {
      const weeks: string[] = [];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach(month => {
        for (let i = 1; i <= 4; i++) {
          weeks.push(`Week ${i}, ${month}`);
        }
      });
      return weeks;
    }
    
    // For daily, limit to current month
    const daysInMonth = new Date(year, new Date().getMonth() + 1, 0).getDate();
    const month = new Date().toLocaleString('default', { month: 'short' });
    return Array.from({ length: daysInMonth }, (_, i) => `${i + 1} ${month}`);
  };

  const fetchYearComparison = async () => {
    if (!profile) return;

    try {
      const years = [selectedYear1, selectedYear2];
      const months = [selectedMonth1, selectedMonth2];
      const comparisons: YearComparison[] = [];

      for (let i = 0; i < years.length; i++) {
        const year = years[i];
        const month = months[i];
        
        let startDate: Date;
        let endDate: Date;
        
        if (month !== null) {
          // Month-specific comparison
          startDate = new Date(year, month, 1);
          endDate = new Date(year, month + 1, 0, 23, 59, 59);
        } else {
          // Full year comparison
          startDate = new Date(year, 0, 1);
          endDate = new Date(year, 11, 31);
        }

        const [incomesRes, expensesRes] = await Promise.all([
          supabase
            .from('incomes')
            .select('amount')
            .eq('user_id', profile.id)
            .gte('income_date', startDate.toISOString())
            .lte('income_date', endDate.toISOString()),
          supabase
            .from('expenses')
            .select('amount')
            .eq('user_id', profile.id)
            .gte('expense_date', startDate.toISOString())
            .lte('expense_date', endDate.toISOString()),
        ]);

        const totalIncome = incomesRes.data?.reduce((sum, item) => sum + item.amount, 0) || 0;
        const totalExpense = expensesRes.data?.reduce((sum, item) => sum + item.amount, 0) || 0;

        comparisons.push({ year, totalIncome, totalExpense });
      }

      setYearComparisons(comparisons);
    } catch (error) {
      console.error('Error fetching year comparison:', error);
    }
  };

  const fetchCategoryBreakdown = async () => {
    if (!profile) return;

    try {
      const currentYear = selectedYear1;
      const startDate = new Date(currentYear, 0, 1);
      const endDate = new Date(currentYear, 11, 31);

      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, category:categories(name)')
        .eq('user_id', profile.id)
        .gte('expense_date', startDate.toISOString())
        .lte('expense_date', endDate.toISOString());

      const categoryMap = new Map<string, number>();
      let totalAmount = 0;

      expenses?.forEach(item => {
        const cat = Array.isArray(item.category) ? item.category[0] : item.category;
        const categoryName = cat?.name || 'Uncategorized';
        const current = categoryMap.get(categoryName) || 0;
        categoryMap.set(categoryName, current + item.amount);
        totalAmount += item.amount;
      });

      const breakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8);

      setCategoryBreakdown(breakdown);
    } catch (error) {
      console.error('Error fetching category breakdown:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(amount);
  };

  const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const year1Data = yearComparisons.find(y => y.year === selectedYear1);
  const year2Data = yearComparisons.find(y => y.year === selectedYear2);
  
  const incomeChange = year1Data && year2Data ? calculatePercentageChange(year1Data.totalIncome, year2Data.totalIncome) : 0;
  const expenseChange = year1Data && year2Data ? calculatePercentageChange(year1Data.totalExpense, year2Data.totalExpense) : 0;

  const totalIncome = financialData.reduce((sum, d) => sum + d.income, 0);
  const totalExpense = financialData.reduce((sum, d) => sum + d.expense, 0);
  const avgIncome = financialData.length > 0 ? totalIncome / financialData.length : 0;
  const avgExpense = financialData.length > 0 ? totalExpense / financialData.length : 0;

  const nepalComparisonIncome = ((totalIncome / 12) / NEPAL_AVERAGE_DATA.monthlyIncome * 100) - 100;
  const nepalComparisonExpense = ((totalExpense / 12) / NEPAL_AVERAGE_DATA.monthlyExpense * 100) - 100;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const getComparisonLabel = (year: number, month: number | null) => {
    if (month !== null) {
      return `${monthNames[month]} ${year}`;
    }
    return year.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Income & Expense Comparison</h1>
          <p className="text-muted-foreground">Analyze and compare your financial trends</p>
        </div>
        <Badge variant="outline" className="text-sm">
          <BarChart3 className="h-3 w-3 mr-1" />
          Analytics
        </Badge>
      </div>

      <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-700 dark:text-blue-300 flex items-center justify-between">
          Comparison & Analytics Guide
          <div className="flex items-center gap-2">
            <Dialog open={isComparisonInfoDialogOpen} onOpenChange={setIsComparisonInfoDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  Read More
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Understanding Your Financial Comparisons</DialogTitle>
                  <DialogDescription>
                    How to interpret and use comparison analytics effectively
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Comparison Types</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Purpose</TableHead>
                          <TableHead>Best Used For</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell><strong>Income vs Expense</strong></TableCell>
                          <TableCell>Track spending against earnings</TableCell>
                          <TableCell>Monthly budgeting, savings goals</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Year-on-Year Income</strong></TableCell>
                          <TableCell>Compare income growth</TableCell>
                          <TableCell>Salary increases, business growth</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Year-on-Year Expense</strong></TableCell>
                          <TableCell>Track spending trends</TableCell>
                          <TableCell>Cost management, inflation impact</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Nepal Average</strong></TableCell>
                          <TableCell>Compare with national benchmarks</TableCell>
                          <TableCell>Understanding relative position</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Nepal Average Data (2024)</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metric</TableHead>
                          <TableHead>National Average</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>Monthly Income</TableCell>
                          <TableCell>NPR 45,000</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Monthly Expense</TableCell>
                          <TableCell>NPR 35,000</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Savings Rate</TableCell>
                          <TableCell>22% of income</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-2">How to Use Insights</h3>
                    <div className="space-y-2">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold text-sm">🎯 Set Realistic Goals</p>
                        <p className="text-xs text-muted-foreground">Use year-on-year data to set achievable financial targets</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold text-sm">📊 Identify Trends</p>
                        <p className="text-xs text-muted-foreground">Look for patterns in your spending and income cycles</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold text-sm">💰 Optimize Spending</p>
                        <p className="text-xs text-muted-foreground">Compare category expenses to find saving opportunities</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold text-sm">🇳🇵 Benchmark Performance</p>
                        <p className="text-xs text-muted-foreground">See how you compare to Nepal averages</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <p><strong>Note:</strong> Nepal average data is based on 2024 economic surveys and may vary by region and demographic. Use as general guidance only.</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComparisonInfo(!showComparisonInfo)}
              className="h-auto p-0 text-blue-600 dark:text-blue-400"
            >
              {showComparisonInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </AlertTitle>
        <AlertDescription className="text-blue-600 dark:text-blue-400">
          {showComparisonInfo ? (
            <div className="mt-2 space-y-1 text-sm">
              <p>Analyze your financial patterns across different time periods</p>
              <p className="text-xs">• Compare with previous years to track growth</p>
              <p className="text-xs">• Benchmark against Nepal national averages</p>
              <p className="text-xs">• Identify spending trends and opportunities</p>
            </div>
          ) : null}
        </AlertDescription>
      </Alert>

      {/* Period and Comparison Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Comparison Settings
          </CardTitle>
          <CardDescription>Select time period and comparison type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Period Type</label>
              <Select value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="daily">Daily (Current Month)</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Primary Year</label>
              <Select value={selectedYear1.toString()} onValueChange={(value) => setSelectedYear1(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Compare With Year</label>
              <Select value={selectedYear2.toString()} onValueChange={(value) => setSelectedYear2(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Primary Month (Optional)</label>
              <Select 
                value={selectedMonth1 !== null ? selectedMonth1.toString() : "all"} 
                onValueChange={(value) => setSelectedMonth1(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Year</SelectItem>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Compare With Month (Optional)</label>
              <Select 
                value={selectedMonth2 !== null ? selectedMonth2.toString() : "all"} 
                onValueChange={(value) => setSelectedMonth2(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Year</SelectItem>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      ) : (
        <>
          {/* Year-on-Year Comparison Stats */}
          {year1Data && year2Data && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Income Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{getComparisonLabel(selectedYear1, selectedMonth1)}</p>
                      <p className="text-2xl font-bold">{formatCurrency(year1Data.totalIncome)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{getComparisonLabel(selectedYear2, selectedMonth2)}</p>
                      <p className="text-2xl font-bold text-muted-foreground">{formatCurrency(year2Data.totalIncome)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {incomeChange >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`font-semibold ${incomeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {incomeChange >= 0 ? '+' : ''}{incomeChange.toFixed(1)}%
                    </span>
                    <span className="text-sm text-muted-foreground">vs {getComparisonLabel(selectedYear2, selectedMonth2)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    Expense Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{getComparisonLabel(selectedYear1, selectedMonth1)}</p>
                      <p className="text-2xl font-bold">{formatCurrency(year1Data.totalExpense)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{getComparisonLabel(selectedYear2, selectedMonth2)}</p>
                      <p className="text-2xl font-bold text-muted-foreground">{formatCurrency(year2Data.totalExpense)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {expenseChange >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-red-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-green-600" />
                    )}
                    <span className={`font-semibold ${expenseChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {expenseChange >= 0 ? '+' : ''}{expenseChange.toFixed(1)}%
                    </span>
                    <span className="text-sm text-muted-foreground">vs {getComparisonLabel(selectedYear2, selectedMonth2)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Chart */}
          <Tabs defaultValue="trend" className="space-y-4">
            <TabsList>
              <TabsTrigger value="trend">Trend Analysis</TabsTrigger>
              <TabsTrigger value="comparison">Bar Comparison</TabsTrigger>
              <TabsTrigger value="categories">Category Breakdown</TabsTrigger>
              <TabsTrigger value="nepal">Nepal Comparison</TabsTrigger>
            </TabsList>

            <TabsContent value="trend">
              <Card>
                <CardHeader>
                  <CardTitle>Income vs Expense Trend ({selectedYear1})</CardTitle>
                  <CardDescription>Track your financial flow over {periodType} periods</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={financialData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Income" />
                      <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} name="Expense" />
                      <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} name="Net" strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comparison">
              <Card>
                <CardHeader>
                  <CardTitle>Income vs Expense Bars ({selectedYear1})</CardTitle>
                  <CardDescription>Side-by-side comparison of income and expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={financialData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Bar dataKey="income" fill="#10b981" name="Income" />
                      <Bar dataKey="expense" fill="#ef4444" name="Expense" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories">
              <Card>
                <CardHeader>
                  <CardTitle>Expense Category Breakdown ({selectedYear1})</CardTitle>
                  <CardDescription>Where your money goes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.category}: ${entry.percentage.toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="amount"
                        >
                          {categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {categoryBreakdown.map((cat, index) => (
                        <div key={cat.category} className="flex items-center justify-between p-2 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="text-sm font-medium">{cat.category}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{formatCurrency(cat.amount)}</p>
                            <p className="text-xs text-muted-foreground">{cat.percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="nepal">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Compare with Nepal Averages
                  </CardTitle>
                  <CardDescription>How you compare to national benchmarks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Your Monthly Average (₹{selectedYear1})</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="text-sm">Income</span>
                          <span className="font-semibold">{formatCurrency(totalIncome / 12)}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="text-sm">Expense</span>
                          <span className="font-semibold">{formatCurrency(totalExpense / 12)}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                          <span className="text-sm font-medium">Net Savings</span>
                          <span className="font-bold">{formatCurrency((totalIncome - totalExpense) / 12)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Nepal National Average</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="text-sm">Income</span>
                          <span className="font-semibold">{formatCurrency(NEPAL_AVERAGE_DATA.monthlyIncome)}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="text-sm">Expense</span>
                          <span className="font-semibold">{formatCurrency(NEPAL_AVERAGE_DATA.monthlyExpense)}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                          <span className="text-sm font-medium">Net Savings</span>
                          <span className="font-bold">{formatCurrency(NEPAL_AVERAGE_DATA.monthlyIncome - NEPAL_AVERAGE_DATA.monthlyExpense)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h3 className="font-semibold">Your Position vs Nepal Average</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className={`p-4 border rounded-lg ${nepalComparisonIncome >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-red-50 dark:bg-red-900/20 border-red-200'}`}>
                        <p className="text-sm text-muted-foreground mb-1">Income Comparison</p>
                        <div className="flex items-center gap-2">
                          {nepalComparisonIncome >= 0 ? (
                            <TrendingUp className="h-5 w-5 text-green-600" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          )}
                          <span className={`text-2xl font-bold ${nepalComparisonIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {nepalComparisonIncome >= 0 ? '+' : ''}{nepalComparisonIncome.toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {nepalComparisonIncome >= 0 ? 'Above' : 'Below'} national average
                        </p>
                      </div>

                      <div className={`p-4 border rounded-lg ${nepalComparisonExpense <= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-red-50 dark:bg-red-900/20 border-red-200'}`}>
                        <p className="text-sm text-muted-foreground mb-1">Expense Comparison</p>
                        <div className="flex items-center gap-2">
                          {nepalComparisonExpense >= 0 ? (
                            <TrendingUp className="h-5 w-5 text-red-600" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-green-600" />
                          )}
                          <span className={`text-2xl font-bold ${nepalComparisonExpense >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {nepalComparisonExpense >= 0 ? '+' : ''}{nepalComparisonExpense.toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {nepalComparisonExpense <= 0 ? 'Below' : 'Above'} national average
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
