import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Sector } from 'recharts';
import { RefreshCw, Wallet } from 'lucide-react';
import { PortfolioData } from '../lib/binance';
import { RiskResult, calculateRiskScore } from '../lib/risk';
import { Alert, generateAlerts } from '../lib/alerts';
import { calculatePulseScore, PulseScoreResult } from '../lib/pulseScore';
import RiskScore from './RiskScore';
import PulseScore from './PulseScore';
import ProactiveAlerts from './ProactiveAlerts';
import { useCountUp } from '../hooks/useCountUp';
import { motion } from 'motion/react';

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="shimmer p-6 rounded-2xl border border-[rgba(255,255,255,0.06)] h-[140px]"></div>
      <div className="shimmer p-5 rounded-2xl border border-[rgba(255,255,255,0.06)] h-[120px]"></div>
      <div className="shimmer p-5 rounded-2xl border border-[rgba(255,255,255,0.06)] h-[160px]"></div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="shimmer p-6 rounded-2xl border border-[rgba(255,255,255,0.06)] col-span-1 lg:col-span-2 h-[260px]"></div>
        <div className="shimmer p-6 rounded-2xl border border-[rgba(255,255,255,0.06)] col-span-1 lg:col-span-3 h-[260px]"></div>
      </div>
    </div>
  );
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

export default function PortfolioDashboard({
  portfolio,
  risk: propRisk,
  alerts: propAlerts,
  onRefresh,
  onAlertClick
}: {
  portfolio?: PortfolioData;
  risk?: RiskResult;
  alerts?: Alert[];
  onRefresh?: () => void;
  onAlertClick?: (alert: Alert) => void;
}) {

  const animatedTotalValue = useCountUp(portfolio?.totalValueUSD || 0, 1000);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  const { risk, alerts, pulseScore, chartData, changeUSD, changePct } = useMemo(() => {
    if (!portfolio) return { risk: propRisk, alerts: propAlerts, pulseScore: undefined, chartData: [], changeUSD: 0, changePct: 0 };
    
    const calculatedRisk = propRisk || calculateRiskScore(portfolio);
    const calculatedAlerts = propAlerts || generateAlerts(portfolio);
    const pulseScore = calculatePulseScore(portfolio, calculatedRisk);
    
    const top5 = portfolio.assets.slice(0, 5);
    const othersValue = portfolio.assets.slice(5).reduce((sum, a) => sum + a.valueUSD, 0);
    const chartData = top5.map(a => ({ name: a.symbol.replace('USDT',''), value: a.valueUSD, percent: (a.valueUSD / portfolio.totalValueUSD) * 100, originalSymbol: a.symbol }));
    if (othersValue > 0) chartData.push({ name: 'Others', value: othersValue, percent: (othersValue / portfolio.totalValueUSD) * 100, originalSymbol: 'Others' });

    let totalPrev = 0;
    portfolio.assets.forEach(a => {
      totalPrev += a.valueUSD / (1 + (a.changePercent24h / 100));
    });
    const cUSD = portfolio.totalValueUSD - totalPrev;
    const cPct = totalPrev > 0 ? (cUSD / totalPrev) * 100 : 0;

    return { risk: calculatedRisk, alerts: calculatedAlerts, pulseScore, chartData, changeUSD: cUSD, changePct: cPct };
  }, [portfolio, propRisk, propAlerts]);

  if (!portfolio) {
    return <DashboardSkeleton />;
  }

  if (portfolio.assets.length === 0 || portfolio.totalValueUSD === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center py-20 bg-[#0d0d0d] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-sm min-h-[500px]">
        <Wallet className="w-12 h-12 text-[#6366f1]/50 mb-4" />
        <p className="text-lg font-semibold text-[#f9fafb] mb-2">No assets found</p>
        <p className="text-sm text-[#6b7280] max-w-sm">Your Binance account appears to have no active balances. Add funds to your account to get started.</p>
        <button 
          onClick={onRefresh} 
          className="mt-6 min-h-[44px] flex items-center gap-2 px-6 py-2.5 bg-[#6366f1]/10 text-[#6366f1] border border-[#6366f1]/20 rounded-xl hover:bg-[#6366f1]/20 transition-all font-medium"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Balance
        </button>
      </div>
    );
  }

  const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316', '#64748b'];

  const formatCryptoAmount = (symbol: string, amount: number) => {
    const isBTC = symbol.includes('BTC');
    const decimals = isBTC ? 6 : 4;
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(amount);
  };

  const handlePieClick = (entry: any) => {
    if (entry.originalSymbol === 'Others') return;
    if (selectedAsset === entry.originalSymbol) {
      setSelectedAsset(null);
    } else {
      setSelectedAsset(entry.originalSymbol);
    }
  };

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">
      
      {/* 1. Total value + 24h change */}
      <div className="p-6 rounded-2xl bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] shadow-sm">
        <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-2 font-semibold">Total Balance</p>
        <h2 className="text-4xl font-bold text-[#f9fafb] tracking-tight">
          {formatUSD(animatedTotalValue)}
        </h2>
        <p className={`text-sm mt-3 flex items-center gap-1.5 font-medium ${changeUSD >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {changeUSD >= 0 ? '+' : ''}{formatUSD(Math.abs(changeUSD))} 
          <span className="opacity-75">({changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%) 24h</span>
        </p>
      </div>

      {/* 2. Pulse Score */}
      {pulseScore && <PulseScore pulseScore={pulseScore} />}

      {/* 3. Risk Score card */}
      <RiskScore risk={risk} />

      {/* 4. Proactive Alerts */}
      <ProactiveAlerts alerts={alerts} onAlertClick={onAlertClick} />

      {/* 5. Donut chart + Holdings */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
         
         <div className="p-6 rounded-2xl bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] shadow-sm lg:col-span-2">
            <h3 className="font-semibold text-[#f9fafb] mb-6">Allocation</h3>
            <div className="h-[200px] mb-6 cursor-pointer">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={chartData} 
                    innerRadius={60} 
                    outerRadius={80} 
                    paddingAngle={3} 
                    dataKey="value" 
                    stroke="none"
                    onClick={handlePieClick}
                    activeIndex={chartData.findIndex(d => d.originalSymbol === selectedAsset)}
                    activeShape={renderActiveShape}
                  >
                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(val: number) => formatUSD(val)}
                    contentStyle={{ backgroundColor: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}
                    itemStyle={{ color: '#f9fafb', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
              {chartData.map((entry, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${selectedAsset === entry.originalSymbol ? 'text-[#f9fafb] font-bold' : 'text-[#f9fafb]'}`}
                  onClick={() => handlePieClick(entry)}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span className="font-medium">{entry.name}</span>
                  <span className="text-[#6b7280]">{entry.percent?.toFixed(2)}%</span>
                </div>
              ))}
            </div>
         </div>

         <div className="p-6 rounded-2xl bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] shadow-sm lg:col-span-3 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
           <div className="flex justify-between items-center mb-6">
             <h3 className="font-semibold text-[#f9fafb]">Holdings</h3>
             <div className="flex items-center gap-2 text-xs text-[#6b7280]">
               <RefreshCw className="w-3 h-3 text-[#6366f1]" />
               Auto-updates
             </div>
           </div>
           
           <div className="w-full">
             <table className="w-full text-sm text-left">
               <thead className="text-xs text-[#6b7280] uppercase border-b border-[rgba(255,255,255,0.06)]">
                 <tr>
                   <th className="pb-3 px-2 font-semibold">Asset</th>
                   <th className="pb-3 px-2 font-semibold">Price</th>
                   <th className="pb-3 px-2 font-semibold">Balance</th>
                   <th className="pb-3 px-2 text-right font-semibold">24h</th>
                 </tr>
               </thead>
               <tbody className="text-[#f9fafb]">
                 {portfolio.assets.map(asset => {
                   const isSelected = selectedAsset === asset.symbol;
                   return (
                   <tr 
                     key={asset.symbol} 
                     className={`border-b border-[rgba(255,255,255,0.06)]/50 transition-colors ${isSelected ? 'bg-[#6366f1]/10 border border-[#6366f1]/20' : 'hover:bg-[rgba(255,255,255,0.06)]/30'}`}
                   >
                     <td className="py-3 px-2 font-medium">{asset.symbol.replace('USDT', '')}</td>
                     <td className="py-3 px-2">{formatUSD(asset.priceUSD)}</td>
                     <td className="py-3 px-2">
                       <div className="flex flex-col">
                         <span>{formatUSD(asset.valueUSD)}</span>
                         <span className="text-[10px] text-[#6b7280]">{formatCryptoAmount(asset.symbol, asset.amount)}</span>
                       </div>
                     </td>
                     <td className={`py-3 px-2 text-right font-medium ${asset.changePercent24h >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                       {asset.changePercent24h >= 0 ? '+' : ''}{asset.changePercent24h.toFixed(2)}%
                     </td>
                   </tr>
                 )})}
               </tbody>
             </table>
           </div>
         </div>

      </div>
    </motion.div>
  );
}
