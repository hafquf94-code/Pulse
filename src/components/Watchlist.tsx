import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  X,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Eye,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export type WatchlistItem = {
  symbol: string;
  priceUSD: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24hUSD: number;
};

interface WatchlistProps {
  onAskPulse?: (prompt: string) => void;
}

const STORAGE_KEY = "pulse_watchlist";
const DEFAULT_WATCHLIST = ["SOL", "LINK", "DOT", "AVAX"];

export default function Watchlist({ onAskPulse }: WatchlistProps) {
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to read watchlist from localStorage", e);
    }
    return DEFAULT_WATCHLIST;
  });

  const [prices, setPrices] = useState<WatchlistItem[]>([]);
  const [newCoin, setNewCoin] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingCoin, setAddingCoin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync watchlist to localStorage whenever it updates
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
    } catch (e) {
      console.error("Failed to save watchlist to localStorage", e);
    }
  }, [watchlist]);

  const fetchPrices = useCallback(async (symbols: string[], retryCount = 0) => {
    if (!symbols || symbols.length === 0) {
      setPrices([]);
      setLoading(false);
      return;
    }
    try {
      const url = `/api/watchlist/prices?symbols=${encodeURIComponent(symbols.join(","))}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load watchlist prices (${res.status})`);
      }
      const data: WatchlistItem[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setPrices(data);
      }
    } catch (err: any) {
      if (retryCount < 2 && err?.message === "Failed to fetch") {
        setTimeout(
          () => {
            fetchPrices(symbols, retryCount + 1);
          },
          1200 * (retryCount + 1),
        );
        return;
      }
      console.warn("Watchlist fetch prices notice:", err?.message || err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch prices on initial load and when watchlist changes
  useEffect(() => {
    fetchPrices(watchlist);
  }, [watchlist, fetchPrices]);

  // Auto-refresh prices every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (watchlist.length > 0) {
        fetchPrices(watchlist);
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [watchlist, fetchPrices]);

  const handleAddCoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const cleaned = newCoin
      .trim()
      .toUpperCase()
      .replace(/USDT$|BUSD$|USDC$/g, "");
    if (!cleaned) return;

    if (watchlist.includes(cleaned)) {
      setError(`${cleaned} is already on your watchlist`);
      return;
    }

    try {
      setAddingCoin(true);
      // Validate that symbol exists on Binance
      const res = await fetch(
        `/api/watchlist/prices?symbols=${encodeURIComponent(cleaned)}`,
      );
      if (!res.ok) throw new Error("Validation failed");
      const items: WatchlistItem[] = await res.json();

      if (!Array.isArray(items) || items.length === 0) {
        setError("Coin not found on Binance");
        return;
      }

      const verifiedItem = items[0];
      const updatedList = [...watchlist, cleaned];
      setWatchlist(updatedList);
      setPrices((prev) => {
        const without = prev.filter((p) => p.symbol !== cleaned);
        return [...without, verifiedItem];
      });
      setNewCoin("");
    } catch (err) {
      setError("Coin not found on Binance");
    } finally {
      setAddingCoin(false);
    }
  };

  const handleRemoveCoin = (symbolToRemove: string) => {
    const updated = watchlist.filter((s) => s !== symbolToRemove);
    setWatchlist(updated);
    setPrices((prev) => prev.filter((p) => p.symbol !== symbolToRemove));
  };

  const handleAskPulse = (symbol: string) => {
    if (onAskPulse) {
      onAskPulse(
        `Tell me about ${symbol} and whether it might be worth considering given my current portfolio`,
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Title and Live Badge */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Watchlist
          </h2>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[#6366f1]/10 text-[#6366f1] border border-[#6366f1]/20">
            <Eye className="w-3 h-3" />
            {watchlist.length} {watchlist.length === 1 ? "coin" : "coins"}
          </span>
        </div>
        <button
          onClick={() => fetchPrices(watchlist)}
          disabled={loading || watchlist.length === 0}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
          title="Refresh prices"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#6366f1]" : ""}`}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Add Coin Form */}
      <form onSubmit={handleAddCoin} className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={newCoin}
              onChange={(e) => {
                setNewCoin(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Add a coin to watch... (e.g. SOL, LINK, AVAX)"
              className="w-full bg-[var(--bg-card)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[#6b7280] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition"
            />
          </div>
          <button
            type="submit"
            disabled={addingCoin || !newCoin.trim()}
            className="px-3.5 py-2.5 rounded-xl bg-[#6366f1] hover:brightness-110 text-[var(--text-primary)] font-medium text-xs sm:text-sm transition flex items-center gap-1.5 disabled:opacity-40 disabled:hover:brightness-100 cursor-pointer shrink-0"
            title="Add to Watchlist"
          >
            {addingCoin ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--negative)] px-1 pt-0.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* Loading Skeleton */}
      {loading && prices.length === 0 && (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="shimmer bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3.5 h-16"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && watchlist.length === 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[220px] shadow-sm">
          <Eye className="w-8 h-8 text-[var(--text-secondary)] mb-3 opacity-60" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            No coins on your watchlist yet. Add a coin above to start
            monitoring.
          </p>
        </div>
      )}

      {/* Watched Coins List */}
      {watchlist.length > 0 && (
        <div className="space-y-2.5">
          {watchlist.map((symbol) => {
            const item = prices.find(
              (p) => p.symbol.toUpperCase() === symbol.toUpperCase(),
            );
            const isPositive = item ? item.changePercent24h >= 0 : true;

            return (
              <div
                key={symbol}
                className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3.5 flex items-center justify-between gap-3 hover:bg-[rgba(255,255,255,0.02)] transition group"
              >
                {/* Symbol and 24h High/Low */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm sm:text-base text-[var(--text-primary)] tracking-wide">
                      {symbol}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] bg-white/5 px-1.5 py-0.5 rounded uppercase font-medium">
                      USDT
                    </span>
                  </div>
                  {item && (
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 flex items-center gap-2">
                      <span>
                        24h H: $
                        {item.high24h >= 1
                          ? item.high24h.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : item.high24h.toFixed(4)}
                      </span>
                      <span>•</span>
                      <span>
                        24h L: $
                        {item.low24h >= 1
                          ? item.low24h.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : item.low24h.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Price and 24h Change */}
                <div className="text-right shrink-0">
                  {item ? (
                    <>
                      <div className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
                        $
                        {item.priceUSD >= 1
                          ? item.priceUSD.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : item.priceUSD.toFixed(4)}
                      </div>
                      <div
                        className={`text-xs font-medium flex items-center justify-end gap-0.5 mt-0.5 ${
                          isPositive
                            ? "text-[var(--positive)]"
                            : "text-[var(--negative)]"
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>
                          {isPositive ? "+" : ""}
                          {item.changePercent24h.toFixed(2)}%
                        </span>
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-[var(--text-secondary)]">
                      Loading...
                    </span>
                  )}
                </div>

                {/* Actions: Ask Pulse & Remove */}
                <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-[var(--border-subtle)]">
                  <button
                    onClick={() => handleAskPulse(symbol)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#6366f1]/10 text-[#6366f1] border border-[#6366f1]/20 hover:bg-[#6366f1]/20 transition cursor-pointer"
                    title={`Ask Pulse about ${symbol}`}
                  >
                    <Sparkles className="w-3 h-3 text-[#6366f1]" />
                    <span className="hidden sm:inline">Ask Pulse</span>
                  </button>

                  <button
                    onClick={() => handleRemoveCoin(symbol)}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--negative)] hover:bg-[#ef4444]/10 transition cursor-pointer"
                    title={`Remove ${symbol} from watchlist`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
