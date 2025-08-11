import {
  LayoutDashboard,
  List,
  BarChart2,
  Wallet,
  Tags,
  FileText,
  Clock,
  Repeat,
  Plus,
  LayoutGrid,
  CalendarClock,
} from "lucide-react";
import { Button } from "./ui/button";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const Sidebar = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="hidden md:flex w-72 flex-shrink-0 bg-card border-r border-border flex-col">
      <div className="h-16 flex items-center px-6">
        <img src="https://i.imgur.com/MX9Vsqz.png" alt="Trac-Q Logo" className="h-9 w-9 mr-3" />
        <span className="text-xl font-semibold">TRAC-Q</span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-6">
        <div>
          <Button
            asChild
            variant={isActive('/') ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              isActive('/') && "bg-primary text-primary-foreground hover:bg-primary/90",
              !isActive('/') && "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Link to="/">
              <LayoutDashboard className="mr-3 h-5 w-5" />
              Overview
            </Link>
          </Button>
        </div>
        <div className="space-y-2">
          <h3 className="px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Transaction Data
          </h3>
          <Button
            asChild
            variant={isActive('/transactions') ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-between",
              isActive('/transactions') && "bg-primary text-primary-foreground hover:bg-primary/90",
              !isActive('/transactions') && "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Link to="/transactions">
              <div className="flex items-center">
                <List className="mr-3 h-5 w-5" />
                Transaction Details
              </div>
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant={isActive('/statistics') ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              isActive('/statistics') && "bg-primary text-primary-foreground hover:bg-primary/90",
              !isActive('/statistics') && "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Link to="/statistics">
              <BarChart2 className="mr-3 h-5 w-5" />
              Statistics & Analysis
            </Link>
          </Button>
        </div>
        <div className="space-y-2">
          <h3 className="px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Basis Data
          </h3>
          <Button
            asChild
            variant={isActive('/accounts') ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              isActive('/accounts') && "bg-primary text-primary-foreground hover:bg-primary/90",
              !isActive('/accounts') && "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Link to="/accounts">
              <Wallet className="mr-3 h-5 w-5" />
              Accounts
            </Link>
          </Button>
          <Button
            asChild
            variant={isActive('/categories') ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              isActive('/categories') && "bg-primary text-primary-foreground hover:bg-primary/90",
              !isActive('/categories') && "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Link to="/categories">
              <LayoutGrid className="mr-3 h-5 w-5" />
              Transaction Categories
            </Link>
          </Button>
          <Button
            asChild
            variant={isActive('/tags') ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              isActive('/tags') && "bg-primary text-primary-foreground hover:bg-primary/90",
              !isActive('/tags') && "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Link to="/tags">
              <Tags className="mr-3 h-5 w-5" />
              Transaction Tags
            </Link>
          </Button>
          <Button
            asChild
            variant={isActive('/templates') ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              isActive('/templates') && "bg-primary text-primary-foreground hover:bg-primary/90",
              !isActive('/templates') && "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Link to="/templates">
              <FileText className="mr-3 h-5 w-5" />
              Transaction Templates
            </Link>
          </Button>
          <Button
            asChild
            variant={isActive('/scheduled-transactions') ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              isActive('/scheduled-transactions') && "bg-primary text-primary-foreground hover:bg-primary/90",
              !isActive('/scheduled-transactions') && "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Link to="/scheduled-transactions">
              <CalendarClock className="mr-3 h-5 w-5" />
              Scheduled Transactions
            </Link>
          </Button>
        </div>
        <div className="space-y-2">
          <h3 className="px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Miscellaneous
          </h3>
          <Button
            asChild
            variant={isActive('/exchange-rates') ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              isActive('/exchange-rates') && "bg-primary text-primary-foreground hover:bg-primary/90",
              !isActive('/exchange-rates') && "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Link to="/exchange-rates">
              <Repeat className="mr-3 h-5 w-5" />
              Exchange Rates Data
            </Link>
          </Button>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;