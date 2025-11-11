
'use client';

import { useState, useTransition, useCallback, useEffect, useRef } from 'react';
import { useDebounce } from 'use-debounce';
import { Loader2, Building, Globe, Bitcoin } from 'lucide-react';
import { searchSymbols } from '@/app/actions';
import type { SearchResult } from '@/lib/types';
import { Input } from '@/components/ui/input';

interface SymbolSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (symbol: string) => void;
}

const getIcon = (type: string) => {
    switch (type) {
        case 'Equity':
            return <Building className="h-4 w-4" />;
        case 'ETF':
             return <Building className="h-4 w-4" />;
        case 'Forex':
            return <Globe className="h-4 w-4" />;
        case 'Cryptocurrency':
            return <Bitcoin className="h-4 w-4" />;
        default:
            return <Building className="h-4 w-4" />;
    }
}

export function SymbolSearch({ value, onChange, onSelect }: SymbolSearchProps) {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const [debouncedValue] = useDebounce(value, 300);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchResults = useCallback((keywords: string) => {
    startTransition(async () => {
      if (keywords.length > 1) {
        const results = await searchSymbols(keywords);
        setSearchResults(results);
        if (results.length > 0) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
      } else {
        setSearchResults([]);
        setIsOpen(false);
      }
    });
  }, []);
  
  useEffect(() => {
     // Close dropdown if clicked outside
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchResults(debouncedValue);
  }, [debouncedValue, fetchResults]);

  const handleSelect = (symbol: string) => {
    onSelect(symbol);
    setIsOpen(false);
    setSearchResults([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    onChange(newValue);
     if (newValue.length < 2) {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
        <Input
            placeholder="e.g., GOOG, 0005.HK, EURUSD, BTCUSD"
            autoComplete="off"
            value={value}
            onInput={handleInputChange}
            onFocus={() => {
              if (searchResults.length > 0) setIsOpen(true);
            }}
        />
        {isPending && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}

       {isOpen && searchResults.length > 0 && (
         <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-80 overflow-y-auto">
           <div className="p-2 text-sm font-semibold text-muted-foreground border-b">Search Results</div>
           {searchResults.map((result) => (
             <div
               key={result.symbol}
               className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-accent"
               onClick={() => handleSelect(result.symbol)}
             >
                <div className="text-muted-foreground">{getIcon(result.type)}</div>
                <div className="flex-grow">
                    <div className="font-semibold">{result.symbol}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">{result.name}</div>
                </div>
                <div className="text-xs text-muted-foreground">{result.region}</div>
             </div>
           ))}
         </div>
       )}
    </div>
  );
}

    