"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { apiClientJson, Expense, ExpenseAllocation, ExpenseReceipt, Project } from "@/lib/api";

type AllocationRow = { id: number; project_id: string; amount: string; percent: string };
type SavedSummary = { expenseId: number; amount: number; allocations: Array<{ projectName: string; amount: number }>; receiptCount: number };

export default function NewExpensePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProject = searchParams.get("project_id") ?? "";
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
    return <section className="space-y-3 rounded-lg border border-white/10 bg-neutral-900 p-4">
      <h1 className="text-xl font-semibold">Expense saved</h1>
      <p className="text-sm text-neutral-300">Total amount: ${savedSummary.amount.toFixed(2)}</p>
      <div className="rounded bg-neutral-800 p-3 text-sm">
        <p className="mb-1 font-semibold">Allocations</p>
        {savedSummary.allocations.map((row, index) => <p key={`${row.projectName}-${index}`}>{row.projectName}: ${row.amount.toFixed(2)}</p>)}
      </div>
      <p className="text-sm">Receipts uploaded: {savedSummary.receiptCount}</p>
      <div className="flex gap-2">
        <button onClick={() => router.push(`/expenses/${savedSummary.expenseId}`)} className="rounded bg-red-700 px-3 py-2 text-sm">View expense</button>
        <button onClick={() => router.push("/expenses/new")} className="rounded bg-neutral-800 px-3 py-2 text-sm">Add another</button>
      </div>
    </section>;
  }

  return <form onSubmit={submit} className="space-y-3 rounded-lg border border-white/10 bg-neutral-900 p-4">
    <h1 className="text-xl font-semibold">New Expense</h1>
    <select name="project_id" defaultValue={preselectedProject} className="w-full rounded bg-neutral-800 p-2">{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
    <input name="date" type="date" required className="w-full rounded bg-neutral-800 p-2" />
    <input name="category" required placeholder="Category" className="w-full rounded bg-neutral-800 p-2" />
    <input name="vendor" placeholder="Vendor" className="w-full rounded bg-neutral-800 p-2" />
    <input name="amount" type="number" step="0.01" required placeholder="Amount" className="w-full rounded bg-neutral-800 p-2" onChange={(event) => setAmount(event.target.value)} />
    <textarea name="note" placeholder="Note" className="w-full rounded bg-neutral-800 p-2" />

    <section className="space-y-2 rounded border border-white/10 p-3">
      <h2 className="font-semibold">Receipt photos</h2>
      {!receiptUploadSupported ? <p className="rounded bg-amber-900/40 p-2 text-xs text-amber-200">Receipt upload not configured.</p> : null}
      <input type="file" accept=".png,.jpg,.jpeg,.webp" multiple className="w-full rounded bg-neutral-800 p-2 text-sm" onChange={(event) => setReceiptFiles(Array.from(event.target.files ?? []))} />
      <input value={receiptCaption} onChange={(event) => setReceiptCaption(event.target.value)} placeholder="Caption for uploaded receipts" className="w-full rounded bg-neutral-800 p-2 text-sm" />
      <div className="grid grid-cols-3 gap-2">
        {receiptPreviews.map((item) => <img key={item.file.name + item.file.lastModified} src={item.url} alt={item.file.name} className="h-16 w-full rounded object-cover" />)}
      </div>
    </section>

    <section className="space-y-2 rounded border border-white/10 p-3">
      <div className="flex items-center justify-between"><h2 className="font-semibold">Split allocations</h2><label className="text-sm"><input type="checkbox" checked={splitEnabled} onChange={(event) => setSplitEnabled(event.target.checked)} className="mr-2" />Split this expense</label></div>
      {splitEnabled ? <>
        <div className="flex gap-2 text-sm">
          <button type="button" onClick={() => setSplitMode("dollar")} className={`rounded px-2 py-1 ${splitMode === "dollar" ? "bg-red-700" : "bg-neutral-800"}`}>Dollar split</button>
          <button type="button" onClick={() => setSplitMode("percent")} className={`rounded px-2 py-1 ${splitMode === "percent" ? "bg-red-700" : "bg-neutral-800"}`}>Percent split</button>
          <button type="button" onClick={autoSplitEqually} className="rounded bg-neutral-800 px-2 py-1">Auto split equally</button>
        </div>
        <div className="space-y-2">
          {rows.map((row) => <div key={row.id} className="grid grid-cols-12 gap-2 text-sm"><select value={row.project_id} onChange={(event) => setRows((prev) => prev.map((item) => item.id === row.id ? ({ ...item, project_id: event.target.value }) : item))} className="col-span-6 rounded bg-neutral-800 p-2"><option value="">Project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>{splitMode === "dollar" ? <input type="number" step="0.01" value={row.amount} onChange={(event) => setRows((prev) => prev.map((item) => item.id === row.id ? ({ ...item, amount: event.target.value }) : item))} placeholder="Amount" className="col-span-5 rounded bg-neutral-800 p-2" /> : <input type="number" step="0.01" value={row.percent} onChange={(event) => setRows((prev) => prev.map((item) => item.id === row.id ? ({ ...item, percent: event.target.value }) : item))} placeholder="Percent" className="col-span-5 rounded bg-neutral-800 p-2" />}<button type="button" onClick={() => setRows((prev) => prev.length > 1 ? prev.filter((item) => item.id !== row.id) : prev)} className="col-span-1 rounded bg-neutral-700">×</button></div>)}
        </div>
        <div className="flex items-center justify-between"><button type="button" onClick={() => setRows((prev) => [...prev, { id: Date.now() + prev.length, project_id: "", amount: "", percent: "" }])} className="rounded bg-neutral-800 px-3 py-2 text-sm">Add allocation</button><p className={`text-sm ${preview.remainingCents === 0 ? "text-green-300" : "text-yellow-300"}`}>Remaining ${(preview.remainingCents / 100).toFixed(2)}</p></div>
      </> : null}
    </section>

    {error ? <p className="text-red-300">{error}</p> : null}
    <button disabled={splitEnabled && preview.remainingCents !== 0} className="rounded bg-red-700 px-3 py-2 disabled:opacity-50">Save expense</button>
  </form>;
}
