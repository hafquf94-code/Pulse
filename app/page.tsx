"use client";
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

function ConversationExample({ user, pulse }: { user: string, pulse: string }) {
  return (
    <div className="flex flex-col gap-4 max-w-sm mx-auto mb-12 last:mb-0">
      <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="self-end bg-[#6366f1] text-[#f9fafb] px-5 py-3.5 rounded-2xl rounded-br-sm text-sm shadow-sm leading-relaxed">
        {user}
      </motion.div>
      <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="self-start bg-black border border-white/5 text-[#f9fafb] px-5 py-3.5 rounded-2xl rounded-bl-sm text-sm shadow-sm leading-relaxed relative">
        <div className="absolute -top-3 left-4 text-[10px] font-bold tracking-wider text-[#6b7280] bg-black px-2 uppercase">Pulse</div>
        {pulse}
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const navigate = useNavigate();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !apiSecret.trim()) return;
    
    setIsConnecting(true);
    setConnectionError("");

    // Store keys in sessionStorage first as requested
    sessionStorage.setItem('BINANCE_API_KEY', apiKey.trim());
    sessionStorage.setItem('BINANCE_API_SECRET', apiSecret.trim());

    try {
      const res = await fetch('/api/portfolio', {
        headers: {
          'x-binance-key': apiKey.trim(),
          'x-binance-secret': apiSecret.trim(),
        },
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && !data.isDemoFallback && !data.error) {
        navigate('/dashboard');
      } else {
        sessionStorage.removeItem('BINANCE_API_KEY');
        sessionStorage.removeItem('BINANCE_API_SECRET');
        setConnectionError("Could not connect to Binance. Please check your API keys and try again.");
      }
    } catch (err) {
      sessionStorage.removeItem('BINANCE_API_KEY');
      sessionStorage.removeItem('BINANCE_API_SECRET');
      setConnectionError("Could not connect to Binance. Please check your API keys and try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDemoConnect = () => {
    setIsConnecting(true);
    setConnectionError("");
    sessionStorage.setItem('BINANCE_API_KEY', 'demo');
    sessionStorage.setItem('BINANCE_API_SECRET', 'demo');
    setIsConnecting(false);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-black text-[#f9fafb] font-sans relative selection:bg-[#6366f1]/30 overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5 transition-all">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#f9fafb] font-bold text-lg tracking-tight">
            <div className="w-2.5 h-2.5 rounded-full bg-[#6366f1]"></div>
            Pulse
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleDemoConnect}
              className="text-sm font-medium text-[#6b7280] hover:text-white transition-colors"
            >
              Try Demo
            </button>
            <button 
              onClick={() => {
                setConnectionError("");
                setIsModalOpen(true);
              }}
              className="text-sm font-medium text-white border border-white/10 rounded-full px-5 py-2 hover:bg-white/5 transition-colors"
            >
              Connect
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-32 lg:pt-48 pb-20">
        <div 
          className="absolute inset-0 -z-10 opacity-[0.03] pointer-events-none" 
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
        ></div>

        <section className="max-w-6xl mx-auto px-5 lg:px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-8xl font-black text-white tracking-tight leading-[1.1] mb-6"
            >
              Think with your portfolio.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-base text-[#6b7280] mb-10 max-w-lg mx-auto leading-relaxed"
            >
              Connect your Binance account and chat with an AI that understands your live positions, tracks your risk, and watches the market for you.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button 
                onClick={() => {
                  setConnectionError("");
                  setIsModalOpen(true);
                }}
                className="w-full sm:w-auto bg-[#6366f1] text-white px-8 py-4 rounded-full font-semibold text-base hover:brightness-110 transition-all active:scale-[0.98]"
              >
                Connect Binance
              </button>
              <button 
                onClick={handleDemoConnect}
                className="w-full sm:w-auto bg-[#0d0d0d] hover:bg-white/5 text-white border border-[rgba(255,255,255,0.1)] px-8 py-4 rounded-full font-semibold text-base transition-all active:scale-[0.98]"
              >
                Try Demo Portfolio
              </button>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center justify-center gap-3 text-xs text-[#6b7280] mt-8"
            >
              <span>🔒 Read-only access</span>
              <span className="text-white/20">•</span>
              <span>⚡ Live Binance data</span>
              <span className="text-white/20">•</span>
              <span>🧠 Powered by Gemini</span>
            </motion.div>
          </div>
        </section>

        <section className="mt-32 py-24 bg-[#0d0d0d]/30 border-y border-[rgba(255,255,255,0.06)]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-black border border-white/5 p-8 rounded-3xl relative overflow-hidden group hover:border-white/10 transition-colors">
                <div className="absolute -right-4 -bottom-8 text-6xl font-black text-white/5 select-none z-0">01</div>
                <div className="relative z-10">
                  <h3 className="text-lg font-semibold text-[#f9fafb] mb-3">Connect</h3>
                  <p className="text-[#6b7280] text-sm leading-relaxed">
                    Provide a read-only API key. We securely sync your balances and assets without any trading permissions.
                  </p>
                </div>
              </div>
              <div className="bg-black border border-white/5 p-8 rounded-3xl relative overflow-hidden group hover:border-white/10 transition-colors">
                <div className="absolute -right-4 -bottom-8 text-6xl font-black text-white/5 select-none z-0">02</div>
                <div className="relative z-10">
                  <h3 className="text-lg font-semibold text-[#f9fafb] mb-3">Understand</h3>
                  <p className="text-[#6b7280] text-sm leading-relaxed">
                    Pulse reads your live portfolio and instantly notices what matters, including risks and market shifts.
                  </p>
                </div>
              </div>
              <div className="bg-black border border-white/5 p-8 rounded-3xl relative overflow-hidden group hover:border-white/10 transition-colors">
                <div className="absolute -right-4 -bottom-8 text-6xl font-black text-white/5 select-none z-0">03</div>
                <div className="relative z-10">
                  <h3 className="text-lg font-semibold text-[#f9fafb] mb-3">Converse</h3>
                  <p className="text-[#6b7280] text-sm leading-relaxed">
                    Ask anything in plain English. Pulse thinks with you, grounded in your actual financial reality.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-black relative border-y border-white/5">
          <div className="max-w-4xl mx-auto px-6 relative z-10">
            <h2 className="text-3xl font-bold text-[#f9fafb] text-center mb-16">What talking to Pulse feels like</h2>
            <div className="space-y-6">
              <ConversationExample 
                user="How is my portfolio doing today?"
                pulse="Your portfolio is down 4.2% today — about $127. Most of that came from BTC dropping 6%. Your ETH position actually held up well, only down 1.8%."
              />
              <ConversationExample 
                user="Should I be worried?"
                pulse="Your concentration in BTC is worth watching — it's 68% of your portfolio. That means BTC moves affect you more than most. It's not necessarily bad, just something to be aware of."
              />
              <ConversationExample 
                user="What's driving the market today?"
                pulse="There's been broad crypto selling pressure today linked to macro uncertainty. Nothing specific to your holdings — this is market-wide. Your diversified assets like ETH and BNB are cushioning the impact slightly."
              />
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
              <div className="md:border-r md:border-white/5 md:pr-12">
                <h3 className="text-xl font-bold text-[#f9fafb] mb-2">Read-Only</h3>
                <p className="text-[#6b7280] text-sm leading-relaxed">
                  We can only view. Never trade or withdraw.
                </p>
              </div>
              <div className="md:border-r md:border-white/5 md:pr-12">
                <h3 className="text-xl font-bold text-[#f9fafb] mb-2">Zero Storage</h3>
                <p className="text-[#6b7280] text-sm leading-relaxed">
                  Your data lives in your session only.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#f9fafb] mb-2">Binance Native</h3>
                <p className="text-[#6b7280] text-sm leading-relaxed">
                  Built on official Agent OS infrastructure.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[rgba(255,255,255,0.06)] bg-[#000000] py-12 text-center px-6">
        <p className="text-sm text-[#6b7280] max-w-2xl mx-auto mb-4">
          Pulse is not a licensed financial advisor. It is an AI companion that helps you think.
        </p>
        <p className="text-[10px] text-[#6b7280]/50 tracking-wider">
          Built for Binance Agent OS Mini Hackathon 2026
        </p>
      </footer>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] rounded-3xl w-full max-w-md p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                if (!isConnecting) {
                  setIsModalOpen(false);
                  setConnectionError("");
                }
              }} 
              disabled={isConnecting}
              className="absolute top-6 right-6 text-[#6b7280] hover:text-[#f9fafb] transition-colors p-2"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-bold text-[#f9fafb] mb-6">Connect Binance</h3>
            
            <div className="mb-6 p-4 rounded-xl bg-black border border-white/5">
              <p className="text-xs font-semibold text-[#f9fafb] mb-2">How to get your read-only API key:</p>
              <ol className="text-xs text-[#6b7280] space-y-1.5 list-decimal list-inside">
                <li>Open Binance &rarr; Account &rarr; API Management</li>
                <li>Create API key &rarr; Enable Reading only</li>
                <li>Paste both keys below</li>
              </ol>
            </div>

            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">API Key</label>
                <input 
                  type="password" 
                  required
                  value={apiKey}
                  onChange={e => {
                    setApiKey(e.target.value);
                    if (connectionError) setConnectionError("");
                  }}
                  className="w-full bg-[#000000] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-[#f9fafb] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-all placeholder:text-[#6b7280]/50"
                  placeholder="Paste your API key"
                  disabled={isConnecting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">Secret Key</label>
                <input 
                  type="password" 
                  required
                  value={apiSecret}
                  onChange={e => {
                    setApiSecret(e.target.value);
                    if (connectionError) setConnectionError("");
                  }}
                  className="w-full bg-[#000000] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-[#f9fafb] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-all placeholder:text-[#6b7280]/50"
                  placeholder="Paste your Secret key"
                  disabled={isConnecting}
                />
              </div>
              <button 
                type="submit" 
                disabled={isConnecting}
                className="w-full flex items-center justify-center bg-[#6366f1] hover:brightness-110 disabled:opacity-70 disabled:hover:brightness-100 text-[#f9fafb] font-bold py-3.5 rounded-xl mt-6 transition-all duration-200 active:scale-[0.98]"
              >
                {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Start Talking to Pulse"}
              </button>
              <button 
                type="button" 
                onClick={handleDemoConnect}
                disabled={isConnecting}
                className="w-full py-2 text-xs text-[#6b7280] hover:text-[#f9fafb] text-center transition-colors block mt-2"
              >
                Don't have API keys handy? Try with live Demo Portfolio &rarr;
              </button>
            </form>
            {connectionError && (
              <p className="mt-4 text-xs sm:text-sm text-red-500 text-center font-medium leading-relaxed">
                {connectionError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
