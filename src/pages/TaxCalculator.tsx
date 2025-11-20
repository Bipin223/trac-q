import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Calculator, FileText, Info, TrendingDown, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Nepal Tax Brackets for FY 2023/24 (Individual)
const NEPAL_TAX_BRACKETS = [
  { min: 0, max: 500000, rate: 1, description: 'First NPR 500,000' },
  { min: 500000, max: 700000, rate: 10, description: 'Next NPR 200,000' },
  { min: 700000, max: 1000000, rate: 20, description: 'Next NPR 300,000' },
  { min: 1000000, max: 2000000, rate: 30, description: 'Next NPR 1,000,000' },
  { min: 2000000, max: Infinity, rate: 36, description: 'Above NPR 2,000,000' },
];

interface TaxBreakdown {
  bracket: string;
  taxableAmount: number;
  rate: number;
  tax: number;
}

export default function TaxCalculator() {
  const [grossIncome, setGrossIncome] = useState<string>('');
  const [retirementFund, setRetirementFund] = useState<string>('');
  const [lifeInsurance, setLifeInsurance] = useState<string>('');
  const [medicalInsurance, setMedicalInsurance] = useState<string>('');
  const [remoteAllowance, setRemoteAllowance] = useState<string>('');
  const [otherDeductions, setOtherDeductions] = useState<string>('');
  const [maritalStatus, setMaritalStatus] = useState<'single' | 'married'>('single');
  const [calculated, setCalculated] = useState(false);
  const [taxBreakdown, setTaxBreakdown] = useState<TaxBreakdown[]>([]);
  const [showTaxInfo, setShowTaxInfo] = useState(false);
  const [isTaxInfoDialogOpen, setIsTaxInfoDialogOpen] = useState(false);
  
  const calculateTax = () => {
    const gross = parseFloat(grossIncome) || 0;
    
    // Apply deduction limits
    const retirementDeduction = Math.min(parseFloat(retirementFund) || 0, 300000);
    const lifeInsDeduction = Math.min(parseFloat(lifeInsurance) || 0, 25000);
    const medicalInsDeduction = Math.min(parseFloat(medicalInsurance) || 0, 20000);
    const remoteDeduction = Math.min(parseFloat(remoteAllowance) || 0, 50000);
    const otherDed = parseFloat(otherDeductions) || 0;
    
    const totalDeductions = retirementDeduction + lifeInsDeduction + medicalInsDeduction + remoteDeduction + otherDed;
    
    // Add spouse allowance for married individuals
    const spouseAllowance = maritalStatus === 'married' ? 200000 : 0;
    
    const taxableIncome = Math.max(0, gross - totalDeductions - spouseAllowance);
    
    // Calculate tax based on brackets
    let totalTax = 0;
    const breakdown: TaxBreakdown[] = [];
    
    for (const bracket of NEPAL_TAX_BRACKETS) {
      if (taxableIncome > bracket.min) {
        const taxableInBracket = Math.min(
          taxableIncome - bracket.min,
          bracket.max - bracket.min
        );
        const taxInBracket = (taxableInBracket * bracket.rate) / 100;
        totalTax += taxInBracket;
        
        breakdown.push({
          bracket: bracket.description,
          taxableAmount: taxableInBracket,
          rate: bracket.rate,
          tax: taxInBracket,
        });
      }
    }
    
    setTaxBreakdown(breakdown);
    setCalculated(true);
  };
  
  const resetCalculator = () => {
    setGrossIncome('');
    setRetirementFund('');
    setLifeInsurance('');
    setMedicalInsurance('');
    setRemoteAllowance('');
    setOtherDeductions('');
    setMaritalStatus('single');
    setCalculated(false);
    setTaxBreakdown([]);
  };
  
  // Calculated values
  const gross = parseFloat(grossIncome) || 0;
  const retirementDeduction = Math.min(parseFloat(retirementFund) || 0, 300000);
  const lifeInsDeduction = Math.min(parseFloat(lifeInsurance) || 0, 25000);
  const medicalInsDeduction = Math.min(parseFloat(medicalInsurance) || 0, 20000);
  const remoteDeduction = Math.min(parseFloat(remoteAllowance) || 0, 50000);
  const otherDed = parseFloat(otherDeductions) || 0;
  const spouseAllowance = maritalStatus === 'married' ? 200000 : 0;
  const totalDeductions = retirementDeduction + lifeInsDeduction + medicalInsDeduction + remoteDeduction + otherDed;
  const taxableIncome = Math.max(0, gross - totalDeductions - spouseAllowance);
  const totalTax = taxBreakdown.reduce((sum, b) => sum + b.tax, 0);
  const afterTaxIncome = gross - totalTax;
  const effectiveTaxRate = gross > 0 ? ((totalTax / gross) * 100).toFixed(2) : '0.00';
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Calculator</h1>
          <p className="text-muted-foreground">Calculate your income tax based on Nepal tax brackets</p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Info className="h-3 w-3 mr-1" />
          FY 2023/24
        </Badge>
      </div>
      
      <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-700 dark:text-blue-300 flex items-center justify-between">
          Nepal Tax System
          <div className="flex items-center gap-2">
            <Dialog open={isTaxInfoDialogOpen} onOpenChange={setIsTaxInfoDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  Read More
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nepal Tax System - Detailed Information</DialogTitle>
                  <DialogDescription>
                    Progressive tax system for individuals (FY 2023/24)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Tax Brackets</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Income Range (NPR)</TableHead>
                          <TableHead>Tax Rate</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>0 - 500,000</TableCell>
                          <TableCell>1%</TableCell>
                          <TableCell>First NPR 500,000</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>500,001 - 700,000</TableCell>
                          <TableCell>10%</TableCell>
                          <TableCell>Next NPR 200,000</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>700,001 - 1,000,000</TableCell>
                          <TableCell>20%</TableCell>
                          <TableCell>Next NPR 300,000</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>1,000,001 - 2,000,000</TableCell>
                          <TableCell>30%</TableCell>
                          <TableCell>Next NPR 1,000,000</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Above 2,000,000</TableCell>
                          <TableCell>36%</TableCell>
                          <TableCell>Amount above NPR 2,000,000</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Allowable Deductions</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Deduction Type</TableHead>
                          <TableHead>Maximum Amount (NPR)</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>Retirement Contribution Fund</TableCell>
                          <TableCell>300,000</TableCell>
                          <TableCell>Provident Fund, CIT, SSF contributions</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Life Insurance Premium</TableCell>
                          <TableCell>25,000</TableCell>
                          <TableCell>Premium paid for life insurance</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Medical Insurance</TableCell>
                          <TableCell>20,000</TableCell>
                          <TableCell>Health insurance premium</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Remote Area Allowance</TableCell>
                          <TableCell>50,000</TableCell>
                          <TableCell>For employees working in remote areas</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Spouse Allowance</TableCell>
                          <TableCell>200,000</TableCell>
                          <TableCell>For married individuals</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Tax Calculation Example</h3>
                    <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                      <p><strong>Example:</strong> Annual Income of NPR 1,500,000 (Single)</p>
                      <ul className="space-y-1 ml-4 list-disc">
                        <li>First 500,000 @ 1% = NPR 5,000</li>
                        <li>Next 200,000 @ 10% = NPR 20,000</li>
                        <li>Next 300,000 @ 20% = NPR 60,000</li>
                        <li>Next 500,000 @ 30% = NPR 150,000</li>
                        <li><strong>Total Tax: NPR 235,000</strong></li>
                        <li><strong>Effective Tax Rate: 15.67%</strong></li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <p><strong>Source:</strong> Income Tax Act, 2058 (Nepal)</p>
                    <p><strong>Fiscal Year:</strong> 2023/24 (2080/81 BS)</p>
                    <p><strong>Note:</strong> Tax rates and regulations are subject to change. Please consult with a tax professional or the Inland Revenue Department for official guidance.</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTaxInfo(!showTaxInfo)}
              className="h-auto p-0 text-blue-600 dark:text-blue-400"
            >
              {showTaxInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </AlertTitle>
        <AlertDescription className="text-blue-600 dark:text-blue-400">
          {showTaxInfo ? (
            <div className="mt-2 space-y-1 text-sm">
              <p>This calculator uses the progressive tax system of Nepal.</p>
              <p><strong>Tax Rates:</strong></p>
              <ul className="ml-4 space-y-0.5">
                <li>• 1% (0-5L)</li>
                <li>• 10% (5-7L)</li>
                <li>• 20% (7-10L)</li>
                <li>• 30% (10-20L)</li>
                <li>• 36% (20L+)</li>
              </ul>
            </div>
          ) : null}
        </AlertDescription>
      </Alert>
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Income & Deductions
            </CardTitle>
            <CardDescription>Enter your gross income and applicable deductions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gross-income">Gross Annual Income (NPR) *</Label>
              <Input
                id="gross-income"
                type="number"
                placeholder="e.g., 1500000"
                value={grossIncome}
                onChange={(e) => setGrossIncome(e.target.value)}
                min="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="marital-status">Marital Status</Label>
              <Select value={maritalStatus} onValueChange={(v) => setMaritalStatus(v as 'single' | 'married')}>
                <SelectTrigger id="marital-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married (NPR 200,000 spouse allowance)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-muted-foreground">Deductions</h4>
              
              <div className="space-y-2">
                <Label htmlFor="retirement">Retirement Contribution Fund</Label>
                <Input
                  id="retirement"
                  type="number"
                  placeholder="Max NPR 300,000"
                  value={retirementFund}
                  onChange={(e) => setRetirementFund(e.target.value)}
                  min="0"
                  max="300000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="life-insurance">Life Insurance Premium</Label>
                <Input
                  id="life-insurance"
                  type="number"
                  placeholder="Max NPR 25,000"
                  value={lifeInsurance}
                  onChange={(e) => setLifeInsurance(e.target.value)}
                  min="0"
                  max="25000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="medical-insurance">Medical Insurance</Label>
                <Input
                  id="medical-insurance"
                  type="number"
                  placeholder="Max NPR 20,000"
                  value={medicalInsurance}
                  onChange={(e) => setMedicalInsurance(e.target.value)}
                  min="0"
                  max="20000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="remote-allowance">Remote Area Allowance</Label>
                <Input
                  id="remote-allowance"
                  type="number"
                  placeholder="Max NPR 50,000"
                  value={remoteAllowance}
                  onChange={(e) => setRemoteAllowance(e.target.value)}
                  min="0"
                  max="50000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="other-deductions">Other Deductions</Label>
                <Input
                  id="other-deductions"
                  type="number"
                  placeholder="Additional deductions"
                  value={otherDeductions}
                  onChange={(e) => setOtherDeductions(e.target.value)}
                  min="0"
                />
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button onClick={calculateTax} className="flex-1">
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Tax
              </Button>
              <Button onClick={resetCalculator} variant="outline">
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Results Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tax Summary
              </CardTitle>
              <CardDescription>Your tax calculation breakdown</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm font-medium">Gross Income</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  NPR {gross.toLocaleString()}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Deductions</span>
                  <span className="text-muted-foreground">- NPR {totalDeductions.toLocaleString()}</span>
                </div>
                {maritalStatus === 'married' && (
                  <div className="flex justify-between text-sm">
                    <span>Spouse Allowance</span>
                    <span className="text-muted-foreground">- NPR {spouseAllowance.toLocaleString()}</span>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <span className="text-sm font-medium">Taxable Income</span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  NPR {taxableIncome.toLocaleString()}
                </span>
              </div>
              
              {calculated && taxBreakdown.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Tax Breakdown by Bracket</h4>
                    {taxBreakdown.map((bracket, index) => (
                      <div key={index} className="p-2 bg-muted rounded text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="font-medium">{bracket.bracket}</span>
                          <Badge variant="secondary">{bracket.rate}%</Badge>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>NPR {bracket.taxableAmount.toLocaleString()} @ {bracket.rate}%</span>
                          <span className="font-semibold text-foreground">NPR {bracket.tax.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              <Separator />
              
              <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div>
                  <span className="text-sm font-medium block">Total Tax Payable</span>
                  <span className="text-xs text-muted-foreground">Effective Rate: {effectiveTaxRate}%</span>
                </div>
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  NPR {totalTax.toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm font-medium">After-Tax Income</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  NPR {afterTaxIncome.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
