import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Percent, PiggyBank, CreditCard, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const calculators = [
  {
    id: 'tax',
    title: 'Tax Calculator',
    description: 'Calculate your income tax based on Nepal tax brackets with deductions',
    icon: <Calculator className="h-8 w-8" />,
    route: '/dashboard/tax-calculator',
    color: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    features: ['Nepal Tax Brackets', 'Multiple Deductions', 'Spouse Allowance'],
  },
  {
    id: 'discount',
    title: 'Discount & Pricing',
    description: 'Calculate discounts, profit margins, and bulk pricing',
    icon: <Percent className="h-8 w-8" />,
    route: '/dashboard/discount-calculator',
    color: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800',
    iconBg: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
    features: ['Simple Discounts', 'Multiple Discounts', 'Profit Margins', 'Bulk Pricing'],
  },
  {
    id: 'savings',
    title: 'Savings & Investment',
    description: 'Track savings goals and estimate investment returns',
    icon: <PiggyBank className="h-8 w-8" />,
    route: '/dashboard/savings-investment',
    color: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800',
    iconBg: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
    features: ['Savings Goals', 'Compound Interest', 'Emergency Fund', 'ROI Calculator'],
  },
  {
    id: 'loan',
    title: 'Loan & Debt',
    description: 'Calculate loan payments and debt payoff strategies',
    icon: <CreditCard className="h-8 w-8" />,
    route: '/dashboard/loan-calculator',
    color: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    features: ['Loan Payments', 'Debt Payoff', 'Interest Analysis', 'Payment Strategies'],
  },
];

export default function CalculatorHub() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Calculators</h1>
          <p className="text-muted-foreground">
            Comprehensive tools to help you make informed financial decisions
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {calculators.map((calc) => (
          <Card
            key={calc.id}
            className={`bg-gradient-to-br ${calc.color} hover:shadow-lg transition-all duration-300 cursor-pointer group`}
            onClick={() => navigate(calc.route)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${calc.iconBg} group-hover:scale-110 transition-transform`}>
                    {calc.icon}
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-1">{calc.title}</CardTitle>
                    <CardDescription className="text-sm">{calc.description}</CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {calc.features.map((feature, index) => (
                  <span
                    key={index}
                    className="text-xs px-2 py-1 bg-white/50 dark:bg-gray-800/50 rounded-full border"
                  >
                    {feature}
                  </span>
                ))}
              </div>
              <Button
                variant="outline"
                className="w-full mt-4 group-hover:bg-white dark:group-hover:bg-gray-800"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(calc.route);
                }}
              >
                Open Calculator
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
