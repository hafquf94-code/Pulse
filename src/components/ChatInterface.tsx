import React, { useState, useEffect, useRef, memo } from "react";
import { Send, Sparkles, Mic, MicOff } from "lucide-react";
import QuickPrompts from "./QuickPrompts";
import MorningBriefing from "./MorningBriefing";
import { PortfolioData } from "../lib/binance";
import { generatePersonalisedPrompts } from "../lib/gemini";
import { calculateRiskScore } from "../lib/risk";
import { motion, AnimatePresence } from "motion/react";

// Memoized message component to avoid unnecessary re-renders
const ChatMessage = memo(
  ({
    msg,
  }: {
    msg: {
      role: "user" | "assistant";
      content: string;
      isGuardian?: boolean;
      isBriefing?: boolean;
    };
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex gap-3 items-end ${msg.role === "user" ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${msg.role === "user" ? "bg-[var(--accent)] text-[var(--text-primary)] font-bold text-[10px]" : "bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border-subtle)]"}`}
      >
        {msg.role === "user" ? "ME" : <Sparkles className="w-4 h-4" />}
      </div>
      <div
        className={`flex flex-col gap-1 w-full max-w-[75%] md:max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}
      >
        {msg.role === "assistant" && (
          <span
            className={`text-[11px] ml-1 font-semibold tracking-[0.08em] uppercase ${msg.isBriefing ? "text-[var(--warning)]" : msg.isGuardian ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
          >
            {msg.isBriefing
              ? "☀️ Morning Briefing"
              : msg.isGuardian
                ? "👁 Pulse Guardian"
                : "Pulse"}
          </span>
        )}
        <div
          className={`p-4 rounded-2xl text-sm leading-relaxed max-w-[65ch] whitespace-pre-line ${
            msg.role === "user"
              ? "rounded-br-sm bg-[var(--accent)] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
              : msg.isBriefing
                ? "rounded-bl-sm bg-[var(--warning)]/5 text-[var(--text-primary)] border-l-4 border-[var(--warning)]"
                : msg.isGuardian
                  ? "rounded-bl-sm bg-[var(--accent-subtle)] text-[var(--text-primary)] border-l-4 border-[var(--accent)]"
                  : "rounded-bl-sm border border-[var(--border-subtle)] bg-gradient-to-b from-[#111111] to-[#0d0d0d] text-[var(--text-primary)]"
          }`}
        >
          {msg.content}
        </div>
      </div>
    </motion.div>
  ),
);
ChatMessage.displayName = "ChatMessage";

export default function ChatInterface({
  portfolio: propPortfolio,
  isLoading: isExternalLoading = false,
  pendingMessage,
  clearPendingMessage,
  onNotification,
}: {
  portfolio?: PortfolioData;
  isLoading?: boolean;
  pendingMessage?: string | null;
  clearPendingMessage?: () => void;
  onNotification?: (notification: {
    type: "guardian" | "alert" | "info" | "positive" | "warning";
    title: string;
    message: string;
  }) => void;
}) {
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; isGuardian?: boolean }>
  >([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [personalisedPrompts, setPersonalisedPrompts] = useState<string[]>([]);
  const [hasInjectedFirstMessage, setHasInjectedFirstMessage] = useState(false);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [placeholderText, setPlaceholderText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const onNotificationRef = useRef(onNotification);

  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      setSpeechSupported(true);
      const recognizer = new SpeechRecognitionClass();
      recognizer.continuous = false;
      recognizer.interimResults = true;
      recognizer.lang = "en-US";

      recognizer.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setInputValue(finalTranscript);
        } else if (interimTranscript) {
          setInputValue(interimTranscript);
        }
      };

      recognizer.onend = () => {
        setIsRecording(false);
      };

      recognizer.onerror = (event: any) => {
        console.warn("Speech recognition error:", event?.error);
        setIsRecording(false);
        setPlaceholderText("Voice input error. Please try again or type.");
        setTimeout(() => {
          setPlaceholderText("");
        }, 3000);
      };

      setRecognition(recognizer);
    }
  }, []);

  const toggleRecording = () => {
    if (!recognition) return;
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      try {
        setPlaceholderText("Listening... Speak now");
        recognition.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Error starting speech recognition:", err);
        setIsRecording(false);
      }
    }
  };

  const apiKey = sessionStorage.getItem("BINANCE_API_KEY") || "";
  const apiSecret = sessionStorage.getItem("BINANCE_API_SECRET") || "";

  const getHeaders = () => ({
    "Content-Type": "application/json",
    "x-binance-key": apiKey,
    "x-binance-secret": apiSecret,
  });

  useEffect(() => {
    if (!propPortfolio && !isExternalLoading) {
      fetch("/api/portfolio", { headers: getHeaders() })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && !data.error && data.assets) {
            setPersonalisedPrompts(generatePersonalisedPrompts(data));
          }
        })
        .catch((err) => {
          console.warn(
            "Background portfolio fetch error in chat:",
            err?.message || err,
          );
        });
    } else if (propPortfolio) {
      setPersonalisedPrompts(generatePersonalisedPrompts(propPortfolio));
    }
  }, [propPortfolio, isExternalLoading]);

  useEffect(() => {
    if (
      propPortfolio &&
      propPortfolio.assets.length > 0 &&
      messages.length === 0 &&
      !hasInjectedFirstMessage &&
      !isExternalLoading
    ) {
      setHasInjectedFirstMessage(true);

      const timer = setTimeout(() => {
        const topAsset = [...propPortfolio.assets].sort(
          (a, b) => b.valueUSD - a.valueUSD,
        )[0];
        const percentage = topAsset
          ? ((topAsset.valueUSD / propPortfolio.totalValueUSD) * 100).toFixed(1)
          : 0;
        const risk = calculateRiskScore(propPortfolio);
        const mover = [...propPortfolio.assets].sort(
          (a, b) => Math.abs(b.changePercent24h) - Math.abs(a.changePercent24h),
        )[0];
        const moverSentence = mover
          ? `${mover.symbol.replace("USDT", "")} has been moving significantly, ${mover.changePercent24h >= 0 ? "up" : "down"} ${Math.abs(mover.changePercent24h).toFixed(1)}% in the last 24h.`
          : "";

        const msg = `Hey — I've just connected to your Binance account. Here's what I'm seeing: your portfolio is worth $${propPortfolio.totalValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} with ${propPortfolio.assets.length} active positions. Your biggest holding is ${topAsset ? topAsset.symbol.replace("USDT", "") : ""} at ${percentage}% of your portfolio. Risk level is currently ${risk.label}. ${moverSentence} What would you like to dig into?`;

        setMessages([{ role: "assistant", content: msg, isGuardian: false }]);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [
    propPortfolio,
    messages.length,
    hasInjectedFirstMessage,
    isExternalLoading,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const key = encodeURIComponent(
      sessionStorage.getItem("BINANCE_API_KEY") || "",
    );
    const secret = encodeURIComponent(
      sessionStorage.getItem("BINANCE_API_SECRET") || "",
    );
    const url = `/api/stream?key=${key}&secret=${secret}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("guardian", (e) => {
      try {
        const changes = JSON.parse(e.data);
        if (changes && changes.length > 0) {
          const formattedChanges = changes
            .map((c: any) => `- ${c.message}`)
            .join("\n");
          const msg = `👁 Pulse is watching...\n\nI noticed some significant movements in your portfolio:\n${formattedChanges}`;
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: msg, isGuardian: true },
          ]);

          if (onNotificationRef.current) {
            changes.forEach((c: any) => {
              onNotificationRef.current!({
                type: "guardian",
                title: "Portfolio Movement",
                message: c.message,
              });
            });
          }
        }
      } catch (err) {
        console.error("Error parsing guardian event:", err);
      }
    });

    eventSource.addEventListener("alert", (e) => {
      try {
        const triggered = JSON.parse(e.data);
        if (triggered && triggered.length > 0) {
          triggered.forEach((alert: any) => {
            const msg = `🚨 Price Alert Triggered!\n\nYour alert for ${alert.symbol} to go ${alert.direction} $${alert.targetPrice.toLocaleString()} has been triggered. The current price is $${alert.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}.\n\nYour position impact: $${alert.portfolioImpact.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: msg, isGuardian: true },
            ]);

            if (onNotificationRef.current) {
              onNotificationRef.current!({
                type: "alert",
                title: "Price Alert Triggered",
                message: `Your alert for ${alert.symbol} to go ${alert.direction} $${alert.targetPrice.toLocaleString()} has been triggered.`,
              });
            }
          });
        }
      } catch (err) {
        console.error("Error parsing alert event:", err);
      }
    });

    eventSource.addEventListener("error", () => {
      // SSE will auto-reconnect — just log silently
    });

    return () => {
      eventSource.close();
    };
  }, []);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const newHistory = [...messages, { role: "user" as const, content: text }];
    setMessages(newHistory);
    setInputValue("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ message: text, conversationHistory: messages }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch chat response");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      let fullResponse = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          setMessages((prev) => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1] = {
              ...newMsgs[newMsgs.length - 1],
              content: fullResponse,
            };
            return newMsgs;
          });
        }
      }

      // Handle JSON commands AFTER full stream
      try {
        const jsonMatch = fullResponse.match(/\{[\s\S]*"action"[\s\S]*\}/);
        if (jsonMatch) {
          const command = JSON.parse(jsonMatch[0]);
          if (command.action === "set_alert") {
            const setRes = await fetch("/api/alerts/set", {
              method: "POST",
              headers: getHeaders(),
              body: JSON.stringify({
                symbol: command.symbol,
                targetPrice: command.targetPrice,
                direction: command.direction,
              }),
            });
            if (setRes.ok) {
              setMessages((prev) => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].content =
                  `✅ Price alert set for ${command.symbol} ${command.direction} $${command.targetPrice.toLocaleString()}`;
                return newMsgs;
              });
            }
          } else if (command.action === "get_summary") {
            const sumRes = await fetch("/api/summary", {
              headers: getHeaders(),
            });
            if (sumRes.ok) {
              const summary = await sumRes.json();
              setMessages((prev) => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].content =
                  summary.insight || "Here is your portfolio summary.";
                return newMsgs;
              });
            }
          }
        }
      } catch (e) {
        // Not a JSON command, leave it as plain text
      }
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${error.message || "I encountered an issue. Please try again."}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (pendingMessage) {
      if (isLoading) {
        setQueuedMessage(pendingMessage);
      } else {
        handleSend(pendingMessage);
      }
      clearPendingMessage?.();
    }
  }, [pendingMessage, isLoading, clearPendingMessage]);

  useEffect(() => {
    if (!isLoading && queuedMessage) {
      handleSend(queuedMessage);
      setQueuedMessage(null);
    }
  }, [isLoading, queuedMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!inputValue.trim()) return;
      if (isLoading) {
        setQueuedMessage(inputValue);
        setInputValue("");
      } else {
        handleSend(inputValue);
      }
    }
  };

  if (isExternalLoading) {
    return (
      <div className="flex flex-col h-full bg-[var(--bg-card)] md:rounded-2xl border-t md:border border-[var(--border-subtle)] flex-1 md:overflow-hidden relative shadow-sm animate-pulse">
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center gap-3 bg-[var(--bg-base)]/40 shrink-0">
          <div className="w-3 h-3 rounded-full bg-[rgba(255,255,255,0.06)]"></div>
          <div className="h-4 bg-[rgba(255,255,255,0.06)] rounded w-32"></div>
        </div>
        <div className="flex-1 p-4 flex flex-col gap-6 justify-end">
          <div className="flex gap-3 items-end flex-row-reverse">
            <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)] flex-shrink-0"></div>
            <div className="h-12 w-[60%] bg-[rgba(255,255,255,0.06)] rounded-2xl rounded-br-sm"></div>
          </div>
          <div className="flex gap-3 items-end">
            <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)] flex-shrink-0"></div>
            <div className="h-20 w-[75%] bg-[rgba(255,255,255,0.06)] rounded-2xl rounded-bl-sm"></div>
          </div>
        </div>
        <div className="p-4 bg-[var(--bg-base)] border-t border-[var(--border-subtle)] shrink-0">
          <div className="h-14 w-full bg-[rgba(255,255,255,0.06)] rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] md:rounded-2xl border-t md:border border-[var(--border-subtle)] shadow-sm flex-1 md:overflow-hidden relative">
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center gap-3 bg-[var(--bg-base)]/40 shrink-0">
        <div className="bg-[var(--positive-subtle)] text-[var(--positive)] text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-[var(--positive)] rounded-full"></span>{" "}
          Live
        </div>
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          Pulse
        </span>
      </div>

      <div
        className="flex-1 p-4 overflow-y-auto flex flex-col gap-5 pb-32 md:pb-4"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.06) transparent",
        }}
      >
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center text-[var(--text-secondary)] p-6 h-full"
          >
            <Sparkles className="w-10 h-10 text-[#6366f1]/50 mb-4" />
            <p className="text-base font-medium text-[var(--text-primary)]">
              I'm Pulse.
            </p>
            <p className="text-sm mt-2 max-w-[250px]">
              I'm connected to your live portfolio. Ask me anything about your
              positions, risk, or market context.
            </p>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <ChatMessage key={i} msg={msg} />
          ))}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3 items-end"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--bg-card)] flex-shrink-0 flex items-center justify-center text-[#6366f1] border border-[var(--border-subtle)] shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl rounded-bl-sm bg-[var(--bg-card)] border border-[var(--border-subtle)] flex gap-1.5 items-center h-11">
                <span
                  className="w-1.5 h-1.5 bg-[#6b7280] rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></span>
                <span
                  className="w-1.5 h-1.5 bg-[#6b7280] rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></span>
                <span
                  className="w-1.5 h-1.5 bg-[#6b7280] rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} className="h-1" />
      </div>

      <div
        className="absolute md:relative bottom-0 left-0 right-0 p-4 bg-[var(--bg-card)]/95 backdrop-blur-sm border-t border-[var(--border-subtle)] shrink-0 z-10"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {!messages.some((m) => m.role === "user") && (
          <div className="mb-4">
            <MorningBriefing
              onBriefingGenerated={(briefing) => {
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: briefing, isBriefing: true },
                ]);
              }}
            />
          </div>
        )}
        {!messages.some((m) => m.role === "user") &&
          personalisedPrompts.length > 0 && (
            <QuickPrompts prompts={personalisedPrompts} onSelect={handleSend} />
          )}
        <div className="relative group">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              placeholderText ||
              (isRecording
                ? "Listening... Speak now"
                : isLoading
                  ? "Type a message to send next..."
                  : "Ask about your portfolio...")
            }
            className={`w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl py-4 px-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all ${speechSupported ? "pr-24" : "pr-14"} shadow-inner min-h-[52px]`}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {speechSupported && (
              <button
                type="button"
                onClick={toggleRecording}
                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                  isRecording
                    ? "text-[var(--negative)] animate-pulse"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
                aria-label={
                  isRecording ? "Stop voice recording" : "Start voice recording"
                }
                title={isRecording ? "Stop listening" : "Speak your message"}
              >
                {isRecording ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            )}
            <button
              onClick={() => {
                if (!inputValue.trim() || isLoading) return;
                handleSend(inputValue);
              }}
              disabled={isLoading || !inputValue.trim()}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[#6366f1] active:scale-95 disabled:hover:bg-transparent disabled:opacity-50 transition-all duration-200 ease-in-out cursor-pointer"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
