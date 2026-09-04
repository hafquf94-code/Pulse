import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { PortfolioData } from '../lib/binance';

interface PortfolioHistoryProps {
  portfolio: PortfolioData;
}

type Timeframe = '24h' | '7d' | '30d';

interface HistoryPoint {
  timestamp: string;
  fullDate: string;
  value: number;
}

export default function PortfolioHistory({ portfolio }: PortfolioHistoryProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('24h');
  const [data, setData] = useState<HistoryPoint[]>([]);

  // Calculate the portfolio-wide 24h weighted change percentage
  const weightedChange24h = useMemo(() => {
    const total = portfolio?.totalValueUSD || 0;
    if (total <= 0 || !portfolio?.assets?.length) return 0;
    return portfolio.assets.reduce((acc, asset) => {
      return acc + (asset.valueUSD * (asset.changePercent24h || 0));
    }, 0) / total;
  }, [portfolio]);

  // Seeded simulation generator
  useEffect(() => {
    const currentValue = portfolio?.totalValueUSD || 0;
    if (currentValue <= 0) {
      setData([]);
      return;
    }

    const now = new Date();
    const points: HistoryPoint[] = [];

    // Deterministic pseudo-random helper seeded by asset symbols and current value
    const seed = portfolio.assets.reduce((acc, a) => acc + a.symbol.charCodeAt(0), 42);
    const pseudoRandom = (i: number) => {
      const x = Math.sin(seed + i * 12.9898) * 43758.5453;
      return (x - Math.floor(x)) * 2 - 1; // range -1 to 1
    };

    if (timeframe === '24h') {
      // 25 hourly points from -24h to Now
      // Anchor 24h ago using weightedChange24h
      const value24hAgo = currentValue / (1 + (weightedChange24h / 100));
      const totalDelta = currentValue - value24hAgo;

      for (let i = 24; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        const progress = (24 - i) / 24; // 0 to 1
        
        let val: number;
        if (i === 0) {
          val = currentValue;
        } else {
          // Trend from value24hAgo to currentValue + realistic intraday oscillation
          const trend = value24hAgo + totalDelta * progress;
          const oscillation = pseudoRandom(i) * Math.abs(totalDelta * 0.25 || currentValue * 0.005) * Math.sin(progress * Math.PI);
          val = Math.max(currentValue * 0.1, trend + oscillation);
        }

        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = '00';
        points.push({
          timestamp: i === 0 ? 'Now' : `${hours}:${minutes}`,
          fullDate: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
          value: Number(val.toFixed(8))
        });
      }
    } else if (timeframe === '7d') {
      // 8 points (daily from 7 days ago to today)
      // Work backwards with ±3% daily crypto volatility
      const dailyVals: number[] = [currentValue];
      for (let d = 1; d <= 7; d++) {
        const prevVal = dailyVals[0];
        // Day 1 matches 24h change closely, older days walk with ±3% daily volatility
        const dailyChange = d === 1 ? weightedChange24h / 100 : pseudoRandom(d * 7) * 0.035;
        const simulatedPastVal = Math.max(currentValue * 0.1, prevVal / (1 + dailyChange));
        dailyVals.unshift(simulatedPastVal);
      }

      for (let i = 0; i <= 7; i++) {
        const d = new Date(now.getTime() - (7 - i) * 24 * 60 * 60 * 1000);
        const dayLabel = i === 7 ? 'Today' : d.toLocaleDateString([], { weekday: 'short' });
        points.push({
          timestamp: dayLabel,
          fullDate: d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
          value: Number(dailyVals[i].toFixed(8))
        });
      }
    } else {
      // 30d: 31 daily points
      const dailyVals: number[] = [currentValue];
      for (let d = 1; d <= 30; d++) {
        const prevVal = dailyVals[0];
        const dailyChange = d === 1 ? weightedChange24h / 100 : pseudoRandom(d * 31) * 0.03;
        const simulatedPastVal = Math.max(currentValue * 0.1, prevVal / (1 + dailyChange));
        dailyVals.unshift(simulatedPastVal);
      }

      for (let i = 0; i <= 30; i++) {
        const d = new Date(now.getTime() - (30 - i) * 24 * 60 * 60 * 1000);
        const dateLabel = i === 30 ? 'Today' : d.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
        points.push({
          timestamp: dateLabel,
          fullDate: d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
          value: Number(dailyVals[i].toFixed(8))
        });
      }
    }

    setData(points);
  }, [portfolio, timeframe, weightedChange24h]);

  // Statistics
  const { periodHigh, periodLow, changePercent, isPositiveChange } = useMemo(() => {
    if (!data.length) {
      return { periodHigh: 0, periodLow: 0, changePercent: 0, isPositiveChange: true };
    }
    const values = data.map(d => d.value);
    const high = Math.max(...values);
    const low = Math.min(...values);
    const firstVal = data[0].value;
    const lastVal = data[data.length - 1].value;
    const change = firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;
    return {
      periodHigh: high,
      periodLow: low,
      changePercent: change,
      isPositiveChange: change >= 0
    };
  }, [data]);

  // Formatter helpers
  const formatUSD = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
    if (val >= 1) return `$${val.toFixed(2)}`;
    if (val > 0) return `$${val.toPrecision(3)}`;
    return `$0`;
  };

  const formatDetailedUSD = (val: number) => {
    if (val >= 1) {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })}`;
  };

  return (
    <div className="bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 shadow-sm">
      {/* Header with Title and Timeframe Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-[#6b7280] uppercase">Performance</span>
          <h2 className="text-xl font-bold text-[#f9fafb] tracking-tight mt-0.5">Portfolio History</h2>
        </div>

        {/* Timeframe selector pill buttons */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 self-start sm:self-auto">
          {(['24h', '7d', '30d'] as Timeframe[]).map((tf) => {
            const isActive = timeframe === tf;
            return (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#6366f1]/20 text-[#6366f1] border border-[#6366f1]/30'
                    : 'text-[#6b7280] hover:text-[#f9fafb] border border-transparent'
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-64 sm:h-72">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="historyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#6b7280" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#6b7280', fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#6b7280" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickFormatter={formatUSD}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as HistoryPoint;
                    return (
                      <div className="bg-[#0d0d0d] border border-[rgba(255,255,255,0.1)] rounded-xl p-3 shadow-2xl text-xs backdrop-blur-md">
                        <p className="text-[#6b7280] mb-1 font-medium">{item.fullDate}</p>
                        <p className="text-[#f9fafb] font-bold text-sm">
                          {formatDetailedUSD(item.value)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#historyGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 1.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-[#6b7280]">
            No historical data available
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)]">
        <div className="bg-black/30 border border-white/5 rounded-xl p-3">
          <span className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider block mb-1">
            Period High
          </span>
          <span className="text-sm sm:text-base font-bold text-[#22c55e]">
            {formatDetailedUSD(periodHigh)}
          </span>
        </div>

        <div className="bg-black/30 border border-white/5 rounded-xl p-3">
          <span className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider block mb-1">
            Period Low
          </span>
          <span className="text-sm sm:text-base font-bold text-[#ef4444]">
            {formatDetailedUSD(periodLow)}
          </span>
        </div>

        <div className="bg-black/30 border border-white/5 rounded-xl p-3">
          <span className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider block mb-1">
            Change ({timeframe})
          </span>
          <div className="flex items-center gap-1">
            {isPositiveChange ? (
              <TrendingUp className="w-3.5 h-3.5 text-[#22c55e]" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-[#ef4444]" />
            )}
            <span className={`text-sm sm:text-base font-bold ${isPositiveChange ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {isPositiveChange ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
