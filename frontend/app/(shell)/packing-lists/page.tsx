"use client";

import { FormEvent, useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { apiClientJson, AuthStatus, PackingListTemplate } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";

const fieldClassName =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function PackingListsPage() {
  const [templates, setTemplates] = useState<PackingListTemplate[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isParent = auth?.role === "parent";

  const load = async () => {
    try {
      const [templateData, authData] = await Promise.all([
        apiClientJson<PackingListTemplate[]>("/packing-lists"),
        apiClientJson<AuthStatus>("/auth/status")
      ]);
      setTemplates(templateData);
      setAuth(authData);
      setError(null);
    } catch (loadError) {
      setError(toUserErrorMessage(loadError, "Unable to load packing lists right now."));
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const createTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      await apiClientJson("/packing-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          description: formData.get("description") || null,
          project_type: formData.get("project_type") || null
        })
      });
      event.currentTarget.reset();
      setShowForm(false);
      await load();
    } catch (submitError) {
      setError(toUserErrorMessage(submitError, "Unable to create packing list right now."));
    }
  };

  const addItem = async (event: FormEvent<HTMLFormElement>, templateId: number) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      await apiClientJson(`/packing-lists/${templateId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_name: formData.get("item_name") })
      });
      event.currentTarget.reset();
      await load();
    } catch (submitError) {
      setError(toUserErrorMessage(submitError, "Unable to add packing list item right now."));
    }
  };

  const deleteTemplate = async (templateId: number) => {
    try {
      await apiClientJson(`/packing-lists/${templateId}`, { method: "DELETE" });
      await load();
    } catch (deleteError) {
      setError(toUserErrorMessage(deleteError, "Unable to delete packing list right now."));
    }
  };

  const deleteItem = async (templateId: number, itemId: number) => {
    try {
      await apiClientJson(`/packing-lists/${templateId}/items/${itemId}`, { method: "DELETE" });
      await load();
    } catch (deleteError) {
      setError(toUserErrorMessage(deleteError, "Unable to delete packing list item right now."));
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Packing Lists</h1>
          <p className="text-sm text-muted-foreground">Reusable show day checklists</p>
        </div>
        {isParent ? (
          <button
            type="button"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => setShowForm((prev) => !prev)}
          >
            {showForm ? "Cancel" : "New List"}
          </button>
        ) : null}
      </header>

      {showForm ? (
        <form onSubmit={createTemplate} className="mb-4 rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">New Packing List</h2>
          <div className="space-y-2">
            <input name="name" required className={fieldClassName} placeholder="Template name" />
            <textarea name="description" rows={2} className={fieldClassName} placeholder="Description" />
            <select name="project_type" className={fieldClassName} defaultValue="">
              <option value="">All project types</option>
              <option value="any">any</option>
              <option value="livestock">livestock</option>
              <option value="cooking">cooking</option>
              <option value="crafts">crafts</option>
              <option value="woodworking">woodworking</option>
              <option value="gardening">gardening</option>
              <option value="photography">photography</option>
              <option value="sewing">sewing</option>
              <option value="other">other</option>
            </select>
            <button type="submit" className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
              Save Packing List
            </button>
          </div>
        </form>
      ) : null}

      {templates.map((template) => {
        const expanded = expandedId === template.id;
        return (
          <article key={template.id} className="mb-3 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              onClick={() => setExpandedId((prev) => (prev === template.id ? null : template.id))}
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{template.name}</p>
                {template.project_type ? (
                  <span className="ml-0 mt-1 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
                    {template.project_type}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{template.items.length} items</span>
                {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </div>
            </button>

            {expanded ? (
              <section className="border-t border-border px-4 py-3">
                <div>
                  {template.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 border-b border-border py-1.5 last:border-0">
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span className="flex-1 text-sm text-foreground">{item.item_name}</span>
                      {item.quantity ? <span className="text-xs text-muted-foreground">{item.quantity}</span> : null}
                      {item.category ? <span className="text-xs text-muted-foreground">{item.category}</span> : null}
                      {isParent ? (
                        <button
                          type="button"
                          className="ml-auto text-xs text-red-500"
                          onClick={() => deleteItem(template.id, item.id).catch(() => undefined)}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>

                {isParent ? (
                  <form onSubmit={(event) => addItem(event, template.id).catch(() => undefined)} className="mt-3 flex gap-2">
                    <input name="item_name" required className={`${fieldClassName} flex-1`} placeholder="Add item..." />
                    <button type="submit" className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                      Add
                    </button>
                  </form>
                ) : null}

                {isParent ? (
                  <button
                    type="button"
                    className="mt-3 text-xs text-red-500"
                    onClick={() => deleteTemplate(template.id).catch(() => undefined)}
                  >
                    Delete this list
                  </button>
                ) : null}
              </section>
            ) : null}
          </article>
        );
      })}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
