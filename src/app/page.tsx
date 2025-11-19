
'use client';

import { useState, useTransition, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle, Calendar, ChevronDown, ChevronUp, Download, TrendingUp, TrendingDown, Minus, Scale, Activity, BrainCircuit, Zap, Info, Lightbulb, Globe, Newspaper, HelpCircle, Target, Upload } from 'lucide-react';

import type { MarketData, RsiData, MacdData, BbandsData, RocData, IndicatorPeriods } from '@/lib/types';
import { fetchMarketData } from '@/app/actions';
import { calculateBollingerBands, calculateMACD, calculateRSI, calculateROC } from '@/lib/technical-analysis';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
import { NewsAnalysis } from '@/components/news-analysis';
import { Input } from '@/components/ui/input';


const FormSchema = z.object({
  ticker: z.string().min(1, 'Ticker symbol is required.').max(20, 'Ticker symbol is too long.'),
});

const defaultPeriods: IndicatorPeriods = {
  roc: 22,
  rsi: 14,
  macd: { fast: 12, slow: 26, signal: 9 },
  bbands: { period: 20, stdDev: 2 },
};

export default function Home() {
  const [isPending, startTransition] = useTransition();
  const [marketData, setMarketData] = useState<MarketData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedTicker, setSubmittedTicker] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [currency, setCurrency] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);

  const [indicatorData, setIndicatorData] = useState<{rsi: RsiData[], macd: MacdData[], bbands: BbandsData[], roc: RocData[]} | null>(null);
  const [indicatorsLoading, setIndicatorsLoading] = useState(false);
  const [indicatorsError, setIndicatorsError] = useState<string|null>(null);
  
  const [analysisResult, setAnalysisResult] = useState<AnalyzeStockMomentumOutput | null>(null);
  
  const [indicatorPeriods, setIndicatorPeriods] = useState<IndicatorPeriods>(defaultPeriods);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);


  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      ticker: '',
    },
  });

  const calculateIndicators = useCallback((data: MarketData[], periods: IndicatorPeriods) => {
    setIndicatorsLoading(true);
    setIndicatorsError(null);
    try {
        const closePrices = data.map(d => parseFloat(d.close)).reverse(); // Reverse for chronological order
        
        const rsi = calculateRSI(closePrices, periods.rsi);
        const macd = calculateMACD(closePrices, periods.macd.fast, periods.macd.slow, periods.macd.signal);
        const bbands = calculateBollingerBands(closePrices, periods.bbands.period, periods.bbands.stdDev);
        const roc = calculateROC(closePrices, periods.roc);

        const formatNumber = (num: number | null | undefined, precision: number = 2): string | null => {
            if (num === null || num === undefined || isNaN(num)) return null;
            return num.toFixed(precision);
        };
        
        // Combine into dated results, reversing back to descending order
        const dates = data.map(d => d.date);
        
        setIndicatorData({
            rsi: rsi.reverse().map((val, i) => ({ date: dates[i], RSI: formatNumber(val) })),
            macd: macd.reverse().map((val, i) => ({ 
                date: dates[i],
                MACD: formatNumber(val.MACD),
                MACD_Signal: formatNumber(val.signal),
                MACD_Hist: formatNumber(val.histogram)
            })),
            bbands: bbands.reverse().map((val, i) => ({
                date: dates[i],
                'Real Upper Band': formatNumber(val.upper),
                'Real Middle Band': formatNumber(val.middle),
                'Real Lower Band': formatNumber(val.lower)
            })),
             roc: roc.reverse().map((val, i) => ({ date: dates[i], ROC: formatNumber(val) })),
        });
    } catch (e: any) {
        setIndicatorsError(e.message || 'Failed to calculate indicators.');
        setIndicatorData(null);
    }
    setIndicatorsLoading(false);
  }, []);

  const resetState = () => {
    setError(null);
    setMarketData(null);
    setSubmittedTicker(null);
    setIsHistoryExpanded(false);
    setIndicatorData(null);
    setIndicatorsError(null);
    setAnalysisResult(null);
    setCurrency(null);
    setRegion(null);
    setIndicatorPeriods(defaultPeriods);
    setUploadedFileName(null);
  };
  
  const onSubmit = useCallback(async (values: z.infer<typeof FormSchema>) => {
    resetState();

    startTransition(async () => {
      const ticker = values.ticker.toUpperCase();
      setSubmittedTicker(ticker); 

      const marketResult = await fetchMarketData(ticker);
      
      if (marketResult.error) {
        setError(marketResult.error);
        setSubmittedTicker(null);
        return;
      } 
      
      if (marketResult.data) {
        setMarketData(marketResult.data);
        setCurrency(marketResult.currency || null);
        setRegion(marketResult.region || null);
        
        const isForexOrCrypto = isCurrencyPair(values.ticker) || isCryptoPair(values.ticker);
        if (!isForexOrCrypto) {
            calculateIndicators(marketResult.data, defaultPeriods);
        } else {
            setIndicatorData({ rsi: [], macd: [], bbands: [], roc: [] });
        }
      }
    });
  }, [calculateIndicators]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetState();
    setUploadedFileName(file.name);

    startTransition(async () => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result;
            if (typeof text !== 'string') {
                setError('Failed to read the file.');
                return;
            }

            try {
                const lines = text.split('\n').filter(line => line.trim() !== '');
                if (lines.length < 2) {
                    setError('CSV file must contain a header row and at least one data row.');
                    return;
                }
                
                const headerLine = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
                const headerMap: { [key: string]: number } = {};
                
                const requiredHeaders = ['date', 'close'];
                const optionalHeaders = ['open', 'high', 'low', 'volume'];

                const missingHeaders = requiredHeaders.filter(h => !headerLine.includes(h));
                if (missingHeaders.length > 0) {
                     throw new Error(`CSV file is missing required header(s): ${missingHeaders.join(', ')}. Optional headers are: open, high, low, volume.`);
                }
                
                [...requiredHeaders, ...optionalHeaders].forEach(header => {
                    headerMap[header] = headerLine.indexOf(header); // Will be -1 if not found
                });
                
                const data: MarketData[] = lines.slice(1).map((line, index) => {
                    const values = line.split(',');
                    const closeValue = values[headerMap['close']];
                     if (!closeValue || !values[headerMap['date']]) {
                        throw new Error(`Row ${index + 2} is missing required data for date or close.`);
                    }
                    return {
                        date: values[headerMap['date']],
                        close: closeValue,
                        open: headerMap['open'] !== -1 ? values[headerMap['open']] : closeValue,
                        high: headerMap['high'] !== -1 ? values[headerMap['high']] : closeValue,
                        low: headerMap['low'] !== -1 ? values[headerMap['low']] : closeValue,
                        volume: headerMap['volume'] !== -1 ? values[headerMap['volume']] : '0',
                    };
                }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Ensure descending order

                if(data.length === 0) {
                    setError('CSV file is empty or in an invalid format.');
                    return;
                }
                
                const tickerFromFile = file.name.split(/[\._\s]/)[0].toUpperCase();
                form.setValue('ticker', tickerFromFile);
                setSubmittedTicker(tickerFromFile);
                
                setMarketData(data);
                setCurrency('USD'); // Assume USD for CSV uploads
                setRegion('Uploaded Data');
                
                calculateIndicators(data, defaultPeriods);

            } catch (err: any) {
                setError(`Error parsing CSV: ${err.message}.`);
            }
        };
        reader.readAsText(file);
    });

    // Reset file input to allow re-uploading the same file
    event.target.value = '';
  };
  
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

  const onPeriodsChange = (newPeriods: IndicatorPeriods) => {
    setIndicatorPeriods(newPeriods);
    if (submittedTicker && marketData) {
      calculateIndicators(marketData, newPeriods);
    }
  }

  const latestData = marketData?.[0];

  const showInitialSkeleton = isPending && !marketData;

  const apiLimitMessage = error ? parseApiLimit(error) : null;
  const isApiLimitError = !!apiLimitMessage;

  const isApiInfoNote = error && error.includes('Thank you for using Alpha Vantage!');


  return (
    <main className="container mx-auto px-4 py-8">
      <Header />
      <div className="max-w-4xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Search or Upload Market Data</CardTitle>
            <CardDescription>Enter a symbol to fetch live data, or upload a CSV file with historical data.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent>
                  <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                    <div className="flex-grow w-full">
                       <FormField
                          control={form.control}
                          name="ticker"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ticker Symbol / Currency Pair / Crypto</FormLabel>
                               <FormControl>
                                  <Input
                                    placeholder="e.g., AAPL, EURUSD, 0700.HK"
                                    autoComplete="off"
                                    {...field}
                                    onInput={(e) => {
                                        field.onChange(e.currentTarget.value.toUpperCase())
                                    }}
                                  />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                         <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".csv"
                            className="hidden"
                        />
                        <div className="w-full">
                             <p className="text-xs text-muted-foreground mb-1 text-center">
                                CSV: 'date' & 'close' required. 'open', 'high', 'low', 'volume' optional.
                            </p>
                            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isPending} className="w-full">
                                <Upload className="mr-2 h-4 w-4" />
                                {uploadedFileName ? 'New CSV' : 'Upload CSV'}
                            </Button>
                        </div>
                   </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending && !uploadedFileName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isPending && !uploadedFileName ? 'Retrieving Data...' : 'Get Data'}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                     <Button type="button" variant="outline">
                      How It Works
                      <HelpCircle className="ml-2" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Application Guide</DialogTitle>
                      <DialogDescription>
                        This guide explains the app's features and how it uses AI to provide financial insights.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-sm overflow-y-auto pr-4">
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Data Input & Indicator Calculation</h3>
                        <p className="text-muted-foreground">
                            You can fetch live market data from Alpha Vantage by entering a ticker, or upload your own data via a CSV file. For better AI suggestions, name your file with the ticker (e.g., "SPY.csv"). The file must have 'date' and 'close' columns; 'open', 'high', 'low', and 'volume' are optional.
                        </p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">API Usage</h3>
                        <p className="text-muted-foreground">
                          A free Alpha Vantage API key is used. Clicking "Get Data" for any stock, forex, or crypto pair now uses only **1 API request**. Uploading a CSV uses **0 requests**.
                        </p>
                      </div>
                       <div>
                        <h3 className="font-semibold text-foreground mb-2">On-Demand News Analysis</h3>
                        <p className="text-muted-foreground">
                          To conserve your API quota, news is not fetched automatically. You can load news and generate an AI impact analysis by clicking the **"Load News & Analysis"** button, which costs **1 additional API request**.
                        </p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">AI-Powered Analysis</h3>
                         <ul className="list-disc pl-5 mt-2 space-y-2 text-muted-foreground">
                          <li><span className="font-semibold text-foreground">AI Momentum Score:</span> A proprietary score (-1.0 to +1.0) calculated using multiple technical indicators to provide a single, clear momentum signal.</li>
                          <li><span className="font-semibold text-foreground">AI Price Target:</span> A projected price target based on the momentum score and recent volatility.</li>
                          <li><span className="font-semibold text-foreground">AI Option Strategies:</span> Based on the momentum score, the AI suggests suitable option strategies with a rationale.</li>
                          <li><span className="font-semibold text-foreground">AI News Impact:</span> When you load news, the AI analyzes the articles to provide a summary and a predicted impact (Bullish, Bearish, or Neutral).</li>
                        </ul>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Customizable Indicators</h3>
                        <p className="text-muted-foreground">
                          You can freely adjust the periods for ROC, RSI, MACD, and Bollinger Bands. Clicking "Update" re-calculates all indicators in your browser instantly.
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild>
                     <Button type="button" variant="outline">
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
                      <div>
                        <p><strong>Ticker Examples:</strong> If you are unsure of a symbol, you can use <a href="https://finance.yahoo.com/lookup" target="_blank" rel="noopener noreferrer" className="text-primary underline">a tool like Yahoo Finance</a> to find the correct one. Here are some examples:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                          <li><span className="font-semibold text-foreground">US Stock:</span> <code className="bg-muted px-1.5 py-0.5 rounded-sm">AAPL</code> (Apple Inc.)</li>
                          <li><span className="font-semibold text-foreground">International Stock:</span> <code className="bg-muted px-1.5 py-0.5 rounded-sm">0700.HK</code> (Tencent)</li>
                          <li><span className="font-semibold text-foreground">Forex Pair:</span> <code className="bg-muted px-1.5 py-0.5 rounded-sm">EURUSD</code> (Euro to US Dollar)</li>
                          <li><span className="font-semibold text-foreground">Cryptocurrency:</span> <code className="bg-muted px-1.5 py-0.5 rounded-sm">BTCUSD</code> (Bitcoin to US Dollar)</li>
                        </ul>
                      </div>
                      <p>
                        A free API key is used for this service, which has a limit of 25 requests per day. Each full analysis uses multiple requests.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <div className="mt-8 space-y-8">
          {isPending && !marketData && (
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground pt-1">
                   <div className="flex items-center gap-2">
                     <Calendar className="h-4 w-4" />
                     <span>As of {new Date(latestData.date).toDateString()}</span>
                   </div>
                   {region && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <span>{region}</span>
                      </div>
                   )}
                </div>
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
                                {isHistoryExpanded ? 'Hide' : 'Show'} History
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

          {submittedTicker && marketData && (
            <StockAnalysis 
              ticker={submittedTicker} 
              marketData={marketData}
              onAnalysisComplete={setAnalysisResult}
              currency={currency}
            />
          )}

          {analysisResult && analysisResult.signal !== 'N/A' && latestData && marketData && (
            <OptionStrategies 
                ticker={submittedTicker!} 
                analysis={analysisResult}
                latestClose={latestData.close}
                marketData={marketData}
            />
          )}
          
          {submittedTicker && (
            <TechnicalIndicators 
                ticker={submittedTicker}
                data={indicatorData}
                loading={indicatorsLoading}
                error={indicatorsError}
                currency={currency}
                periods={indicatorPeriods}
                onPeriodsChange={onPeriodsChange}
            />
          )}

          {submittedTicker && !uploadedFileName && (
            <NewsAnalysis 
                ticker={submittedTicker}
            />
           )}
          
          {submittedTicker && (
            <div className="animate-in fade-in-50 duration-500 delay-200">
                <SuggestedQuestions ticker={submittedTicker} />
            </div>
          )}


          {showInitialSkeleton && (
            <div className="space-y-8 animate-pulse">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">
                            <div className="h-8 w-48 bg-muted/80 rounded-md"></div>
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm pt-1">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <div className="h-5 w-32 bg-muted/80 rounded-md"></div>
                            </div>
                             <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                <div className="h-5 w-24 bg-muted/80 rounded-md"></div>
                            </div>
                        </div>
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
                            <span>AI Analysis</span>
                        </CardTitle>
                        <CardDescription>A proprietary momentum score and a derived short-term price target.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-48 bg-muted/80 rounded-md"></CardContent>
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
                            <Newspaper className="h-6 w-6 text-muted-foreground" />
                            <span>AI News Analysis</span>
                        </CardTitle>
                        <CardDescription>AI-powered news analysis will appear here.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-20 bg-muted/80 rounded-md"></CardContent>
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
