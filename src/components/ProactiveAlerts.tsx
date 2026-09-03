import { Alert } from '../lib/alerts';
import { AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ProactiveAlerts({ alerts, onAlertClick }: { alerts?: Alert[], onAlertClick?: (alert: Alert) => void }) {
  if (!alerts || alerts.length === 0) return null;

  const getAlertStyles = (type: string) => {
    switch(type) {
      case 'warning': return { border: 'border-l-[#ef4444]', icon: <AlertTriangle className="w-4 h-4 text-[#ef4444]" />, bg: 'bg-[#ef4444]/5' };
      case 'positive': return { border: 'border-l-[#22c55e]', icon: <TrendingUp className="w-4 h-4 text-[#22c55e]" />, bg: 'bg-[#22c55e]/5' };
      default: return { border: 'border-l-[#6366f1]', icon: <Info className="w-4 h-4 text-[#6366f1]" />, bg: 'bg-[#6366f1]/5' };
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] shadow-sm flex flex-col h-full overflow-hidden">
      <h3 className="text-xs text-[#6b7280] uppercase tracking-wider mb-4 font-semibold">Pulse Noticed</h3>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}>
        <AnimatePresence>
          {alerts.map((alert, i) => {
            const styles = getAlertStyles(alert.type);
            return (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.2 }}
                onClick={() => onAlertClick && onAlertClick(alert)}
                className={`p-3 rounded-r-xl border-l-4 ${styles.border} ${styles.bg} border-y border-r border-[rgba(255,255,255,0.06)] flex flex-col gap-2 group ${onAlertClick ? 'cursor-pointer hover:brightness-110 hover:border-[#6366f1]/30 transition-all' : ''}`}
              >
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5 shrink-0">{styles.icon}</div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-[#f9fafb]">{alert.title}</h4>
                    <p className="text-xs text-[#6b7280] mt-1 leading-relaxed">{alert.message}</p>
                  </div>
                </div>
                {onAlertClick && (
                  <div className="text-xs text-[#6366f1] self-end font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                    Ask Pulse &rarr;
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
