
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
                                This guide explains the app's features, data sources, and how it uses AI to provide financial insights.
                            </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 text-sm overflow-y-auto pr-4">
                            
                            <div>
                                <h3 className="font-semibold text-foreground mb-2">1. Data Input</h3>
                                <p className="text-muted-foreground">
                                    You can fetch market data by entering a ticker, or upload your own historical data via a CSV or Excel (.xls, .xlsx) file. For best results with file uploads, name your file with the ticker (e.g., "SPY.xlsx"). The file must have columns that can be identified as 'date', and 'close'. 'Open', 'high', 'low', and 'volume' are optional but recommended for full analysis. If 'volume' is not provided, it will default to 0.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-foreground mb-2">2. Data Source & API Usage</h3>
                                <p className="text-muted-foreground">
                                All financial data is sourced from the <a href="https://www.alphavantage.co/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Alpha Vantage API</a>. A free API key is used, which has a general limit of 25 requests per day.
                                </p>
                                <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                                <li><span className="font-semibold text-foreground">Get Data:</span> Uses **1** API request. For stocks, this fetches the last 100 days of data (`compact`). For Forex/Crypto, it can fetch a more extensive history (`full`), as this is often supported on the free tier for those asset types.</li>
                                <li><span className="font-semibold text-foreground">Upload File:</span> Uses **0** API requests.</li>
                                <li><span className="font-semibold text-foreground">Load News & Analysis:</span> Uses **1** API request.</li>
                                </ul>
                                <p className="text-muted-foreground mt-2">
                                If you are unsure of a symbol, you can use <a href="https://finance.yahoo.com/lookup" target="_blank" rel="noopener noreferrer" className="text-primary underline">a tool like Yahoo Finance</a> to find it.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-foreground mb-2">3. Calculated & AI-Powered Analysis</h3>
                                <p className="text-muted-foreground">
                                    After loading data, the application automatically uses a mix of deterministic calculations and generative AI to provide insights.
                                </p>
                                <ul className="list-disc pl-5 mt-2 space-y-2 text-muted-foreground">
                                <li><span className="font-semibold text-foreground">Momentum Score & Recommendation:</span> A proprietary score (-1.0 to +1.0) and a direct 'Buy/Sell/Hold' recommendation calculated from multiple technical indicators.</li>
                                <li><span className="font-semibold text-foreground">Calculated Price Target:</span> A price projection based on the momentum score and recent volatility (ATR).</li>
                                <li><span className="font-semibold text-foreground">Monte Carlo Forecast:</span> A probabilistic 30-day price forecast based on thousands of simulations.</li>
                                <li><span className="font-semibold text-foreground">AI Signal Explanation:</span> An AI-generated explanation detailing the key drivers behind the current momentum signal.</li>
                                <li><span className="font-semibold text-foreground">Rule-Based Option Strategies:</span> A deterministic engine suggests potential option strategies based on momentum and volatility.</li>
                                <li><span className="font-semibold text-foreground">AI News Impact:</span> When news is loaded, an AI analyzes the articles to provide a summary and predict its impact.</li>
                                <li><span className="font-semibold text-foreground">Suggested Exploration:</span> Get AI-powered suggestions for follow-up research questions.</li>
                                </ul>
                            </div>
                            
                            <div>
                                <h3 className="font-semibold text-foreground mb-2">4. Customizable Indicators</h3>
                                <p className="text-muted-foreground">
                                You can adjust the periods for all technical indicators in the "Technical Indicators" card. Click "Update" to re-calculate all indicators instantly in your browser at no API cost.
                                </p>
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
