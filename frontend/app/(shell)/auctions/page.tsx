"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { apiClientJson, AuctionSale, Project, Show } from "@/lib/api";

export default function AuctionsPage() {
  const [sales, setSales] = useState<AuctionSale[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [shows, setShows] = useState<Show[]>([]);

  const load = async () => {
    const [saleRows, projectRows, showRows] = await Promise.all([
      apiClientJson<AuctionSale[]>("/auction-sales"),
      apiClientJson<Project[]>("/projects"),
      apiClientJson<Show[]>("/shows")
    ]);
    setSales(saleRows);
    setProjects(projectRows);
    setShows(showRows);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const createSale = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: Number(form.get("project_id")),
      show_id: form.get("show_id") ? Number(form.get("show_id")) : null,
      sale_date: String(form.get("sale_date") || ""),
      buyer_name: String(form.get("buyer_name") || "").trim(),
      sale_amount: Number(form.get("sale_amount") || 0),
      add_ons_amount: Number(form.get("add_ons_amount") || 0),
      fees_amount: Number(form.get("fees_amount") || 0),
      final_payout: Number(form.get("final_payout") || 0),
      notes: String(form.get("notes") || "").trim() || null
    };
    await apiClientJson("/auction-sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    event.currentTarget.reset();
    await load();
  };

  const totals = useMemo(() => sales.reduce((acc, sale) => ({
    gross: acc.gross + sale.sale_amount,
    addOns: acc.addOns + sale.add_ons_amount,
    fees: acc.fees + sale.fees_amount,
    payout: acc.payout + sale.final_payout
  }), { gross: 0, addOns: 0, fees: 0, payout: 0 }), [sales]);

  return (
    <div className="w-full space-y-4 px-4 pb-5">
      <section className="barn-card space-y-1">
        <h1 className="text-2xl font-semibold">Auction & Sale Tracking</h1>
        <p className="text-sm text-[var(--barn-muted)]">Record buyers, add-ons, fees, and final payout per project sale.</p>
      </section>

      <section className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <article className="barn-chip">${totals.gross.toFixed(2)}<span>Gross sale</span></article>
        <article className="barn-chip">${totals.addOns.toFixed(2)}<span>Add-ons</span></article>
        <article className="barn-chip">${totals.fees.toFixed(2)}<span>Fees</span></article>
        <article className="barn-chip">${totals.payout.toFixed(2)}<span>Net payout</span></article>
      </section>

      <form className="barn-card grid gap-2" onSubmit={(event) => createSale(event).catch(() => undefined)}>
        <h2 className="text-base font-semibold">Add Sale</h2>
        <select name="project_id" required className="rounded-lg border border-[var(--barn-border)] bg-black/20 p-3 text-base">
          <option value="">Select project</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <select name="show_id" className="rounded-lg border border-[var(--barn-border)] bg-black/20 p-3 text-base">
          <option value="">No linked show</option>
          {shows.map((show) => <option key={show.id} value={show.id}>{show.name}</option>)}
        </select>
        <input name="sale_date" type="date" required className="rounded-lg border border-[var(--barn-border)] bg-black/20 p-3 text-base" />
        <input name="buyer_name" required placeholder="Buyer name" className="rounded-lg border border-[var(--barn-border)] bg-black/20 p-3 text-base" />
        <input name="sale_amount" type="number" min="0" step="0.01" placeholder="Sale amount" required className="rounded-lg border border-[var(--barn-border)] bg-black/20 p-3 text-lg font-semibold" />
        <input name="add_ons_amount" type="number" min="0" step="0.01" placeholder="Add-ons amount" className="rounded-lg border border-[var(--barn-border)] bg-black/20 p-3 text-base" />
        <input name="fees_amount" type="number" min="0" step="0.01" placeholder="Commission / fees" className="rounded-lg border border-[var(--barn-border)] bg-black/20 p-3 text-base" />
        <input name="final_payout" type="number" min="0" step="0.01" placeholder="Final payout (optional)" className="rounded-lg border border-[var(--barn-border)] bg-black/20 p-3 text-base" />
        <textarea name="notes" rows={3} placeholder="Notes" className="rounded-lg border border-[var(--barn-border)] bg-black/20 p-3 text-base" />
        <button className="rounded-lg bg-[var(--barn-red)] px-4 py-2 text-sm font-medium">Save Sale</button>
      </form>

      <section className="barn-card space-y-2">
        <h2 className="text-base font-semibold">Recent Sales</h2>
        {sales.length === 0 ? <p className="barn-row text-sm text-[var(--barn-muted)]">No sale outcomes recorded yet.</p> : null}
        {sales.map((sale) => (
          <article key={sale.id} className="barn-row text-sm">
            <p className="font-medium">{projects.find((project) => project.id === sale.project_id)?.name ?? `Project ${sale.project_id}`} • {sale.buyer_name}</p>
            <p className="text-xs text-[var(--barn-muted)]">{new Date(sale.sale_date).toLocaleDateString()} • Gross ${sale.sale_amount.toFixed(2)}</p>
            <p className="text-xs text-[var(--barn-muted)]">Add-ons ${sale.add_ons_amount.toFixed(2)} • Fees ${sale.fees_amount.toFixed(2)} • Net ${sale.final_payout.toFixed(2)}</p>
            {sale.notes ? <p className="text-xs text-[var(--barn-muted)]">{sale.notes}</p> : null}
          </article>
        ))}
      </section>
    </div>
  );
}
