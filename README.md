# Pulse

**Your AI Financial Companion.**

Pulse is a smart, real-time AI companion that connects directly to your Binance account. Instead of staring at charts, you can simply have intelligent conversations about your portfolio. Pulse reads your live data, understands your risk, and acts like a financially smart friend available 24/7. 

## Features

- **Intelligent Chat:** Ask anything in plain English. Pulse grounds its responses in your actual portfolio data and market context, helping you think through financial decisions.
- **Portfolio Summaries:** Get instant aggregated insights on your top performers, biggest positions, and active risk scores in a conversational format.
- **Price Alerts Engine:** Set custom price targets directly through chat (e.g., "let me know if BTC hits 90k"). Pulse continuously monitors your live portfolio and notifies you with specific portfolio impact metrics when conditions are met.
- **Guardian System:** Automated background monitoring that securely tracks your portfolio state. It evaluates large portfolio variations (>3%), singular asset movements (>5%), and risk drifts, injecting non-intrusive "Pulse is watching" alerts into the chat flow.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons
- **Backend:** Node.js, Express, Next.js App Router API Patterns
- **AI Engine:** Google Gemini 2.5 Flash (via `@google/genai` SDK)
- **Data Source:** Binance Official REST API

## How to Run Locally

1. Clone this repository to your local machine.
2. Install the required dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your API keys (see below).
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000` in your browser.

## Environment Variables

Create a `.env` file at the root of your project with the following keys:

```env
BINANCE_API_KEY=your_read_only_api_key_here
BINANCE_API_SECRET=your_read_only_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```
*(Note: Pulse only requires a **Read-Only** Binance API key. It does not need trading or withdrawal permissions.)*

---
🏆 **Built for the Binance Agent OS Mini Hackathon**

## Screenshots

### Landing Page
Clean hero with "Think with Pulse." heading, Connect Binance and Try Demo Portfolio CTAs, trust badges, and PWA install prompt.

### Dashboard — Overview
Live portfolio data with Pulse Score breakdown, Risk Score, Pulse Noticed alerts with Ask Pulse buttons, allocation donut chart, and holdings table.

### Morning Briefing
AI-generated daily briefing with portfolio overview, top movers, risk pulse, market context and Pulse Thought sections.

### Chat Interface  
Personalised quick prompts based on actual holdings, voice input, streaming AI responses grounded in live portfolio data.

### Portfolio History
24h/7d/30d area chart showing portfolio performance over time with Period High, Low and Change stats.

### Market News
Live crypto news from Cointelegraph and Decrypt with sentiment-coded colored borders and one-click article access.

### Watchlist
Real-time price monitoring for any coin with 24h high/low, Ask Pulse integration, and auto-refresh every 60 seconds.

### Notification Center
Persistent notification inbox collecting all Guardian alerts, price alert triggers and system notifications.
