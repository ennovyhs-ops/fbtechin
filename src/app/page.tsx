

'use client';

import { useState, useTransition, useCallback, useMemo, useEffect } from 'react';
import { z } from 'zod';
import { Loader2, AlertCircle, Calendar, Download, TrendingUp, TrendingDown, Minus, Scale, Activity, BrainCircuit, Zap, Info, Lightbulb, Globe, Newspaper, HelpCircle, Target, Building, Crown, Mountain, AreaChart } from 'lucide-react';
import * as XLSX from 'xlsx';

import type { MarketData, RsiData, MacdData, BbandsData, RocData, IndicatorPeriods, MAVolData, VwmaData, FetchResult, MonteCarloResult, CombinedAnalysisResult, ObvData, StochasticData, CmfData, EmaData } from '@/lib/types';
import { fetchMarketData } from '@/app/actions';
import { calculateBollingerBands, calculateMACD, calculateRSI, calculateROC, calculateMAVol, calculateVWMA, calculateVolatility, runMonteCarloSimulation, calculateOBV, calculateStochastic, calculateCMF, ema } from '@/lib/technical-analysis';
import { analyzeStockMomentum, type AnalyzeStockMomentumOutput } from '@/ai/flows/analyze-stock-momentum';
import { predictPriceTarget } from '@/ai/flows/predict-price-target';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Header } from '@/components/header';
import { SuggestedQuestions } from '@/components/suggested-questions';
import { isCurrencyPair, isCryptoPair, formatCurrency } from '@/lib/utils';
import { TechnicalIndicators } from '@/components/technical-indicators';
import { StockAnalysis } from '@/components/stock-analysis';
import { OptionStrategies } from '@/components/option-strategies';
import { NewsAnalysis } from '@/components/news-analysis';
import { MarketCorrelation } from '@/components/market-correlation';
import { HistoricalVolatility } from '@/components/historical-volatility';
import { SignalExplanation } from '@/components/signal-explanation';
import { MonteCarloSimulation } from '@/components/monte-carlo-simulation';
import { SynthesizedTradeIdea } from '@/components/synthesized-trade-idea';
import { TechnicalSummary } from '@/components/technical-summary';
import { DataInputForm } from '@/components/data-input-form';
import { HistoricalPriceChart } from '@/components/historical-price-chart';

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
  stochastic: { kPeriod: 14, kSlowing: 3, dSlowing: 3 },
  cmf: 21,
};

export default function Home() {
  const [isPending, startTransition] = useTransition();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [marketData, setMarketData] = useState<MarketData[] | null>(null);
  const [error, setError] = useState<{message: string, url?: string} | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submittedTicker, setSubmittedTicker] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);

  const [indicatorData, setIndicatorData] = useState<{rsi: RsiData[], macd: MacdData[], bbands: BbandsData[], roc: RocData[], maVol: MAVolData[], vwma: VwmaData[], obv: ObvData[], stochastic: StochasticData[], cmf: CmfData[], ema: EmaData[]} | null>(null);
  const [indicatorsLoading, setIndicatorsLoading] = useState(false);
  const [indicatorsError, setIndicatorsError] = useState<string|null>(null);
  
  const [analysisResult, setAnalysisResult] = useState<CombinedAnalysisResult | null>(null);
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null);
  
  const [indicatorPeriods, setIndicatorPeriods] = useState<IndicatorPeriods>(defaultPeriods);
  
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [showPriceChart, setShowPriceChart] = useState(false);

  const calculateIndicators = useCallback((data: MarketData[], periods: IndicatorPeriods) => {
    setIndicatorsLoading(true);
    setIndicatorsError(null);
    try {
        const chronologicalData = [...data].reverse(); // Reverse once for chronological order
        const closePrices = chronologicalData.map(d => parseFloat(d.close));
        const volumes = chronologicalData.map(d => parseFloat(d.volume));
        
        const rsi = calculateRSI(closePrices, periods.rsi);
        const macd = calculateMACD(closePrices, periods.macd.fast, periods.macd.slow, periods.macd.signal);
        const bbands = calculateBollingerBands(closePrices, periods.bbands.period, periods.bbands.stdDev);
        const roc = calculateROC(closePrices, periods.roc);
        const maVol = calculateMAVol(volumes, periods.maVol);
        const vwma = calculateVWMA(closePrices, volumes, periods.vwma);
        const obv = calculateOBV(closePrices, volumes);
        const stochastic = calculateStochastic(chronologicalData.map(d => ({ high: parseFloat(d.high), low: parseFloat(d.low), close: parseFloat(d.close) })), periods.stochastic.kPeriod, periods.stochastic.kSlowing, periods.stochastic.dSlowing);
        const cmf = calculateCMF(chronologicalData.map(d => ({ high: parseFloat(d.high), low: parseFloat(d.low), close: parseFloat(d.close), volume: parseFloat(d.volume) })), periods.cmf);

        const ema12 = ema(closePrices, 12);
        const ema26 = ema(closePrices, 26);
        const ema50 = ema(closePrices, 50);
        const ema200 = ema(closePrices, 200);


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
            obv: obv.reverse().map((val, i) => ({ date: dates[i], OBV: formatNumber(val, 0) })),
            stochastic: stochastic.reverse().map((val, i) => ({ 
                date: dates[i], 
                k: formatNumber(val.k), 
                d: formatNumber(val.d) 
            })),
            cmf: cmf.reverse().map((val, i) => ({ date: dates[i], CMF: formatNumber(val, 3) })),
            ema: dates.map((date, i) => ({
                date,
                EMA12: formatNumber(ema12.reverse()[i]),
                EMA26: formatNumber(ema26.reverse()[i]),
                EMA50: formatNumber(ema50.reverse()[i]),
                EMA200: formatNumber(ema200.reverse()[i]),
            })),
        });
    } catch (e: any) {
        setIndicatorsError(e.message || 'Failed to calculate indicators.');
        setIndicatorData(null);
    }
    setIndicatorsLoading(false);
  }, []);

  const resetState = () => {
    setError(null);
    setInfo(null);
    setMarketData(null);
    setSubmittedTicker(null);
    setIndicatorData(null);
    setIndicatorsError(null);
    setAnalysisResult(null);
    setMonteCarloResult(null);
    setCurrency(null);
    setRegion(null);
    setIndicatorPeriods(defaultPeriods);
    setUploadedFileName(null);
    setIsAnalyzing(false);
    setShowPriceChart(false);
  };
  
  const handleDataResult = (result: FetchResult, ticker: string) => {
     if (result.data) {
        setMarketData(result.data);
        setCurrency(result.currency || null);
        setRegion(result.region || null);
        
        const isForexOrCrypto = isCurrencyPair(ticker) || isCryptoPair(ticker);
        if (!isForexOrCrypto) {
            calculateIndicators(result.data, defaultPeriods);
        } else {
            setIndicatorData({ rsi: [], macd: [], bbands: [], roc: [], maVol: [], vwma: [], obv: [], stochastic: [], cmf: [], ema: [] });
        }
      } else {
        setMarketData(null);
        if (result.error) {
            setError({message: result.error, url: result.url});
        }
      }
  }

  const handleAnalysis = useCallback(async () => {
    if (!marketData || !submittedTicker) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setMonteCarloResult(null);

    try {
        // Momentum & Price Target Analysis
        const momentumResult = await analyzeStockMomentum(submittedTicker, marketData);
        let prevMomentumResult: Awaited<ReturnType<typeof analyzeStockMomentum>> | null = null;
        if (marketData.length > 50) { // Ensure enough data for previous day's calculation
            const prevMarketData = marketData.slice(1);
            prevMomentumResult = await analyzeStockMomentum(submittedTicker, prevMarketData);
        }
        
        let combinedResult: CombinedAnalysisResult = { analysis: null, prediction: null, prevAnalysis: null };

        if (momentumResult && !momentumResult.error) {
            const predictionResult = await predictPriceTarget(submittedTicker, marketData, momentumResult);
            combinedResult = {
                analysis: momentumResult,
                prediction: predictionResult.error ? { error: predictionResult.error } : predictionResult,
                prevAnalysis: (prevMomentumResult && !prevMomentumResult.error) ? prevMomentumResult : null,
            };
        } else {
            combinedResult.error = momentumResult.error || 'An unknown analysis error occurred.';
        }
        setAnalysisResult(combinedResult);
        
        // Monte Carlo Simulation
        const closePrices = marketData.map(d => parseFloat(d.close)).reverse();
        if (closePrices.length > 30) {
             const simulationResult = runMonteCarloSimulation(closePrices, 30, 5000, 0.70);
             setMonteCarloResult(simulationResult);
        }

    } catch (e: any) {
        setError({message: e.message || "An unexpected error occurred during analysis."});
    } finally {
        setIsAnalyzing(false);
    }
  }, [marketData, submittedTicker]);

  useEffect(() => {
    if(marketData && submittedTicker) {
        const timer = setTimeout(() => {
            handleAnalysis();
        }, 50); // Use a short timeout to allow the initial data state to render
        return () => clearTimeout(timer);
    }
  }, [marketData, submittedTicker, handleAnalysis]);


  const onSubmit = useCallback(async (values: z.infer<typeof FormSchema>) => {
    resetState();

    startTransition(async () => {
      const ticker = values.ticker.toUpperCase();
      setSubmittedTicker(ticker);
      
      const marketResult = await fetchMarketData(ticker, 'compact');
      
      handleDataResult(marketResult, ticker);
    });
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetState();
    setUploadedFileName(file.name);

    startTransition(async () => {
        const reader = new FileReader();
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

        reader.onload = async (e) => {
            try {
                let data: MarketData[] = [];
                let jsonData: any[][] = [];

                if (isExcel) {
                    const fileData = e.target?.result;
                    if (!fileData) throw new Error('Failed to read Excel file.');
                    
                    const workbook = XLSX.read(fileData, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
                } else { // CSV
                    const text = e.target?.result;
                    if (typeof text !== 'string') throw new Error('Failed to read the CSV file.');
                    const lines = text.split('\n').filter(line => line.trim() !== '');
                    jsonData = lines.map(line => line.split(','));
                }

                if (jsonData.length < 2) throw new Error('File must contain a header and at least one data row.');
                
                const headerLine = jsonData[0].map((h:any) => String(h).toLowerCase().trim().replace(/[\s_-]/g, ''));
                
                const findHeaderIndex = (aliases: string[]): number => {
                    for (const alias of aliases) {
                        const index = headerLine.indexOf(alias.toLowerCase().replace(/[\s_-]/g, ''));
                        if (index !== -1) return index;
                    }
                    return -1;
                };

                const headerMap = {
                    date: findHeaderIndex(['date', 'time', 'datetime', 'timestamp', 'trade_date', 'tradedate']),
                    open: findHeaderIndex(['open', 'open_price', 'openprice']),
                    high: findHeaderIndex(['high', 'high_price', 'highprice', 'max']),
                    low: findHeaderIndex(['low', 'low_price', 'lowprice', 'min']),
                    close: findHeaderIndex(['close', 'closed', 'closed_price', 'close_price', 'last', 'last_price', 'price', 'adj_close', 'adjusted_close', 'lasttrade']),
                    volume: findHeaderIndex(['volume', 'vol', 'qty', 'quantity', 'trade_volume']),
                };
                
                const missingHeaders = ['date', 'close'].filter(h => headerMap[h as keyof typeof headerMap] === -1);
                if (missingHeaders.length > 0) {
                    throw new Error(`File is missing required headers. Could not find a column for: ${missingHeaders.join(', ')}.`);
                }

                data = jsonData.slice(1).map((row: any[], index: number) => {
                    const closeValue = row[headerMap.close];
                    const dateValue = row[headerMap.date];
                    
                    if (dateValue === undefined || dateValue === null || closeValue === undefined || closeValue === null) {
                        return null; // Skip rows with no date or close
                    }
                    
                    let formattedDate: string;
                    if (typeof dateValue === 'number' && dateValue > 25569) { // Excel serial date check (day 1 is 1900-01-01, 25569 is 1970-01-01)
                         const utc_days  = Math.floor(dateValue - 25569);
                         const utc_value = utc_days * 86400;                                        
                         const date_info = new Date(utc_value * 1000);
                         formattedDate = `${date_info.getUTCFullYear()}-${String(date_info.getUTCMonth() + 1).padStart(2, '0')}-${String(date_info.getUTCDate()).padStart(2, '0')}`;
                    } else {
                        try {
                            const parsedDate = new Date(dateValue);
                            if (isNaN(parsedDate.getTime())) throw new Error();
                            // Correct for timezone offset to prevent date shifts
                            const tzOffset = parsedDate.getTimezoneOffset() * 60000;
                            const localDate = new Date(parsedDate.valueOf() + tzOffset);
                            formattedDate = localDate.toISOString().split('T')[0];
                        } catch {
                            console.warn(`Skipping row ${index + 2} due to invalid date format: ${dateValue}`);
                            return null;
                        }
                    }
                    
                    return {
                        date: formattedDate,
                        close: String(closeValue ?? ''),
                        volume: headerMap.volume !== -1 ? String(row[headerMap.volume] ?? '0') : '0',
                        open: headerMap.open !== -1 && row[headerMap.open] ? String(row[headerMap.open]) : String(closeValue ?? ''),
                        high: headerMap.high !== -1 && row[headerMap.high] ? String(row[headerMap.high]) : String(closeValue ?? ''),
                        low: headerMap.low !== -1 && row[headerMap.low] ? String(row[headerMap.low]) : String(closeValue ?? ''),
                    };
                }).filter((row): row is MarketData => row !== null);

                if(data.length === 0) throw new Error('Uploaded file is empty or contains no valid data rows.');
                
                const sortedData = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                
                const tickerFromFile = file.name.split(/[\._\s]/)[0].toUpperCase();
                setSubmittedTicker(tickerFromFile);
                handleDataResult({ data: sortedData }, tickerFromFile);

            } catch (err: any) {
                setError({message: `Error parsing file: ${err.message}.`});
            }
        };

        if (isExcel) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    });

    if (event.target) {
        event.target.value = '';
    }
  }, []);
  
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

  const { latestData, fiftyTwoWeek, displayDate } = useMemo(() => {
    if (!marketData || marketData.length === 0) {
      return { latestData: null, fiftyTwoWeek: null, displayDate: null };
    }
    const latest = marketData[0];
    
    // Create a new Date object from the date string's parts to avoid timezone issues.
    // Assumes YYYY-MM-DD format.
    const dateParts = latest.date.split('-').map(Number);
    const date = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));

    const oneYearData = marketData.slice(0, 252);
    let high52 = -Infinity;
    let low52 = Infinity;
    if (marketData.length >= 252) {
      oneYearData.forEach(d => {
          const h = parseFloat(d.high);
          const l = parseFloat(d.low);
          if (!isNaN(h) && h > high52) high52 = h;
          if (!isNaN(l) && l < low52) low52 = l;
      });
    }
    
    return {
      latestData: latest,
      fiftyTwoWeek: marketData.length >= 252 ? { high: high52, low: low52 } : null,
      displayDate: date.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }),
    };
  }, [marketData]);

  const showInitialSkeleton = isPending && !marketData;
  const showAnalysisSkeleton = isAnalyzing && !analysisResult;
  
  const thirtyDayVolatility = useMemo(() => {
    if (!marketData) return null;
    return calculateVolatility(marketData.map(d => parseFloat(d.close)).reverse(), 30);
  }, [marketData]);

  const meanReversionTarget = useMemo(() => {
    if (!indicatorData?.bbands?.[0]?.['Real Middle Band']) return null;
    const middleBandValue = parseFloat(indicatorData.bbands[0]['Real Middle Band']);
    return isNaN(middleBandValue) ? null : middleBandValue;
  }, [indicatorData]);

  return (
    <main className="container mx-auto px-4 py-8">
      <Header className="no-print" />
      <div className="max-w-4xl mx-auto">
        <DataInputForm 
            isPending={isPending}
            uploadedFileName={uploadedFileName}
            onFormSubmit={onSubmit}
            onFileUpload={handleFileUpload}
            onPrint={() => window.print()}
            hasMarketData={!!marketData}
        />

        <div className="mt-8 space-y-8">
          {showInitialSkeleton && (
            <div className="flex justify-center items-center p-8 no-print">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          {info && (
             <Alert variant="default" className="no-print">
              <Info className="h-4 w-4" />
              <AlertTitle>Heads up!</AlertTitle>
              <AlertDescription>
                {info}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="no-print">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
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
            </Alert>
          )}

          {latestData && submittedTicker && (
             <Card className="card">
             <CardHeader>
               <CardTitle className="font-headline text-2xl">
                 Latest Price for {submittedTicker}
               </CardTitle>
                <div className="space-y-2 text-sm text-muted-foreground pt-1">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                       <div className="flex items-center gap-2">
                         <Calendar className="h-4 w-4" />
                         <span>As of {displayDate} Close</span>
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
                      <p className="text-lg font-bold text-foreground">{formatCurrency(latestData.close, currency)}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="flex items-center gap-2">
                        <Minus className="text-muted-foreground h-5 w-5" />
                        <div>
                            <p className="text-xs text-muted-foreground">Open</p>
                            <p className="font-semibold text-sm">{formatCurrency(latestData.open, currency)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="text-muted-foreground h-5 w-5" />
                        <div>
                            <p className="text-xs text-muted-foreground">Day's High</p>
                            <p className="font-semibold text-sm">{formatCurrency(latestData.high, currency)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <TrendingDown className="text-muted-foreground h-5 w-5" />
                        <div>
                            <p className="text-xs text-muted-foreground">Day's Low</p>
                            <p className="font-semibold text-sm">{formatCurrency(latestData.low, currency)}</p>
                        </div>
                    </div>
                    {fiftyTwoWeek && (
                      <>
                        <div className="flex items-center gap-2">
                            <Crown className="text-muted-foreground h-5 w-5" />
                            <div>
                                <p className="text-xs text-muted-foreground">52-Wk High</p>
                                <p className="font-semibold text-sm">{formatCurrency(fiftyTwoWeek.high, currency)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Mountain className="text-muted-foreground h-5 w-5" />
                            <div>
                                <p className="text-xs text-muted-foreground">52-Wk Low</p>
                                <p className="font-semibold text-sm">{formatCurrency(fiftyTwoWeek.low, currency)}</p>
                            </div>
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-2">
                        <Scale className="text-muted-foreground h-5 w-5" />
                        <div>
                            <p className="text-xs text-muted-foreground">Volume</p>
                            <p className="font-semibold text-sm">{Number(latestData.volume).toLocaleString()}</p>
                        </div>
                    </div>
                  </div>
                </div>
             </CardContent>
             <CardFooter className="flex flex-wrap gap-4 no-print">
                 <Button variant="outline" onClick={downloadCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    Download as CSV
                </Button>
                <Button variant="outline" onClick={() => setShowPriceChart(prev => !prev)}>
                    <AreaChart className="mr-2 h-4 w-4" />
                    {showPriceChart ? 'Hide Price Chart' : 'Show Price Chart'}
                </Button>
             </CardFooter>
           </Card>
          )}

          {showPriceChart && submittedTicker && marketData && indicatorData && (
            <HistoricalPriceChart
                ticker={submittedTicker}
                marketData={marketData}
                indicatorData={indicatorData}
                currency={currency}
                analysisResult={analysisResult}
                monteCarloResult={monteCarloResult}
            />
          )}

          {analysisResult?.analysis && 'totalScore' in analysisResult.analysis && analysisResult.prediction && !('error' in analysisResult.prediction) && latestData && thirtyDayVolatility && (
            <TechnicalSummary
              ticker={submittedTicker!}
              analysis={analysisResult}
              currentPrice={parseFloat(latestData.close)}
              volatility={thirtyDayVolatility}
              indicatorData={indicatorData}
              marketData={marketData}
            />
          )}

          {submittedTicker && marketData && (
            <>
                {(isAnalyzing || analysisResult) &&
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <StockAnalysis 
                            ticker={submittedTicker} 
                            analysisResult={analysisResult}
                            currency={currency}
                            marketData={marketData}
                            loading={showAnalysisSkeleton}
                            meanReversionTarget={meanReversionTarget}
                        />
                        <MonteCarloSimulation 
                            monteCarloResult={monteCarloResult}
                            currency={currency}
                            loading={showAnalysisSkeleton}
                        />
                    </div>
                }
                <HistoricalVolatility marketData={marketData} />
            </>
          )}
          
          {analysisResult?.analysis && 'totalScore' in analysisResult.analysis && analysisResult.analysis.signal !== 'N/A' && latestData && marketData && indicatorData && (
              <SignalExplanation 
                ticker={submittedTicker!}
                analysis={analysisResult.analysis}
                marketData={marketData}
                indicatorData={indicatorData}
              />
          )}

          {analysisResult?.analysis && 'totalScore' in analysisResult.analysis && analysisResult.prediction && !('error' in analysisResult.prediction) && monteCarloResult && latestData && thirtyDayVolatility && (
              <SynthesizedTradeIdea
                ticker={submittedTicker!}
                analysis={analysisResult}
                monteCarlo={monteCarloResult}
                currentPrice={parseFloat(latestData.close)}
                volatility={thirtyDayVolatility}
              />
          )}

          {analysisResult?.analysis && 'totalScore' in analysisResult.analysis && analysisResult.analysis.signal !== 'N/A' && latestData && marketData && (
            <OptionStrategies 
                ticker={submittedTicker!} 
                analysis={analysisResult.analysis}
                latestClose={latestData.close}
                marketData={marketData}
            />
          )}

          {submittedTicker && (
            <NewsAnalysis 
                ticker={submittedTicker}
                analysisResult={analysisResult}
                monteCarloResult={monteCarloResult}
            />
           )}
          
          {submittedTicker && marketData && latestData && (
            <div className="space-y-8">
                <TechnicalIndicators 
                    ticker={submittedTicker}
                    data={indicatorData}
                    loading={indicatorsLoading}
                    error={indicatorsError}
                    currency={currency}
                    periods={indicatorPeriods}
                    onPeriodsChange={onPeriodsChange}
                    latestClose={parseFloat(latestData.close)}
                    marketData={marketData}
                />
                <MarketCorrelation 
                  baseTicker={submittedTicker}
                  baseMarketData={marketData}
                />
            </div>
          )}

          {submittedTicker && (
             <SuggestedQuestions 
                ticker={submittedTicker}
            />
          )}


          {showInitialSkeleton && (
            <div className="space-y-8 animate-pulse no-print">
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
