import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, ExternalLink, Newspaper, AlertCircle } from 'lucide-react';
import { PortfolioData } from '../lib/binance';

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  relatedCoins: string[];
  sentiment: "positive" | "negative" | "neutral";
};

interface CryptoNewsProps {
  portfolio?: PortfolioData;
}

export default function CryptoNews({ portfolio }: CryptoNewsProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const symbolsQuery = useMemo(() => {
    if (!portfolio?.assets || portfolio.assets.length === 0) return '';
    const cleanSymbols = portfolio.assets.map(a => 
      a.symbol.replace(/USDT$|BUSD$|USDC$/g, '').toUpperCase()
    ).filter(Boolean);
    return Array.from(new Set(cleanSymbols)).join(',');
  }, [portfolio]);

  const userCoins = useMemo(() => {
    if (!portfolio?.assets) return new Set<string>();
    return new Set(
      portfolio.assets.map(a => a.symbol.replace(/USDT$|BUSD$|USDC$/g, '').toUpperCase())
    );
  }, [portfolio]);

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = symbolsQuery ? `/api/news?symbols=${encodeURIComponent(symbolsQuery)}` : '/api/news';
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch news (${res.status})`);
      }
      const data = await res.json();
      setNews(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("CryptoNews fetch error:", err);
      setError("Couldn't load news right now");
    } finally {
      setLoading(false);
    }
  }, [symbolsQuery]);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 5 * 60 * 1000); // Auto-refresh every 5 minutes
    return () => clearInterval(interval);
  }, [fetchNews]);

  const getSentimentBorder = (sentiment: "positive" | "negative" | "neutral") => {
    switch (sentiment) {
      case 'positive':
        return 'border-l-[#22c55e]';
      case 'negative':
        return 'border-l-[#ef4444]';
      default:
        return 'border-l-[#6b7280]';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header: "Market News" with a small "Live" badge */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-bold text-[#f9fafb]">Market News</h2>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse"></span>
            Live
          </span>
        </div>
        <button
          onClick={fetchNews}
          disabled={loading}
          className="text-xs text-[#6b7280] hover:text-[#f9fafb] flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          title="Refresh news"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#6366f1]' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Loading State: 5 shimmer skeleton cards */}
      {loading && news.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className="shimmer bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 h-24"
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && news.length === 0 && (
        <div className="bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[220px] shadow-sm">
          <AlertCircle className="w-8 h-8 text-[#ef4444] mb-3" />
          <p className="text-sm font-semibold text-[#f9fafb] mb-1">Couldn't load news right now</p>
          <p className="text-xs text-[#6b7280] mb-4">Please check your connection and try again.</p>
          <button
            onClick={fetchNews}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-[#6366f1]/10 text-[#6366f1] border border-[#6366f1]/20 hover:bg-[#6366f1]/20 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && news.length === 0 && (
        <div className="bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[220px] shadow-sm">
          <Newspaper className="w-8 h-8 text-[#6b7280] mb-3 opacity-60" />
          <p className="text-sm font-medium text-[#6b7280]">No recent news for your holdings</p>
        </div>
      )}

      {/* News List */}
      {!error && news.length > 0 && (
        <div className="space-y-3">
          {news.map((item) => {
            // Only show coins the user holds
            const displayCoins = item.relatedCoins
              ? item.relatedCoins
                  .map(c => c.toUpperCase())
                  .filter(c => userCoins.has(c))
              : [];

            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] border-l-4 ${getSentimentBorder(
                  item.sentiment
                )} rounded-2xl p-4 overflow-hidden hover:bg-[rgba(255,255,255,0.03)] transition group cursor-pointer`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-medium text-[#f9fafb] line-clamp-2 group-hover:text-white leading-snug flex-1">
                    {item.title}
                  </h3>
                  <ExternalLink className="w-3.5 h-3.5 text-[#6b7280] group-hover:text-[#f9fafb] shrink-0 opacity-60 group-hover:opacity-100 transition-opacity mt-0.5" />
                </div>

                <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[rgba(255,255,255,0.04)]">
                  <span className="text-xs text-[#6b7280]">
                    {item.source} • {item.publishedAt}
                  </span>

                  {displayCoins.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {displayCoins.slice(0, 3).map((coin) => (
                        <span
                          key={coin}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#6366f1]/10 text-[#6366f1] border border-[#6366f1]/20"
                        >
                          {coin}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
