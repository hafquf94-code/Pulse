import { RiskResult } from '../lib/risk';
import { useCountUp } from '../hooks/useCountUp';

export default function RiskScore({ risk }: { risk?: RiskResult }) {
  if (!risk) return null;
  
  const animatedScore = useCountUp(risk.score, 1000);
  const fillPercentage = (animatedScore / 10) * 100;

  return (
    <div className="p-6 rounded-2xl bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] shadow-sm flex flex-col w-full h-full">
      <div className="flex items-end justify-between mb-3">
        <h3 className="text-sm text-[#f9fafb] font-semibold">Risk Score</h3>
        <span className="text-2xl font-bold tracking-tight text-[#f9fafb]">
          {Math.round(animatedScore * 10) / 10}<span className="text-[#6b7280] text-lg font-medium">/10</span>
        </span>
      </div>
      
      <div className="w-full h-2 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden mb-2">
        <div 
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${fillPercentage}%`, backgroundColor: risk.color }}
        ></div>
      </div>
      
      <p className="text-sm font-medium mb-6" style={{ color: risk.color }}>{risk.label}</p>
      
      <ul className="flex flex-col gap-2 mb-6">
        {risk.factors.map((factor, i) => (
          <li key={i} className="text-sm text-[#f9fafb] flex items-start gap-2 leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: risk.color }}></span>
            <span>{factor}</span>
          </li>
        ))}
      </ul>
      
      <p className="text-sm text-[#6b7280] italic mt-auto border-t border-[rgba(255,255,255,0.06)] pt-4">
        {risk.summary}
      </p>
    </div>
  );
}
