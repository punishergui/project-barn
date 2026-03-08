"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { apiClientJson, Expense, ExpenseAllocation, ExpenseReceipt, Project } from "@/lib/api";

type AllocationRow = { id: number; project_id: string; amount: string; percent: string };
type SavedSummary = { expenseId: number; amount: number; allocations: Array<{ projectName: string; amount: number }>; receiptCount: number };

export default function NewExpensePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProject = searchParams.get("projectId") ?? searchParams.get("project_id") ?? "";
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitMode, setSplitMode] = useState<"dollar" | "percent">("dollar");
  const [amount, setAmount] = useState("0");
  const [rows, setRows] = useState<AllocationRow[]>([{ id: Date.now(), project_id: preselectedProject, amount: "", percent: "" }]);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [receiptCaption, setReceiptCaption] = useState("");
  const [receiptUploadSupported, setReceiptUploadSupported] = useState(true);
  const [savedSummary, setSavedSummary] = useState<SavedSummary | null>(null);

  useEffect(() => {
    apiClientJson<Project[]>("/projects").then(setProjects).catch(() => setProjects([]));
  }, []);

  const totalCents = Math.round((Number(amount) || 0) * 100);

  const preview = useMemo(() => {
    if (!splitEnabled) return { allocations: [] as Array<{ project_id: number; amount_cents: number }>, remainingCents: 0 };
    const validRows = rows.filter((row) => Number(row.project_id) > 0);
    const allocations = validRows.map((row) => ({
      project_id: Number(row.project_id),
      amount_cents: splitMode === "dollar" ? Math.round((Number(row.amount) || 0) * 100) : Math.round(totalCents * ((Number(row.percent) || 0) / 100))
    })).filter((row) => row.amount_cents > 0);
    const allocated = allocations.reduce((sum, row) => sum + row.amount_cents, 0);
    return { allocations, remainingCents: totalCents - allocated };
  }, [rows, splitEnabled, totalCents, splitMode]);

  const autoSplitEqually = () => {
    const validRows = rows.filter((row) => Number(row.project_id) > 0);
    if (validRows.length === 0) return;
    if (splitMode === "percent") {
      const base = 100 / validRows.length;
      setRows((prev) => prev.map((row) => Number(row.project_id) > 0 ? { ...row, percent: base.toFixed(2), amount: "" } : row));
      return;
    }
    const share = (Number(amount) || 0) / validRows.length;
    setRows((prev) => prev.map((row) => Number(row.project_id) > 0 ? { ...row, amount: share.toFixed(2), percent: "" } : row));
  };

  const receiptPreviews = useMemo(() => receiptFiles.map((file) => ({ file, url: URL.createObjectURL(file) })), [receiptFiles]);

  useEffect(() => {
    return () => {
      receiptPreviews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [receiptPreviews]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      const formEntries = Object.fromEntries(new FormData(event.currentTarget).entries());
      const created = await apiClientJson<Expense>("/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formEntries) });

      let savedAllocations: ExpenseAllocation[] = [];
      if (splitEnabled) {
        if (preview.allocations.length === 0 || preview.remainingCents !== 0) {
          setError("Allocations must equal the full expense total before saving.");
          return;
        }
        savedAllocations = await apiClientJson<ExpenseAllocation[]>(`/expenses/${created.id}/allocations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allocations: preview.allocations }) });
      }

      let uploadedCount = 0;
      for (const file of receiptFiles) {
        const form = new FormData();
        form.set("file", file);
        form.set("caption", receiptCaption);
        try {
          await apiClientJson<ExpenseReceipt>(`/expenses/${created.id}/receipts`, { method: "POST", body: form });
          uploadedCount += 1;
        } catch {
          setReceiptUploadSupported(false);
        }
      }

      const projectName = new Map(projects.map((project) => [project.id, project.name]));
      const summaryAllocations = splitEnabled
        ? savedAllocations.map((allocation) => ({ projectName: projectName.get(allocation.project_id) ?? `Project ${allocation.project_id}`, amount: allocation.amount }))
        : [{ projectName: projectName.get(Number(formEntries.project_id)) ?? "Primary project", amount: Number(formEntries.amount) || 0 }];

      setSavedSummary({ expenseId: created.id, amount: Number(formEntries.amount) || 0, allocations: summaryAllocations, receiptCount: uploadedCount });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (savedSummary) {
    return <section className="space-y-4 rounded-2xl bg-card border border-border shadow-sm p-4">
      <h1 className="mb-4 font-serif text-2xl text-foreground">Expense saved</h1>
      <p className="text-sm text-muted-foreground">Total amount: ${savedSummary.amount.toFixed(2)}</p>
      <div className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Allocations</p>
        {savedSummary.allocations.map((row, index) => <p key={`${row.projectName}-${index}`} className="text-sm text-foreground">{row.projectName}: ${row.amount.toFixed(2)}</p>)}
      </div>
      <p className="text-sm text-muted-foreground">Receipts uploaded: {savedSummary.receiptCount}</p>
      <div className="flex gap-2">
        <button onClick={() => router.push(`/expenses/${savedSummary.expenseId}`)} className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium">View expense</button>
        <button onClick={() => router.push("/expenses/new")} className="bg-secondary text-foreground rounded-xl px-4 py-2 text-sm">Add another</button>
      </div>
    </section>;
  }

  return <form onSubmit={submit} className="space-y-4 pb-4">
    <div>
      <h1 className="mb-4 font-serif text-2xl text-foreground">New Expense</h1>
      <p className="text-sm text-muted-foreground">Record spending and optionally split allocations across projects.</p>
    </div>

    <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Expense Details</p>
      <select name="project_id" defaultValue={preselectedProject} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30">{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <input name="date" type="date" required className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
      <input name="category" required placeholder="Category" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
      <input name="vendor" placeholder="Vendor" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
      <input name="amount" type="number" step="0.01" required placeholder="Amount" className="rounded-xl border border-border bg-background px-3 py-2 text-3xl font-bold text-center text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" onChange={(event) => setAmount(event.target.value)} />
      <textarea name="note" placeholder="Note" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </section>

    <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Receipt Photos</p>
      {!receiptUploadSupported ? <p className="rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">Receipt upload not configured.</p> : null}
      <input type="file" accept=".png,.jpg,.jpeg,.webp" multiple className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" onChange={(event) => setReceiptFiles(Array.from(event.target.files ?? []))} />
      <input value={receiptCaption} onChange={(event) => setReceiptCaption(event.target.value)} placeholder="Caption for uploaded receipts" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
      <div className="grid grid-cols-3 gap-2">
        {receiptPreviews.map((item) => <img key={item.file.name + item.file.lastModified} src={item.url} alt={item.file.name} className="h-16 w-full rounded-xl object-cover" />)}
      </div>
    </section>

    <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
      <div className="flex items-center justify-between py-2">
        <h2 className="text-sm font-semibold text-foreground">Split allocations</h2>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={splitEnabled} onChange={(event) => setSplitEnabled(event.target.checked)} />
          Split this expense
        </label>
      </div>
      {splitEnabled ? <>
        <div className="flex gap-2 text-sm">
          <button type="button" onClick={() => setSplitMode("dollar")} className={splitMode === "dollar" ? "bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium" : "bg-secondary text-foreground rounded-xl px-4 py-2 text-sm"}>Dollar split</button>
          <button type="button" onClick={() => setSplitMode("percent")} className={splitMode === "percent" ? "bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium" : "bg-secondary text-foreground rounded-xl px-4 py-2 text-sm"}>Percent split</button>
          <button type="button" onClick={autoSplitEqually} className="bg-secondary text-foreground rounded-xl px-4 py-2 text-sm">Auto split equally</button>
        </div>
        <div className="space-y-2">
          {rows.map((row) => <div key={row.id} className="flex gap-2 items-center"><select value={row.project_id} onChange={(event) => setRows((prev) => prev.map((item) => item.id === row.id ? ({ ...item, project_id: event.target.value }) : item))} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30"><option value="">Project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>{splitMode === "dollar" ? <input type="number" step="0.01" value={row.amount} onChange={(event) => setRows((prev) => prev.map((item) => item.id === row.id ? ({ ...item, amount: event.target.value }) : item))} placeholder="Amount" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" /> : <input type="number" step="0.01" value={row.percent} onChange={(event) => setRows((prev) => prev.map((item) => item.id === row.id ? ({ ...item, percent: event.target.value }) : item))} placeholder="Percent" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />}<button type="button" onClick={() => setRows((prev) => prev.length > 1 ? prev.filter((item) => item.id !== row.id) : prev)} className="bg-secondary text-foreground rounded-xl px-4 py-2 text-sm">×</button></div>)}
        </div>
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setRows((prev) => [...prev, { id: Date.now() + prev.length, project_id: "", amount: "", percent: "" }])} className="bg-secondary text-foreground rounded-xl px-4 py-2 text-sm">Add allocation</button>
          <p className={`text-sm ${preview.remainingCents === 0 ? "text-green-600" : "text-muted-foreground"}`}>Remaining ${(preview.remainingCents / 100).toFixed(2)}</p>
        </div>
      </> : null}
    </section>

    {error ? <p className="text-sm text-destructive">{error}</p> : null}
    <button disabled={splitEnabled && preview.remainingCents !== 0} className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold disabled:opacity-50">Save expense</button>
  </form>;
}
