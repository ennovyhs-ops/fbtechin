
'use client';

import type { NewsArticle } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface NewsCardProps {
    article: NewsArticle;
}

const getSentimentColor = (label: string) => {
    switch (label) {
        case 'Bullish':
        case 'Somewhat-Bullish':
            return 'text-green-400 bg-green-500/20';
        case 'Bearish':
        case 'Somewhat-Bearish':
            return 'text-red-400 bg-red-500/20';
        default:
            return 'text-muted-foreground bg-muted';
    }
}

const parseDateString = (dateStr: string) => {
    // Format: "20240722T043000"
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1; // Month is 0-indexed
    const day = parseInt(dateStr.substring(6, 8), 10);
    const hour = parseInt(dateStr.substring(9, 11), 10);
    const minute = parseInt(dateStr.substring(11, 13), 10);
    return new Date(year, month, day, hour, minute);
}


export function NewsCard({ article }: NewsCardProps) {
    
    const publishedDate = parseDateString(article.time_published);
    const timeAgo = formatDistanceToNow(publishedDate, { addSuffix: true });

    const relevantTickerSentiment = article.ticker_sentiment.find(t => parseFloat(t.relevance_score) > 0.5);
    const sentimentLabel = relevantTickerSentiment?.ticker_sentiment_label || 'Neutral';
    const sentimentColor = getSentimentColor(sentimentLabel);

    return (
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="block p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors group">
            <div className="flex flex-col h-full">
                <h4 className="font-semibold text-sm leading-snug text-card-foreground group-hover:text-foreground line-clamp-2">{article.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.summary}</p>
                <div className="flex-grow" />
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <span className="font-medium">{article.source}</span>
                     <div className="flex items-center gap-2">
                        <span>{timeAgo}</span>
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${sentimentColor}`}>{sentimentLabel}</span>
                    </div>
                </div>
            </div>
        </a>
    )
}
