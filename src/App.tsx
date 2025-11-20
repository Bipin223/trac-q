import { useState } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useSession } from '@supabase/auth-helpers-react';
import Sidebar, { SidebarContent } from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Incomes from './pages/Incomes';
import Expenses from './pages/Expenses';
import ProfileEnhanced from './pages/ProfileEnhanced';
import ExchangeRatesPage from './pages/ExchangeRates';
import Accounts from './pages/Accounts';
import LendBorrowPage from './pages/LendBorrow';
import Friends from './pages/Friends';
import PendingTransactions from './pages/PendingTransactions';
import { Button } from './components/ui/button';
import { Menu, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';
import { ThemeToggle } from './components/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
//import AdminAccountsPage from './pages/admin/AdminAccounts';
import AdminUsersPage from './pages/admin/AdminUsers';
import { useProfile } from './contexts/ProfileContext';

function App() {
  const session = useSession();
  const { profile, loading } = useProfile();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
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
            <Link to="/dashboard/profile" className="transition-transform hover:scale-110">
              <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-transparent hover:ring-purple-500 transition-all">
                <AvatarImage src={profile?.avatar_url} alt="User avatar" />
                <AvatarFallback className="h-10 w-10 text-sm bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300">{initials}</AvatarFallback>
              </Avatar>
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-background">
          <div className="container mx-auto px-6 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/incomes" element={<Incomes />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/exchange-rates" element={<ExchangeRatesPage />} />
              <Route path="/profile" element={<ProfileEnhanced />} />
              <Route path="/lend-borrow" element={<LendBorrowPage />} />
              <Route path="/friends" element={<Friends />} />
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