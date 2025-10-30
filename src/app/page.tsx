'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle, Search, Calendar, ChevronDown, ChevronUp, Download } from 'lucide-react';

import type { MarketData } from '@/lib/types';
import { fetchMarketData } from '@/app/actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Header } from '@/components/header';
import { MarketDataTable } from '@/components/market-data-table';
import { SuggestedQuestions } from '@/components/suggested-questions';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const FormSchema = z.object({
  ticker: z.string().min(1, 'Ticker symbol is required.').max(10, 'Ticker symbol is too long.').toUpperCase(),
});

export default function Home() {
  const [isPending, startTransition] = useTransition();
  const [marketData, setMarketData] = useState<MarketData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedTicker, setSubmittedTicker] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      ticker: '',
    },
  });

  async function onSubmit(values: z.infer<typeof FormSchema>) {
    setError(null);
    setMarketData(null);
    setSubmittedTicker(null);
    setIsHistoryExpanded(false);

    startTransition(async () => {
      const result = await fetchMarketData(values.ticker);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setMarketData(result.data);
        setSubmittedTicker(values.ticker);
      }
    });
  }
  
  const handleExport = () => {
    if (!marketData || !submittedTicker) return;

    const headers = ['date', 'open', 'high', 'low', 'close', 'volume'];
    const csvContent = [
      headers.join(','),
      ...marketData.map(row => 
        [row.date, row.open, row.high, row.low, row.close, row.volume].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${submittedTicker}_history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const latestData = marketData?.[0];

  return (
    <main className="container mx-auto px-4 py-8">
      <Header />
      <div className="max-w-4xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Search Stock Data</CardTitle>
            <CardDescription>Enter a stock ticker symbol to retrieve end-of-day market data.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent>
                <FormField
                  control={form.control}
                  name="ticker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticker Symbol</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="e.g., AAPL, MSFT, 0005.HK" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isPending ? 'Retrieving Data...' : 'Get Data'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <div className="mt-8 space-y-8">
          {isPending && (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {latestData && submittedTicker && (
             <Card className="animate-in fade-in-50 duration-500">
             <CardHeader>
               <CardTitle className="font-headline text-2xl">
                 Latest Price for {submittedTicker}
               </CardTitle>
               <CardDescription className="flex items-center gap-2 text-sm">
                 <Calendar className="h-4 w-4" />
                 <span>As of {new Date(latestData.date).toDateString()}</span>
               </CardDescription>
             </CardHeader>
             <CardContent>
                <div className="flex items-end gap-2">
                    <p className="text-4xl font-bold text-primary">${latestData.close}</p>
                    <p className="text-lg text-muted-foreground">USD</p>
                </div>
             </CardContent>
             <CardFooter>
                <Collapsible open={isHistoryExpanded} onOpenChange={setIsHistoryExpanded} className="w-full">
                    <div className="flex flex-col items-start gap-4">
                        <div className="flex gap-2">
                            <CollapsibleTrigger asChild>
                                <Button variant="outline">
                                    {isHistoryExpanded ? 'Hide' : 'Show'} Full History
                                    {isHistoryExpanded ? <ChevronUp className="ml-2" /> : <ChevronDown className="ml-2" />}
                                </Button>
                            </CollapsibleTrigger>
                            <Button variant="outline" onClick={handleExport}>
                                CSV Export
                                <Download className="ml-2" />
                            </Button>
                        </div>
                        <CollapsibleContent className="w-full">
                            {marketData && marketData.length > 0 && (
                                <div className="animate-in fade-in-50 duration-500">
                                    <MarketDataTable data={marketData} ticker={submittedTicker} />
                                </div>
                            )}
                        </CollapsibleContent>
                    </div>
                </Collapsible>
             </CardFooter>
           </Card>
          )}
          
          {submittedTicker && marketData && marketData.length > 0 && (
            <div className="animate-in fade-in-50 duration-500 delay-200">
                <SuggestedQuestions ticker={submittedTicker} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
