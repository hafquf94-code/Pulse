import React from "react";
import { X, Bell, Eye, AlertCircle, TrendingUp, Info } from "lucide-react";

export type Notification = {
  id: string;
  type: "guardian" | "alert" | "info" | "positive" | "warning";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
};

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onNotificationClick: (notification: Notification) => void;
}

const getRelativeTime = (isoString: string) => {
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24)
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
};

const getIcon = (type: string) => {
  switch (type) {
    case "guardian":
      return <Eye className="w-4 h-4 text-[#6366f1]" />;
    case "alert":
      return <Bell className="w-4 h-4 text-[#eab308]" />;
    case "positive":
      return <TrendingUp className="w-4 h-4 text-[var(--positive)]" />;
    case "warning":
      return <AlertCircle className="w-4 h-4 text-[var(--negative)]" />;
    case "info":
    default:
      return <Info className="w-4 h-4 text-[var(--text-secondary)]" />;
  }
};

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onClearAll,
  onNotificationClick,
}: NotificationCenterProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-[var(--bg-base)]/30 z-40"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 bottom-0 w-full md:w-[360px] bg-[var(--bg-base)] border-l border-[var(--border-subtle)] z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg text-[var(--text-primary)]">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="bg-[#6366f1] text-[var(--text-primary)] text-xs px-2 py-0.5 rounded-full font-medium">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] shrink-0 bg-white/[0.02]">
            <button
              onClick={onMarkAllRead}
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Mark all read
            </button>
            <button
              onClick={onClearAll}
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--negative)] transition-colors"
            >
              Clear all
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255,255,255,0.06) transparent",
            }}
          >
            {notifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3 opacity-50">
                <Bell className="w-12 h-12 text-[var(--text-secondary)]" />
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">
                    No notifications yet
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Pulse will alert you when something important happens
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => onNotificationClick(notification)}
                    className={`p-4 cursor-pointer hover:bg-[rgba(255,255,255,0.03)] transition-colors flex gap-3 ${
                      !notification.read
                        ? "border-l-2 border-[#6366f1] bg-white/[0.01]"
                        : "opacity-70"
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {notification.title}
                        </h4>
                        <span className="text-[10px] text-[var(--text-secondary)]/60 shrink-0 whitespace-nowrap">
                          {getRelativeTime(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
