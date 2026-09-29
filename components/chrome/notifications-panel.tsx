"use client"

import { useState, useEffect } from "react"
import { Bell, Check, EnvelopeSimple, Lock, ShieldCheck, X } from "@phosphor-icons/react"
import type { NotificationRecord } from "@/lib/db/types"

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(false)

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications")
      const data = await res.json()
      if (data.ok) {
        setNotifications(data.data || [])
      }
    } catch {
      // offline fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setLoading(true)
    })
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.ok) {
          setNotifications(data.data || [])
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {
      // ignore
    }
  }

  const handleMarkSingleRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      })
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    } catch {
      // ignore
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "invite_received":
      case "invite_accepted":
        return <EnvelopeSimple size={16} className="text-primary" />
      case "access_changed":
      case "access_removed":
        return <ShieldCheck size={16} className="text-amber-500" />
      case "link_expiring":
        return <Lock size={16} className="text-red-500" />
      default:
        return <Bell size={16} className="text-muted-foreground" />
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Sharing notifications center"
      className="fixed inset-0 z-50 flex items-start justify-end p-4 bg-black/20 backdrop-blur-2xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-80 max-h-[80vh] flex flex-col rounded-xl border border-border bg-card p-4 shadow-xl text-card-foreground">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-foreground" />
            <h3 className="text-xs font-mono font-semibold uppercase">Notifications</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-[11px] font-mono text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-muted-foreground hover:bg-muted"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 space-y-2">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground font-mono">
              No new sharing notifications.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleMarkSingleRead(n.id)}
                className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                  n.is_read
                    ? "border-border/40 bg-card text-muted-foreground"
                    : "border-primary/30 bg-primary/5 text-foreground font-medium"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">{getNotificationIcon(n.type)}</div>
                  <div className="flex-1 space-y-1">
                    <p className="leading-tight">
                      {n.type === "invite_received" && "You were invited to a document."}
                      {n.type === "invite_accepted" && "Your invitation was accepted."}
                      {n.type === "access_changed" && "Your document access permission was updated."}
                      {n.type === "access_removed" && "Your document access permission was removed."}
                      {n.type === "link_expiring" && "A share link is expiring soon."}
                    </p>
                    <span className="text-[10px] font-mono text-muted-foreground block">
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
