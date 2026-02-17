import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { PiggyBank, TrendingUp, Target, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SavingsInvestment() {
  // Savings Goal Tracker
  const [goalName, setGoalName] = useState<string>('');
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [currentSavings, setCurrentSavings] = useState<string>('');
  const [monthlyContribution, setMonthlyContribution] = useState<string>('');

  // Dialog state
  const [showSavingsInfo, setShowSavingsInfo] = useState(false);
  const [isSavingsInfoDialogOpen, setIsSavingsInfoDialogOpen] = useState(false);

  // Compound Interest Calculator
  const [principal, setPrincipal] = useState<string>('');
  const [annualRate, setAnnualRate] = useState<string>('');
  const [timePeriod, setTimePeriod] = useState<string>('');
  const [compoundFrequency, setCompoundFrequency] = useState<string>('12');
  const [monthlyDeposit, setMonthlyDeposit] = useState<string>('');

  // Emergency Fund Calculator
  const [monthlyExpenses, setMonthlyExpenses] = useState<string>('');
  const [emergencyMonths, setEmergencyMonths] = useState<string>('6');

  // Savings Goal Calculations
  const target = parseFloat(targetAmount) || 0;
  const current = parseFloat(currentSavings) || 0;
  const monthly = parseFloat(monthlyContribution) || 0;
  const remaining = Math.max(0, target - current);
  const progressPercent = target > 0 ? ((current / target) * 100) : 0;
  const monthsToGoal = monthly > 0 ? Math.ceil(remaining / monthly) : 0;
  const yearsToGoal = Math.floor(monthsToGoal / 12);
  const remainingMonths = monthsToGoal % 12;

  // Compound Interest Calculations
  const p = parseFloat(principal) || 0;
  const r = (parseFloat(annualRate) || 0) / 100;
  const t = parseFloat(timePeriod) || 0;
  const n = parseFloat(compoundFrequency) || 12;
  const monthlyDep = parseFloat(monthlyDeposit) || 0;

  // Compound interest formula: A = P(1 + r/n)^(nt)
  const compoundAmount = p * Math.pow((1 + r / n), n * t);

  // Future value of monthly deposits: FV = PMT × [((1 + r/n)^(nt) - 1) / (r/n)]
  const futureValueOfDeposits = monthlyDep > 0 && r > 0
    ? monthlyDep * ((Math.pow(1 + r / n, n * t) - 1) / (r / n))
    : monthlyDep * n * t; // Simple addition if no interest

  const totalFutureValue = compoundAmount + futureValueOfDeposits;
  const totalDeposited = p + (monthlyDep * n * t);
  const totalInterestEarned = totalFutureValue - totalDeposited;

  // Emergency Fund Calculations
  const expenses = parseFloat(monthlyExpenses) || 0;
  const months = parseFloat(emergencyMonths) || 6;
  const emergencyFundTarget = expenses * months;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Savings & Investment Tracker</h1>
          <p className="text-muted-foreground">Track savings goals and estimate investment returns</p>
        </div>
      </div>

      <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-700 dark:text-green-300 flex items-center justify-between">
          Savings & Investment Information
          <div className="flex items-center gap-2">
            <Dialog open={isSavingsInfoDialogOpen} onOpenChange={setIsSavingsInfoDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                >
                  Read More
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Savings & Investment Guide for Nepal</DialogTitle>
                  <DialogDescription>
                    Understanding interest rates, compound growth, and savings options
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Savings Account Interest Rates</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account Type</TableHead>
                          <TableHead>Interest Rate</TableHead>
                          <TableHead>Best For</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell><strong>Savings Account</strong></TableCell>
                          <TableCell>3% - 5%</TableCell>
                          <TableCell>Daily expenses, emergency fund</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Fixed Deposit (1 year)</strong></TableCell>
                          <TableCell>8% - 10%</TableCell>
                          <TableCell>Short-term goals, guaranteed returns</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Fixed Deposit (3-5 years)</strong></TableCell>
                          <TableCell>9% - 11%</TableCell>
                          <TableCell>Medium-term goals, higher returns</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Recurring Deposit</strong></TableCell>
                          <TableCell>7% - 9%</TableCell>
                          <TableCell>Regular monthly savings</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold text-lg mb-2">Compound Interest Formula</h3>
                    <div className="bg-muted p-4 rounded-lg space-y-3">
                      <div>
                        <p className="font-semibold text-sm">Basic Compound Interest:</p>
                        <p className="font-mono text-sm mt-1">A = P(1 + r/n)^(nt)</p>
                        <ul className="space-y-1 ml-4 list-disc text-xs text-muted-foreground mt-2">
                          <li>A = Final amount</li>
                          <li>P = Principal (initial investment)</li>
                          <li>r = Annual interest rate (decimal)</li>
                          <li>n = Number of times interest compounds per year</li>
                          <li>t = Time in years</li>
                        </ul>
                      </div>

                      <Separator />

                      <div>
                        <p className="font-semibold text-sm">With Regular Monthly Deposits:</p>
                        <p className="font-mono text-sm mt-1">FV = PMT × [((1 + r/n)^(nt) - 1) / (r/n)]</p>
                        <ul className="space-y-1 ml-4 list-disc text-xs text-muted-foreground mt-2">
                          <li>FV = Future value</li>
                          <li>PMT = Monthly payment/deposit</li>
                          <li>r = Annual interest rate (decimal)</li>
                          <li>n = Compounding frequency (12 for monthly)</li>
                          <li>t = Time in years</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold text-lg mb-2">Example Calculation</h3>
                    <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                      <p><strong>Scenario:</strong> रु 50,000 invested for 5 years at 9% annual interest, compounded monthly</p>
                      <div className="mt-2 space-y-1">
                        <p>• Principal: रु 50,000</p>
                        <p>• Rate: 9% = 0.09</p>
                        <p>• Time: 5 years</p>
                        <p>• Compounding: 12 times/year (monthly)</p>
                      </div>
                      <Separator />
                      <p className="font-semibold">Result: रु 78,454.48</p>
                      <p className="text-xs text-muted-foreground">Interest earned: रु 28,454.48</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold text-lg mb-2">Emergency Fund Guidelines</h3>
                    <div className="space-y-2">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold text-sm">Recommended: 3-6 months of expenses</p>
                        <p className="text-xs text-muted-foreground mt-1">Keep in easily accessible savings account</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold text-sm">Single Income Family: 6-9 months</p>
                        <p className="text-xs text-muted-foreground mt-1">Higher buffer for income stability</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold text-sm">Self-Employed: 9-12 months</p>
                        <p className="text-xs text-muted-foreground mt-1">Account for irregular income</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <p><strong>Note:</strong> Interest rates vary by bank and are subject to Nepal Rastra Bank regulations. Rates shown are approximate as of 2024. Check with your bank for current rates.</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSavingsInfo(!showSavingsInfo)}
              className="h-auto p-0 text-green-600 dark:text-green-400"
            >
              {showSavingsInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </AlertTitle>
        <AlertDescription className="text-green-600 dark:text-green-400">
          {showSavingsInfo ? (
            <div className="mt-2 space-y-1 text-sm">
              <p>Interest rates in Nepal:</p>
              <ul className="ml-4 space-y-0.5">
                <li>• Savings: 3-5%</li>
                <li>• Fixed Deposit (1yr): 8-10%</li>
                <li>• Fixed Deposit (3-5yr): 9-11%</li>
              </ul>
              <p className="mt-2">Emergency fund: Save 3-6 months of expenses</p>
            </div>
          ) : (
            <p>Fixed deposits offer 8-11% returns. Emergency fund: 3-6 months expenses recommended</p>
          )}
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Savings Goal Tracker */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Savings Goal Tracker
            </CardTitle>
            <CardDescription>Set and track your savings goals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-name">Goal Name</Label>
              <Input
                id="goal-name"
                placeholder="e.g., Emergency Fund, Vacation, New Car"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-amount">Target Amount (रु )</Label>
              <Input
                id="target-amount"
                type="number"
                placeholder="e.g., 500000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current-savings">Current Savings (रु )</Label>
              <Input
                id="current-savings"
                type="number"
                placeholder="e.g., 100000"
                value={currentSavings}
                onChange={(e) => setCurrentSavings(e.target.value)}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly-contribution">Monthly Contribution (रु )</Label>
              <Input
                id="monthly-contribution"
                type="number"
                placeholder="e.g., 10000"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                min="0"
              />
            </div>

            <Separator />

            <div className="space-y-4">
              {goalName && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h3 className="font-semibold text-purple-700 dark:text-purple-300">{goalName}</h3>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <Badge variant={progressPercent >= 100 ? 'default' : 'secondary'}>
                    {progressPercent.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={Math.min(progressPercent, 100)} className="h-3" />
                <div className="flex justify-between items-center mt-2 text-sm">
                  <span className="text-muted-foreground">रु  {current.toLocaleString()}</span>
                  <span className="font-semibold">रु  {target.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    रु  {remaining.toLocaleString()}
                  </p>
                </div>

                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Monthly</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    रु  {monthly.toLocaleString()}
                  </p>
                </div>
              </div>

              {monthsToGoal > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Time to Goal</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {yearsToGoal > 0 ? `${yearsToGoal}y ` : ''}{remainingMonths}m
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Approximately {monthsToGoal} months
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Compound Interest Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Compound Interest Calculator
            </CardTitle>
            <CardDescription>Estimate returns on investments over time</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="principal">Initial Investment (रु )</Label>
              <Input
                id="principal"
                type="number"
                placeholder="e.g., 100000"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="annual-rate">Annual Interest Rate (%)</Label>
              <Input
                id="annual-rate"
                type="number"
                placeholder="e.g., 8.5"
                value={annualRate}
                onChange={(e) => setAnnualRate(e.target.value)}
                min="0"
                step="0.1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-period">Time Period (Years)</Label>
              <Input
                id="time-period"
                type="number"
                placeholder="e.g., 10"
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="compound-frequency">Compound Frequency</Label>
              <Select value={compoundFrequency} onValueChange={setCompoundFrequency}>
                <SelectTrigger id="compound-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Annually</SelectItem>
                  <SelectItem value="2">Semi-Annually</SelectItem>
                  <SelectItem value="4">Quarterly</SelectItem>
                  <SelectItem value="12">Monthly</SelectItem>
                  <SelectItem value="365">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly-deposit">Monthly Deposit (रु )</Label>
              <Input
                id="monthly-deposit"
                type="number"
                placeholder="e.g., 5000"
                value={monthlyDeposit}
                onChange={(e) => setMonthlyDeposit(e.target.value)}
                min="0"
              />
              <p className="text-xs text-muted-foreground">Additional amount invested each month</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Deposited</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  रु  {totalDeposited.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Interest Earned</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  रु  {totalInterestEarned.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400 block">Future Value</span>
                  <span className="text-xs text-muted-foreground">After {t} years</span>
                </div>
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  रु  {totalFutureValue.toLocaleString()}
                </span>
              </div>

              {totalInterestEarned > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Return on Investment</span>
                    <Badge variant="secondary">
                      {((totalInterestEarned / totalDeposited) * 100).toFixed(2)}%
                    </Badge>
                  </div>
                  <Progress
                    value={Math.min(((totalInterestEarned / totalDeposited) * 100), 100)}
                    className="h-2"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Emergency Fund Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5" />
              Emergency Fund Calculator
            </CardTitle>
            <CardDescription>Calculate your ideal emergency fund target</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="monthly-expenses">Monthly Expenses (रु )</Label>
              <Input
                id="monthly-expenses"
                type="number"
                placeholder="e.g., 50000"
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(e.target.value)}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency-months">Months of Coverage</Label>
              <Select value={emergencyMonths} onValueChange={setEmergencyMonths}>
                <SelectTrigger id="emergency-months">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Months (Minimum)</SelectItem>
                  <SelectItem value="6">6 Months (Recommended)</SelectItem>
                  <SelectItem value="9">9 Months (Conservative)</SelectItem>
                  <SelectItem value="12">12 Months (Very Safe)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Financial experts recommend 3-6 months of expenses
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg border-2 border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <PiggyBank className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">
                    Emergency Fund Target
                  </span>
                </div>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  रु  {emergencyFundTarget.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {months} months × रु  {expenses.toLocaleString()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Per Month</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    रु  {expenses.toLocaleString()}
                  </p>
                </div>

                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Coverage</p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {months} Months
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
