"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { apiClientJson, Expense, ExpenseAllocation, ExpenseReceipt, Project } from "@/lib/api";
import { uploadReceipt } from "@/lib/uploads";
import { toUserErrorMessage } from "@/lib/errorMessage";

type AllocationRow = { id: number; project_id: string; amount: string; percent: string };
type SavedSummary = { amount: number; allocations: Array<{ projectName: string; amount: number }>; receiptCount: number };

export default function EditExpensePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [receipts, setReceipts] = useState<ExpenseReceipt[]>([]);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitMode, setSplitMode] = useState<"dollar" | "percent">("dollar");
  const [rows, setRows] = useState<AllocationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [receiptCaption, setReceiptCaption] = useState("");
  const [savedSummary, setSavedSummary] = useState<SavedSummary | null>(null);

  const load = async () => {
    const [expenseData, projectData, receiptData, allocationData] = await Promise.all([
      apiClientJson<Expense>(`/expenses/${params.id}`),
      apiClientJson<Project[]>("/projects"),
      apiClientJson<ExpenseReceipt[]>(`/expenses/${params.id}/receipts`),
      apiClientJson<ExpenseAllocation[]>(`/expenses/${params.id}/allocations`)
    ]);
    setExpense(expenseData);
    setProjects(projectData);
    setReceipts(receiptData);
    setSplitEnabled(expenseData.is_split);
    setRows(allocationData.map((row) => ({ id: row.id ?? Date.now() + row.project_id, project_id: String(row.project_id), amount: row.amount.toFixed(2), percent: expenseData.amount > 0 ? ((row.amount / expenseData.amount) * 100).toFixed(2) : "" })));
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [params.id]);

  const totalCents = expense ? Math.round(expense.amount * 100) : 0;

  const preview = useMemo(() => {
    if (!splitEnabled) return { allocations: [] as Array<{ project_id: number; amount_cents: number }>, remainingCents: 0 };
    const validRows = rows.filter((row) => Number(row.project_id) > 0);
    const allocations = validRows.map((row) => ({
      project_id: Number(row.project_id),
      amount_cents: splitMode === "dollar" ? Math.round((Number(row.amount) || 0) * 100) : Math.round(totalCents * ((Number(row.percent) || 0) / 100))
    })).filter((row) => row.amount_cents > 0);
    const allocated = allocations.reduce((sum, row) => sum + row.amount_cents, 0);
    return { allocations, remainingCents: totalCents - allocated };
  }, [rows, splitEnabled, splitMode, totalCents]);

  const autoSplitEqually = () => {
    const validRows = rows.filter((row) => Number(row.project_id) > 0);
    if (validRows.length === 0 || !expense) return;
    if (splitMode === "percent") {
      const base = 100 / validRows.length;
      setRows((prev) => prev.map((row) => Number(row.project_id) > 0 ? { ...row, percent: base.toFixed(2), amount: "" } : row));
      return;
    }
    const share = expense.amount / validRows.length;
    setRows((prev) => prev.map((row) => Number(row.project_id) > 0 ? { ...row, amount: share.toFixed(2), percent: "" } : row));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    await apiClientJson(`/expenses/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    let allocationSummary = [{ projectName: projects.find((project) => project.id === Number(payload.project_id))?.name ?? "Primary project", amount: Number(payload.amount) || 0 }];
    if (splitEnabled) {
      if (preview.allocations.length === 0 || preview.remainingCents !== 0) {
        setError("Allocations must equal the full expense total.");
        return;
      }
      const savedAllocations = await apiClientJson<ExpenseAllocation[]>(`/expenses/${params.id}/allocations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allocations: preview.allocations }) });
      allocationSummary = savedAllocations.map((allocation) => ({ projectName: projects.find((project) => project.id === allocation.project_id)?.name ?? `Project ${allocation.project_id}`, amount: allocation.amount }));
    }
    setSavedSummary({ amount: Number(payload.amount) || 0, allocations: allocationSummary, receiptCount: receipts.length });
  };

  const uploadReceipts = async () => {
    if (receiptFiles.length === 0) return;
    try {
      for (const file of receiptFiles) {
        await uploadReceipt(Number(params.id), file, receiptCaption);
      }
      setReceiptFiles([]);
      setReceiptCaption("");
      await load();
    } catch (uploadError) {
      setError(toUserErrorMessage(uploadError, "Unable to upload one or more receipts."));
    }
  };

  if (!expense) return <p>Loading expense...</p>;

  if (savedSummary) {
    return <section className="space-y-3 rounded-lg border border-white/10 bg-neutral-900 p-4">
      <h1 className="text-xl font-semibold">Expense updated</h1>
      <p className="text-sm text-neutral-300">Total amount: ${savedSummary.amount.toFixed(2)}</p>
      <div className="rounded bg-neutral-800 p-3 text-sm">
        <p className="mb-1 font-semibold">Allocations</p>
        {savedSummary.allocations.map((row, index) => <p key={`${row.projectName}-${index}`}>{row.projectName}: ${row.amount.toFixed(2)}</p>)}
      </div>
      <p className="text-sm">Receipts on file: {savedSummary.receiptCount}</p>
      <button onClick={() => router.push(`/expenses/${params.id}`)} className="rounded bg-red-700 px-3 py-2 text-sm">Back to expense</button>
    </section>;
  }

  return <form onSubmit={submit} className="space-y-3 rounded-lg border border-white/10 bg-neutral-900 p-4">
    <h1 className="text-xl font-semibold">Edit Expense</h1>
    <select name="project_id" defaultValue={expense.project_id} className="w-full rounded bg-neutral-800 p-2">{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
    <input name="date" type="date" defaultValue={expense.date.slice(0, 10)} className="w-full rounded bg-neutral-800 p-2" />
    <input name="category" defaultValue={expense.category} className="w-full rounded bg-neutral-800 p-2" />
    <input name="vendor" defaultValue={expense.vendor ?? ""} className="w-full rounded bg-neutral-800 p-2" />
    <input name="amount" type="number" step="0.01" defaultValue={expense.amount} className="w-full rounded bg-neutral-800 p-2" onChange={(event) => setExpense((prev) => prev ? ({ ...prev, amount: Number(event.target.value) || 0 }) : prev)} />
    <textarea name="note" defaultValue={expense.note ?? ""} className="w-full rounded bg-neutral-800 p-2" />

    <section className="space-y-2 rounded border border-white/10 p-3">
      <h2 className="font-semibold">Receipt photos</h2>
      <div className="flex flex-wrap items-center gap-2">
        <input type="file" multiple accept="image/*,.pdf,application/pdf" className="rounded bg-neutral-800 p-2 text-sm" onChange={(event) => setReceiptFiles(Array.from(event.target.files ?? []))} />
        <input value={receiptCaption} onChange={(event) => setReceiptCaption(event.target.value)} placeholder="Caption" className="rounded bg-neutral-800 p-2 text-sm" />
        <button type="button" onClick={uploadReceipts} className="rounded bg-red-700 px-3 py-2 text-sm">Upload</button>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">{receipts.map((receipt) => <div key={receipt.id} className="space-y-1 rounded bg-neutral-800 p-2 text-xs">{/\.pdf($|\?)/i.test(receipt.url) ? <a href={receipt.url} className="block rounded border border-white/20 p-3 text-center text-blue-200 underline">Download PDF</a> : <img src={receipt.url} alt={receipt.caption ?? receipt.file_name} className="h-20 w-full cursor-pointer rounded object-cover" onClick={() => setPreviewUrl(receipt.url)} />}<p>{receipt.caption ?? receipt.file_name}</p></div>)}</div>
    </section>

    <section className="space-y-2 rounded border border-white/10 p-3">
      <div className="flex items-center justify-between"><h2 className="font-semibold">Split allocations</h2><label className="text-sm"><input type="checkbox" checked={splitEnabled} onChange={(event) => setSplitEnabled(event.target.checked)} className="mr-2" />Split this expense</label></div>
      {splitEnabled ? <>
        <div className="flex gap-2 text-sm">
          <button type="button" onClick={() => setSplitMode("dollar")} className={`rounded px-2 py-1 ${splitMode === "dollar" ? "bg-red-700" : "bg-neutral-800"}`}>Dollar split</button>
          <button type="button" onClick={() => setSplitMode("percent")} className={`rounded px-2 py-1 ${splitMode === "percent" ? "bg-red-700" : "bg-neutral-800"}`}>Percent split</button>
          <button type="button" onClick={autoSplitEqually} className="rounded bg-neutral-800 px-2 py-1">Auto split equally</button>
        </div>
        <div className="space-y-2">{rows.map((row) => <div key={row.id} className="grid grid-cols-12 gap-2 text-sm"><select value={row.project_id} onChange={(event) => setRows((prev) => prev.map((item) => item.id === row.id ? ({ ...item, project_id: event.target.value }) : item))} className="col-span-6 rounded bg-neutral-800 p-2"><option value="">Project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>{splitMode === "dollar" ? <input type="number" step="0.01" value={row.amount} onChange={(event) => setRows((prev) => prev.map((item) => item.id === row.id ? ({ ...item, amount: event.target.value }) : item))} placeholder="Amount" className="col-span-5 rounded bg-neutral-800 p-2" /> : <input type="number" step="0.01" value={row.percent} onChange={(event) => setRows((prev) => prev.map((item) => item.id === row.id ? ({ ...item, percent: event.target.value }) : item))} placeholder="Percent" className="col-span-5 rounded bg-neutral-800 p-2" />}<button type="button" onClick={() => setRows((prev) => prev.length > 1 ? prev.filter((item) => item.id !== row.id) : prev)} className="col-span-1 rounded bg-neutral-700">×</button></div>)}</div>
        <div className="flex items-center justify-between"><button type="button" onClick={() => setRows((prev) => [...prev, { id: Date.now() + prev.length, project_id: "", amount: "", percent: "" }])} className="rounded bg-neutral-800 px-3 py-2 text-sm">Add allocation</button><p className={`text-sm ${preview.remainingCents === 0 ? "text-green-300" : "text-yellow-300"}`}>Remaining ${(preview.remainingCents / 100).toFixed(2)}</p></div>
      </> : null}
    </section>

    {error ? <p className="text-red-300">{error}</p> : null}
    <button disabled={splitEnabled && preview.remainingCents !== 0} className="rounded bg-red-700 px-3 py-2 disabled:opacity-50">Save</button>
    {previewUrl ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setPreviewUrl(null)}><img src={previewUrl} alt="receipt preview" className="max-h-[90vh] max-w-[90vw] rounded" /></div> : null}
  </form>;
}
