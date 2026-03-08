"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { apiClientJson, ShowReadinessResponse } from "@/lib/api";

export default function ProjectShowReadinessPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ShowReadinessResponse | null>(null);

  const load = () => apiClientJson<ShowReadinessResponse>(`/projects/${params.id}/show-readiness`).then(setData);

  useEffect(() => {
    load().catch(() => undefined);
  }, [params.id]);

  const addItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiClientJson(`/projects/${params.id}/show-readiness`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_name: form.get("item_name") })
    });
    event.currentTarget.reset();
    await load();
  };

  const toggle = async (id: number, isCompleted: boolean) => {
    await apiClientJson(`/show-readiness/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_completed: !isCompleted })
    });
    await load();
  };

  return (
    <div className="w-full space-y-3 px-4 pb-4">
      <h1 className="text-xl font-semibold">Show Readiness</h1>
      <p className="text-sm text-muted-foreground">Ready: {data?.summary.completion_percent ?? 0}%</p>
      <div className="h-2 w-full overflow-hidden rounded bg-background"><div className="h-full bg-amber-500" style={{ width: `${data?.summary.completion_percent ?? 0}%` }} /></div>
      <form className="rounded-2xl bg-card border border-border shadow-sm p-4 flex gap-2" onSubmit={(event) => addItem(event).catch(() => undefined)}>
        <input name="item_name" required className="flex-1 rounded bg-background p-2" placeholder="Add readiness item" />
        <button className="rounded bg-primary text-primary-foreground px-3 py-2 text-xs">Add</button>
      </form>
      {(data?.items ?? []).map((item) => (
        <article key={item.id} className="text-sm text-muted-foreground flex items-center justify-between text-sm">
          <p className={item.is_completed ? "line-through" : ""}>{item.item_name}</p>
          <button onClick={() => toggle(item.id, item.is_completed).catch(() => undefined)} className="rounded bg-secondary text-foreground px-2 py-1 text-xs">{item.is_completed ? "Undo" : "Done"}</button>
        </article>
      ))}
    </div>
  );
}
