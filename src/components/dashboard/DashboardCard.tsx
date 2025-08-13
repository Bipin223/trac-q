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
    <Link to={to} className="block hover:scale-105 transition-transform duration-200">
      <Card className="h-full flex flex-col bg-card hover:bg-muted/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          <div className="p-2 bg-primary/10 rounded-md text-primary">
            {icon}
          </div>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
        <div className="p-4 pt-0 flex justify-end">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </Card>
    </Link>
  );
};