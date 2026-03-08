"use client";

import { FormEvent, useMemo, useState } from "react";
import { Drawer } from "vaul";
import { toast } from "sonner";

import { FeedInventoryItem, apiClientJson } from "@/lib/api";

type TaskType = "feed" | "weigh" | "walk" | "groom" | "health" | "note";

const TASK_TYPES: Array<{ type: TaskType; label: string; emoji: string; livestock_only: boolean }> = [
  { type: "feed", label: "Feed", emoji: "🌾", livestock_only: true },
  { type: "weigh", label: "Weigh", emoji: "⚖️", livestock_only: true },
  { type: "walk", label: "Walk", emoji: "🚶", livestock_only: true },
  { type: "groom", label: "Groom", emoji: "✂️", livestock_only: true },
  { type: "health", label: "Health", emoji: "💊", livestock_only: false },
  { type: "note", label: "Note", emoji: "📝", livestock_only: false }
];

const fieldClassName = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function LogActivityDrawer({
  projectId,
  projectName,
  isLivestock,
  feedInventoryItems,
  targetWeight,
  onSuccess,
  open,
  onOpenChange
}: {
  projectId: number;
  projectName: string;
  isLivestock: boolean;
  feedInventoryItems: FeedInventoryItem[];
  targetWeight: number | null;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedTask, setSelectedTask] = useState<TaskType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const availableTaskTypes = useMemo(
    () => TASK_TYPES.filter((task) => isLivestock || !task.livestock_only),
    [isLivestock]
  );

  const selectedLabel = TASK_TYPES.find((task) => task.type === selectedTask)?.label ?? "";

  const resetAndClose = () => {
    onSuccess();
    onOpenChange(false);
    setSelectedTask(null);
  };

  const submitFeed = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      await apiClientJson(`/projects/${projectId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feed_inventory_item_id: Number(formData.get("feed_inventory_item_id") || 0) || null,
          amount: Number(formData.get("amount") || 0),
          unit: String(formData.get("unit") || "lb"),
          notes: String(formData.get("notes") || "") || null,
          recorded_at: new Date().toISOString()
        })
      });
      toast.success("Feed logged!");
      resetAndClose();
    } catch {
      toast.error("Failed to log feed");
    } finally {
      setSubmitting(false);
    }
  };

  const submitWeight = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      await apiClientJson(`/projects/${projectId}/weights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight_lbs: Number(formData.get("weight_lbs") || 0),
          notes: String(formData.get("notes") || "") || null,
          recorded_at: new Date().toISOString()
        })
      });
      toast.success("Weight logged!");
      resetAndClose();
    } catch {
      toast.error("Failed to log weight");
    } finally {
      setSubmitting(false);
    }
  };

  const submitWalk = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      await apiClientJson(`/projects/${projectId}/care`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "walk",
          duration_minutes: Number(formData.get("duration_minutes") || 0),
          notes: String(formData.get("notes") || "") || null,
          recorded_at: new Date().toISOString()
        })
      });
      toast.success("Walk logged!");
      resetAndClose();
    } catch {
      toast.error("Failed to log walk");
    } finally {
      setSubmitting(false);
    }
  };

  const submitGroom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      await apiClientJson(`/projects/${projectId}/care`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "groom",
          notes: String(formData.get("notes") || "") || null,
          recorded_at: new Date().toISOString()
        })
      });
      toast.success("Grooming logged!");
      resetAndClose();
    } catch {
      toast.error("Failed to log grooming");
    } finally {
      setSubmitting(false);
    }
  };

  const submitHealth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      await apiClientJson(`/projects/${projectId}/health`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: String(formData.get("category") || "other"),
          description: String(formData.get("description") || ""),
          cost: formData.get("cost") ? Number(formData.get("cost")) : null,
          vendor: String(formData.get("vendor") || "") || null,
          notes: String(formData.get("notes") || "") || null,
          recorded_at: new Date().toISOString()
        })
      });
      toast.success("Health entry logged!");
      resetAndClose();
    } catch {
      toast.error("Failed to log health entry");
    } finally {
      setSubmitting(false);
    }
  };

  const submitNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const notes = String(formData.get("notes") || "");
    setSubmitting(true);
    try {
      await apiClientJson(`/projects/${projectId}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "note",
          title: "Note",
          description: notes,
          date: new Date().toISOString().slice(0, 10)
        })
      });
      toast.success("Note saved!");
      resetAndClose();
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setSelectedTask(null);
        }
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 inset-x-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card px-4 pb-8 pt-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-serif text-lg text-foreground">{selectedTask === null ? "Log Activity" : `${selectedLabel} for ${projectName}`}</h2>
            {selectedTask !== null ? (
              <button type="button" onClick={() => setSelectedTask(null)} className="text-sm text-primary">
                ← Back
              </button>
            ) : null}
          </div>

          {selectedTask === null ? (
            <div className="grid grid-cols-3 gap-3">
              {availableTaskTypes.map((task) => (
                <button
                  key={task.type}
                  type="button"
                  onClick={() => setSelectedTask(task.type)}
                  className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-secondary py-4 text-center"
                >
                  <span className="text-2xl">{task.emoji}</span>
                  <span className="text-xs font-medium text-foreground">{task.label}</span>
                </button>
              ))}
            </div>
          ) : null}

          {selectedTask === "feed" ? (
            <form className="space-y-3" onSubmit={(event) => submitFeed(event).catch(() => undefined)}>
              {feedInventoryItems.length > 0 ? (
                <select name="feed_inventory_item_id" defaultValue="" className={fieldClassName} required>
                  <option value="">Select feed...</option>
                  {feedInventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.qty_on_hand} {item.unit})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-muted-foreground">No feed inventory yet. Add items in Feed Inventory.</p>
              )}
              <input name="amount" type="number" step="0.1" min="0" placeholder="Amount" className={fieldClassName} required />
              <input name="unit" defaultValue="lb" className={fieldClassName} required />
              <textarea name="notes" placeholder="Notes (optional)" rows={2} className={fieldClassName} />
              <button disabled={submitting} className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {submitting ? "Saving..." : "Save"}
              </button>
            </form>
          ) : null}

          {selectedTask === "weigh" ? (
            <form className="space-y-3" onSubmit={(event) => submitWeight(event).catch(() => undefined)}>
              {targetWeight ? <p className="mb-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800">Target: {targetWeight} lbs</p> : null}
              <input
                name="weight_lbs"
                type="number"
                step="0.1"
                min="0"
                placeholder="Weight (lbs)"
                required
                className={`${fieldClassName} h-20 text-center text-3xl font-bold`}
              />
              <textarea name="notes" placeholder="Notes (optional)" rows={2} className={fieldClassName} />
              <button disabled={submitting} className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {submitting ? "Saving..." : "Save"}
              </button>
            </form>
          ) : null}

          {selectedTask === "walk" ? (
            <form className="space-y-3" onSubmit={(event) => submitWalk(event).catch(() => undefined)}>
              <input name="duration_minutes" type="number" min="1" placeholder="Duration (minutes)" required className={fieldClassName} />
              <textarea name="notes" placeholder="Notes (optional)" rows={2} className={fieldClassName} />
              <button disabled={submitting} className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {submitting ? "Saving..." : "Save"}
              </button>
            </form>
          ) : null}

          {selectedTask === "groom" ? (
            <form className="space-y-3" onSubmit={(event) => submitGroom(event).catch(() => undefined)}>
              <textarea name="notes" placeholder="Grooming notes (optional)" rows={3} className={fieldClassName} />
              <button disabled={submitting} className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {submitting ? "Saving..." : "Save"}
              </button>
            </form>
          ) : null}

          {selectedTask === "health" ? (
            <form className="space-y-3" onSubmit={(event) => submitHealth(event).catch(() => undefined)}>
              <select name="category" defaultValue="illness" className={fieldClassName}>
                <option value="illness">illness</option>
                <option value="injury">injury</option>
                <option value="medication">medication</option>
                <option value="vet_visit">vet_visit</option>
                <option value="vaccination">vaccination</option>
                <option value="deworming">deworming</option>
                <option value="other">other</option>
              </select>
              <input name="description" required placeholder="Description" className={fieldClassName} />
              <input name="cost" type="number" step="0.01" min="0" placeholder="Cost (optional)" className={fieldClassName} />
              <input name="vendor" placeholder="Vet / vendor (optional)" className={fieldClassName} />
              <textarea name="notes" placeholder="Notes (optional)" rows={2} className={fieldClassName} />
              <button disabled={submitting} className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {submitting ? "Saving..." : "Save"}
              </button>
            </form>
          ) : null}

          {selectedTask === "note" ? (
            <form className="space-y-3" onSubmit={(event) => submitNote(event).catch(() => undefined)}>
              <textarea name="notes" placeholder="Write a note..." rows={4} required className={fieldClassName} />
              <button disabled={submitting} className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {submitting ? "Saving..." : "Save"}
              </button>
            </form>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
