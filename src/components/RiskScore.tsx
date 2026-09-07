import { RiskResult } from "../lib/risk";
import { useCountUp } from "../hooks/useCountUp";

export default function RiskScore({ risk }: { risk?: RiskResult }) {
  if (!risk) return null;

  const animatedScore = useCountUp(risk.score, 1000);
  const fillPercentage = (animatedScore / 10) * 100;

  return (
    <div className="p-6 rounded-2xl bg-[var(--bg-card)] shadow-card border border-[var(--border-subtle)] flex flex-col w-full h-full">
      <div className="flex items-end justify-between mb-3">
        <h3 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--text-muted)]">
          Risk Score
        </h3>
        <span className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
          {Math.round(animatedScore * 10) / 10}
          <span className="text-[var(--text-muted)] text-lg font-medium">
            /10
          </span>
        </span>
      </div>

      <div className="w-full h-2 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden mb-2 relative">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${fillPercentage}%`,
            background: `linear-gradient(90deg, ${risk.color}aa, ${risk.color})`,
            boxShadow: `0 0 10px ${risk.color}aa`,
          }}
        ></div>
      </div>

      <p className="font-semibold text-sm mb-6" style={{ color: risk.color }}>
        {risk.label}
      </p>

      <ul className="flex flex-col gap-2 mb-6">
        {risk.factors.map((factor, i) => (
          <li
            key={i}
            className="font-normal leading-relaxed text-[var(--text-secondary)] text-sm flex items-start gap-2"
          >
            <span
              className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
              style={{ backgroundColor: risk.color }}
            ></span>
            <span>{factor}</span>
          </li>
        ))}
      </ul>

      <p className="font-normal leading-relaxed text-[var(--text-secondary)] text-sm italic mt-auto border-t border-[var(--border-subtle)] pt-4">
        {risk.summary}
      </p>
    </div>
  );
}
