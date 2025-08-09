import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

const ExchangeRatesPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [ratesData, setRatesData] = useState<ExchangeRatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState<number>(100);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('NPR');
  const [convertedAmount, setConvertedAmount] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        const response = await fetch('https://api.frankfurter.app/latest?from=USD');
        if (!response.ok) throw new Error('Failed to fetch exchange rates.');
        
        const data: ExchangeRatesData = await response.json();
        
        const nprRateInUsd = data.rates['NPR'];
        if (!nprRateInUsd) {
          throw new Error('NPR exchange rate not available from the provider.');
        }

        const nprBasedRates: { [key: string]: number } = {};
        // Recalculate rates relative to NPR
        for (const currency in data.rates) {
          nprBasedRates[currency] = data.rates[currency] / nprRateInUsd;
        }
        nprBasedRates['USD'] = 1 / nprRateInUsd; // Add USD rate vs NPR
        nprBasedRates['NPR'] = 1; // 1 NPR = 1 NPR

        const nprRatesData: ExchangeRatesData = {
          amount: 1,
          base: 'NPR',
          date: data.date,
          rates: nprBasedRates,
        };

        setRatesData(nprRatesData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (ratesData && ratesData.rates) {
      const rateFrom = ratesData.rates[fromCurrency];
      const rateTo = ratesData.rates[toCurrency];
      
      if (rateFrom && rateTo && amount >= 0) {
        // Convert amount from 'fromCurrency' to base (NPR), then to 'toCurrency'
        const result = amount * (rateTo / rateFrom);
        setConvertedAmount(result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }));
      } else {
        setConvertedAmount('');
      }
    }
  }, [amount, fromCurrency, toCurrency, ratesData]);

  if (loading || !user) {
    return (
      <Layout user={user}>
        <div className="w-full max-w-4xl space-y-4 mx-auto">
          <Skeleton className="h-12 w-1/3 bg-muted" />
          <Skeleton className="h-20 w-full bg-muted" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="md:col-span-2 h-96 bg-muted" />
            <Skeleton className="md:col-span-1 h-96 bg-muted" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Exchange Rates</h1>
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Live Data</AlertTitle>
          <AlertDescription>
            {`Rates are based on NPR and were last updated on ${ratesData?.date}. Data is provided for informational purposes only.`}
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Latest Exchange Rates</CardTitle>
              <CardDescription>Base currency: NPR (Nepalese Rupee)</CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <p className="text-destructive">{error}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Currency</TableHead>
                      <TableHead className="text-right">Rate (per 1 NPR)</TableHead>
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
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Currency Converter</CardTitle>
              <CardDescription>Manually convert between currencies.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                      {ratesData && Object.keys(TARGET_CURRENCIES).sort().map(currency => (
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
                      {ratesData && Object.keys(TARGET_CURRENCIES).sort().map(currency => (
                        <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">{amount.toLocaleString()} {fromCurrency} =</p>
                <p className="text-2xl font-bold">{convertedAmount ? `${convertedAmount} ${toCurrency}` : '...'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ExchangeRatesPage;