import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, ArrowRightLeft, Languages } from 'lucide-react';
import { adToBs, bsToAd, nepaliMonthsEng, isValidBsDate } from '@/utils/nepaliCalendar';
import { NepaliCalendar } from '@/components/NepaliCalendar';

export default function DateConverter() {
  const [adDate, setAdDate] = useState(new Date().toISOString().split('T')[0]);
  const [bsYear, setBsYear] = useState('');
  const [bsMonth, setBsMonth] = useState('');
  const [bsDay, setBsDay] = useState('');
  const [convertedAd, setConvertedAd] = useState('');
  const [convertedBs, setConvertedBs] = useState('');
  const [error, setError] = useState('');
  const [useNepaliScript, setUseNepaliScript] = useState(false);

  const handleAdToBs = () => {
    try {
      setError('');
      const date = new Date(adDate);
      const bs = adToBs(date);
      setConvertedBs(`${bs.year} ${nepaliMonthsEng[bs.month - 1]} ${bs.day}`);
      setBsYear(bs.year.toString());
      setBsMonth(bs.month.toString());
      setBsDay(bs.day.toString());
    } catch (err) {
      setError('Invalid AD date');
    }
  };

  const handleBsToAd = () => {
    try {
      setError('');
      const year = parseInt(bsYear);
      const month = parseInt(bsMonth);
      const day = parseInt(bsDay);

      if (!isValidBsDate(year, month, day)) {
        setError('Invalid BS date');
        return;
      }

      const ad = bsToAd({ year, month, day });
      setConvertedAd(ad.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      }));
      setAdDate(ad.toISOString().split('T')[0]);
    } catch (err) {
      setError('Invalid BS date or out of range');
    }
  };

  const handleCalendarDateSelect = (year: number, month: number, day: number) => {
    setBsYear(year.toString());
    setBsMonth(month.toString());
    setBsDay(day.toString());
    
    // Auto convert
    try {
      const ad = bsToAd({ year, month, day });
      setConvertedAd(ad.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      }));
      setAdDate(ad.toISOString().split('T')[0]);
      setConvertedBs(`${year} ${nepaliMonthsEng[month - 1]} ${day}`);
      setError('');
    } catch (err) {
      setError('Error converting selected date');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Date Converter & Calendar</h1>
          <p className="text-muted-foreground">Convert between AD (Gregorian) and BS (Bikram Sambat) dates</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUseNepaliScript(!useNepaliScript)}
        >
          <Languages className="h-4 w-4 mr-2" />
          {useNepaliScript ? 'English' : 'नेपाली'}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <Tabs defaultValue="converter" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="converter">Date Converter</TabsTrigger>
          <TabsTrigger value="calendar">Nepali Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="converter" className="space-y-6 mt-6">
          <div className="grid md:grid-cols-2 gap-6">
        {/* AD to BS Converter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              AD to BS Converter
            </CardTitle>
            <CardDescription>Convert Gregorian (AD) date to Bikram Sambat (BS)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ad-date">AD Date (Gregorian)</Label>
              <Input
                id="ad-date"
                type="date"
                value={adDate}
                onChange={(e) => setAdDate(e.target.value)}
                min="1943-04-14"
                max="2043-04-13"
              />
            </div>

            <Button onClick={handleAdToBs} className="w-full">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Convert to BS
            </Button>

            {convertedBs && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">BS Date (Bikram Sambat)</p>
                <p className="text-xl font-bold text-primary">{convertedBs}</p>
                <Badge variant="outline" className="mt-2">विक्रम संवत्</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* BS to AD Converter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              BS to AD Converter
            </CardTitle>
            <CardDescription>Convert Bikram Sambat (BS) date to Gregorian (AD)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="bs-year">Year</Label>
                <Input
                  id="bs-year"
                  type="number"
                  placeholder="2081"
                  value={bsYear}
                  onChange={(e) => setBsYear(e.target.value)}
                  min="2000"
                  max="2100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bs-month">Month</Label>
                <Input
                  id="bs-month"
                  type="number"
                  placeholder="1-12"
                  value={bsMonth}
                  onChange={(e) => setBsMonth(e.target.value)}
                  min="1"
                  max="12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bs-day">Day</Label>
                <Input
                  id="bs-day"
                  type="number"
                  placeholder="1-32"
                  value={bsDay}
                  onChange={(e) => setBsDay(e.target.value)}
                  min="1"
                  max="32"
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Month names: {nepaliMonthsEng.slice(0, 6).join(', ')}, etc.
            </div>

            <Button onClick={handleBsToAd} className="w-full">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Convert to AD
            </Button>

            {convertedAd && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">AD Date (Gregorian)</p>
                <p className="text-xl font-bold text-primary">{convertedAd}</p>
                <Badge variant="outline" className="mt-2">Anno Domini</Badge>
              </div>
            )}
          </CardContent>
        </Card>
          </div>

          {/* Quick Reference */}
          <Card>
            <CardHeader>
              <CardTitle>Nepali Month Reference</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {nepaliMonthsEng.map((month, index) => (
                  <div key={index} className="p-2 bg-muted rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Month {index + 1}</p>
                    <p className="font-semibold">{month}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <NepaliCalendar 
                useNepaliScript={useNepaliScript}
                onDateSelect={handleCalendarDateSelect}
              />
            </div>

            <div className="space-y-6">
              {/* Selected Date Info */}
              {(bsYear && bsMonth && bsDay) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Selected Date</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Bikram Sambat (BS)</Label>
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="font-bold text-primary">
                          {bsYear} {nepaliMonthsEng[parseInt(bsMonth) - 1]} {bsDay}
                        </p>
                        <Badge variant="outline" className="mt-1">विक्रम संवत्</Badge>
                      </div>
                    </div>

                    {convertedAd && (
                      <div className="space-y-2">
                        <Label>Gregorian (AD)</Label>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="font-semibold">{convertedAd}</p>
                          <Badge variant="outline" className="mt-1">Anno Domini</Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">About Nepali Calendar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    The Nepali calendar (Bikram Sambat) is approximately 56 years and 8.5 months ahead of the Gregorian calendar.
                  </p>
                  <p>
                    Each month can have 29 to 32 days, varying each year. Saturday is the weekly holiday in Nepal.
                  </p>
                  <div className="pt-2 border-t mt-4">
                    <p className="font-semibold text-foreground mb-1">Color Legend:</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary rounded" />
                        <span>Today's date</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-red-50 dark:bg-red-900/20 border rounded" />
                        <span>Public holidays & festivals</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center font-bold text-blue-600">S</span>
                        <span>Saturday (weekly holiday)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
