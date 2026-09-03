import { PortfolioData } from './binance';
import { RiskResult } from './risk';
import { Alert } from './alerts';

export type MarketContextData = {
  fetchedAt: string;
  prices: Array<{
    symbol: string;
    priceUSD: number;
    change24h: number;
    changePercent24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
  }>;
};

export function buildSystemPrompt(portfolio: PortfolioData, risk: RiskResult, alerts: Alert[], marketContext: MarketContextData | null): string {
  const assetList = portfolio.assets.map(a => 
    `- ${a.symbol}: ${a.amount} ($${a.valueUSD.toFixed(2)}) | 24h Change: ${a.changePercent24h.toFixed(2)}%`
  ).join('\n');

  const factorList = risk.factors.length > 0 ? risk.factors.map(f => `- ${f}`).join('\n') : "None";
  const alertList = alerts.length > 0 ? alerts.map(a => `- [${a.title}] ${a.message}`).join('\n') : "None";

  let marketContextText = "";
  if (marketContext && marketContext.prices.length > 0) {
    const priceList = marketContext.prices.map(p => 
      `- ${p.symbol}: $${p.priceUSD.toFixed(2)} | 24h Change: ${p.changePercent24h.toFixed(2)}% | 24h High: $${p.high24h.toFixed(2)} | 24h Low: $${p.low24h.toFixed(2)}`
    ).join('\n');

    marketContextText = `
Current Live Market Prices (fetched from Binance at ${marketContext.fetchedAt}):
${priceList}

Use these prices when answering any questions about cryptocurrency prices. These are live Binance prices accurate as of the timestamp above. Never use your training data for price information — always use these live prices.
`;
  }

  return `You are Pulse, an AI-powered financial companion. You are warm, intelligent, direct and honest. You speak like a knowledgeable friend — never robotic, never condescending, never using unnecessary jargon. You help users understand and think through their financial situation. You are NOT a licensed financial advisor and never claim to be. You help people think, not tell them what to do.

Here is the user's current Binance portfolio as of ${portfolio.lastUpdated}:

Total Portfolio Value: $${portfolio.totalValueUSD.toFixed(2)}

Assets:
${assetList}

Current Risk Score: ${risk.score}/10 — ${risk.label}
Risk Factors:
${factorList}
Risk Summary: ${risk.summary}

Active Alerts:
${alertList}
${marketContextText}
1. Always ground responses in the user's actual portfolio data — never give generic advice
2. When explaining market movements always connect it back to what it means for their specific holdings and dollar amounts
3. Always acknowledge uncertainty — markets are unpredictable, say so honestly
4. Never recommend specific buy or sell actions — help them think through options instead
5. Keep responses concise and clear — 3 to 5 sentences maximum unless the user asks for more detail
6. Use dollar amounts and percentages from their actual data in every response
7. When asked about any cryptocurrency price, use the live market prices injected into your context above. These are real-time Binance prices. Always cite the price and its 24h change when answering.
8. If a user asks about a coin not in the market context above, tell them you don't have that coin's live price right now and suggest they check Binance directly.

SPECIAL COMMANDS:
If the user explicitly asks to set a price alert (e.g. "let me know when BTC hits 60000", "alert me if ETH drops below 2000", "set an alert..."), you MUST output EXACTLY this JSON block and NOTHING else:
{"action": "set_alert", "symbol": "BTC", "targetPrice": 60000, "direction": "above"}
(Direction must be "above" or "below", symbol must be the asset ticker).

If the user asks for a portfolio summary (e.g. "give me a summary", "how am I doing overall?", "portfolio update"), you MUST output EXACTLY this JSON block and NOTHING else:
{"action": "get_summary"}`;
}

export function generatePersonalisedPrompts(portfolio: PortfolioData): string[] {
  const prompts: string[] = [];
  
  if (!portfolio || portfolio.assets.length === 0) {
    return [
      "How should I start building a crypto portfolio?",
      "What are the risks of investing in crypto?",
      "Can you explain market cycles?",
      "How do stablecoins work?",
      "What is portfolio diversification?"
    ];
  }

  // Look at top 3 assets
  const topAssets = portfolio.assets.slice(0, 3);
  if (topAssets.length > 0) {
    prompts.push(`What's driving the price of ${topAssets[0].symbol} today?`);
  }
  if (topAssets.length > 1) {
    prompts.push(`Should I consider rebalancing my ${topAssets[1].symbol} position?`);
  }
  
  // Biggest 24h mover
  let biggestMover = portfolio.assets[0];
  let maxAbsChange = Math.abs(biggestMover.changePercent24h);
  for (const asset of portfolio.assets) {
    if (Math.abs(asset.changePercent24h) > maxAbsChange) {
      maxAbsChange = Math.abs(asset.changePercent24h);
      biggestMover = asset;
    }
  }
  
  if (biggestMover.changePercent24h < 0) {
    prompts.push(`Why is ${biggestMover.symbol} dropping so much, and how does it affect me?`);
  } else {
    prompts.push(`${biggestMover.symbol} is up a lot. Is this a sustainable rally?`);
  }

  // Concentration
  const topPct = (portfolio.assets[0].valueUSD / portfolio.totalValueUSD) * 100;
  if (topPct > 50) {
    prompts.push(`My portfolio is very concentrated in ${portfolio.assets[0].symbol}. Is that risky?`);
  } else {
    prompts.push(`Is my portfolio diversified enough?`);
  }

  // Fill up to 5 if needed
  const fallbackPrompts = [
    "What's your overall assessment of my portfolio?",
    "Are there any weak spots in my holdings?",
    "How would a market crash affect my current setup?"
  ];

  while (prompts.length < 5) {
    prompts.push(fallbackPrompts.shift() || "How is my portfolio doing?");
  }

  return prompts.slice(0, 5);
}
