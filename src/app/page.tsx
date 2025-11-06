
'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle, Calendar, ChevronDown, ChevronUp, Download, TrendingUp, TrendingDown, Minus, Scale, Activity, BrainCircuit, Zap, Info, Lightbulb } from 'lucide-react';

import type { MarketData, RsiData, MacdData, BbandsData, RocData } from '@/lib/types';
import { fetchMarketData, getApiKey, calculateAllIndicators } from '@/app/actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Header } from '@/components/header';
import { MarketDataTable } from '@/components/market-data-table';
import { SuggestedQuestions } from '@/components/suggested-questions';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { isCurrencyPair, isCryptoPair, parseApiLimit, formatCurrency } from '@/lib/utils';
import { TechnicalIndicators } from '@/components/technical-indicators';
import { StockAnalysis } from '@/components/stock-analysis';
import { OptionStrategies } from '@/components/option-strategies';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { AnalyzeStockMomentumOutput } from '@/ai/flows/analyze-stock-momentum';


const FormSchema = z.object({
  ticker: z.string().min(1, 'Ticker symbol is required.').max(20, 'Ticker symbol is too long.'),
});

export default function Home() {
  const [isPending, startTransition] = useTransition();
  const [marketData, setMarketData] = useState<MarketData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedTicker, setSubmittedTicker] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);

  const [indicatorData, setIndicatorData] = useState<{rsi: RsiData[], macd: MacdData[], bbands: BbandsData[], roc: RocData[]} | null>(null);
  const [indicatorsLoading, setIndicatorsLoading] = useState(false);
  const [indicatorsError, setIndicatorsError] = useState<string|null>(null);
  
  const [analysisResult, setAnalysisResult] = useState<AnalyzeStockMomentumOutput | null>(null);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      ticker: '',
    },
  });
  
  const onSubmit = useCallback(async (values: z.infer<typeof FormSchema>) => {
    setError(null);
    setMarketData(null);
    setSubmittedTicker(null);
    setIsHistoryExpanded(false);
    setIndicatorData(null);
    setIndicatorsError(null);
    setAnalysisResult(null);
    setCurrency(null);

    startTransition(async () => {
      const result = await fetchMarketData(values.ticker.toUpperCase());
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setMarketData(result.data);
        setSubmittedTicker(values.ticker.toUpperCase());
        setCurrency(result.currency || null);
        
        const isForexOrCrypto = isCurrencyPair(values.ticker) || isCryptoPair(values.ticker);
        if (!isForexOrCrypto) {
            setIndicatorsLoading(true);
            const indicatorsResult = await calculateAllIndicators(result.data);
            if (indicatorsResult.error) {
              setIndicatorsError(indicatorsResult.error);
            } else {
              setIndicatorData({
                rsi: indicatorsResult.rsi || [],
                macd: indicatorsResult.macd || [],
                bbands: indicatorsResult.bbands || [],
                roc: indicatorsResult.roc || [],
              });
            }
            setIndicatorsLoading(false);
        } else {
            setIndicatorData({ rsi: [], macd: [], bbands: [], roc: [] });
        }
      }
    });
  }, []);

  useEffect(() => {
    getApiKey().then(key => {
        setApiKey(key);
    });
  }, []);
  
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

  const showSkeleton = !isPending && !marketData && !error && !submittedTicker;

  const apiLimitMessage = error ? parseApiLimit(error) : null;
  const isApiLimitError = !!apiLimitMessage;

  const isApiInfoNote = error && error.includes('Thank you for using Alpha Vantage!');


  return (
    <main className="container mx-auto px-4 py-8">
      <Header />
      <div className="max-w-4xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Search Market Data</CardTitle>
            <CardDescription>Enter a stock ticker, currency pair or crypto symbol to retrieve end-of-day market data.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent>
                <FormField
                  control={form.control}
                  name="ticker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticker Symbol / Currency Pair / Crypto</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., GOOG, 0005.HK, EURUSD, BTCUSD" {...field} autoComplete="off" onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex items-center gap-2">
                <Button type="submit" disabled={isPending || !apiKey}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isPending ? 'Retrieving Data...' : 'Get Data'}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                     <Button variant="outline">
                      Data Sources
                      <Info className="ml-2" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Our Data Source</DialogTitle>
                      <DialogDescription>
                        This application retrieves all financial data from a single provider to ensure consistency.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-sm">
                      <p>
                        <strong>Primary Data Source:</strong> All end-of-day stock data, forex rates, cryptocurrency prices, and technical indicators are sourced from the <a href="https://www.alphavantage.co/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Alpha Vantage API</a>.
                      </p>
                       <p>
                        <strong>Ticker Symbols:</strong> Ticker symbols also follow Alpha Vantage's conventions. If you are unsure of a symbol, you can use their <a href="https://www.alphavantage.co/symbol_search" target="_blank" rel="noopener noreferrer" className="text-primary underline">official search tool</a> to find the correct one (e.g., "GOOGL" for Google, or "0005.HK" for HSBC).
                      </p>
                      <p>
                        A free API key is used for this service, which has a limit of 25 requests per day.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
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
            <Alert variant={isApiLimitError || isApiInfoNote ? 'default' : 'destructive'}>
              <AlertCircle className="h-4 w-4" />
              {isApiLimitError ? 
                <AlertTitle>{apiLimitMessage}</AlertTitle> : 
                <>
                  <AlertTitle>{isApiInfoNote ? 'API Information' : 'Error'}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </>
              }
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
                  <div className="flex flex-col sm:flex-row sm:items-end sm:gap-2">
                      <p className="text-4xl md:text-5xl font-bold text-foreground">{formatCurrency(latestData.close, currency)}</p>
                      <p className="text-lg text-muted-foreground font-medium sm:pb-1">Close</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <Minus className="text-muted-foreground h-5 w-5" />
                        <div>
                            <p className="text-muted-foreground">Open</p>
                            <p className="font-semibold">{formatCurrency(latestData.open, currency)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="text-muted-foreground h-5 w-5" />
                        <div>
                            <p className="text-muted-foreground">High</p>
                            <p className="font-semibold">{formatCurrency(latestData.high, currency)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <TrendingDown className="text-muted-foreground h-5 w-5" />
                        <div>
                            <p className="text-muted-foreground">Low</p>
                            <p className="font-semibold">{formatCurrency(latestData.low, currency)}</p>
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
                                {isHistoryExpanded ? 'Hide' : 'Show'} 2-Year History
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
                                <MarketDataTable data={marketData} ticker={submittedTicker} currency={currency} />
                            </div>
                        )}
                    </CollapsibleContent>
                </Collapsible>
             </CardFooter>
           </Card>
          )}

          {submittedTicker && !isPending && (
            <StockAnalysis 
              ticker={submittedTicker} 
              marketData={marketData}
              onAnalysisComplete={setAnalysisResult}
            />
          )}

          {analysisResult && analysisResult.signal !== 'N/A' && latestData && (
            <OptionStrategies 
                ticker={submittedTicker!} 
                analysis={analysisResult}
                latestClose={latestData.close}
            />
          )}

          {submittedTicker && (
            <TechnicalIndicators 
                ticker={submittedTicker}
                data={indicatorData}
                loading={indicatorsLoading}
                error={indicatorsError}
                currency={currency}
            />
          )}
          
          {submittedTicker && marketData && marketData.length > 0 && (
            <div className="animate-in fade-in-50 duration-500 delay-200">
                <SuggestedQuestions ticker={submittedTicker} />
            </div>
          )}

          {showSkeleton && (
            <div className="space-y-8 animate-pulse">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">
                            <div className="h-8 w-48 bg-muted/80 rounded-md"></div>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 text-sm pt-1">
                            <Calendar className="h-4 w-4" />
                            <div className="h-5 w-32 bg-muted/80 rounded-md"></div>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col sm:flex-row sm:items-end sm:gap-2">
                                <div className="h-12 w-32 bg-muted/80 rounded-md"></div>
                                <div className="h-6 w-16 bg-muted/80 rounded-md sm:pb-1"></div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                <div className="h-10 w-24 bg-muted/80 rounded-md"></div>
                                <div className="h-10 w-24 bg-muted/80 rounded-md"></div>
                                <div className="h-10 w-24 bg-muted/80 rounded-md"></div>
                                <div className="h-10 w-24 bg-muted/80 rounded-md"></div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                       <div className="h-10 w-36 bg-muted/80 rounded-md"></div>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                            <Zap className="h-6 w-6 text-muted-foreground" />
                            <span>Calculated Momentum Score</span>
                        </CardTitle>
                        <CardDescription>A proprietary score based on ROC, Bollinger Bands, RSI, MACD, and Volume analysis.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-24 bg-muted/80 rounded-md"></CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                          <Lightbulb className="h-6 w-6 text-muted-foreground" />
                          <span>Option Strategy Ideas</span>
                        </CardTitle>
                        <CardDescription>
                          Option strategies based on the momentum score will appear here.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                         <div className="space-y-4">
                            <div className="h-12 w-full bg-muted/80 rounded-md"></div>
                            <div className="h-12 w-full bg-muted/80 rounded-md"></div>
                         </div>
                      </CardContent>
                </Card>

                <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                            <Activity className="h-6 w-6 text-muted-foreground" />
                            <span>Technical Indicators</span>
                        </CardTitle>
                        <CardDescription>Latest calculated values based on daily data.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="h-10 w-full bg-muted/80 rounded-md"></div>
                        <div className="h-10 w-full bg-muted/80 rounded-md"></div>
                        <div className="h-10 w-full bg-muted/80 rounded-md"></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                          <BrainCircuit className="h-6 w-6 text-muted-foreground" />
                          <span>Suggested Exploration</span>
                        </CardTitle>
                        <CardDescription>
                          AI-powered suggestions for your next query will appear here.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                         <div className="flex flex-wrap gap-2">
                            <div className="h-9 w-48 bg-muted/80 rounded-md"></div>
                            <div className="h-9 w-56 bg-muted/80 rounded-md"></div>
                            <div className="h-9 w-64 bg-muted/80 rounded-md"></div>
                         </div>
                      </CardContent>
                </Card>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

    

    