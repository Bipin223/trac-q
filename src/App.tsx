import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from './integrations/supabase/client';
import { showSuccess } from './utils/toast';
import Sidebar, { SidebarContent } from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Incomes from './pages/Incomes';
import Expenses from './pages/Expenses';
import ProfileEnhanced from './pages/ProfileEnhanced';
import ExchangeRatesPage from './pages/ExchangeRates';
import Accounts from './pages/Accounts';
import LendBorrowPage from './pages/LendBorrow';
import Friends from './pages/Friends';
import MoneyRequests from './pages/MoneyRequests';
import SplitBills from './pages/SplitBills';
import PendingTransactions from './pages/PendingTransactions';
import TaxCalculator from './pages/TaxCalculator';
import DiscountCalculator from './pages/DiscountCalculator';
import SavingsInvestment from './pages/SavingsInvestment';
import LoanCalculator from './pages/LoanCalculator';
import CalculatorHub from './pages/CalculatorHub';
import Comparison from './pages/Comparison';
import RecurringTransactions from './pages/RecurringTransactions';
import DailyWallet from './pages/DailyWallet';
import DateConverter from './pages/DateConverter';
import { Button } from './components/ui/button';
import { Menu, Loader2, Bell, AlertCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';
import { ThemeToggle } from './components/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { Badge } from './components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert';
import { NotificationPanel } from './components/NotificationPanel';
//import AdminAccountsPage from './pages/admin/AdminAccounts';
import AdminUsersPage from './pages/admin/AdminUsers';
import { useProfile } from './contexts/ProfileContext';
import { useNotifications } from './contexts/NotificationContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './components/ui/tooltip';

function App() {
  const session = useSession();
  const navigate = useNavigate();
  const { profile, loading } = useProfile();
  const { todayCount, upcomingCount, refreshNotifications } = useNotifications();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  const handleLogout = async () => {
    // Supabase's signOut() handles its own session cleanup
    // Don't clear localStorage/sessionStorage to preserve remembered users
    // and avoid race conditions with auth state
    await supabase.auth.signOut();
    navigate('/');
  };

  // Global copy event listener
  useEffect(() => {
    const handleCopy = () => {
      showSuccess('Text copied to clipboard!');
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col gap-4 p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Profile Error</AlertTitle>
          <AlertDescription>
            Unable to load your profile. This might be due to a session issue or missing profile data.
          </AlertDescription>
        </Alert>
        <div className="flex gap-4">
          <Button onClick={handleLogout} variant="outline">
            Logout & Try Again
          </Button>
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  const initials = profile ? `${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || profile.username?.charAt(0) || ''}`.toUpperCase() : '';

  // Truncate email for display if too long
  const displayEmail = profile?.email ? (profile.email.length > 25 ? `${profile.email.substring(0, 25)}...` : profile.email) : '';

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-background">
      <Sidebar isOpen={isSidebarOpen} isAdmin={isAdmin} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-20 px-4 sm:px-6 bg-white dark:bg-card border-b dark:border-border shrink-0">
          <div className="flex items-center space-x-3">
            <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-white dark:bg-card">
                <SidebarContent isSidebarOpen={true} onLinkClick={() => setMobileMenuOpen(false)} isAdmin={isAdmin} />
              </SheetContent>
            </Sheet>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="hidden md:inline-flex"
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle Sidebar</span>
            </Button>

            {/* User Email Display - Hidden on mobile for space */}
            {displayEmail && (
              <p className="hidden md:block text-sm text-muted-foreground truncate max-w-xs">
                {displayEmail}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* Notification Bell */}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative" 
                    onClick={() => setShowNotificationPanel(true)}
                  >
                    <Bell className="h-5 w-5" />
                    {(todayCount + upcomingCount) > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {todayCount + upcomingCount}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    {todayCount > 0 && <p className="text-red-600 font-semibold">{todayCount} due today</p>}
                    {upcomingCount > 0 && <p>{upcomingCount} upcoming</p>}
                    {(todayCount + upcomingCount) === 0 && <p>No notifications</p>}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Link to="/dashboard/profile" className="transition-all duration-300 hover:scale-110 active:scale-95">
              <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-transparent hover:ring-purple-500 hover:shadow-lg transition-all duration-300">
                <AvatarImage src={profile?.avatar_url} alt="User avatar" />
                <AvatarFallback className="h-10 w-10 text-sm bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300">{initials}</AvatarFallback>
              </Avatar>
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-background">
          <NotificationPanel 
            open={showNotificationPanel} 
            onOpenChange={setShowNotificationPanel}
            onUpdate={refreshNotifications}
          />
          <div className="container mx-auto px-6 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/incomes" element={<Incomes />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/exchange-rates" element={<ExchangeRatesPage />} />
              <Route path="/calculators" element={<CalculatorHub />} />
              <Route path="/tax-calculator" element={<TaxCalculator />} />
              <Route path="/discount-calculator" element={<DiscountCalculator />} />
              <Route path="/savings-investment" element={<SavingsInvestment />} />
              <Route path="/loan-calculator" element={<LoanCalculator />} />
              <Route path="/comparison" element={<Comparison />} />
              <Route path="/recurring" element={<RecurringTransactions />} />
              <Route path="/daily-wallet" element={<DailyWallet />} />
              <Route path="/date-converter" element={<DateConverter />} />
              <Route path="/profile" element={<ProfileEnhanced />} />
              <Route path="/lend-borrow" element={<LendBorrowPage />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/money-requests" element={<MoneyRequests />} />
              <Route path="/split-bills" element={<SplitBills />} />
              <Route path="/pending-transactions" element={<PendingTransactions />} />
              {/*isAdmin && <Route path="/admin/accounts" element={<AdminAccountsPage />} />*/}
              {isAdmin && <Route path="/admin/users" element={<AdminUsersPage />} />}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;