"use client";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Loader2, Sun, Moon } from "lucide-react";
import { motion } from "motion/react";
import { useTheme } from "../src/context/ThemeContext";

function ConversationExample({ user, pulse }: { user: string; pulse: string }) {
  const { theme } = useTheme();
  return (
    <div className="flex flex-col gap-4 max-w-sm mx-auto mb-12 last:mb-0">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="self-end bg-[#6366f1] text-[var(--text-primary)] px-5 py-3.5 rounded-2xl rounded-br-sm text-sm shadow-sm leading-relaxed"
      >
        {user}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className={`self-start ${theme === 'light' ? 'bg-[var(--bg-card)] border border-[var(--border-subtle)]' : 'bg-[var(--bg-base)] border border-[var(--border-subtle)]'} text-[var(--text-primary)] px-5 py-3.5 rounded-2xl rounded-bl-sm text-sm shadow-sm leading-relaxed relative`}
      >
        <div className={`absolute -top-3 left-4 text-[10px] font-bold tracking-wider text-[var(--text-secondary)] ${theme === 'light' ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-base)]'} px-2 uppercase`}>
          Pulse
        </div>
        {pulse}
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
    } catch (err) {
      console.error("Install prompt error:", err);
    } finally {
      setShowInstallBanner(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !apiSecret.trim()) return;

    setIsConnecting(true);
    setConnectionError("");

    // Store keys in sessionStorage first as requested
    sessionStorage.setItem("BINANCE_API_KEY", apiKey.trim());
    sessionStorage.setItem("BINANCE_API_SECRET", apiSecret.trim());

    try {
      const res = await fetch("/api/portfolio", {
        headers: {
          "x-binance-key": apiKey.trim(),
          "x-binance-secret": apiSecret.trim(),
        },
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && !data.isDemoFallback && !data.error) {
        navigate("/dashboard");
      } else {
        sessionStorage.removeItem("BINANCE_API_KEY");
        sessionStorage.removeItem("BINANCE_API_SECRET");
        setConnectionError(
          "Could not connect to Binance. Please check your API keys and try again.",
        );
      }
    } catch (err) {
      sessionStorage.removeItem("BINANCE_API_KEY");
      sessionStorage.removeItem("BINANCE_API_SECRET");
      setConnectionError(
        "Could not connect to Binance. Please check your API keys and try again.",
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDemoConnect = () => {
    setIsConnecting(true);
    setConnectionError("");
    sessionStorage.setItem("BINANCE_API_KEY", "demo");
    sessionStorage.setItem("BINANCE_API_SECRET", "demo");
    setIsConnecting(false);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans relative selection:bg-[#6366f1]/30 overflow-x-hidden">
      {/* Install banner at the very top of the page (above navbar) */}
      {showInstallBanner && (
        <div className="fixed top-0 left-0 right-0 z-60 bg-[#6366f1] text-[var(--text-primary)] py-2 px-4 flex items-center justify-between shadow-md">
          <span className="text-xs sm:text-sm font-medium">
            Install Pulse on your home screen for the best experience
          </span>
          <div className="flex items-center gap-3 shrink-0 ml-3">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1 bg-white text-[#6366f1] text-xs font-bold rounded-lg hover:bg-white/90 transition shadow-sm cursor-pointer"
            >
              Install
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] p-1 transition cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <nav
        className={`fixed ${showInstallBanner ? "top-10" : "top-0"} left-0 right-0 z-50 bg-[var(--bg-base)]/60 backdrop-blur-xl border-b border-[var(--border-subtle)] transition-all`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-lg tracking-tight">
            <div className="w-2.5 h-2.5 rounded-full bg-[#6366f1]"></div>
            Pulse
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-2 rounded-full hover:bg-[var(--border-subtle)]"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={handleDemoConnect}
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Try Demo
            </button>
            <button
              onClick={() => {
                setConnectionError("");
                setIsModalOpen(true);
              }}
              className="text-sm font-medium text-[var(--text-primary)] border border-white/10 rounded-full px-5 py-2 hover:bg-white/5 transition-colors"
            >
              Connect
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-32 lg:pt-48 pb-20">
        <div
          className="absolute inset-0 -z-10 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              theme === 'light'
                ? "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.08) 1px, transparent 0)"
                : "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        ></div>

        <section className="max-w-6xl mx-auto px-5 lg:px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <div
              className="relative inline-block w-full"
              style={{
                background:
                  "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.12), transparent)",
              }}
            >
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-8xl font-black text-[var(--text-primary)] tracking-tight leading-[1.1] mb-6 pt-4"
              >
                Think with{" "}
                <span className="bg-gradient-to-r from-[#818cf8] to-[#6366f1] bg-clip-text text-transparent">
                  Pulse
                </span>
                .
              </motion.h1>
            </div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-base text-[var(--text-secondary)] mb-10 max-w-lg mx-auto leading-relaxed"
            >
              Connect your Binance account and chat with an AI that understands
              your live positions, tracks your risk, and watches the market for
              you.
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
                className="w-full sm:w-auto bg-[#6366f1] text-[var(--text-primary)] px-8 py-4 rounded-full font-semibold text-base hover:brightness-110 hover:shadow-glow-accent transition-all active:scale-[0.98]"
              >
                Connect Binance
              </button>
              <button
                onClick={handleDemoConnect}
                className="w-full sm:w-auto bg-[var(--bg-card)] hover:bg-white/5 text-[var(--text-primary)] border border-[rgba(255,255,255,0.1)] px-8 py-4 rounded-full font-semibold text-base transition-all active:scale-[0.98]"
              >
                Try Demo Portfolio
              </button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center justify-center gap-3 text-xs text-[var(--text-secondary)] mt-8"
            >
              <span>🔒 Read-only access</span>
              <span className="text-[var(--text-primary)]/20">•</span>
              <span>⚡ Live Binance data</span>
              <span className="text-[var(--text-primary)]/20">•</span>
              <span>🧠 Powered by Gemini</span>
            </motion.div>
          </div>
        </section>

        <section className="mt-32 py-24 bg-[var(--bg-card)]/30 border-y border-[var(--border-subtle)]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[var(--bg-card)] shadow-card border border-[var(--border-subtle)] p-8 rounded-3xl relative overflow-hidden group hover:border-[rgba(255,255,255,0.1)] hover:shadow-card-hover hover:-translate-y-[2px] transition-all duration-300">
                <div className="absolute -right-4 -bottom-8 text-6xl font-black text-[var(--text-primary)]/[0.07] select-none z-0">
                  01
                </div>
                <div className="relative z-10">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                    Connect
                  </h3>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                    Provide a read-only API key. We securely sync your balances
                    and assets without any trading permissions.
                  </p>
                </div>
              </div>
              <div className="bg-[var(--bg-card)] shadow-card border border-[var(--border-subtle)] p-8 rounded-3xl relative overflow-hidden group hover:border-[rgba(255,255,255,0.1)] hover:shadow-card-hover hover:-translate-y-[2px] transition-all duration-300">
                <div className="absolute -right-4 -bottom-8 text-6xl font-black text-[var(--text-primary)]/[0.07] select-none z-0">
                  02
                </div>
                <div className="relative z-10">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                    Understand
                  </h3>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                    Pulse reads your live portfolio and instantly notices what
                    matters, including risks and market shifts.
                  </p>
                </div>
              </div>
              <div className="bg-[var(--bg-card)] shadow-card border border-[var(--border-subtle)] p-8 rounded-3xl relative overflow-hidden group hover:border-[rgba(255,255,255,0.1)] hover:shadow-card-hover hover:-translate-y-[2px] transition-all duration-300">
                <div className="absolute -right-4 -bottom-8 text-6xl font-black text-[var(--text-primary)]/[0.07] select-none z-0">
                  03
                </div>
                <div className="relative z-10">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                    Converse
                  </h3>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                    Ask anything in plain English. Pulse thinks with you,
                    grounded in your actual financial reality.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-[var(--bg-base)] relative border-y border-[var(--border-subtle)]">
          <div className="max-w-4xl mx-auto px-6 relative z-10">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-16">
              What talking to Pulse feels like
            </h2>
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
              <div className="md:border-r md:border-[var(--border-subtle)] md:pr-12">
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                  Read-Only
                </h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                  We can only view. Never trade or withdraw.
                </p>
              </div>
              <div className="md:border-r md:border-[var(--border-subtle)] md:pr-12">
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                  Zero Storage
                </h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                  Your data lives in your session only.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                  Binance Native
                </h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                  Built on official Agent OS infrastructure.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-base)] py-12 text-center px-6">
        <p className="text-sm text-[var(--text-secondary)] max-w-2xl mx-auto mb-4">
          Pulse is not a licensed financial advisor. It is an AI companion that
          helps you think.
        </p>
        <p className="text-[10px] text-[var(--text-secondary)]/50 tracking-wider">
          Built for Binance Agent OS Mini Hackathon 2026
        </p>
      </footer>

      {isModalOpen && (
        <div className="fixed inset-0 bg-[var(--bg-base)]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl w-full max-w-md p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                if (!isConnecting) {
                  setIsModalOpen(false);
                  setConnectionError("");
                }
              }}
              disabled={isConnecting}
              className="absolute top-6 right-6 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
              Connect Binance
            </h3>

            <div className="mb-6 p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)]">
              <p className="text-xs font-semibold text-[var(--text-primary)] mb-2">
                How to get your read-only API key:
              </p>
              <ol className="text-xs text-[var(--text-secondary)] space-y-1.5 list-decimal list-inside">
                <li>Open Binance &rarr; Account &rarr; API Management</li>
                <li>Create API key &rarr; Enable Reading only</li>
                <li>Paste both keys below</li>
              </ol>
            </div>

            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  API Key
                </label>
                <input
                  type="password"
                  required
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    if (connectionError) setConnectionError("");
                  }}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-all placeholder:text-[var(--text-secondary)]/50"
                  placeholder="Paste your API key"
                  disabled={isConnecting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  Secret Key
                </label>
                <input
                  type="password"
                  required
                  value={apiSecret}
                  onChange={(e) => {
                    setApiSecret(e.target.value);
                    if (connectionError) setConnectionError("");
                  }}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition-all placeholder:text-[var(--text-secondary)]/50"
                  placeholder="Paste your Secret key"
                  disabled={isConnecting}
                />
              </div>
              <button
                type="submit"
                disabled={isConnecting}
                className="w-full flex items-center justify-center bg-[#6366f1] hover:brightness-110 disabled:opacity-70 disabled:hover:brightness-100 text-[var(--text-primary)] font-bold py-3.5 rounded-xl mt-6 transition-all duration-200 active:scale-[0.98]"
              >
                {isConnecting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Start Talking to Pulse"
                )}
              </button>
              <button
                type="button"
                onClick={handleDemoConnect}
                disabled={isConnecting}
                className="w-full py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-center transition-colors block mt-2"
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
