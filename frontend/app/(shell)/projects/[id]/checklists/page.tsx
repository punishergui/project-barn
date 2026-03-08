"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { apiClientJson, ChecklistResponse } from "@/lib/api";

export default function ProjectChecklistsPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ChecklistResponse | null>(null);

  const load = () => apiClientJson<ChecklistResponse>(`/projects/${params.id}/checklists`).then(setData);

  useEffect(() => {
    load().catch(() => undefined);
  }, [params.id]);

  const addItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiClientJson(`/projects/${params.id}/checklists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.get("title") })
    });
    event.currentTarget.reset();
    await load();
  };

  const toggle = async (id: number, isCompleted: boolean) => {
    await apiClientJson(`/checklists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_completed: !isCompleted })
    });
    await load();
  };

  return (
    <div className="w-full space-y-3 px-4 pb-4">
      <h1 className="text-xl font-semibold">Checklist & Skills</h1>
      <p className="text-sm text-muted-foreground">Completion: {data?.summary.completion_percent ?? 0}% ({data?.summary.completed ?? 0}/{data?.summary.total ?? 0})</p>
      <div className="h-2 w-full overflow-hidden rounded bg-background"><div className="h-full bg-green-600" style={{ width: `${data?.summary.completion_percent ?? 0}%` }} /></div>
      <form className="rounded-2xl bg-card border border-border shadow-sm p-4 flex gap-2" onSubmit={(event) => addItem(event).catch(() => undefined)}>
        <input name="title" required className="flex-1 rounded bg-background p-2" placeholder="Add checklist item" />
        <button className="rounded bg-primary text-primary-foreground px-3 py-2 text-xs">Add</button>
      </form>
      {(data?.items ?? []).map((item) => (
        <article key={item.id} className="text-sm text-muted-foreground flex items-center justify-between text-sm">
          <p className={item.is_completed ? "line-through" : ""}>{item.title}</p>
          <button onClick={() => toggle(item.id, item.is_completed).catch(() => undefined)} className="rounded bg-secondary text-foreground px-2 py-1 text-xs">{item.is_completed ? "Undo" : "Done"}</button>
        </article>
      ))}
    </div>
  );
}
