import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      className="animate-in fade-in-0 slide-in-from-right-4 duration-500 ease-out"
    >
      {children}
    </div>
  );
}
