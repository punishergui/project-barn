"use client";

import { useMemo, useState } from "react";

const packingTemplates: Array<{ title: string; items: string[] }> = [
  {
    title: "Show ring day",
    items: ["Halter", "Brushes", "Water bucket", "Feed scoop", "Registration papers", "Backup lead rope"]
  },
  {
    title: "Weekend show trip",
    items: ["Bedding", "Fan/extension cord", "First aid supplies", "Show clothes", "Boots", "Snacks and water"]
  },
  {
    title: "Fair check-in",
    items: ["Health papers", "Entry confirmation", "Ear tag records", "Weight card", "Pens/clipboard", "Cash for extras"]
  }
];

export default function PackingListsPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const totals = useMemo(() => {
    const total = packingTemplates.reduce((sum, template) => sum + template.items.length, 0);
    const completed = Object.values(checked).filter(Boolean).length;
    return { total, completed };
  }, [checked]);

  return (
    <div className="w-full space-y-4 pb-4">
      <header className="rounded-2xl border border-border bg-card px-4 py-3">
        <h1 className="font-serif text-2xl text-foreground">Packing Lists</h1>
        <p className="mt-1 text-sm text-muted-foreground">Use these quick checklists before practices, shows, and fair check-in.</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {totals.completed} of {totals.total} items packed
        </p>
      </header>

      {packingTemplates.map((template) => (
        <section key={template.title} className="rounded-2xl border border-border bg-card px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{template.title}</h2>
          <ul className="mt-2 space-y-2">
            {template.items.map((item) => {
              const key = `${template.title}:${item}`;
              return (
                <li key={key}>
                  <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={Boolean(checked[key])}
                      onChange={(event) => setChecked((prev) => ({ ...prev, [key]: event.target.checked }))}
                    />
                    <span>{item}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
