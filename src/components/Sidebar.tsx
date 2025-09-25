import { Home, BarChart2, Tag, User, LogOut, ArrowRightLeft, DollarSign, Landmark, Shield, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { cn } from "@/lib/utils";
import SidebarLink from './SidebarLink';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const navItems = [
  { to: '/', icon: <Home className="h-5 w-5" />, label: 'Dashboard' },
  { to: '/accounts', icon: <Landmark className="h-5 w-5" />, label: 'Accounts' },
  // Removed budgets link as it's covered in dashboard summary
  { to: '/incomes', icon: <DollarSign className="h-5 w-5" />, label: 'Incomes' },
  { to: '/expenses', icon: <BarChart2 className="h-5 w-5" />, label: 'Expenses' },
  { to: '/exchange-rates', icon: <ArrowRightLeft className="h-5 w-5" />, label: 'Exchange Rates' },
  { to: '/profile', icon: <User className="h-5 w-5" />, label: 'Profile' },
];

const adminNavItems = [
    { to: '/admin/accounts', icon: <Shield className="h-5 w-5" />, label: 'Accounts (Admin)' },
    { to: '/admin/users', icon: <Users className="h-5 w-5" />, label: 'Users (Admin)' },
];

interface SidebarContentProps {
  isSidebarOpen: boolean;
  isAdmin: boolean;
  onLinkClick?: () => void;
}

export const SidebarContent = ({ isSidebarOpen, isAdmin, onLinkClick }: SidebarContentProps) => {
  const supabase = useSupabaseClient();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (onLinkClick) onLinkClick();
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      <div className="flex items-center h-20 border-b dark:border-gray-700 px-4 shrink-0">
        <Link to="/" onClick={onLinkClick} className={cn("flex items-center w-full", !isSidebarOpen && "justify-center")}>
          <img src="https://i.imgur.com/MX9Vsqz.png" alt="Logo" className="h-10 w-10 shrink-0" />
          {isSidebarOpen && <span className="ml-3 text-xl font-semibold">Trac-Q</span>}
        </Link>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <SidebarLink key={item.to} {...item} isSidebarOpen={isSidebarOpen} onClick={onLinkClick} />
        ))}
        {isAdmin && <div className="pt-2 mt-2 border-t"></div>}
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