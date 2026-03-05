"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { apiClientJson, Expense, ExpenseAllocation, ExpenseReceipt, Project } from "@/lib/api";

type AllocationRow = { id: number; project_id: string; amount: string; percent: string };

export default function EditExpensePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [receipts, setReceipts] = useState<ExpenseReceipt[]>([]);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [rows, setRows] = useState<AllocationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
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
    if (validRows.length === 1 && !validRows[0].amount && !validRows[0].percent) {
      return { allocations: [{ project_id: Number(validRows[0].project_id), amount_cents: totalCents }], remainingCents: 0 };
    }
    const allocations = validRows.map((row) => {
      if (Number(row.amount) > 0) {
        return { project_id: Number(row.project_id), amount_cents: Math.round(Number(row.amount) * 100) };
      }
      return { project_id: Number(row.project_id), amount_cents: Math.round(totalCents * (Number(row.percent) / 100)) };
    }).filter((row) => row.amount_cents > 0);
    const allocated = allocations.reduce((sum, row) => sum + row.amount_cents, 0);
    return { allocations, remainingCents: totalCents - allocated };
  }, [rows, splitEnabled, totalCents]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    await apiClientJson(`/expenses/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
    if (splitEnabled) {
      if (preview.allocations.length === 0) {
        setError("Add at least one valid allocation row.");
        return;
      }
      if (preview.remainingCents !== 0) {
        setError("Allocations must equal the full expense total.");
        return;
      }
      await apiClientJson(`/expenses/${params.id}/allocations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allocations: preview.allocations }) });
    }
    router.push(`/expenses/${params.id}`);
  };

  const remove = async () => {
    if (!confirm("Delete expense?")) return;
    await apiClientJson(`/expenses/${params.id}`, { method: "DELETE" });
    router.push("/expenses");
  };

  const uploadReceipt = async () => {
    if (receiptFiles.length === 0) return;
    for (const file of receiptFiles) {
      const form = new FormData();
      form.set("file", file);
      form.set("caption", receiptCaption);
      await apiClientJson<ExpenseReceipt>(`/expenses/${params.id}/receipts`, { method: "POST", body: form });
    }
    setReceiptFiles([]);
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
        <input type="file" multiple accept=".png,.jpg,.jpeg,.webp" className="rounded bg-neutral-800 p-2 text-sm" onChange={(e) => setReceiptFiles(Array.from(e.target.files ?? []))} />
        <input value={receiptCaption} onChange={(e) => setReceiptCaption(e.target.value)} placeholder="Caption" className="rounded bg-neutral-800 p-2 text-sm" />
        <button type="button" onClick={() => uploadReceipt()} className="rounded bg-red-700 px-3 py-2 text-sm">Upload</button>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">{receipts.map((r) => <div key={r.id} className="space-y-1 rounded bg-neutral-800 p-2 text-xs"><img src={r.url} alt={r.caption ?? r.file_name} className="h-20 w-full cursor-pointer rounded object-cover" onClick={() => setPreviewUrl(r.url)} /><p>{r.caption ?? r.file_name}</p><button type="button" onClick={() => deleteReceipt(r.id)} className="rounded bg-red-900 px-2 py-1">Delete</button></div>)}</div>
    </section>

    <section className="space-y-2 rounded border border-white/10 p-3">
      <div className="flex items-center justify-between"><h2 className="font-semibold">Split allocations</h2><label className="text-sm"><input type="checkbox" checked={splitEnabled} onChange={(e) => setSplitEnabled(e.target.checked)} className="mr-2" />Split this expense</label></div>
      {splitEnabled ? <>
        <div className="space-y-2">{rows.map((row) => <div key={row.id} className="grid grid-cols-12 gap-2 text-sm"><select value={row.project_id} onChange={(e) => setRows((prev) => prev.map((item) => item.id === row.id ? ({ ...item, project_id: e.target.value }) : item))} className="col-span-5 rounded bg-neutral-800 p-2"><option value="">Project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="number" step="0.01" value={row.amount} onChange={(e) => setRows((prev) => prev.map((item) => item.id === row.id ? ({ ...item, amount: e.target.value, percent: "" }) : item))} placeholder="Amount" className="col-span-3 rounded bg-neutral-800 p-2" /><input type="number" step="0.01" value={row.percent} onChange={(e) => setRows((prev) => prev.map((item) => item.id === row.id ? ({ ...item, percent: e.target.value, amount: "" }) : item))} placeholder="%" className="col-span-3 rounded bg-neutral-800 p-2" /><button type="button" onClick={() => setRows((prev) => prev.length > 1 ? prev.filter((item) => item.id !== row.id) : prev)} className="col-span-1 rounded bg-neutral-700">×</button></div>)}</div>
        <div className="flex items-center justify-between"><button type="button" onClick={() => setRows((prev) => [...prev, { id: Date.now() + prev.length, project_id: "", amount: "", percent: "" }])} className="rounded bg-neutral-800 px-3 py-2 text-sm">Add allocation</button><p className={`text-sm ${preview.remainingCents === 0 ? "text-green-300" : "text-yellow-300"}`}>Remaining ${(preview.remainingCents / 100).toFixed(2)}</p></div>
      </> : null}
    </section>

    {error ? <p className="text-red-300">{error}</p> : null}
    <div className="flex gap-2"><button disabled={splitEnabled && preview.remainingCents !== 0} className="rounded bg-red-700 px-3 py-2 disabled:opacity-50">Save</button><button type="button" onClick={remove} className="rounded bg-red-900 px-3 py-2">Delete</button></div>
    {previewUrl ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setPreviewUrl(null)}><img src={previewUrl} alt="receipt preview" className="max-h-[90vh] max-w-[90vw] rounded" /></div> : null}
  </form>;
}
