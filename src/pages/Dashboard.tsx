import { AugustExpenseCard } from "@/components/dashboard/AugustExpenseCard";
import { AssetSummaryCard } from "@/components/dashboard/AssetSummaryCard";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { TrendsCard } from "@/components/dashboard/TrendsCard";
import { Calendar, CalendarDays, CalendarRange, BarChartHorizontal } from "lucide-react";

const Dashboard = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <AugustExpenseCard />
      <AssetSummaryCard />
      <SummaryCard 
        title="Today" 
        icon={<Calendar className="h-5 w-5" />} 
        period="August 4, 2025" 
      />
      <SummaryCard 
        title="This Week" 
        icon={<CalendarDays className="h-5 w-5" />} 
        period="August 3-August 9" 
      />
      <TrendsCard />
      <SummaryCard 
        title="This Month" 
        icon={<CalendarRange className="h-5 w-5" />} 
        period="August 2025" 
      />
      <SummaryCard 
        title="This Year" 
        icon={<BarChartHorizontal className="h-5 w-5" />} 
        period="2025" 
      />
    </div>
  );
};

export default Dashboard;