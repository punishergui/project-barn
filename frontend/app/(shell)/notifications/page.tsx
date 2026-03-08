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
    <div className="w-full space-y-4 pb-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="mb-4 font-serif text-2xl text-foreground">Notifications</h1>
          <span className="rounded-full bg-secondary px-2 py-1 text-xs text-muted-foreground">{unread} unread</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button disabled={isLoading} onClick={() => setScope("all")} className={scope === "all" ? "bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-sm disabled:opacity-50" : "bg-secondary text-muted-foreground rounded-full px-4 py-1.5 text-sm disabled:opacity-50"}>All</button>
            <button disabled={isLoading} onClick={() => setScope("unread")} className={scope === "unread" ? "bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-sm disabled:opacity-50" : "bg-secondary text-muted-foreground rounded-full px-4 py-1.5 text-sm disabled:opacity-50"}>Unread</button>
          </div>
          <button disabled={isSaving || isLoading} onClick={() => markAllRead().catch(() => undefined)} className="bg-secondary text-foreground rounded-xl px-3 py-1.5 text-sm disabled:opacity-50">Mark all read</button>
        </div>

        {error ? (
          <div className="rounded-2xl bg-card border border-border shadow-sm p-4 text-sm">
            <p className="text-destructive">{error}</p>
            <button type="button" onClick={() => load(scope).catch(() => undefined)} className="mt-2 bg-secondary text-foreground rounded-xl px-4 py-2 text-sm">Retry</button>
          </div>
        ) : null}
      </section>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading notifications...</p> : null}
      {!isLoading && rows.length === 0 ? <p className="text-sm text-muted-foreground">No notifications.</p> : null}
      {!isLoading ? rows.map((item) => (
        <article key={item.id} className={`rounded-2xl bg-card border border-border shadow-sm px-4 py-3 ${!item.is_read ? "border-l-2 border-l-primary" : ""}`}>
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm text-foreground">{item.title}</p>
            {!item.is_read ? <button disabled={isSaving} onClick={() => markRead(item.id).catch(() => undefined)} className="text-xs text-primary ml-auto disabled:opacity-50">Mark read</button> : <span className="text-xs text-muted-foreground ml-auto">Read</span>}
          </div>
          <p className="text-xs text-muted-foreground">{item.type} • {item.timestamp ? new Date(item.timestamp).toLocaleString() : ""}</p>
          {item.body ? <p className="mt-1 text-sm text-foreground">{item.body}</p> : null}
          <p className="text-xs text-muted-foreground">{item.project ? `Project: ${item.project.name}` : ""}{item.actor_profile ? ` • By ${item.actor_profile.name}` : ""}</p>
          <Link href={item.related_route || "/dashboard"} className="text-xs text-primary">Open</Link>
        </article>
      )) : null}
    </div>
  );
}
