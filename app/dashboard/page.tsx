"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, X, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import PortfolioDashboard from '../../src/components/PortfolioDashboard';
import ChatInterface from '../../src/components/ChatInterface';
import { PortfolioData } from '../../src/lib/binance';
import { Alert } from '../../src/lib/alerts';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<(PortfolioData & { isDemoFallback?: boolean; warning?: string }) | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [dismissWarning, setDismissWarning] = useState(false);
  
  const [pendingAlertMessage, setPendingAlertMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [compactMode, setCompactMode] = useState(false);
  const [apiKeyMasked, setApiKeyMasked] = useState("");

  const fetchPortfolioData = useCallback(async () => {
    let key = sessionStorage.getItem('BINANCE_API_KEY') || 'demo';
    let secret = sessionStorage.getItem('BINANCE_API_SECRET') || 'demo';
    
    try {
      setError(null);
      const res = await fetch('/api/portfolio', { 
        headers: { 
          'x-binance-key': key, 
          'x-binance-secret': secret 
        } 
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.details || data.error || `Request failed with status ${res.status}`);
      }
      setPortfolio(data);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err?.message || "Failed to fetch portfolio data. Check your network or API keys.");
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, []);

  useEffect(() => {
    let key = sessionStorage.getItem('BINANCE_API_KEY');
    let secret = sessionStorage.getItem('BINANCE_API_SECRET');
    
    // Auto-init to demo mode if keys are not set, ensuring preview links and direct navigation always work
    if (!key || !secret) {
      key = 'demo';
      secret = 'demo';
      sessionStorage.setItem('BINANCE_API_KEY', 'demo');
      sessionStorage.setItem('BINANCE_API_SECRET', 'demo');
    }
    
    setApiKeyMasked(key === 'demo' ? 'Connected Demo Account' : key.substring(0, 8) + '...');
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  useEffect(() => {
    const interval = setInterval(fetchPortfolioData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPortfolioData, refreshInterval]);

  const handleDisconnect = () => {
    sessionStorage.removeItem('BINANCE_API_KEY');
    sessionStorage.removeItem('BINANCE_API_SECRET');
    navigate('/');
  };

  const handleSwitchToDemo = () => {
    sessionStorage.setItem('BINANCE_API_KEY', 'demo');
    sessionStorage.setItem('BINANCE_API_SECRET', 'demo');
    setApiKeyMasked('Connected Demo Account');
    setError(null);
    setLoading(true);
    fetchPortfolioData();
  };

  const handleAlertClick = (alert: Alert) => {
    setPendingAlertMessage(`Explain this alert to me: ${alert.title} — ${alert.message}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center text-[#f9fafb] relative overflow-hidden">
        <style>{`
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.5; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          .ring-anim {
            position: absolute;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(99,102,241,0.3);
            animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          }
        `}</style>
        <div className="relative flex items-center justify-center w-20 h-20 mb-8">
          <div className="ring-anim" style={{ animationDelay: '0s' }}></div>
          <div className="ring-anim" style={{ animationDelay: '1s' }}></div>
          <div className="w-4 h-4 rounded-full bg-[#6366f1] relative z-10 shadow-[0_0_15px_rgba(99,102,241,0.8)]"></div>
        </div>
        <p className="text-lg font-medium tracking-wide text-[#f9fafb]">Connecting to portfolio data...</p>
      </div>
    );
  }

  if (error && !portfolio) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center text-[#f9fafb] p-6 text-center relative overflow-hidden">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5 shadow-lg">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold mb-2 text-[#f9fafb]">Portfolio Connection Notice</h2>
        <p className="text-sm text-[#6b7280] max-w-md mb-6 leading-relaxed">
          {error}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              setIsRetrying(true);
              fetchPortfolioData();
            }}
            disabled={isRetrying}
            className="px-6 py-2.5 rounded-xl bg-[#6366f1] hover:brightness-110 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            Retry Connection
          </button>
          <button
            onClick={handleSwitchToDemo}
            className="px-6 py-2.5 rounded-xl bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] hover:bg-white/5 text-[#f9fafb] font-medium text-sm transition-all active:scale-98"
          >
            Switch to Demo Portfolio
          </button>
          <button
            onClick={handleDisconnect}
            className="px-6 py-2.5 rounded-xl border border-white/10 text-[#6b7280] hover:text-[#f9fafb] hover:bg-white/5 font-medium text-sm transition-all active:scale-98"
          >
            Enter Different Keys
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#000000] flex flex-col font-sans relative overflow-x-hidden">
      {portfolio?.warning && !dismissWarning && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{portfolio.warning}</span>
          </div>
          <button 
            onClick={() => setDismissWarning(true)}
            className="text-amber-300/80 hover:text-amber-200 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <nav className="shrink-0 flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/5 bg-black sticky top-0 z-20">
         <div className="flex items-center gap-2 text-[#f9fafb] font-bold text-xl tracking-tight">
            <div className="w-2.5 h-2.5 rounded-full bg-[#6366f1]"></div>
            Pulse
         </div>
         <div className="flex items-center gap-4">
           <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-[#6b7280] hover:text-[#f9fafb] transition-colors p-2 rounded-full hover:bg-white/5"
           >
              <Settings className="w-5 h-5" />
           </button>
           <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 text-sm font-medium text-[#6b7280] hover:text-[#ef4444] transition-colors"
           >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Disconnect</span>
           </button>
         </div>
      </nav>
      <main className="flex-1 flex flex-col lg:overflow-hidden h-auto lg:h-[calc(100dvh-69px)]">
        <div className="flex-1 flex flex-col lg:flex-row h-full">
          
          <div className={`w-full lg:w-[45%] xl:w-[45%] h-auto lg:h-full overflow-y-auto border-r border-white/5 ${compactMode ? 'p-3' : 'p-4 md:p-6'}`} style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}>
            <PortfolioDashboard portfolio={portfolio} onRefresh={fetchPortfolioData} onAlertClick={handleAlertClick} />
          </div>
          
          <div className={`w-full lg:w-[55%] xl:w-[55%] h-[calc(100dvh-69px)] lg:h-full shrink-0 flex flex-col ${compactMode ? 'p-3 pb-4' : 'p-4 md:p-6 pb-6 lg:pb-6'}`}>
            <ChatInterface 
              portfolio={portfolio} 
              pendingMessage={pendingAlertMessage} 
              clearPendingMessage={() => setPendingAlertMessage(null)} 
            />
          </div>
        </div>
      </main>

      {/* Settings Panel */}
      <div 
        className={`fixed top-0 right-0 bottom-0 w-80 bg-black border-l border-white/5 z-50 transform transition-transform duration-300 ease-in-out ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white">Settings</h2>
            <button onClick={() => setIsSettingsOpen(false)} className="text-[#6b7280] hover:text-white p-2">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-8 flex-1">
            <div>
              <h3 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Connected Account</h3>
              <div className="bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] p-3 rounded-lg flex justify-between items-center">
                <span className="text-sm font-mono text-[#f9fafb]">{apiKeyMasked}</span>
                <span className="text-xs text-[#22c55e] bg-[#22c55e]/10 px-2 py-1 rounded">Active</span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Display</h3>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-[#f9fafb]">Compact mode</span>
                <input 
                  type="checkbox" 
                  checked={compactMode} 
                  onChange={(e) => setCompactMode(e.target.checked)} 
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[rgba(255,255,255,0.06)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6366f1] relative"></div>
              </label>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Data</h3>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#f9fafb]">Auto-refresh</span>
                <select 
                  value={refreshInterval} 
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] text-sm text-[#f9fafb] rounded-lg px-2 py-1 focus:outline-none focus:border-[#6366f1]"
                >
                  <option value={30000}>30s</option>
                  <option value={60000}>60s</option>
                  <option value={120000}>120s</option>
                </select>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">About</h3>
              <p className="text-xs text-[#6b7280] leading-relaxed">
                Pulse v1.0 — Built for Binance Agent OS Hackathon 2026.
              </p>
            </div>
          </div>

          <button
            onClick={handleDisconnect}
            className="w-full py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-medium rounded-xl transition-colors mt-auto flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Disconnect Account
          </button>
        </div>
      </div>
      
      {/* Backdrop for settings */}
      {isSettingsOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsSettingsOpen(false)}
        ></div>
      )}
    </div>
  );
}
