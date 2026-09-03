import { PortfolioData } from './binance';

export type RiskResult = {
  score: number;
  label: "Low" | "Moderate" | "High" | "Very High";
  color: string;
  factors: string[];
  summary: string;
};

export function calculateRiskScore(portfolio: PortfolioData): RiskResult {
  let score = 5;
  const factors: string[] = [];

  if (!portfolio || portfolio.assets.length === 0 || portfolio.totalValueUSD === 0) {
    return {
      score: 1,
      label: "Low",
      color: "#22c55e",
      factors: ["Empty or zero-value portfolio."],
      summary: "Your portfolio has no active risk."
    };
  }

  // Assets are already sorted by valueUSD descending from getPortfolioData
  const top1 = portfolio.assets[0];
  const top2 = portfolio.assets.length > 1 ? portfolio.assets[1] : null;

  // Rule 1 & 2: Top 1 Concentration
  const top1Pct = (top1.valueUSD / portfolio.totalValueUSD) * 100;
  if (top1Pct > 80) {
    score += 3;
    factors.push(`Extreme concentration: ${top1.symbol} makes up over 80% of your portfolio.`);
  } else if (top1Pct > 60) {
    score += 2;
    factors.push(`High concentration: ${top1.symbol} makes up over 60% of your portfolio.`);
  }

  // Rule 3: Top 2 Concentration
  let top2AssetsValue = top1.valueUSD;
  if (top2) {
    top2AssetsValue += top2.valueUSD;
  }
  const top2Pct = (top2AssetsValue / portfolio.totalValueUSD) * 100;
  if (top2Pct > 80) {
    score += 1;
    factors.push(`Top-heavy distribution: Your top 2 assets make up over 80% of your total holdings.`);
  }

  // Rule 4 & 5: Volatility
  let maxAbsChange = 0;
  let extremeVolAsset = "";
  for (const asset of portfolio.assets) {
    const absChange = Math.abs(asset.changePercent24h);
    if (absChange > maxAbsChange) {
      maxAbsChange = absChange;
      extremeVolAsset = asset.symbol;
    }
  }

  if (maxAbsChange > 25) {
    score += 2;
    factors.push(`Extreme volatility: ${extremeVolAsset} has moved by ${maxAbsChange.toFixed(1)}% in the last 24h.`);
  } else if (maxAbsChange > 15) {
    score += 1;
    factors.push(`High volatility: ${extremeVolAsset} has moved by ${maxAbsChange.toFixed(1)}% in the last 24h.`);
  }

  // Rule 6: Stablecoin Safety
  const stablecoins = ['USDT', 'USDC', 'BUSD'];
  const stablecoinValue = portfolio.assets
    .filter(a => stablecoins.includes(a.symbol))
    .reduce((sum, a) => sum + a.valueUSD, 0);
  
  const stablePct = (stablecoinValue / portfolio.totalValueUSD) * 100;
  if (stablePct > 40) {
    score -= 1;
    factors.push(`Safety buffer: ${stablePct.toFixed(1)}% of your portfolio is in stablecoins, shielding against market drops.`);
  }

  // Clamp score
  score = Math.max(1, Math.min(10, score));

  // Determine Label and Color
  let label: RiskResult['label'] = "Low";
  let color = "#22c55e"; // green
  let summary = "";

  if (score <= 3) {
    label = "Low";
    color = "#22c55e";
    summary = "Your portfolio exhibits a highly conservative, low-risk profile.";
  } else if (score <= 5) {
    label = "Moderate";
    color = "#eab308"; // yellow
    summary = "Your portfolio has a balanced and well-distributed moderate risk profile.";
  } else if (score <= 7) {
    label = "High";
    color = "#f97316"; // orange
    summary = "Your portfolio is exposed to elevated risk due to concentration or high volatility.";
  } else {
    label = "Very High";
    color = "#ef4444"; // red
    summary = "Your portfolio is carrying severe risk and is highly vulnerable to sudden market shocks.";
  }

  return { score, label, color, factors, summary };
}
