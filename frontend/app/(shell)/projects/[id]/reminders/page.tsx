"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { AuthStatus, ProjectReminder, apiClientJson } from "@/lib/api";

const reminderTypes = ["feed", "weigh_in", "exercise", "show_prep", "expense", "custom"];

export default function ProjectRemindersPage() {
  const { id } = useParams<{ id: string }>();
  const [rows, setRows] = useState<ProjectReminder[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);

  const load = async () => {
    const [reminders, authStatus] = await Promise.all([
      apiClientJson<ProjectReminder[]>(`/projects/${id}/reminders`),
      apiClientJson<AuthStatus>("/auth/status")
    ]);
    setRows(reminders);
    setAuth(authStatus);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [id]);

  const createReminder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiClientJson(`/projects/${id}/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.get("type"),
        enabled: true,
        time_of_day: form.get("time_of_day"),
        frequency: form.get("frequency"),
        notes: form.get("notes"),
        parent_locked: form.get("parent_locked") === "on"
      })
    });
    event.currentTarget.reset();
    await load();
  };

  const toggle = async (item: ProjectReminder) => {
    await apiClientJson(`/reminders/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !item.enabled }) });
    await load();
  };

  const removeReminder = async (item: ProjectReminder) => {
    await apiClientJson(`/reminders/${item.id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="w-full space-y-4 px-4 pb-6">
      <h1 className="text-xl font-semibold">Project Reminders</h1>
      <form className="barn-card grid gap-2 text-sm" onSubmit={(event) => createReminder(event).catch(() => undefined)}>
        <select name="type" className="rounded bg-[var(--barn-bg)] p-2">{reminderTypes.map((type) => <option key={type} value={type}>{type.replace("_", " ")}</option>)}</select>
        <input name="time_of_day" type="time" className="rounded bg-[var(--barn-bg)] p-2" />
        <input name="frequency" placeholder="daily, weekdays, custom" className="rounded bg-[var(--barn-bg)] p-2" />
        <textarea name="notes" placeholder="Reminder message" className="rounded bg-[var(--barn-bg)] p-2" />
        <label className="flex items-center gap-2"><input name="parent_locked" type="checkbox" /> Parent locked</label>
        <button className="rounded bg-[var(--barn-red)] px-3 py-2 text-sm">Add reminder</button>
      </form>

      {rows.length === 0 ? <p className="barn-row text-sm text-[var(--barn-muted)]">No reminders yet.</p> : rows.map((item) => {
        const blocked = item.parent_locked && auth?.role !== "parent";
        return (
          <article key={item.id} className="barn-card space-y-2 text-sm">
            <p className="font-semibold">{item.type.replace("_", " ")}{item.parent_locked ? " 🔒" : ""}</p>
            <p className="text-xs text-[var(--barn-muted)]">{item.time_of_day || "Any time"} • {item.frequency || "No frequency"}</p>
            {item.notes ? <p>{item.notes}</p> : null}
            <div className="flex gap-2">
              <button disabled={blocked} onClick={() => toggle(item).catch(() => undefined)} className="rounded bg-[var(--barn-bg)] px-3 py-2 text-xs disabled:opacity-50">{item.enabled ? "Disable" : "Enable"}</button>
              <button disabled={blocked} onClick={() => removeReminder(item).catch(() => undefined)} className="rounded bg-red-900 px-3 py-2 text-xs disabled:opacity-50">Delete</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
