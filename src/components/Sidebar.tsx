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
    <aside className="hidden md:flex w-72 flex-shrink-0 bg-gray-50/50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700 flex-col">
      <div className="h-16 flex items-center px-6">
        <BookOpen className="h-8 w-8 text-orange-500" />
        <span className="ml-3 text-xl font-semibold">ezBookkeeping</span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-6">
        <div>
          <Button
            variant="secondary"
            className="w-full justify-start bg-orange-400 text-white hover:bg-orange-400/90 rounded-full"
          >
            <LayoutDashboard className="mr-3 h-5 w-5" />
            Overview
          </Button>
        </div>
        <div className="space-y-2">
          <h3 className="px-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Transaction Data
          </h3>
          <Button variant="ghost" className="w-full justify-between text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50">
            <div className="flex items-center">
              <List className="mr-3 h-5 w-5" />
              Transaction Details
            </div>
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="w-full justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50">
            <BarChart2 className="mr-3 h-5 w-5" />
            Statistics & Analysis
          </Button>
        </div>
        <div className="space-y-2">
          <h3 className="px-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Basis Data
          </h3>
          <Button variant="ghost" className="w-full justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50">
            <Wallet className="mr-3 h-5 w-5" />
            Accounts
          </Button>
          <Button variant="ghost" className="w-full justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50">
            <LayoutGrid className="mr-3 h-5 w-5" />
            Transaction Categories
          </Button>
          <Button variant="ghost" className="w-full justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50">
            <Tags className="mr-3 h-5 w-5" />
            Transaction Tags
          </Button>
          <Button variant="ghost" className="w-full justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50">
            <FileText className="mr-3 h-5 w-5" />
            Transaction Templates
          </Button>
          <Button variant="ghost" className="w-full justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50">
            <CalendarClock className="mr-3 h-5 w-5" />
            Scheduled Transactions
          </Button>
        </div>
        <div className="space-y-2">
          <h3 className="px-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Miscellaneous
          </h3>
          <Button variant="ghost" className="w-full justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50">
            <Repeat className="mr-3 h-5 w-5" />
            Exchange Rates Data
          </Button>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;