import { Home, BarChart2, User, LogOut, ArrowRightLeft, Landmark, Users, Handshake, UserPlus, Clock, Calculator, TrendingUp, Repeat, HandCoins, Receipt, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { cn } from "@/lib/utils";
import SidebarLink from './SidebarLink';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useProfile } from '@/contexts/ProfileContext';

const navItems = [
  { to: '/dashboard', icon: <Home className="h-5 w-5" />, label: 'Dashboard' },
  { to: '/dashboard/incomes', icon: <span className="h-5 w-5 flex items-center justify-center font-bold text-base leading-none">रु</span>, label: 'Incomes' },
  { to: '/dashboard/expenses', icon: <BarChart2 className="h-5 w-5" />, label: 'Expenses' },
  { to: '/dashboard/daily-wallet', icon: <Landmark className="h-5 w-5" />, label: 'Daily Wallet' },
  { to: '/dashboard/comparison', icon: <TrendingUp className="h-5 w-5" />, label: 'Comparison' },
  { to: '/dashboard/recurring', icon: <Repeat className="h-5 w-5" />, label: 'Recurring' },
  { to: '/dashboard/pending-transactions', icon: <Clock className="h-5 w-5" />, label: 'Pending' },
  { to: '/dashboard/exchange-rates', icon: <ArrowRightLeft className="h-5 w-5" />, label: 'Exchange Rates' },
  { to: '/dashboard/date-converter', icon: <Calendar className="h-5 w-5" />, label: 'Date Converter' },
  { to: '/dashboard/calculators', icon: <Calculator className="h-5 w-5" />, label: 'Calculators' },
  { to: '/dashboard/lend-borrow', icon: <Handshake className="h-5 w-5" />, label: 'Lend & Borrow' },
  { to: '/dashboard/friends', icon: <UserPlus className="h-5 w-5" />, label: 'Friends' },
  { to: '/dashboard/money-requests', icon: <HandCoins className="h-5 w-5" />, label: 'Money Requests' },
  { to: '/dashboard/split-bills', icon: <Receipt className="h-5 w-5" />, label: 'Split Bills' },
  { to: '/dashboard/profile', icon: <User className="h-5 w-5" />, label: 'Profile' },
];

const adminNavItems = [
  //{ to: '/dashboard/admin/accounts', icon: <Shield className="h-5 w-5" />, label: 'Accounts (Admin)' },
  { to: '/dashboard/admin/users', icon: <Users className="h-5 w-5" />, label: 'Users (Admin)' },
];

interface SidebarContentProps {
  isSidebarOpen: boolean;
  isAdmin: boolean;
  onLinkClick?: () => void;
}

export const SidebarContent = ({ isSidebarOpen, isAdmin, onLinkClick }: SidebarContentProps) => {
  const supabase = useSupabaseClient();
  const navigate = useNavigate();
  const { profile } = useProfile();

  const handleLogout = async () => {
    if (onLinkClick) onLinkClick();
    // Supabase's signOut() handles its own session cleanup
    // Don't clear localStorage/sessionStorage to preserve remembered users
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header with Logo Only */}
      <div className="flex flex-col h-24 border-b dark:border-gray-700 px-4 shrink-0 justify-center">
        {/* Logo - Enlarged and centered */}
        <Link to="/dashboard" onClick={onLinkClick} className={cn("flex items-center justify-center w-full", !isSidebarOpen && "justify-center")}>
          <img src="/logo.png" alt="Trac-Q Logo" className="h-16 w-16 shrink-0" />
          {isSidebarOpen && <span className="ml-3 text-xl font-semibold">Trac-Q</span>}
        </Link>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <SidebarLink key={item.to} {...item} isSidebarOpen={isSidebarOpen} onClick={onLinkClick} />
        ))}

        {isAdmin && <div className="pt-2 mt-2 border-t dark:border-gray-700"></div>}
        {isAdmin && isSidebarOpen && (
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Admin
          </p>
        )}
        {isAdmin && adminNavItems.map((item) => (
          <SidebarLink key={item.to} {...item} isSidebarOpen={isSidebarOpen} onClick={onLinkClick} />
        ))}
      </nav>
      <div className="px-2 py-4 mt-auto border-t dark:border-gray-700">
        {isSidebarOpen ? (
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start p-3"
          >
            <LogOut className="h-5 w-5 mr-4" />
            <span className="font-medium">Logout</span>
          </Button>
        ) : (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="w-full"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Logout</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Logout</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
};

interface SidebarProps {
  isOpen: boolean;
  isAdmin: boolean;
}

const Sidebar = ({ isOpen, isAdmin }: SidebarProps) => {
  return (
    <aside className={cn(
      "hidden md:flex flex-col shadow-lg transition-all duration-300 ease-in-out",
      isOpen ? "w-64" : "w-20"
    )}>
      <SidebarContent isSidebarOpen={isOpen} isAdmin={isAdmin} />
    </aside>
  );
};

export default Sidebar;