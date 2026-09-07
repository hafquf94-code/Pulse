import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { PulseScoreResult } from "../lib/pulseScore";

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
    { name: "Diversification", points: pulseScore.breakdown.diversification },
    { name: "Performance", points: pulseScore.breakdown.performance },
    { name: "Risk Management", points: pulseScore.breakdown.riskManagement },
    { name: "Stability", points: pulseScore.breakdown.stability },
  ];

  return (
    <div className="bg-[var(--bg-card)] shadow-card border border-[var(--border-subtle)] rounded-2xl p-6 w-full">
      {/* Top: Pulse Score label in tiny uppercase muted text */}
      <div className="text-center">
        <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--text-muted)] block">
          Pulse Score
        </span>

        {/* Center: score number HUGE — text-7xl font-black */}
        <div
          className="text-7xl font-black tracking-tight my-2"
          style={{
            color: pulseScore.color,
            filter:
              pulseScore.score >= 80
                ? "drop-shadow(0 0 12px currentColor)"
                : "none",
          }}
        >
          {pulseScore.score}
        </div>

        {/* Below number: label in score color font-semibold + Trend indicator */}
        <div
          className="inline-flex items-center gap-1.5 font-semibold text-sm"
          style={{ color: pulseScore.color }}
        >
          <span>{pulseScore.label}</span>
          {pulseScore.trend === "up" && <TrendingUp className="w-4 h-4" />}
          {pulseScore.trend === "down" && <TrendingDown className="w-4 h-4" />}
          {pulseScore.trend === "neutral" && <Minus className="w-4 h-4" />}
        </div>
      </div>

      {/* Divider line */}
      <div className="border-t border-[var(--border-subtle)] my-6"></div>

      {/* 4 breakdown bars below */}
      <div className="space-y-3.5">
        {categories.map((cat) => (
          <div key={cat.name} className="flex items-center gap-3 text-xs">
            <span className="font-medium text-[var(--text-secondary)] w-28 sm:w-32 shrink-0 truncate">
              {cat.name}
            </span>
            <div className="flex-1 bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)] h-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: mounted ? `${(cat.points / 25) * 100}%` : "0%",
                  background: `linear-gradient(90deg, ${pulseScore.color}99, ${pulseScore.color})`,
                }}
              />
            </div>
            <span className="text-[var(--text-primary)] font-black w-10 text-right shrink-0">
              {cat.points}/25
            </span>
          </div>
        ))}
      </div>

      {/* Bottom: insight sentence in text-sm text-[var(--text-secondary)] italic */}
      <p className="font-normal leading-relaxed text-[var(--text-secondary)] text-sm mt-6 pt-5 border-t border-[var(--border-subtle)]">
        "{pulseScore.insight}"
      </p>
    </div>
  );
}
