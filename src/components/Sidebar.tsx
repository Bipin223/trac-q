import {
  LayoutDashboard,
  List,
  BarChart2,
  Wallet,
  Tags,
  FileText,
  Clock,
  Repeat,
  BookOpen,
  Plus,
  LayoutGrid,
  CalendarClock,
} from "lucide-react";
import { Button } from "./ui/button";

const Sidebar = () => {
  return (
    <aside className="hidden md:flex w-72 flex-shrink-0 bg-card border-r border-border flex-col">
      <div className="h-16 flex items-center px-6">
        <BookOpen className="h-8 w-8 text-primary" />
        <span className="ml-3 text-xl font-semibold">TRAC-Q</span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-6">
        <div>
          <Button
            variant="secondary"
            className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
          >
            <LayoutDashboard className="mr-3 h-5 w-5" />
            Overview
          </Button>
        </div>
        <div className="space-y-2">
          <h3 className="px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Transaction Data
          </h3>
          <Button variant="ghost" className="w-full justify-between text-foreground/80 hover:bg-accent hover:text-accent-foreground">
            <div className="flex items-center">
              <List className="mr-3 h-5 w-5" />
              Transaction Details
            </div>
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="w-full justify-start text-foreground/80 hover:bg-accent hover:text-accent-foreground">
            <BarChart2 className="mr-3 h-5 w-5" />
            Statistics & Analysis
          </Button>
        </div>
        <div className="space-y-2">
          <h3 className="px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Basis Data
          </h3>
          <Button variant="ghost" className="w-full justify-start text-foreground/80 hover:bg-accent hover:text-accent-foreground">
            <Wallet className="mr-3 h-5 w-5" />
            Accounts
          </Button>
          <Button variant="ghost" className="w-full justify-start text-foreground/80 hover:bg-accent hover:text-accent-foreground">
            <LayoutGrid className="mr-3 h-5 w-5" />
            Transaction Categories
          </Button>
          <Button variant="ghost" className="w-full justify-start text-foreground/80 hover:bg-accent hover:text-accent-foreground">
            <Tags className="mr-3 h-5 w-5" />
            Transaction Tags
          </Button>
          <Button variant="ghost" className="w-full justify-start text-foreground/80 hover:bg-accent hover:text-accent-foreground">
            <FileText className="mr-3 h-5 w-5" />
            Transaction Templates
          </Button>
          <Button variant="ghost" className="w-full justify-start text-foreground/80 hover:bg-accent hover:text-accent-foreground">
            <CalendarClock className="mr-3 h-5 w-5" />
            Scheduled Transactions
          </Button>
        </div>
        <div className="space-y-2">
          <h3 className="px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Miscellaneous
          </h3>
          <Button variant="ghost" className="w-full justify-start text-foreground/80 hover:bg-accent hover:text-accent-foreground">
            <Repeat className="mr-3 h-5 w-5" />
            Exchange Rates Data
          </Button>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;