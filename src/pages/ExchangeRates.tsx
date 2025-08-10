import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, ArrowRightLeft } from "lucide-react";

interface ExchangeRatesData {
  amount: number;
  base: string;
  date: string;
  rates: { [key: string]: number };
}

const TARGET_CURRENCIES = {
  NPR: { name: 'Nepalese Rupee', flag: '🇳🇵' },
  USD: { name: 'United States Dollar', flag: '🇺🇸' },
  EUR: { name: 'Euro', flag: '🇪🇺' },
  JPY: { name: 'Japanese Yen', flag: '🇯🇵' },
  GBP: { name: 'British Pound', flag: '🇬🇧' },
  CNY: { name: 'Chinese Yuan', flag: '🇨🇳' },
};

const staticRatesData: ExchangeRatesData = {
  amount: 1,
  base: 'NPR',
  date: new Date().toISOString().split('T')[0],
  rates: {
    USD: 0.0075,
    EUR: 0.0070,
    GBP: 0.0060,
    JPY: 1.17,
    CNY: 0.055,
    NPR: 1,
  },
};

const ExchangeRatesPage = () => {
  const [ratesData] = useState<ExchangeRatesData>(staticRatesData);
  const [amount, setAmount] = useState<number>(100);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('NPR');
  const [convertedAmount, setConvertedAmount] = useState<string>('');

  useEffect(() => {
    if (ratesData && ratesData.rates) {
      const rateFrom = ratesData.rates[fromCurrency];
      const rateTo = ratesData.rates[toCurrency];
      
      if (rateFrom && rateTo && amount >= 0) {
        const amountInBase = amount / rateFrom;
        const result = amountInBase * rateTo;
        
        setConvertedAmount(result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }));
      } else {
        setConvertedAmount('');
      }
    }
  }, [amount, fromCurrency, toCurrency, ratesData]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Exchange Rates</h1>
      
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Static Data</AlertTitle>
        <AlertDescription>
          The exchange rates shown are for demonstration purposes and are not live.
        </AlertDescription>
      </Alert>

      <div className="grid gap-8 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Major Currency Rates vs. NPR</CardTitle>
            <CardDescription>Static rates for 1 Nepalese Rupee (NPR).</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Value of 1 NPR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(TARGET_CURRENCIES).filter(([code]) => code !== 'NPR').map(([code, { name, flag }]) => (
                  <TableRow key={code}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{flag}</span>
                        <div>
                          <p className="font-medium">{code}</p>
                          <p className="text-sm text-muted-foreground">{name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{ratesData?.rates[code]?.toFixed(6) || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Currency Converter</CardTitle>
            <CardDescription>Convert amounts between currencies.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-4">
            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium">Amount</label>
              <Input 
                id="amount" 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(Number(e.target.value))}
                min="0"
                placeholder="100.00"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">From</label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(TARGET_CURRENCIES).sort().map(currency => (
                      <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-8">
                <Button variant="ghost" size="icon" onClick={() => {
                  setFromCurrency(toCurrency);
                  setToCurrency(fromCurrency);
                }}>
                  <ArrowRightLeft className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">To</label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(TARGET_CURRENCIES).sort().map(currency => (
                      <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg text-center mt-4">
              <p className="text-sm text-muted-foreground">{amount.toLocaleString()} {fromCurrency} is equal to</p>
              <p className="text-3xl font-bold text-primary mt-1">{convertedAmount ? `${convertedAmount} ${toCurrency}` : '...'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExchangeRatesPage;