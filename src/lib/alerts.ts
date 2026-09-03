import { PortfolioData } from './binance';

export type Alert = {
  type: "warning" | "info" | "positive";
  title: string;
  message: string;
  affectedAsset?: string;
};

export function generateAlerts(portfolio: PortfolioData): Alert[] {
  const alerts: Alert[] = [];
  
  if (!portfolio || portfolio.assets.length === 0 || portfolio.totalValueUSD === 0) {
    return alerts;
  }

  let total24hGainLossUSD = 0;
  let totalPreviousValue = 0;

  for (const asset of portfolio.assets) {
    // Deduce previous value to calculate total portfolio percentage change accurately
    const previousValue = asset.valueUSD / (1 + (asset.changePercent24h / 100));
    const gainLoss = asset.valueUSD - previousValue;
    
    total24hGainLossUSD += gainLoss;
    totalPreviousValue += previousValue;

    // Rule 1: Individual Asset Drop > 10%
    if (asset.changePercent24h < -10) {
      alerts.push({
        type: "warning",
        title: "Major Price Drop",
        message: `${asset.symbol} is down ${Math.abs(asset.changePercent24h).toFixed(1)}% today — here is what that means for your portfolio value.`,
        affectedAsset: asset.symbol
      });
    } 
    // Rule 2: Individual Asset Gain > 10%
    else if (asset.changePercent24h > 10) {
      alerts.push({
        type: "positive",
        title: "Significant Gain",
        message: `${asset.symbol} is up ${asset.changePercent24h.toFixed(1)}% today — your position gained $${gainLoss.toFixed(2)} from this move.`,
        affectedAsset: asset.symbol
      });
    }
  }

  // Rule 3: Concentration Risk
  const topAsset = portfolio.assets[0];
  if (topAsset) {
    const topAssetPct = (topAsset.valueUSD / portfolio.totalValueUSD) * 100;
    if (topAssetPct > 70) {
      alerts.push({
        type: "warning",
        title: "High Concentration Risk",
        message: `Your portfolio is highly concentrated in ${topAsset.symbol} (${topAssetPct.toFixed(1)}%), exposing you to significant single-asset risk.`,
        affectedAsset: topAsset.symbol
      });
    }
  }

  // Rule 4 & 5: Overall Portfolio Performance
  const totalPortfolioChangePct = totalPreviousValue > 0 
    ? (total24hGainLossUSD / totalPreviousValue) * 100 
    : 0;

  if (totalPortfolioChangePct < -10) {
    alerts.push({
      type: "warning",
      title: "Portfolio Drawdown",
      message: `Your overall portfolio is down ${Math.abs(totalPortfolioChangePct).toFixed(1)}% today, resulting in an estimated loss of $${Math.abs(total24hGainLossUSD).toFixed(2)}.`,
    });
  } else if (totalPortfolioChangePct > 0) {
    alerts.push({
      type: "info",
      title: "Portfolio Growth",
      message: `Your portfolio is up today, gaining a total of $${total24hGainLossUSD.toFixed(2)} across all assets.`,
    });
  }

  // Priority sorting: warning (0), positive (1), info (2)
  const priorityMap: Record<Alert['type'], number> = { "warning": 0, "positive": 1, "info": 2 };
  alerts.sort((a, b) => priorityMap[a.type] - priorityMap[b.type]);

  // Return max 4 alerts
  return alerts.slice(0, 4);
}
