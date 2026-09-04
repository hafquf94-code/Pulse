import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PulseScoreResult } from '../lib/pulseScore';

interface PulseScoreProps {
  pulseScore: PulseScoreResult;
}

export default function PulseScore({ pulseScore }: PulseScoreProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(timer);
  }, []);

  const categories = [
    { name: 'Diversification', points: pulseScore.breakdown.diversification },
    { name: 'Performance', points: pulseScore.breakdown.performance },
    { name: 'Risk Management', points: pulseScore.breakdown.riskManagement },
    { name: 'Stability', points: pulseScore.breakdown.stability }
  ];

  return (
    <div className="bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 w-full shadow-sm">
      {/* Top: Pulse Score label in tiny uppercase muted text */}
      <div className="text-center">
        <span className="text-[10px] font-bold tracking-wider text-[#6b7280] uppercase block">
          Pulse Score
        </span>

        {/* Center: score number HUGE — text-7xl font-black */}
        <div 
          className="text-7xl font-black tracking-tight my-2"
          style={{ color: pulseScore.color }}
        >
          {pulseScore.score}
        </div>

        {/* Below number: label in score color font-semibold + Trend indicator */}
        <div 
          className="inline-flex items-center gap-1.5 font-semibold text-sm"
          style={{ color: pulseScore.color }}
        >
          <span>{pulseScore.label}</span>
          {pulseScore.trend === 'up' && <TrendingUp className="w-4 h-4" />}
          {pulseScore.trend === 'down' && <TrendingDown className="w-4 h-4" />}
          {pulseScore.trend === 'neutral' && <Minus className="w-4 h-4" />}
        </div>
      </div>

      {/* Divider line */}
      <div className="border-t border-[rgba(255,255,255,0.06)] my-6"></div>

      {/* 4 breakdown bars below */}
      <div className="space-y-3.5">
        {categories.map((cat) => (
          <div key={cat.name} className="flex items-center gap-3 text-xs">
            <span className="text-[#9ca3af] font-medium w-28 sm:w-32 shrink-0 truncate">
              {cat.name}
            </span>
            <div className="flex-1 bg-black/40 border border-white/5 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ 
                  width: mounted ? `${(cat.points / 25) * 100}%` : '0%',
                  backgroundColor: pulseScore.color 
                }}
              />
            </div>
            <span className="text-[#f9fafb] font-semibold w-10 text-right shrink-0">
              {cat.points}/25
            </span>
          </div>
        ))}
      </div>

      {/* Bottom: insight sentence in text-sm text-[#6b7280] italic */}
      <p className="text-sm text-[#6b7280] italic leading-relaxed mt-6 pt-5 border-t border-[rgba(255,255,255,0.04)]">
        "{pulseScore.insight}"
      </p>
    </div>
  );
}
