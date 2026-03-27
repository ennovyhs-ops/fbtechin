'use client';

import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Upload, X, HelpCircle, Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const FormSchema = z.object({
  ticker: z.string().min(1, 'Ticker symbol is required.').max(20, 'Ticker symbol is too long.'),
});

interface DataInputFormProps {
    isPending: boolean;
    uploadedFileName: string | null;
    onFormSubmit: (values: z.infer<typeof FormSchema>) => void;
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onPrint: () => void;
    hasMarketData: boolean;
}

export function DataInputForm({ 
    isPending, 
    uploadedFileName, 
    onFormSubmit, 
    onFileUpload,
    onPrint,
    hasMarketData,
}: DataInputFormProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            ticker: '',
        },
    });

    return (
        <Card className="w-full no-print">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Search or Upload Market Data</CardTitle>
                <CardDescription>Enter a symbol to fetch data, or upload a CSV/XLS/XLSX file with historical data.</CardDescription>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onFormSubmit)}>
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
                                    <div className="relative">
                                        <Input
                                            placeholder="e.g., AAPL, EURUSD, 0700.HK, BTCUSD"
                                            {...field}
                                            onInput={(e) => {
                                                field.onChange(e.currentTarget.value.toUpperCase())
                                            }}
                                            className={field.value ? 'pr-8' : ''}
                                        />
                                        {field.value && (
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                                                onClick={() => {
                                                    form.setValue('ticker', '');
                                                    field.onChange('');
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                                <span className="sr-only">Clear</span>
                                            </Button>
                                        )}
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </div>

                        <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={onFileUpload}
                                accept=".csv, .xlsx, .xls"
                                className="hidden"
                            />
                            <div className="w-full text-center">
                                <p className="text-xs text-muted-foreground mb-2">
                                    File format: Date, Close required
                                </p>
                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isPending} className="w-full">
                                    <Upload className="mr-2 h-4 w-4" />
                                    {uploadedFileName ? 'New File' : 'Upload File'}
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
                    <Button type="button" variant="outline" onClick={onPrint} disabled={!hasMarketData}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print Report
                    </Button>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button type="button" variant="outline">
                            Application Guide
                            <HelpCircle className="ml-2 h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] flex flex-col">
                            <DialogHeader>
                            <DialogTitle className="font-headline text-2xl">Application Guide</DialogTitle>
                            <DialogDescription>
                                Learn about the market data and AI insights available in this platform.
                            </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 text-sm overflow-y-auto pr-4">
                            
                            <div>
                                <h3 className="font-semibold text-foreground mb-2">1. Available Market Data</h3>
                                <p className="text-muted-foreground">
                                    This application integrates with Alpha Vantage to provide:
                                </p>
                                <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                                    <li><strong>Global Stocks:</strong> End-of-day data for thousands of symbols in US and select international markets (e.g., AAPL, TSLA, 0700.HK).</li>
                                    <li><strong>Forex:</strong> Real-time and historical daily data for major and minor currency pairs (e.g., EURUSD, GBPJPY).</li>
                                    <li><strong>Cryptocurrencies:</strong> Daily historical data for digital assets paired with USD (e.g., BTCUSD, ETHUSD).</li>
                                    <li><strong>Market News & Sentiment:</strong> Real-time news feed with AI-scored sentiment for any of the above assets.</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold text-foreground mb-2">2. Data Limits & File Upload</h3>
                                <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                                    <li><strong>API Limit:</strong> For stock symbols, the app fetches the last **100 trading days** (approx. 5 months) per request to remain within the free API tier.</li>
                                    <li><strong>Extended Analysis:</strong> Long-term features like the 52-Week Range require 252 days of data. To use these for stocks, please **upload a file** (CSV or Excel) containing at least one year of historical data.</li>
                                    <li><strong>File Upload:</strong> Your files must contain 'date' and 'close' columns at minimum.</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold text-foreground mb-2">3. AI-Powered Analysis</h3>
                                <p className="text-muted-foreground">
                                    The platform uses a "Strategy Synthesis" approach:
                                </p>
                                <ul className="list-disc pl-5 mt-2 space-y-2 text-muted-foreground">
                                <li><strong>Momentum Score:</strong> A deterministic technical model (-1.0 to +1.0) derived from RSI, MACD, Bollinger Bands, and Trend Alignment.</li>
                                <li><strong>Monte Carlo Forecast:</strong> Runs 10,000 simulations to predict a 30-day probable price range.</li>
                                <li><strong>AI Signal Explainer:</strong> Gemini 1.5 Flash explains *why* the momentum model reached its conclusion.</li>
                                <li><strong>News Divergence:</strong> Compares news sentiment with technical momentum to identify if the market is ignoring or overreacting to news.</li>
                                </ul>
                            </div>
                            
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
