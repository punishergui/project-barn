"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { NotificationItem, NotificationsResponse, apiClientJson } from "@/lib/api";

export default function NotificationsPage() {
  const [scope, setScope] = useState<"all" | "unread">("unread");
  const [rows, setRows] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const load = async (nextScope = scope) => {
    const data = await apiClientJson<NotificationsResponse>(`/notifications?scope=${nextScope}`);
    setRows(data.items);
    setUnread(data.unread_count);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [scope]);

  const markRead = async (id: number) => {
    await apiClientJson(`/notifications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_read: true }) });
    await load();
  };

  const markAllRead = async () => {
    await apiClientJson("/notifications/mark-all-read", { method: "POST" });
    await load();
  };

  return (
    <div className="w-full space-y-4 px-4 pb-6">
      <section className="barn-card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Notifications</h1>
          <button onClick={() => markAllRead().catch(() => undefined)} className="rounded bg-[var(--barn-red)] px-3 py-2 text-xs">Mark all read</button>
        </div>
        <p className="text-sm text-[var(--barn-muted)]">Unread: {unread}</p>
        <div className="flex gap-2 text-xs">
          <button onClick={() => setScope("unread")} className={`rounded px-3 py-2 ${scope === "unread" ? "bg-[var(--barn-red)]" : "bg-[var(--barn-bg)]"}`}>Unread</button>
          <button onClick={() => setScope("all")} className={`rounded px-3 py-2 ${scope === "all" ? "bg-[var(--barn-red)]" : "bg-[var(--barn-bg)]"}`}>All</button>
        </div>
      </section>

      {rows.length === 0 ? <p className="barn-row text-sm text-[var(--barn-muted)]">No notifications.</p> : rows.map((item) => (
        <article key={item.id} className="barn-card space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">{item.title}</p>
            {!item.is_read ? <button onClick={() => markRead(item.id).catch(() => undefined)} className="rounded bg-[var(--barn-bg)] px-2 py-1 text-xs">Mark read</button> : <span className="text-xs text-[var(--barn-muted)]">Read</span>}
          </div>
          <p className="text-xs text-[var(--barn-muted)]">{item.type} • {item.timestamp ? new Date(item.timestamp).toLocaleString() : ""}</p>
          {item.body ? <p>{item.body}</p> : null}
          <p className="text-xs text-[var(--barn-muted)]">{item.project ? `Project: ${item.project.name}` : ""}{item.actor_profile ? ` • By ${item.actor_profile.name}` : ""}</p>
          <Link href={item.related_route || "/dashboard"} className="see-all-link">Open</Link>
        </article>
      ))}
    </div>
  );
}
