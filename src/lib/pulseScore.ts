import { PortfolioData } from './binance';
import { RiskResult } from './risk';

export type PulseScoreResult = {
  score: number; // (0-100)
  label: "Critical" | "Poor" | "Fair" | "Good" | "Excellent";
  color: string; // (hex)
  breakdown: {
    diversification: number; // (0-25, raw points)
    performance: number; // (0-25, raw points)
    riskManagement: number; // (0-25, raw points)
    stability: number; // (0-25, raw points)
  };
  insight: string; // (one plain English sentence explaining the score)
  trend: "up" | "down" | "neutral"; // (based on overall 24h performance)
};

export function calculatePulseScore(portfolio: PortfolioData, risk: RiskResult): PulseScoreResult {
  if (!portfolio || !portfolio.assets || portfolio.assets.length === 0 || portfolio.totalValueUSD === 0) {
    return {
      score: 0,
      label: "Critical",
      color: "#ef4444",
      breakdown: {
        diversification: 0,
        performance: 0,
        riskManagement: 0,
        stability: 0
      },
      insight: "Your portfolio has no active assets or valuation to assess.",
      trend: "neutral"
    };
  }

  // 1. DIVERSIFICATION (0-25)
  // - 1 asset: 5 points
  // - 2-3 assets: 12 points
  // - 4-6 assets: 20 points
  // - 7+ assets: 25 points
  // - Deduct 5 if top asset > 70% of portfolio
  const assetCount = portfolio.assets.length;
  let diversification = 5;
  if (assetCount >= 7) {
    diversification = 25;
  } else if (assetCount >= 4) {
    diversification = 20;
  } else if (assetCount >= 2) {
    diversification = 12;
  } else {
    diversification = 5;
  }

  const sortedAssets = [...portfolio.assets].sort((a, b) => b.valueUSD - a.valueUSD);
  const topAsset = sortedAssets[0];
  const topPct = portfolio.totalValueUSD > 0 && topAsset 
    ? (topAsset.valueUSD / portfolio.totalValueUSD) * 100 
    : 0;

  if (topPct > 70) {
    diversification -= 5;
  }
  diversification = Math.max(0, Math.min(25, diversification));

  // 2. PERFORMANCE (0-25)
  // Based on overall 24h portfolio change:
  // - Greater than +5%: 25 points
  // - +2% to +5%: 20 points
  // - 0% to +2%: 15 points
  // - -2% to 0%: 10 points
  // - -5% to -2%: 5 points
  // - Less than -5%: 0 points
  let totalPrev = 0;
  for (const a of portfolio.assets) {
    totalPrev += a.valueUSD / (1 + (a.changePercent24h / 100));
  }
  const overallChange24h = totalPrev > 0 
    ? ((portfolio.totalValueUSD - totalPrev) / totalPrev) * 100 
    : 0;

  let performance = 0;
  if (overallChange24h > 5) {
    performance = 25;
  } else if (overallChange24h > 2) {
    performance = 20;
  } else if (overallChange24h >= 0) {
    performance = 15;
  } else if (overallChange24h >= -2) {
    performance = 10;
  } else if (overallChange24h >= -5) {
    performance = 5;
  } else {
    performance = 0;
  }

  // 3. RISK MANAGEMENT (0-25)
  // Convert risk score (1-10) inversely: ((10 - riskScore) / 9) * 25
  // Round to nearest integer
  const riskScoreVal = risk?.score ?? 5;
  const riskManagement = Math.max(0, Math.min(25, Math.round(((10 - riskScoreVal) / 9) * 25)));

  // 4. STABILITY (0-25)
  // Based on max single asset 24h volatility:
  // - Less than 3% movement: 25 points
  // - 3-5%: 20 points
  // - 5-10%: 15 points
  // - 10-15%: 8 points
  // - Greater than 15%: 3 points
  let maxVolatility = 0;
  for (const a of portfolio.assets) {
    const absChange = Math.abs(a.changePercent24h);
    if (absChange > maxVolatility) {
      maxVolatility = absChange;
    }
  }

  let stability = 25;
  if (maxVolatility < 3) {
    stability = 25;
  } else if (maxVolatility <= 5) {
    stability = 20;
  } else if (maxVolatility <= 10) {
    stability = 15;
  } else if (maxVolatility <= 15) {
    stability = 8;
  } else {
    stability = 3;
  }

  // Total Score (0-100)
  const score = Math.max(0, Math.min(100, diversification + performance + riskManagement + stability));

  // Labels and colors:
  // - 0-20: Critical #ef4444
  // - 21-40: Poor #f97316
  // - 41-60: Fair #eab308
  // - 61-80: Good #22c55e
  // - 81-100: Excellent #6366f1
  let label: "Critical" | "Poor" | "Fair" | "Good" | "Excellent" = "Critical";
  let color = "#ef4444";
  if (score >= 81) {
    label = "Excellent";
    color = "#6366f1";
  } else if (score >= 61) {
    label = "Good";
    color = "#22c55e";
  } else if (score >= 41) {
    label = "Fair";
    color = "#eab308";
  } else if (score >= 21) {
    label = "Poor";
    color = "#f97316";
  } else {
    label = "Critical";
    color = "#ef4444";
  }

  // Trend: positive overall 24h change = "up", negative = "down", within ±0.5% = "neutral"
  let trend: "up" | "down" | "neutral" = "neutral";
  if (overallChange24h > 0.5) {
    trend = "up";
  } else if (overallChange24h < -0.5) {
    trend = "down";
  } else {
    trend = "neutral";
  }

  // Insight: generate a plain English sentence based on the weakest scoring category and the overall score.
  const categories = [
    { name: 'diversification', value: diversification },
    { name: 'performance', value: performance },
    { name: 'riskManagement', value: riskManagement },
    { name: 'stability', value: stability }
  ];
  categories.sort((a, b) => a.value - b.value);
  const weakest = categories[0];

  let insight = "";
  if (score >= 81) {
    insight = "Your portfolio shows excellent overall balance across asset diversification, managed risk exposure, and market stability.";
  } else {
    switch (weakest.name) {
      case 'diversification':
        insight = topPct > 70
          ? `High concentration in ${topAsset?.symbol || 'your primary holding'} (${topPct.toFixed(1)}%) is holding back your portfolio health.`
          : "Spreading capital across more distinct, quality crypto assets would improve your diversification and overall score.";
        break;
      case 'performance':
        insight = overallChange24h < 0
          ? "Recent 24-hour market pullbacks across your positions are currently weighing down your overall score."
          : "Subdued 24-hour price gains across your assets are currently keeping your performance category modest.";
        break;
      case 'riskManagement':
        insight = "High allocation risk and unbalanced portfolio weighting are currently pulling down your overall health score.";
        break;
      case 'stability':
        insight = `Elevated volatility of up to ${maxVolatility.toFixed(1)}% in individual holdings is increasing overall portfolio swings.`;
        break;
    }
  }

  return {
    score,
    label,
    color,
    breakdown: {
      diversification,
      performance,
      riskManagement,
      stability
    },
    insight,
    trend
  };
}
