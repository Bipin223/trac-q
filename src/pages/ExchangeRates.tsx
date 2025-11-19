import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, ArrowRightLeft, RefreshCw, TrendingUp, ChevronDown } from "lucide-react";

interface ExchangeRatesData {
  amount: number;
  base: string;
  date: string;
  rates: { [key: string]: number };
}

const ALL_CURRENCIES = {
  USD: { name: 'United States Dollar', flag: '🇺🇸' },
  INR: { name: 'Indian Rupee', flag: '🇮🇳' },
  CNY: { name: 'Chinese Yuan', flag: '🇨🇳' },
  EUR: { name: 'Euro', flag: '🇪🇺' },
  JPY: { name: 'Japanese Yen', flag: '🇯🇵' },
  GBP: { name: 'British Pound', flag: '🇬🇧' },
  AUD: { name: 'Australian Dollar', flag: '🇦🇺' },
  CAD: { name: 'Canadian Dollar', flag: '🇨🇦' },
  CHF: { name: 'Swiss Franc', flag: '🇨🇭' },
  KRW: { name: 'South Korean Won', flag: '🇰🇷' },
  SGD: { name: 'Singapore Dollar', flag: '🇸🇬' },
  HKD: { name: 'Hong Kong Dollar', flag: '🇭🇰' },
  SEK: { name: 'Swedish Krona', flag: '🇸🇪' },
  NOK: { name: 'Norwegian Krone', flag: '🇳🇴' },
  MXN: { name: 'Mexican Peso', flag: '🇲🇽' },
  BRL: { name: 'Brazilian Real', flag: '🇧🇷' },
  ZAR: { name: 'South African Rand', flag: '🇿🇦' },
  THB: { name: 'Thai Baht', flag: '🇹🇭' },
  MYR: { name: 'Malaysian Ringgit', flag: '🇲🇾' },
  PHP: { name: 'Philippine Peso', flag: '🇵🇭' },
};

const DEFAULT_CURRENCIES = ['USD', 'INR', 'CNY'];

const ExchangeRatesPage = () => {
  const [ratesData, setRatesData] = useState<ExchangeRatesData | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [fromCurrency, setFromCurrency] = useState('NPR');
  const [toCurrency, setToCurrency] = useState('USD');
  const [convertedAmount, setConvertedAmount] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showAllRates, setShowAllRates] = useState(false);

  const numericAmount = parseFloat(amount);

  // Fetch live exchange rates
  const fetchRates = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch NPR as base currency to get correct NPR exchange rates
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/NPR');
      const data = await response.json();
      
      setRatesData({
        amount: 1,
        base: 'NPR',
        date: data.date,
        rates: data.rates,
      });
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error fetching exchange rates:', err);
      setError('Failed to fetch live rates. Please try again.');
      // Fallback to static data (1 NPR = ...)
      setRatesData({
        amount: 1,
        base: 'NPR',
        date: new Date().toISOString().split('T')[0],
        rates: {
          NPR: 1,
          USD: 0.0075,
          INR: 0.625,
          CNY: 0.054,
          EUR: 0.0069,
          GBP: 0.0059,
          JPY: 1.16,
          AUD: 0.0115,
          CAD: 0.0105,
          CHF: 0.0066,
          KRW: 10.45,
          SGD: 0.010,
          HKD: 0.058,
          SEK: 0.082,
          NOK: 0.083,
          MXN: 0.152,
          BRL: 0.043,
          ZAR: 0.136,
          THB: 0.256,
          MYR: 0.033,
          PHP: 0.442,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch rates on mount and every 5 minutes
  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 5 * 60 * 1000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (ratesData && ratesData.rates && !isNaN(numericAmount) && numericAmount >= 0) {
      const rateFrom = ratesData.rates[fromCurrency];
      const rateTo = ratesData.rates[toCurrency];
      
      if (rateFrom && rateTo) {
        const amountInBase = numericAmount / rateFrom;
        const result = amountInBase * rateTo;
        
        setConvertedAmount(result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }));
      } else {
        setConvertedAmount('');
      }
    } else {
      setConvertedAmount('');
    }
  }, [amount, fromCurrency, toCurrency, ratesData, numericAmount]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Exchange Rates</h1>
        <Button 
          onClick={fetchRates} 
          disabled={loading}
          variant="outline"
          size="sm"
          className="hover:scale-105 transition-all"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Rates
        </Button>
      </div>
      
      <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-700 dark:text-green-300">Live Exchange Rates</AlertTitle>
        <AlertDescription className="text-green-600 dark:text-green-400">
          {loading ? 'Fetching latest rates...' : error ? error : `Real-time rates • Last updated: ${lastUpdated} • Auto-refreshes every 5 minutes`}
        </AlertDescription>
      </Alert>

      <div className="grid gap-8 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>NPR Exchange Rates</CardTitle>
            <CardDescription>Value of 1 Nepalese Rupee (NPR) in other currencies.</CardDescription>
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
                {(showAllRates 
                  ? Object.entries(ALL_CURRENCIES)
                  : Object.entries(ALL_CURRENCIES).filter(([code]) => DEFAULT_CURRENCIES.includes(code))
                ).map(([code, { name, flag }]) => {
                  const rate = ratesData?.rates[code];
                  return (
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
                      <TableCell className="text-right font-mono">
                        {rate ? rate.toFixed(code === 'JPY' || code === 'KRW' ? 2 : 4) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {!showAllRates && (
              <div className="mt-4 text-center">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAllRates(true)}
                  className="w-full"
                >
                  <ChevronDown className="h-4 w-4 mr-2" />
                  See More Currencies
                </Button>
              </div>
            )}
            
            {showAllRates && (
              <div className="mt-4 text-center">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowAllRates(false)}
                  className="w-full"
                >
                  Show Less
                </Button>
              </div>
            )}
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
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                placeholder="Enter amount (e.g., 1)"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">From</label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NPR">NPR</SelectItem>
                    {Object.keys(ALL_CURRENCIES).sort().map(currency => (
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
                    <SelectItem value="NPR">NPR</SelectItem>
                    {Object.keys(ALL_CURRENCIES).sort().map(currency => (
                      <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg text-center mt-4">
              <p className="text-sm text-muted-foreground">
                {amount && !isNaN(numericAmount) ? `${numericAmount.toLocaleString()} ${fromCurrency}` : 'Enter an amount'} is equal to
              </p>
              <p className="text-3xl font-bold text-primary mt-1">{convertedAmount ? `${convertedAmount} ${toCurrency}` : '...'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExchangeRatesPage;