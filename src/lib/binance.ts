import crypto from 'crypto';
import axios from 'axios';

export type PortfolioData = {
  totalValueUSD: number;
  lastUpdated: string;
  assets: Array<{
    symbol: string;
    amount: number;
    priceUSD: number;
    valueUSD: number;
    change24h: number;
    changePercent24h: number;
  }>;
};

const BASE_URL = 'https://api.binance.com';

function getCredentials(apiKey?: string, apiSecret?: string) {
  const key = apiKey || process.env.BINANCE_API_KEY;
  const secret = apiSecret || process.env.BINANCE_API_SECRET;
  
  if (!key || !secret) {
    throw new Error("Binance API credentials not configured");
  }
  
  return { apiKey: key, apiSecret: secret };
}

export function generateSignature(queryString: string, apiSecret?: string): string {
  const creds = getCredentials(undefined, apiSecret);
  return crypto
    .createHmac('sha256', creds.apiSecret)
    .update(queryString)
    .digest('hex');
}

export async function getAccountInfo(apiKey?: string, apiSecret?: string): Promise<any> {
  try {
    const creds = getCredentials(apiKey, apiSecret);
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = generateSignature(queryString, creds.apiSecret);
    
    const response = await axios.get(`${BASE_URL}/api/v3/account?${queryString}&signature=${signature}`, {
      headers: {
        'X-MBX-APIKEY': creds.apiKey
      }
    });
    
    return response.data;
  } catch (error) {
    console.error("Error fetching account info:", error);
    throw error;
  }
}

export async function get24hTickerData(): Promise<any> {
  try {
    const response = await axios.get(`${BASE_URL}/api/v3/ticker/24hr`);
    return response.data;
  } catch (error) {
    console.error("Error fetching 24h ticker data:", error);
    return [];
  }
}

export async function getPortfolioData(apiKey?: string, apiSecret?: string): Promise<PortfolioData> {
  try {
    const accountInfo = await getAccountInfo(apiKey, apiSecret);
    const balances = accountInfo.balances || [];
    
    // Filter balances where free + locked > 0.00001
    const activeAssets = balances.filter((b: any) => {
      const amount = parseFloat(b.free) + parseFloat(b.locked);
      return amount > 0.00001;
    });

    const stablecoins = ['USDT', 'BUSD', 'USDC'];

    let ticker24hData: any[] = [];
    let pricesMap: Record<string, number> = {};

    // Fetch 24h change data for all assets
    try {
      ticker24hData = await get24hTickerData();
    } catch (error) {
      console.error("Failed to fetch 24h ticker data:", error);
    }
    
    // Fetch price from /api/v3/ticker/price
    try {
      const priceResponse = await axios.get(`${BASE_URL}/api/v3/ticker/price`);
      if (Array.isArray(priceResponse.data)) {
        priceResponse.data.forEach((p: any) => {
          pricesMap[p.symbol] = parseFloat(p.price);
        });
      }
    } catch (error) {
      console.error("Failed to fetch all asset prices:", error);
    }

    const btcUsdtPrice = pricesMap['BTCUSDT'] || 0;
    const bnbUsdtPrice = pricesMap['BNBUSDT'] || 0;

    const assets: PortfolioData['assets'] = [];
    let totalValueUSD = 0;

    for (const asset of activeAssets) {
      const symbol = asset.asset;
      const amount = parseFloat(asset.free) + parseFloat(asset.locked);
      let priceUSD = 0;
      let change24h = 0;
      let changePercent24h = 0;

      if (stablecoins.includes(symbol)) {
        priceUSD = 1;
        // Defaults to 0 for change as instructed (stablecoin)
      } else {
        const pairUsdt = `${symbol}USDT`;
        const pairBtc = `${symbol}BTC`;
        const pairBnb = `${symbol}BNB`;

        if (pricesMap[pairUsdt]) {
          priceUSD = pricesMap[pairUsdt];
          const ticker = ticker24hData.find((t: any) => t.symbol === pairUsdt);
          if (ticker) {
            change24h = parseFloat(ticker.priceChange) || 0;
            changePercent24h = parseFloat(ticker.priceChangePercent) || 0;
          }
        } else if (pricesMap[pairBtc] && btcUsdtPrice > 0) {
          priceUSD = pricesMap[pairBtc] * btcUsdtPrice;
          const ticker = ticker24hData.find((t: any) => t.symbol === pairBtc);
          if (ticker) {
            change24h = (parseFloat(ticker.priceChange) || 0) * btcUsdtPrice;
            changePercent24h = parseFloat(ticker.priceChangePercent) || 0;
          }
        } else if (pricesMap[pairBnb] && bnbUsdtPrice > 0) {
          priceUSD = pricesMap[pairBnb] * bnbUsdtPrice;
          const ticker = ticker24hData.find((t: any) => t.symbol === pairBnb);
          if (ticker) {
            change24h = (parseFloat(ticker.priceChange) || 0) * bnbUsdtPrice;
            changePercent24h = parseFloat(ticker.priceChangePercent) || 0;
          }
        }
      }

      const valueUSD = amount * priceUSD;
      totalValueUSD += valueUSD;

      assets.push({
        symbol,
        amount,
        priceUSD,
        valueUSD,
        change24h,
        changePercent24h
      });
    }

    // Sort assets by valueUSD descending
    assets.sort((a, b) => b.valueUSD - a.valueUSD);

    return {
      totalValueUSD,
      lastUpdated: new Date().toISOString(),
      assets
    };

  } catch (error) {
    console.error("Error generating portfolio data:", error);
    throw error;
  }
}
