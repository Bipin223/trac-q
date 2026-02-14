import { Link, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isSidebarOpen: boolean;
  onClick?: () => void;
}

const SidebarLink = ({ to, icon, label, isSidebarOpen, onClick }: SidebarLinkProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={to}
            onClick={onClick}
            className={cn(
              "flex items-center p-3 rounded-lg transition-all duration-300 ease-in-out sidebar-link-morph",
              isActive
                ? "bg-purple-600 text-white shadow-lg scale-105 active"
                : "text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 hover:scale-105 hover:shadow-md",
              !isSidebarOpen && "justify-center"
            )}
          >
            {icon}
            {isSidebarOpen && <span className="ml-4 font-medium">{label}</span>}
          </Link>
        </TooltipTrigger>
        {!isSidebarOpen && (
          <TooltipContent side="right">
            <p>{label}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export default SidebarLink;