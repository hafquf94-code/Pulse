import React, { useState, useEffect } from "react";
import { Sun, RefreshCw, Check } from "lucide-react";

interface MorningBriefingProps {
  onBriefingGenerated: (briefing: string) => void;
}

export default function MorningBriefing({
  onBriefingGenerated,
}: MorningBriefingProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGeneratedToday, setHasGeneratedToday] = useState(false);

  useEffect(() => {
    const lastGeneratedDate = localStorage.getItem("pulse_briefing_date");
    if (lastGeneratedDate === new Date().toDateString()) {
      setHasGeneratedToday(true);
    }
  }, []);

  const handleGenerateBriefing = async () => {
    setIsGenerating(true);
    try {
      const key = sessionStorage.getItem("BINANCE_API_KEY") || "";
      const secret = sessionStorage.getItem("BINANCE_API_SECRET") || "";

      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-binance-key": key,
          "x-binance-secret": secret,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to generate briefing");
      }

      const data = await res.json();

      localStorage.setItem("pulse_briefing_date", new Date().toDateString());
      setHasGeneratedToday(true);
      onBriefingGenerated(data.briefing);
    } catch (error) {
      console.error("Briefing generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleGenerateBriefing}
      disabled={isGenerating}
      className={`w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl py-3 px-4 text-left transition-all ${
        isGenerating
          ? "opacity-80 cursor-not-allowed"
          : "hover:border-[#6366f1]/30 hover:bg-[var(--accent-subtle)] cursor-pointer active:scale-[0.99]"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${isGenerating ? "bg-[#6366f1]/20 text-[#6366f1]" : "bg-[#eab308]/20 text-[#eab308]"}`}
          >
            {isGenerating ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3
              className={`font-semibold text-sm ${isGenerating ? "text-[#6366f1]" : "text-[var(--text-primary)]"}`}
            >
              {isGenerating
                ? "Generating your briefing..."
                : "☀️ Morning Briefing"}
            </h3>
            {!isGenerating && (
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {hasGeneratedToday ? (
                  <span className="flex items-center gap-1 text-[var(--positive)]">
                    <Check className="w-3 h-3" /> Briefing delivered today
                  </span>
                ) : (
                  "Get your daily portfolio briefing"
                )}
              </p>
            )}
          </div>
        </div>

        {hasGeneratedToday && !isGenerating && (
          <span className="text-xs text-[#6366f1] hover:text-[#4f46e5] font-medium transition-colors">
            Refresh
          </span>
        )}
      </div>
    </button>
  );
}
