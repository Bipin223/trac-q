import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

  if (!isSidebarOpen) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={to}
              onClick={onClick}
              className={cn(
                "flex items-center justify-center p-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors",
                isActive && "bg-primary text-white hover:bg-primary/90"
              )}
            >
              {icon}
              <span className="sr-only">{label}</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center p-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors",
        isActive && "bg-primary text-white hover:bg-primary/90"
      )}
    >
      {icon}
      <span className="ml-4 font-medium">{label}</span>
    </Link>
  );
};

export default SidebarLink;