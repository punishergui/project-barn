"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { apiClientJson, Expense, ExpenseAllocation, ExpenseReceipt, Project } from "@/lib/api";

type Mode = "dollars" | "percent";

export default function EditExpensePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [receipts, setReceipts] = useState<ExpenseReceipt[]>([]);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [mode, setMode] = useState<Mode>("dollars");
  const [dollars, setDollars] = useState<Record<number, string>>({});
  const [percents, setPercents] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptCaption, setReceiptCaption] = useState("");

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
    const actualSplit = expenseData.is_split;
    setSplitEnabled(actualSplit);
    const dollarMap: Record<number, string> = {};
    const percentMap: Record<number, string> = {};
    for (const row of allocationData) {
      dollarMap[row.project_id] = row.amount.toFixed(2);
      percentMap[row.project_id] = expenseData.amount > 0 ? ((row.amount / expenseData.amount) * 100).toFixed(2) : "0";
    }
    setDollars(dollarMap);
    setPercents(percentMap);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [params.id]);

  const totalCents = expense ? Math.round(expense.amount * 100) : 0;
  const allocationPreview = useMemo(() => {
    if (!splitEnabled || !expense) return [] as Array<{ project_id: number; amount_cents: number }>;
    if (mode === "percent") {
      return projects.map((p) => ({ project_id: p.id, amount_cents: Math.round(totalCents * (Number(percents[p.id] ?? 0) / 100)) })).filter((x) => x.amount_cents > 0);
    }
    return projects.map((p) => ({ project_id: p.id, amount_cents: Math.round((Number(dollars[p.id] ?? 0) || 0) * 100) })).filter((x) => x.amount_cents > 0);
  }, [splitEnabled, mode, projects, dollars, percents, totalCents, expense]);
  const remainingCents = totalCents - allocationPreview.reduce((sum, row) => sum + row.amount_cents, 0);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    await apiClientJson(`/expenses/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
    if (splitEnabled) {
      if (allocationPreview.length === 0) {
        setError("Split is enabled, but no allocations were entered.");
        return;
      }
      if (remainingCents !== 0) {
        setError("Allocations must match expense total exactly.");
        return;
      }
      await apiClientJson(`/expenses/${params.id}/allocations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allocations: allocationPreview }) });
    }
    router.push("/expenses");
  };

  const remove = async () => {
    if (!confirm("Delete expense?")) return;
    await apiClientJson(`/expenses/${params.id}`, { method: "DELETE" });
    router.push("/expenses");
  };

  const uploadReceipt = async () => {
    if (!receiptFile) return;
    const form = new FormData();
    form.set("file", receiptFile);
    form.set("caption", receiptCaption);
    await apiClientJson<ExpenseReceipt>(`/expenses/${params.id}/receipts`, { method: "POST", body: form });
    setReceiptFile(null);
    setReceiptCaption("");
    await load();
  };

  const deleteReceipt = async (id: number) => {
    await apiClientJson(`/receipts/${id}`, { method: "DELETE" });
    await load();
  };

  if (!expense) return <p>Loading expense...</p>;

  return <form onSubmit={submit} className="space-y-3 rounded-lg border border-white/10 bg-neutral-900 p-4">
    <h1 className="text-xl font-semibold">Edit Expense</h1>
    <select name="project_id" defaultValue={expense.project_id} className="w-full rounded bg-neutral-800 p-2">{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
    <input name="date" type="date" defaultValue={expense.date.slice(0, 10)} className="w-full rounded bg-neutral-800 p-2" />
    <input name="category" defaultValue={expense.category} className="w-full rounded bg-neutral-800 p-2" />
    <input name="vendor" defaultValue={expense.vendor ?? ""} className="w-full rounded bg-neutral-800 p-2" />
    <input name="amount" type="number" step="0.01" defaultValue={expense.amount} className="w-full rounded bg-neutral-800 p-2" onChange={(e) => setExpense((prev) => prev ? ({ ...prev, amount: Number(e.target.value) || 0 }) : prev)} />
    <textarea name="note" defaultValue={expense.note ?? ""} className="w-full rounded bg-neutral-800 p-2" />

    <section className="space-y-2 rounded border border-white/10 p-3">
      <h2 className="font-semibold">Receipt Photos</h2>
      <div className="flex flex-wrap items-center gap-2">
        <input type="file" accept=".png,.jpg,.jpeg,.webp" className="rounded bg-neutral-800 p-2 text-sm" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
        <input value={receiptCaption} onChange={(e) => setReceiptCaption(e.target.value)} placeholder="Caption" className="rounded bg-neutral-800 p-2 text-sm" />
        <button type="button" onClick={() => uploadReceipt()} className="rounded bg-red-700 px-3 py-2 text-sm">Upload</button>
      </div>
      <div className="grid grid-cols-3 gap-2">{receipts.map((r) => <div key={r.id} className="space-y-1 rounded bg-neutral-800 p-2 text-xs"><img src={r.url} alt={r.caption ?? r.file_name} className="h-20 w-full cursor-pointer rounded object-cover" onClick={() => setPreviewUrl(r.url)} /><p>{r.caption ?? r.file_name}</p><button type="button" onClick={() => deleteReceipt(r.id)} className="rounded bg-red-900 px-2 py-1">Delete</button></div>)}</div>
    </section>

    <section className="space-y-2 rounded border border-white/10 p-3">
      <div className="flex items-center justify-between"><h2 className="font-semibold">Split Across Projects</h2><label className="text-sm"><input type="checkbox" checked={splitEnabled} onChange={(e) => setSplitEnabled(e.target.checked)} className="mr-2" />Split this expense across projects</label></div>
      {splitEnabled ? <>
        <div className="flex gap-2 text-sm"><button type="button" onClick={() => setMode("dollars")} className={`rounded px-2 py-1 ${mode === "dollars" ? "bg-red-700" : "bg-neutral-800"}`}>Dollars</button><button type="button" onClick={() => setMode("percent")} className={`rounded px-2 py-1 ${mode === "percent" ? "bg-red-700" : "bg-neutral-800"}`}>Percent</button><button type="button" className="rounded bg-neutral-800 px-2 py-1" onClick={() => {
          if (projects.length === 0) return;
          const equalPercent = 100 / projects.length;
          setPercents(Object.fromEntries(projects.map((p) => [p.id, equalPercent.toFixed(2)])));
        }}>Equal Split</button></div>
        <div className="space-y-2">{projects.map((p) => <div key={p.id} className="flex items-center justify-between gap-2 text-sm"><span>{p.name}</span><input type="number" step="0.01" value={mode === "dollars" ? (dollars[p.id] ?? "") : (percents[p.id] ?? "")} onChange={(e) => mode === "dollars" ? setDollars((prev) => ({ ...prev, [p.id]: e.target.value })) : setPercents((prev) => ({ ...prev, [p.id]: e.target.value }))} placeholder={mode === "dollars" ? "$0.00" : "%"} className="w-32 rounded bg-neutral-800 p-1" /></div>)}</div>
        <p className={`text-sm ${remainingCents === 0 ? "text-green-300" : "text-yellow-300"}`}>Remaining: ${(remainingCents / 100).toFixed(2)}</p>
      </> : null}
    </section>

    {error ? <p className="text-red-300">{error}</p> : null}
    <div className="flex gap-2"><button disabled={splitEnabled && remainingCents !== 0} className="rounded bg-red-700 px-3 py-2 disabled:opacity-50">Save</button><button type="button" onClick={remove} className="rounded bg-red-900 px-3 py-2">Delete</button></div>
    {previewUrl ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setPreviewUrl(null)}><img src={previewUrl} alt="receipt preview" className="max-h-[90vh] max-w-[90vw] rounded" /></div> : null}
  </form>;
}
