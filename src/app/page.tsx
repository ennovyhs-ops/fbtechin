'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle, Search, Calendar, ChevronDown, ChevronUp, Download, TrendingUp, TrendingDown, Minus, Scale } from 'lucide-react';
import { useDebounce } from 'use-debounce';

import type { MarketData, SearchResult } from '@/lib/types';
import { fetchMarketData, getApiKey, searchSymbols } from '@/app/actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Header } from '@/components/header';
import { MarketDataTable } from '@/components/market-data-table';
import { SuggestedQuestions } from '@/components/suggested-questions';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const FormSchema = z.object({
  ticker: z.string().min(1, 'Ticker symbol is required.').max(10, 'Ticker symbol is too long.').toUpperCase(),
});

export default function Home() {
  const [isPending, startTransition] = useTransition();
  const [marketData, setMarketData] = useState<MarketData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedTicker, setSubmittedTicker] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = useState(false);

  useEffect(() => {
    getApiKey().then(setApiKey);
  }, []);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      ticker: '',
    },
  });

  const { watch, setValue } = form;
  const tickerValue = watch('ticker');

  useEffect(() => {
    setSearchQuery(tickerValue);
  }, [tickerValue]);

  useEffect(() => {
    if (debouncedSearchQuery && debouncedSearchQuery.length > 1) {
      setIsSearching(true);
      setIsSearchPopoverOpen(true);
      searchSymbols(debouncedSearchQuery, apiKey).then(result => {
        if (result.data) {
          setSearchResults(result.data);
        }
        setIsSearching(false);
      });
    } else {
      setSearchResults([]);
      setIsSearchPopoverOpen(false);
    }
  }, [debouncedSearchQuery, apiKey]);

  const handleSelectSuggestion = (symbol: string) => {
    setValue('ticker', symbol);
    setIsSearchPopoverOpen(false);
    setSearchResults([]);
    form.handleSubmit(onSubmit)();
  };

  async function onSubmit(values: z.infer<typeof FormSchema>) {
    setError(null);
    setMarketData(null);
    setSubmittedTicker(null);
    setIsHistoryExpanded(false);
    setIsSearchPopoverOpen(false);
    setSearchResults([]);

    startTransition(async () => {
      const result = await fetchMarketData(values.ticker, apiKey);
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
  const isForex = submittedTicker && isCurrencyPair(submittedTicker);


  return (
    <main className="container mx-auto px-4 py-8">
      <Header />
      <div className="max-w-4xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Search Market Data</CardTitle>
            <CardDescription>Enter a stock ticker or currency pair to retrieve end-of-day market data.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent>
                <FormField
                  control={form.control}
                  name="ticker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticker Symbol / Currency Pair</FormLabel>
                       <Popover open={isSearchPopoverOpen} onOpenChange={setIsSearchPopoverOpen}>
                        <PopoverTrigger asChild>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <FormControl>
                              <Input placeholder="e.g., GOOG, 0005.HK, EURUSD" className="pl-10" {...field} autoComplete="off" />
                            </FormControl>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          {isSearching && (
                            <div className="p-4 text-sm text-muted-foreground flex items-center">
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Searching...
                            </div>
                          )}
                          {searchResults.length > 0 && !isSearching && (
                            <ul className="max-h-60 overflow-y-auto">
                              {searchResults.map((result) => (
                                <li
                                  key={result.symbol}
                                  className="p-3 hover:bg-accent cursor-pointer"
                                  onClick={() => handleSelectSuggestion(result.symbol)}
                                  onMouseDown={(e) => e.preventDefault()}
                                >
                                  <div className="font-semibold">{result.symbol}</div>
                                  <div className="text-sm text-muted-foreground truncate">{result.name}</div>
                                  <div className="text-xs text-muted-foreground">{result.region} - {result.type}</div>
                                </li>
                              ))}
                            </ul>
                          )}
                           {!isSearching && debouncedSearchQuery.length > 1 && searchResults.length === 0 && (
                              <div className="p-4 text-sm text-muted-foreground">
                                No results found.
                              </div>
                            )}
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isPending || !apiKey}>
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
               <CardDescription className="flex items-center gap-2 text-sm pt-1">
                 <Calendar className="h-4 w-4" />
                 <span>As of {new Date(latestData.date).toDateString()}</span>
               </CardDescription>
             </CardHeader>
             <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex items-end gap-2">
                      <p className="text-4xl md:text-5xl font-bold text-primary">{isForex ? '' : '$'}{latestData.close}</p>
                      <p className="text-lg text-muted-foreground font-medium pb-1">Close</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <Minus className="text-muted-foreground h-5 w-5" />
                        <div>
                            <p className="text-muted-foreground">Open</p>
                            <p className="font-semibold">{isForex ? '' : '$'}{latestData.open}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="text-muted-foreground h-5 w-5" />
                        <div>
                            <p className="text-muted-foreground">High</p>
                            <p className="font-semibold">{isForex ? '' : '$'}{latestData.high}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <TrendingDown className="text-muted-foreground h-5 w-5" />
                        <div>
                            <p className="text-muted-foreground">Low</p>
                            <p className="font-semibold">{isForex ? '' : '$'}{latestData.low}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Scale className="text-muted-foreground h-5 w-5" />
                        <div>
                            <p className="text-muted-foreground">Volume</p>
                            <p className="font-semibold">{Number(latestData.volume).toLocaleString()}</p>
                        </div>
                    </div>
                  </div>
                </div>
             </CardContent>
             <CardFooter>
                <Collapsible open={isHistoryExpanded} onOpenChange={setIsHistoryExpanded} className="w-full">
                    <div className="flex flex-col sm:flex-row items-start gap-2">
                        <CollapsibleTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto">
                                {isHistoryExpanded ? 'Hide' : 'Show'} Full History
                                {isHistoryExpanded ? <ChevronUp className="ml-2" /> : <ChevronDown className="ml-2" />}
                            </Button>
                        </CollapsibleTrigger>
                        <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto">
                            CSV Export
                            <Download className="ml-2" />
                        </Button>
                    </div>
                    <CollapsibleContent className="w-full mt-4">
                        {marketData && marketData.length > 0 && (
                            <div className="animate-in fade-in-50 duration-500">
                                <MarketDataTable data={marketData} ticker={submittedTicker} />
                            </div>
                        )}
                    </CollapsibleContent>
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
