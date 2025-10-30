import { LineChart } from 'lucide-react';

export function Header() {
  return (
    <header className="flex flex-col items-center justify-center gap-2 text-center mb-8">
      <div className="flex items-center gap-3">
        <div className="p-2 sm:p-3 bg-primary/10 rounded-lg">
          <LineChart className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
        </div>
        <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold text-primary">
          Market Data
        </h1>
      </div>
      <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
        global stock market data
      </p>
    </header>
  );
}

    