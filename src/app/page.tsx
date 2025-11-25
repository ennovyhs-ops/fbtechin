
'use client';

import { useState, useTransition, useCallback, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle, Calendar, ChevronDown, ChevronUp, Download, TrendingUp, TrendingDown, Minus, Scale, Activity, BrainCircuit, Zap, Info, Lightbulb, Globe, Newspaper, HelpCircle, Target, Upload, BarChart, Percent, LineChart, Building } from 'lucide-react';

import type { MarketData, RsiData, MacdData, BbandsData, RocData, IndicatorPeriods, MAVolData, VwmaData } from '@/lib/types';
import { fetchMarketData } from '@/app/actions';
import { calculateBollingerBands, calculateMACD, calculateRSI, calculateROC, calculateMAVol, calculateVWMA } from '@/lib/technical-analysis';

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
import { MarketCorrelation } from '@/components/market-correlation';
import { HistoricalVolatility } from '@/components/historical-volatility';
import { SignalExplanation } from '@/components/signal-explanation';


const FormSchema = z.object({
  ticker: z.string().min(1, 'Ticker symbol is required.').max(20, 'Ticker symbol is too long.'),
});

const defaultPeriods: IndicatorPeriods = {
  roc: 22,
  rsi: 14,
  macd: { fast: 12, slow: 26, signal: 9 },
  bbands: { period: 20, stdDev: 2 },
  maVol: 50,
  vwma: 20,
};

export default function Home() {
  const [isPending, startTransition] = useTransition();
  const [marketData, setMarketData] = useState<MarketData[] | null>(null);
  const [error, setError] = useState<{message: string, url?: string} | null>(null);
  const [submittedTicker, setSubmittedTicker] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [currency, setCurrency] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);

  const [indicatorData, setIndicatorData] = useState<{rsi: RsiData[], macd: MacdData[], bbands: BbandsData[], roc: RocData[], maVol: MAVolData[], vwma: VwmaData[]} | null>(null);
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
        const volumes = data.map(d => parseFloat(d.volume)).reverse();
        
        const rsi = calculateRSI(closePrices, periods.rsi);
        const macd = calculateMACD(closePrices, periods.macd.fast, periods.macd.slow, periods.macd.signal);
        const bbands = calculateBollingerBands(closePrices, periods.bbands.period, periods.bbands.stdDev);
        const roc = calculateROC(closePrices, periods.roc);
        const maVol = calculateMAVol(volumes, periods.maVol);
        const vwma = calculateVWMA(closePrices, volumes, periods.vwma);

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
            maVol: maVol.reverse().map((val, i) => ({ 
                date: dates[i],
                volume: volumes.reverse()[i].toString(),
                MAVol: formatNumber(val, 0) 
            })),
            vwma: vwma.reverse().map((val, i) => ({ date: dates[i], VWMA: formatNumber(val) })),
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
      
      try {
        const marketResult = await fetchMarketData(ticker);
        
        if (marketResult.error) {
          setError({message: marketResult.error, url: marketResult.url});
          return;
        } 
        
        if (marketResult.data) {
          setMarketData(marketResult.data);
          if (marketResult.currency) setCurrency(marketResult.currency);
          if (marketResult.region) setRegion(marketResult.region);
          
          const isForexOrCrypto = isCurrencyPair(values.ticker) || isCryptoPair(values.ticker);
          if (!isForexOrCrypto) {
              calculateIndicators(marketResult.data, defaultPeriods);
          } else {
              setIndicatorData({ rsi: [], macd: [], bbands: [], roc: [], maVol: [], vwma: [] });
          }
        } else {
          setError({message: "No market data was returned."});
        }
      } catch (e: any) {
        setError({message: e.message || 'An unexpected error occurred.'});
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
                setError({message: 'Failed to read the file.'});
                return;
            }

            try {
                const lines = text.split('\n').filter(line => line.trim() !== '');
                if (lines.length < 2) {
                    setError({message: 'CSV file must contain a header row and at least one data row.'});
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
                    setError({message: 'CSV file is empty or in an invalid format.'});
                    return;
                }
                
                const tickerFromFile = file.name.split(/[\._\s]/)[0].toUpperCase();
                form.setValue('ticker', tickerFromFile);
                setSubmittedTicker(tickerFromFile);

                setMarketData(data);
                setRegion('Uploaded Data');
                setCurrency('USD'); // Default to USD for uploaded files
                
                calculateIndicators(data, defaultPeriods);

            } catch (err: any) {
                setError({message: `Error parsing CSV: ${err.message}.`});
            }
        };
        reader.readAsText(file);
    });

    // Reset file input to allow re-uploading the same file
    event.target.value = '';
  };
  
  const onPeriodsChange = (newPeriods: IndicatorPeriods) => {
    setIndicatorPeriods(newPeriods);
    if (submittedTicker && marketData) {
      calculateIndicators(marketData, newPeriods);
    }
  };

  const downloadCsv = () => {
    if (!marketData || !submittedTicker) return;

    const headers = ['date', 'open', 'high', 'low', 'close', 'volume'];
    const csvContent = [
        headers.join(','),
        ...marketData.map(row => headers.map(header => row[header as keyof MarketData]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
        URL.revokeObjectURL(link.href);
    }
    link.href = URL.createObjectURL(blob);
    link.download = `${submittedTicker}_market_data.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const latestData = marketData?.[0];

  const showInitialSkeleton = isPending && !marketData;

  const apiLimitMessage = error ? parseApiLimit(error.message) : null;
  const isApiLimitError = !!apiLimitMessage;
  const isApiInfoNote = error?.message?.toLowerCase().includes('thank you for using');


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
                      Application Guide
                      <HelpCircle className="ml-2" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Application Guide</DialogTitle>
                      <DialogDescription>
                        This guide explains the app's features, data sources, and how it uses AI to provide financial insights.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-sm overflow-y-auto pr-4">
                      
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">1. Data Input</h3>
                        <p className="text-muted-foreground">
                            You can fetch live market data by entering a ticker, or upload your own historical data via a CSV file. For best results with CSV uploads, name your file with the ticker (e.g., "SPY.csv"). The CSV file must have 'date' and 'close' columns; 'open', 'high', 'low', and 'volume' are optional but recommended for full analysis.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold text-foreground mb-2">2. Data Source & API Usage</h3>
                        <p className="text-muted-foreground">
                          All live financial data is sourced from the <a href="https://www.alphavantage.co/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Alpha Vantage API</a>. A free API key is used, which has a limit of 25 requests per day.
                        </p>
                         <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                          <li><span className="font-semibold text-foreground">Get Data:</span> Uses **1** API request.</li>
                          <li><span className="font-semibold text-foreground">Upload CSV:</span> Uses **0** API requests.</li>
                          <li><span className="font-semibold text-foreground">Load News & Analysis:</span> Uses **1** API request.</li>
                        </ul>
                         <p className="text-muted-foreground mt-2">
                           If you are unsure of a symbol, you can use <a href="https://finance.yahoo.com/lookup" target="_blank" rel="noopener noreferrer" className="text-primary underline">a tool like Yahoo Finance</a> to find it.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold text-foreground mb-2">3. Calculated & AI-Powered Analysis</h3>
                        <p className="text-muted-foreground">
                            The application uses a mix of deterministic calculations and generative AI to provide insights.
                        </p>
                         <ul className="list-disc pl-5 mt-2 space-y-2 text-muted-foreground">
                          <li><span className="font-semibold text-foreground">Momentum Score:</span> A proprietary score (-1.0 to +1.0) calculated from multiple technical indicators, including the stock's position within its 52-week range.</li>
                          <li><span className="font-semibold text-foreground">Calculated Price Target:</span> A price projection based on the momentum score and recent volatility, with an interpretation that considers the 52-week high/low.</li>
                          <li><span className="font-semibold text-foreground">AI Company Name Lookup:</span> The company name is identified using an AI model to avoid using API quota.</li>
                          <li><span className="font-semibold text-foreground">52-Week Range:</span> The high and low for the last 52 weeks are calculated locally from historical data, using no extra API calls.</li>
                          <li><span className="font-semibold text-foreground">AI Signal Explanation:</span> An AI-generated explanation detailing the key drivers behind the current momentum signal.</li>
                          <li><span className="font-semibold text-foreground">Option Strategy Ideas:</span> Both AI-powered and rule-based engines suggest potential option strategies based on the momentum score.</li>
                          <li><span className="font-semibold text-foreground">AI News Impact:</span> When news is loaded, an AI analyzes the articles to provide a summary and predict its impact.</li>
                          <li><span className="font-semibold text-foreground">Suggested Exploration:</span> Get AI-powered suggestions for follow-up research questions.</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">4. Customizable Indicators</h3>
                        <p className="text-muted-foreground">
                          You can adjust the periods for ROC, RSI, MACD, and Bollinger Bands in the "Technical Indicators" card. Click "Update" to re-calculate all indicators instantly in your browser at no API cost.
                        </p>
                      </div>

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
                  <AlertDescription>
                    <p>{error.message}</p>
                    {error.url && (
                        <div className="mt-2 text-xs">
                            <p className="font-semibold">Failed URL (for diagnosis):</p>
                            <a 
                                href={error.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="break-all text-blue-500 underline"
                            >
                                {error.url}
                            </a>
                            <p className="mt-1">Click the link to see the raw error from the API provider. Note: the API key has been removed.</p>
                        </div>
                    )}
                  </AlertDescription>
                </>
              }
            </Alert>
          )}

          {latestData && submittedTicker && (
             <Card>
             <CardHeader>
               <CardTitle className="font-headline text-2xl">
                 Latest Price for {submittedTicker}
               </CardTitle>
                <div className="space-y-2 text-sm text-muted-foreground pt-1">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
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
                </div>
             </CardHeader>
             <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-end sm:gap-2">
                      <p className="text-4xl md:text-5xl font-bold text-foreground">{formatCurrency(latestData.close, currency)}</p>
                      <p className="text-lg text-muted-foreground font-medium sm:pb-1">Close</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
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
                 <Button variant="outline" onClick={downloadCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    Download as CSV
                </Button>
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
              <SignalExplanation 
                ticker={submittedTicker!}
                analysis={analysisResult}
                marketData={marketData}
                indicatorData={indicatorData}
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
          
          {submittedTicker && marketData && (
            <HistoricalVolatility marketData={marketData} />
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
          
          {submittedTicker && marketData && (
              <MarketCorrelation 
                baseTicker={submittedTicker}
                baseMarketData={marketData}
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
                        <div className="space-y-2 pt-1">
                            <div className="h-5 w-40 bg-muted/80 rounded-md"></div>
                            <div className="h-5 w-56 bg-muted/80 rounded-md"></div>
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
                            <span>Calculated Analysis</span>
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
