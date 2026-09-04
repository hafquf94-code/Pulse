import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as dotenv from 'dotenv';
import { getPortfolioData } from './src/lib/binance.js';

dotenv.config();

const sessionStore = new Map<string, { alerts: any[], snapshot: any }>();

const getSessionData = (apiKey: string) => {
  const sessionId = apiKey ? apiKey.substring(0, 8) : 'default';
  if (!sessionStore.has(sessionId)) {
    sessionStore.set(sessionId, { alerts: [], snapshot: null });
  }
  return sessionStore.get(sessionId)!;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS and OPTIONS handling for all API requests
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-binance-key, x-binance-secret, X-Requested-With, Accept');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Helper to extract keys
  const getKeys = (req: express.Request) => {
    let apiKey = (req.headers['x-binance-key'] as string) || process.env.BINANCE_API_KEY;
    let apiSecret = (req.headers['x-binance-secret'] as string) || process.env.BINANCE_API_SECRET;
    
    // Support demo/sandbox mode or empty values using server environment keys
    if (!apiKey || apiKey === 'demo' || apiKey === 'DEMO' || apiKey === 'sandbox' || apiKey.trim() === '') {
      apiKey = process.env.BINANCE_API_KEY;
    }
    if (!apiSecret || apiSecret === 'demo' || apiSecret === 'DEMO' || apiSecret === 'sandbox' || apiSecret.trim() === '') {
      apiSecret = process.env.BINANCE_API_SECRET;
    }
    return { apiKey, apiSecret };
  };

  // API routes go here FIRST
  app.get("/api/portfolio", async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const { apiKey, apiSecret } = getKeys(req);
      const data = await getPortfolioData(apiKey, apiSecret);
      res.status(200).json(data);
    } catch (error: any) {
      console.error("Portfolio fetch error:", error?.message || error);
      // If user supplied invalid custom keys, try fallback to preconfigured server demo account
      const rawUserKey = req.headers['x-binance-key'] as string;
      if (rawUserKey && rawUserKey !== 'demo' && process.env.BINANCE_API_KEY) {
        try {
          console.log("Custom keys rejected by Binance; falling back to server Binance account...");
          const fallbackData = await getPortfolioData(process.env.BINANCE_API_KEY, process.env.BINANCE_API_SECRET);
          return res.status(200).json({
            ...fallbackData,
            isDemoFallback: true,
            warning: "Your custom Binance API keys were invalid or lacked permissions. Displaying live demo portfolio instead."
          });
        } catch (fallbackError) {
          console.error("Fallback portfolio fetch failed as well:", fallbackError);
        }
      }
      res.status(500).json({ error: "Failed to fetch portfolio data", details: error.message || "Unknown error" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { apiKey, apiSecret } = getKeys(req);
      const { message, conversationHistory } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Check for Gemini API Key
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Server configuration error", details: "GEMINI_API_KEY is missing" });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const { calculateRiskScore } = await import("./src/lib/risk.js");
      const { generateAlerts } = await import("./src/lib/alerts.js");
      const { calculatePulseScore } = await import("./src/lib/pulseScore.js");
      const { buildSystemPrompt } = await import("./src/lib/gemini.js");
      
      const portfolio = await getPortfolioData(apiKey, apiSecret);
      const risk = calculateRiskScore(portfolio);
      const alerts = generateAlerts(portfolio);
      const pulseScore = calculatePulseScore(portfolio, risk);

      // Fetch market context
      const top10 = ['BTC','ETH','BNB','SOL','XRP','ADA','DOGE','AVAX','DOT','MATIC'];
      const portfolioSymbols = portfolio.assets.map(a => a.symbol.replace(/USDT$|BUSD$|USDC$/g, ''));
      const allTargetSymbols = [...new Set([...top10, ...portfolioSymbols])];
      
      let marketContext = null;
      try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
        if (response.ok) {
          const allTickers = await response.json();
          const prices = [];
          for (const sym of allTargetSymbols) {
            if (sym === 'USDT' || sym === 'BUSD' || sym === 'USDC') continue;
            const pair = `${sym}USDT`;
            const ticker = allTickers.find((t: any) => t.symbol === pair);
            if (ticker) {
              prices.push({
                symbol: sym,
                priceUSD: parseFloat(ticker.lastPrice),
                change24h: parseFloat(ticker.priceChange),
                changePercent24h: parseFloat(ticker.priceChangePercent),
                high24h: parseFloat(ticker.highPrice),
                low24h: parseFloat(ticker.lowPrice),
                volume24h: parseFloat(ticker.volume)
              });
            }
          }
          marketContext = {
            fetchedAt: new Date().toISOString(),
            prices
          };
        }
      } catch (e) {
        console.error("Failed to fetch market context for chat", e);
      }
      
      const systemInstruction = buildSystemPrompt(portfolio, risk, alerts, marketContext, pulseScore);
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Setup SSE response
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked'
      });

      // Format history
      const contents = conversationHistory ? conversationHistory.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })) : [];
      
      contents.push({ role: 'user', parts: [{ text: message }] });

      let responseStream;
      try {
        responseStream = await ai.models.generateContentStream({
          model: "gemini-2.5-flash",
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
          }
        });
      } catch (streamErr: any) {
        console.warn("Primary model error, falling back to gemini-3.8-flash:", streamErr?.message || streamErr);
        responseStream = await ai.models.generateContentStream({
          model: "gemini-3.8-flash",
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
          }
        });
      }

      for await (const chunk of responseStream) {
        res.write(chunk.text);
      }
      res.end();
    
    } catch (error: any) {
      console.error("Chat Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to process chat request", details: error.message });
      } else {
        res.end();
      }
    }
  });

  app.get("/api/market-context", async (req, res) => {
    try {
      const symbolsQuery = req.query.symbols as string;
      const top10 = ['BTC','ETH','BNB','SOL','XRP','ADA','DOGE','AVAX','DOT','MATIC'];
      const requestedSymbols = symbolsQuery ? symbolsQuery.split(',').map(s => s.trim().toUpperCase()) : top10;

      const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
      if (!response.ok) throw new Error("Failed to fetch Binance ticker data");
      const allTickers = await response.json();

      const prices = [];
      for (const sym of requestedSymbols) {
        const pair = `${sym}USDT`;
        const ticker = allTickers.find((t: any) => t.symbol === pair);
        if (ticker) {
          prices.push({
            symbol: sym,
            priceUSD: parseFloat(ticker.lastPrice),
            change24h: parseFloat(ticker.priceChange),
            changePercent24h: parseFloat(ticker.priceChangePercent),
            high24h: parseFloat(ticker.highPrice),
            low24h: parseFloat(ticker.lowPrice),
            volume24h: parseFloat(ticker.volume)
          });
        }
      }

      res.setHeader('Cache-Control', 'max-age=30');
      res.status(200).json({
        fetchedAt: new Date().toISOString(),
        prices
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch market context", details: error.message });
    }
  });

  app.get("/api/news", async (req, res) => {
    try {
      const symbolsQuery = req.query.symbols as string;
      const symbolsList = symbolsQuery
        ? symbolsQuery.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
        : [];

      // Fetch live crypto news from CryptoCompare's free public API
      const categoriesParam = symbolsList.length > 0
        ? `categories=${encodeURIComponent(symbolsList.join(','))}&`
        : '';
      const url = `https://min-api.cryptocompare.com/data/v2/news/?${categoriesParam}excludeCategories=Sponsored&lang=EN`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`CryptoCompare news API returned status ${response.status}`);
      }

      const data = await response.json();
      const rawList = Array.isArray(data?.Data) ? data.Data : [];

      const formatTimeAgo = (epochSeconds: number): string => {
        const now = Math.floor(Date.now() / 1000);
        const diff = Math.max(0, now - epochSeconds);
        if (diff < 60) return "just now";
        const mins = Math.floor(diff / 60);
        if (mins < 60) return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
        const months = Math.floor(days / 30);
        return `${months} ${months === 1 ? 'month' : 'months'} ago`;
      };

      const detectSentiment = (title: string): "positive" | "negative" | "neutral" => {
        const lower = title.toLowerCase();
        const positiveKeywords = ["surge", "rally", "soar", "gain", "bull", "rise", "high", "record", "up", "growth", "adoption"];
        const negativeKeywords = ["crash", "drop", "fall", "bear", "down", "hack", "ban", "lose", "dump", "plunge", "fear"];

        const hasPositive = positiveKeywords.some(w => {
          if (w === "up") return /\bup\b/i.test(lower);
          return new RegExp(`\\b${w}`, 'i').test(lower);
        });
        const hasNegative = negativeKeywords.some(w => {
          if (w === "down" || w === "ban") return new RegExp(`\\b${w}\\b`, 'i').test(lower);
          return new RegExp(`\\b${w}`, 'i').test(lower);
        });

        if (hasPositive) return "positive";
        if (hasNegative) return "negative";
        return "neutral";
      };

      const mapped = rawList.map((item: any) => {
        const rawCategories = (item.categories || '').split('|').map((c: string) => c.trim().toUpperCase()).filter(Boolean);
        const rawTags = (item.tags || '').split('|').map((t: string) => t.trim().toUpperCase()).filter(Boolean);
        const combined = Array.from(new Set([...rawCategories, ...rawTags]));

        const matchingUserSymbols = symbolsList.filter(sym => 
          item.title?.toUpperCase().includes(sym) || combined.includes(sym)
        );

        const relatedCoins = Array.from(new Set([...matchingUserSymbols, ...combined]));

        return {
          id: String(item.id || item.guid || Math.random().toString()),
          title: item.title || "",
          source: item.source_info?.name || item.source || "Crypto News",
          url: item.url || "#",
          publishedAt: formatTimeAgo(item.published_on || Math.floor(Date.now() / 1000)),
          publishedOn: item.published_on || 0,
          relatedCoins,
          sentiment: detectSentiment(item.title || "")
        };
      });

      mapped.sort((a: any, b: any) => b.publishedOn - a.publishedOn);
      const top10 = mapped.slice(0, 10).map(({ publishedOn, ...rest }: any) => rest);

      res.setHeader('Cache-Control', 'public, max-age=300');
      res.status(200).json(top10);
    } catch (error: any) {
      console.error("News fetch error:", error?.message || error);
      res.status(500).json({ error: "Failed to fetch news", details: error.message });
    }
  });

  app.get("/api/watchlist/prices", async (req, res) => {
    try {
      const symbolsQuery = req.query.symbols as string;
      if (!symbolsQuery) {
        return res.status(200).json([]);
      }

      const symbolsList = symbolsQuery
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);

      if (symbolsList.length === 0) {
        return res.status(200).json([]);
      }

      const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
      if (!response.ok) {
        throw new Error(`Failed to fetch Binance ticker data (${response.status})`);
      }
      const allTickers = await response.json();

      const results = [];
      for (const rawSym of symbolsList) {
        const cleanSym = rawSym.replace(/USDT$|BUSD$|USDC$/g, '');
        // Search pair priority: cleanSym + USDT, then rawSym, then cleanSym + BUSD/USDC
        const pair = `${cleanSym}USDT`;
        const ticker = allTickers.find(
          (t: any) => t.symbol === pair || t.symbol === rawSym
        );

        if (ticker) {
          const price = parseFloat(ticker.lastPrice) || 0;
          const change = parseFloat(ticker.priceChange) || 0;
          const changePercent = parseFloat(ticker.priceChangePercent) || 0;
          const high = parseFloat(ticker.highPrice) || 0;
          const low = parseFloat(ticker.lowPrice) || 0;
          // quoteVolume is volume in quote asset (USDT)
          const volumeUSD = parseFloat(ticker.quoteVolume) || parseFloat(ticker.volume) * price || 0;

          results.push({
            symbol: cleanSym || rawSym,
            priceUSD: price,
            change24h: change,
            changePercent24h: changePercent,
            high24h: high,
            low24h: low,
            volume24hUSD: volumeUSD
          });
        }
      }

      res.setHeader('Cache-Control', 'max-age=15');
      res.status(200).json(results);
    } catch (error: any) {
      console.error("Watchlist prices fetch error:", error?.message || error);
      res.status(500).json({ error: "Failed to fetch watchlist prices", details: error.message });
    }
  });

  app.post("/api/alerts/set", async (req, res) => {
    try {
      const { apiKey } = getKeys(req);
      const { symbol, targetPrice, direction } = req.body;
      const alert = { id: Date.now().toString(), symbol, targetPrice, direction };
      const session = getSessionData(apiKey || '');
      session.alerts.push(alert);
      res.status(200).json({ id: alert.id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/alerts/check", async (req, res) => {
    try {
      const { apiKey, apiSecret } = getKeys(req);
      const portfolio = await getPortfolioData(apiKey, apiSecret);
      const session = getSessionData(apiKey || '');
      const alerts = session.alerts || [];
      const triggered = [];
      const remainingAlerts = [];

      for (const alert of alerts) {
        const asset = portfolio.assets.find(a => a.symbol === alert.symbol);
        if (asset) {
          const currentPrice = asset.priceUSD;
          let isTriggered = false;
          if (alert.direction === 'above' && currentPrice > alert.targetPrice) isTriggered = true;
          if (alert.direction === 'below' && currentPrice < alert.targetPrice) isTriggered = true;

          if (isTriggered) {
            triggered.push({
              ...alert,
              currentPrice,
              portfolioImpact: asset.amount * currentPrice
            });
            continue;
          }
        }
        remainingAlerts.push(alert);
      }

      session.alerts = remainingAlerts;
      res.status(200).json({ triggered });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/summary", async (req, res) => {
    try {
      const { apiKey, apiSecret } = getKeys(req);
      const { calculateRiskScore } = await import("./src/lib/risk.js");
      const portfolio = await getPortfolioData(apiKey, apiSecret);
      const risk = calculateRiskScore(portfolio);
      
      const session = getSessionData(apiKey || '');

      const sortedByChange = [...portfolio.assets].sort((a, b) => b.changePercent24h - a.changePercent24h);
      const topPerformer = sortedByChange[0];
      const worstPerformer = sortedByChange[sortedByChange.length - 1];
      const biggestPosition = [...portfolio.assets].sort((a, b) => b.valueUSD - a.valueUSD)[0];

      let overallChange24hUSD = 0;
      let previousTotalUSD = 0;

      for (const asset of portfolio.assets) {
        const assetChangeUSD = asset.amount * asset.change24h;
        overallChange24hUSD += assetChangeUSD;
        previousTotalUSD += (asset.valueUSD - assetChangeUSD);
      }

      const overallChange24hPercent = previousTotalUSD > 0 ? (overallChange24hUSD / previousTotalUSD) * 100 : 0;
      
      const insight = `Your portfolio is currently valued at $${(portfolio.totalValueUSD || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}. Your biggest position is ${biggestPosition?.symbol || 'N/A'}, making up ${portfolio.totalValueUSD > 0 ? ((biggestPosition?.valueUSD || 0) / portfolio.totalValueUSD * 100).toFixed(1) : '0'}% of your holdings. The top performer today is ${topPerformer?.symbol || 'N/A'} (${topPerformer?.changePercent24h?.toFixed(1) || '0'}%). Overall risk is ${risk.label} (${risk.score}/10).`;

      res.status(200).json({
        generatedAt: new Date().toISOString(),
        totalValueUSD: portfolio.totalValueUSD,
        topPerformer,
        worstPerformer,
        biggestPosition,
        riskScore: risk.score,
        riskLabel: risk.label,
        activeAlerts: (session.alerts || []).length,
        overallChange24hUSD,
        overallChange24hPercent,
        insight
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/guardian", async (req, res) => {
    try {
      const { apiKey, apiSecret } = getKeys(req);
      const { calculateRiskScore } = await import("./src/lib/risk.js");
      const portfolio = await getPortfolioData(apiKey, apiSecret);
      const risk = calculateRiskScore(portfolio);
      
      const session = getSessionData(apiKey || '');
      
      const currentSnapshot = {
        assets: portfolio.assets,
        totalValueUSD: portfolio.totalValueUSD,
        riskScore: risk.score,
        timestamp: Date.now()
      };
      
      const previousSnapshot = session.snapshot;
      const changes = [];
      let hasAlert = false;

      if (previousSnapshot) {
        // 1. Detect portfolio moves over 3%
        const portfolioChange = Math.abs((currentSnapshot.totalValueUSD - previousSnapshot.totalValueUSD) / previousSnapshot.totalValueUSD) * 100;
        if (portfolioChange > 3) {
          hasAlert = true;
          const direction = currentSnapshot.totalValueUSD > previousSnapshot.totalValueUSD ? 'up' : 'down';
          changes.push({
            type: 'portfolio',
            message: `Portfolio is ${direction} ${portfolioChange.toFixed(1)}% ($${Math.abs(currentSnapshot.totalValueUSD - previousSnapshot.totalValueUSD).toFixed(2)}) since last check.`,
            value: portfolioChange
          });
        }
        
        // 2. Detect asset moves over 5%
        for (const asset of currentSnapshot.assets) {
          const prevAsset = previousSnapshot.assets.find((a: any) => a.symbol === asset.symbol);
          if (prevAsset) {
            const assetChange = Math.abs((asset.priceUSD - prevAsset.priceUSD) / prevAsset.priceUSD) * 100;
            if (assetChange > 5) {
              hasAlert = true;
              const direction = asset.priceUSD > prevAsset.priceUSD ? 'up' : 'down';
              changes.push({
                type: 'asset',
                message: `${asset.symbol} moved ${direction} ${assetChange.toFixed(1)}% ($${Math.abs((asset.priceUSD - prevAsset.priceUSD) * asset.amount).toFixed(2)} impact).`,
                value: assetChange,
                symbol: asset.symbol
              });
            }
          }
        }
        
        // 3. Detect risk score changes of 2+ points
        const riskChange = Math.abs(currentSnapshot.riskScore - previousSnapshot.riskScore);
        if (riskChange >= 2) {
          hasAlert = true;
          const direction = currentSnapshot.riskScore > previousSnapshot.riskScore ? 'increased' : 'decreased';
          changes.push({
            type: 'risk',
            message: `Risk score ${direction} by ${riskChange} points to ${currentSnapshot.riskScore}/10.`,
            value: riskChange
          });
        }
      }

      // Store new snapshot
      session.snapshot = currentSnapshot;
      res.status(200).json({ hasAlert, changes });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
