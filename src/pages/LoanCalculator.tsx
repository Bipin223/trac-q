import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Home, Car, GraduationCap, Calculator, TrendingDown } from 'lucide-react';

export default function LoanCalculator() {
  // Loan Calculator
  const [loanAmount, setLoanAmount] = useState<string>('');
  const [interestRate, setInterestRate] = useState<string>('');
  const [loanTerm, setLoanTerm] = useState<string>('');
  const [loanType, setLoanType] = useState<string>('personal');
  
  // Debt Payoff Calculator
  const [totalDebt, setTotalDebt] = useState<string>('');
  const [avgInterest, setAvgInterest] = useState<string>('');
  const [monthlyPayment, setMonthlyPayment] = useState<string>('');
  const [extraPayment, setExtraPayment] = useState<string>('');
  
  // Loan Calculations
  const principal = parseFloat(loanAmount) || 0;
  const monthlyRate = (parseFloat(interestRate) || 0) / 100 / 12;
  const numPayments = (parseFloat(loanTerm) || 0) * 12;
  
  // Monthly payment formula: M = P[r(1+r)^n]/[(1+r)^n-1]
  const monthlyPaymentAmount = principal > 0 && monthlyRate > 0 && numPayments > 0
    ? principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    : 0;
  
  const totalPayment = monthlyPaymentAmount * numPayments;
  const totalInterest = totalPayment - principal;
  
  // Debt Payoff Calculations
  const debt = parseFloat(totalDebt) || 0;
  const avgRate = (parseFloat(avgInterest) || 0) / 100 / 12;
  const payment = parseFloat(monthlyPayment) || 0;
  const extra = parseFloat(extraPayment) || 0;
  const totalMonthlyPayment = payment + extra;
  
  // Calculate months to pay off debt
  let monthsToPayoff = 0;
  let totalInterestPaid = 0;
  
  if (debt > 0 && totalMonthlyPayment > 0 && avgRate >= 0) {
    let remainingBalance = debt;
    while (remainingBalance > 0 && monthsToPayoff < 600) { // Max 50 years
      const interestCharge = remainingBalance * avgRate;
      const principalPayment = Math.min(totalMonthlyPayment - interestCharge, remainingBalance);
      
      if (principalPayment <= 0) break; // Payment doesn't cover interest
      
      remainingBalance -= principalPayment;
      totalInterestPaid += interestCharge;
      monthsToPayoff++;
    }
  }
  
  const yearsToPayoff = Math.floor(monthsToPayoff / 12);
  const remainingMonthsPayoff = monthsToPayoff % 12;
  
  // Calculate savings from extra payment
  let monthsWithoutExtra = 0;
  let interestWithoutExtra = 0;
  
  if (debt > 0 && payment > 0 && avgRate >= 0) {
    let balance = debt;
    while (balance > 0 && monthsWithoutExtra < 600) {
      const interest = balance * avgRate;
      const principal = Math.min(payment - interest, balance);
      
      if (principal <= 0) break;
      
      balance -= principal;
      interestWithoutExtra += interest;
      monthsWithoutExtra++;
    }
  }
  
  const monthsSaved = monthsWithoutExtra - monthsToPayoff;
  const interestSaved = interestWithoutExtra - totalInterestPaid;
  
  const getLoanIcon = () => {
    switch (loanType) {
      case 'home':
        return <Home className="h-5 w-5" />;
      case 'car':
        return <Car className="h-5 w-5" />;
      case 'education':
        return <GraduationCap className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loan & Debt Calculator</h1>
          <p className="text-muted-foreground">Calculate loan payments and debt payoff strategies</p>
        </div>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Loan Payment Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Loan Payment Calculator
            </CardTitle>
            <CardDescription>Calculate monthly payments for your loan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loan-type">Loan Type</Label>
              <Select value={loanType} onValueChange={setLoanType}>
                <SelectTrigger id="loan-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal Loan</SelectItem>
                  <SelectItem value="home">Home Loan</SelectItem>
                  <SelectItem value="car">Car Loan</SelectItem>
                  <SelectItem value="education">Education Loan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="loan-amount">Loan Amount (NPR)</Label>
              <Input
                id="loan-amount"
                type="number"
                placeholder="e.g., 1000000"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                min="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="interest-rate">Annual Interest Rate (%)</Label>
              <Input
                id="interest-rate"
                type="number"
                placeholder="e.g., 12.5"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                min="0"
                step="0.1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="loan-term">Loan Term (Years)</Label>
              <Input
                id="loan-term"
                type="number"
                placeholder="e.g., 5"
                value={loanTerm}
                onChange={(e) => setLoanTerm(e.target.value)}
                min="0"
              />
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                {getLoanIcon()}
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  {loanType.charAt(0).toUpperCase() + loanType.slice(1)} Loan
                </span>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400 block">
                    Monthly Payment
                  </span>
                  <span className="text-xs text-muted-foreground">
                    for {numPayments} months
                  </span>
                </div>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  NPR {monthlyPaymentAmount.toLocaleString()}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Principal</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    NPR {principal.toLocaleString()}
                  </p>
                </div>
                
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Interest</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    NPR {totalInterest.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    Total Repayment
                  </span>
                  <Badge variant="secondary">
                    {totalInterest > 0 ? `+${((totalInterest / principal) * 100).toFixed(1)}%` : '0%'}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  NPR {totalPayment.toLocaleString()}
                </p>
              </div>
              
              {totalInterest > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Interest vs Principal</span>
                  </div>
                  <div className="flex gap-2 h-4 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-500 dark:bg-green-600"
                      style={{ width: `${(principal / totalPayment) * 100}%` }}
                    />
                    <div 
                      className="bg-red-500 dark:bg-red-600"
                      style={{ width: `${(totalInterest / totalPayment) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-green-600 dark:text-green-400">
                      Principal {((principal / totalPayment) * 100).toFixed(1)}%
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                      Interest {((totalInterest / totalPayment) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Debt Payoff Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Debt Payoff Calculator
            </CardTitle>
            <CardDescription>See how fast you can pay off your debt</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="total-debt">Total Debt (NPR)</Label>
              <Input
                id="total-debt"
                type="number"
                placeholder="e.g., 500000"
                value={totalDebt}
                onChange={(e) => setTotalDebt(e.target.value)}
                min="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="avg-interest">Average Interest Rate (%)</Label>
              <Input
                id="avg-interest"
                type="number"
                placeholder="e.g., 15"
                value={avgInterest}
                onChange={(e) => setAvgInterest(e.target.value)}
                min="0"
                step="0.1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="monthly-payment">Current Monthly Payment (NPR)</Label>
              <Input
                id="monthly-payment"
                type="number"
                placeholder="e.g., 15000"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
                min="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="extra-payment">Extra Monthly Payment (NPR)</Label>
              <Input
                id="extra-payment"
                type="number"
                placeholder="e.g., 5000"
                value={extraPayment}
                onChange={(e) => setExtraPayment(e.target.value)}
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Additional amount you can pay each month
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Total Monthly Payment</span>
                <span className="text-lg font-bold">
                  NPR {totalMonthlyPayment.toLocaleString()}
                </span>
              </div>
              
              {monthsToPayoff > 0 && (
                <>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        Time to Debt Freedom
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {yearsToPayoff > 0 ? `${yearsToPayoff}y ` : ''}{remainingMonthsPayoff}m
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {monthsToPayoff} months
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        NPR {(debt + totalInterestPaid).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground mb-1">Interest</p>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">
                        NPR {totalInterestPaid.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {extra > 0 && monthsSaved > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                      <h4 className="font-semibold text-sm text-green-700 dark:text-green-300 mb-3">
                        💰 Impact of Extra Payment
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Time Saved:</span>
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            {Math.floor(monthsSaved / 12)}y {monthsSaved % 12}m
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Interest Saved:</span>
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            NPR {interestSaved.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
