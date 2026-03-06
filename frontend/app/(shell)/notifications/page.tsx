"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { NotificationItem, NotificationsResponse, apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";

export default function NotificationsPage() {
  const [scope, setScope] = useState<"all" | "unread">("unread");
  const [rows, setRows] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextScope: "all" | "unread" = scope) => {
    setIsLoading(true);
    try {
      const data = await apiClientJson<NotificationsResponse>(`/notifications?scope=${nextScope}`);
      setRows(data.items);
      setUnread(data.unread_count);
      setError(null);
    } catch (err) {
      setError(toUserErrorMessage(err, "Unable to load notifications."));
    } finally {
      setIsLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    load(scope).catch(() => undefined);
  }, [load, scope]);

  const markRead = async (id: number) => {
    setIsSaving(true);
    try {
      await apiClientJson(`/notifications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_read: true }) });
      await load(scope);
    } catch (err) {
      setError(toUserErrorMessage(err, "Unable to update notification."));
    } finally {
      setIsSaving(false);
    }
  };

  const markAllRead = async () => {
    setIsSaving(true);
    try {
      await apiClientJson("/notifications/mark-all-read", { method: "POST" });
      await load(scope);
    } catch (err) {
      setError(toUserErrorMessage(err, "Unable to mark all as read."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full space-y-4 px-4 pb-6">
      <section className="barn-card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Notifications</h1>
          <button disabled={isSaving || isLoading} onClick={() => markAllRead().catch(() => undefined)} className="min-h-11 rounded bg-[var(--barn-red)] px-3 py-2 text-xs disabled:opacity-50">Mark all read</button>
        </div>
        <p className="text-sm text-[var(--barn-muted)]">Unread: {unread}</p>
        <div className="flex gap-2 text-xs">
          <button disabled={isLoading} onClick={() => setScope("unread")} className={`min-h-11 rounded px-3 py-2 disabled:opacity-50 ${scope === "unread" ? "bg-[var(--barn-red)]" : "bg-[var(--barn-bg)]"}`}>Unread</button>
          <button disabled={isLoading} onClick={() => setScope("all")} className={`min-h-11 rounded px-3 py-2 disabled:opacity-50 ${scope === "all" ? "bg-[var(--barn-red)]" : "bg-[var(--barn-bg)]"}`}>All</button>
        </div>
        {error ? (
          <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">
            <p>{error}</p>
            <button type="button" onClick={() => load(scope).catch(() => undefined)} className="mt-2 min-h-11 rounded bg-neutral-700 px-3 py-2 text-xs">Retry</button>
          </div>
        ) : null}
      </section>

      {isLoading ? <p className="barn-row text-sm text-[var(--barn-muted)]">Loading notifications...</p> : null}
      {!isLoading && rows.length === 0 ? <p className="barn-row text-sm text-[var(--barn-muted)]">No notifications.</p> : null}
      {!isLoading ? rows.map((item) => (
        <article key={item.id} className="barn-card space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">{item.title}</p>
            {!item.is_read ? <button disabled={isSaving} onClick={() => markRead(item.id).catch(() => undefined)} className="min-h-11 rounded bg-[var(--barn-bg)] px-2 py-1 text-xs disabled:opacity-50">Mark read</button> : <span className="text-xs text-[var(--barn-muted)]">Read</span>}
          </div>
          <p className="text-xs text-[var(--barn-muted)]">{item.type} • {item.timestamp ? new Date(item.timestamp).toLocaleString() : ""}</p>
          {item.body ? <p>{item.body}</p> : null}
          <p className="text-xs text-[var(--barn-muted)]">{item.project ? `Project: ${item.project.name}` : ""}{item.actor_profile ? ` • By ${item.actor_profile.name}` : ""}</p>
          <Link href={item.related_route || "/dashboard"} className="see-all-link">Open</Link>
        </article>
      )) : null}
    </div>
  );
}
