import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

interface DashboardCardProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const DashboardCard = ({ to, icon, title, description }: DashboardCardProps) => {
  return (
    <Link to={to} className="block hover:scale-105 transition-all duration-200">
      <Card className="h-full flex flex-col bg-card hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-md text-purple-600 dark:text-purple-400">
            {icon}
          </div>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
        <div className="p-4 pt-0 flex justify-end">
            <ArrowRight className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
      </Card>
    </Link>
  );
};