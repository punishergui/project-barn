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
    <div className="w-full space-y-4 pb-5">
      <section>
        <h1 className="mb-4 font-serif text-2xl text-foreground">Auctions</h1>
        <p className="text-sm text-muted-foreground">Record buyers, add-ons, fees, and final payout per project sale.</p>
      </section>

      <section className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <article className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3"><p className="text-foreground font-semibold">${totals.gross.toFixed(2)}</p><span className="text-sm text-muted-foreground">Gross sale</span></article>
        <article className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3"><p className="text-foreground font-semibold">${totals.addOns.toFixed(2)}</p><span className="text-sm text-muted-foreground">Add-ons</span></article>
        <article className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3"><p className="text-foreground font-semibold">${totals.fees.toFixed(2)}</p><span className="text-sm text-muted-foreground">Fees</span></article>
        <article className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3"><p className="text-green-600 font-semibold">${totals.payout.toFixed(2)}</p><span className="text-sm text-muted-foreground">Net payout</span></article>
      </section>

      <form className="rounded-2xl bg-card border border-border shadow-sm p-4 mb-4 grid gap-2" onSubmit={(event) => createSale(event).catch(() => undefined)}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Add Auction Sale</h2>
        <select name="project_id" required className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">Select project</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <select name="show_id" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">No linked show</option>
          {shows.map((show) => <option key={show.id} value={show.id}>{show.name}</option>)}
        </select>
        <input name="sale_date" type="date" required className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <input name="buyer_name" required placeholder="Buyer name" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <input name="sale_amount" type="number" min="0" step="0.01" placeholder="Sale amount" required className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <input name="add_ons_amount" type="number" min="0" step="0.01" placeholder="Add-ons amount" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <input name="fees_amount" type="number" min="0" step="0.01" placeholder="Commission / fees" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <input name="final_payout" type="number" min="0" step="0.01" placeholder="Final payout (optional)" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <textarea name="notes" rows={3} placeholder="Notes" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <button className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium">Save Sale</button>
      </form>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recent Sales</h2>
        {sales.length === 0 ? <p className="text-sm text-muted-foreground">No sale outcomes recorded yet.</p> : null}
        {sales.map((sale) => (
          <article key={sale.id} className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3">
            <p className="font-semibold text-sm">{sale.buyer_name}</p>
            <p className="text-base font-bold text-foreground">Sale ${sale.sale_amount.toFixed(2)}</p>
            <p className="text-green-600 font-semibold">Final payout ${sale.final_payout.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{new Date(sale.sale_date).toLocaleDateString()} • {shows.find((show) => show.id === sale.show_id)?.name ?? "No show"}</p>
            <p className="text-xs text-muted-foreground">{projects.find((project) => project.id === sale.project_id)?.name ?? `Project ${sale.project_id}`}</p>
            {sale.notes ? <p className="text-xs text-muted-foreground">{sale.notes}</p> : null}
          </article>
        ))}
      </section>
    </div>
  );
}
