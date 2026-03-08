"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AdminSummary, AuthStatus, ExportsAllResponse, apiClientJson } from "@/lib/api";

const scopes = [
  { key: "all", label: "All projects" },
  { key: "active", label: "Active only" },
  { key: "archived", label: "Archived only" }
] as const;

export default function AdminDashboardPage() {
  const [scope, setScope] = useState<(typeof scopes)[number]["key"]>("all");
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [exports, setExports] = useState<ExportsAllResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextScope: string) => {
    setLoading(true);
    try {
      const [authData, summaryData, exportData] = await Promise.all([
        apiClientJson<AuthStatus>("/auth/status"),
        apiClientJson<AdminSummary>(`/admin/summary?project_scope=${nextScope}`),
        apiClientJson<ExportsAllResponse>("/exports/all")
      ]);
      setAuth(authData);
      setSummary(summaryData);
      setExports(exportData);
      setError(null);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load admin dashboard right now.";
      setError(message);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(scope).catch(() => undefined);
  }, [scope]);

  if (auth?.role && auth.role !== "parent") {
    return (
      <div className="w-full space-y-3 pb-4">
        <h1 className="mb-1 font-serif text-2xl text-foreground">Parent Admin</h1>
        <p className="text-sm text-muted-foreground">Parent profile required for this screen.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-4">
      <section>
        <h1 className="mb-1 font-serif text-2xl text-foreground">Parent Admin</h1>
        <p className="mb-4 text-sm text-muted-foreground">Family management center for members, projects, archives, awards, helpers, and exports.</p>
        <p className="text-xs text-muted-foreground">Parent unlocked: {auth?.is_unlocked ? "Yes" : "No"}</p>
      </section>

      <section className="mb-4 grid grid-cols-2 gap-2">
        <Link href="/settings/profiles" className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground">Manage Profiles</Link>
        <Link href="/projects" className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground">Manage Projects</Link>
        <Link href="/notifications" className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground">Manage Reminders</Link>
        <Link href="/reports" className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground">Open Reports</Link>
        <Link href="/equipment" className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground">📦 Equipment</Link>
        <Link href="/packing-lists" className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground">🎒 Packing Lists</Link>
        <Link href="/admin/data" className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground">Data Tools</Link>
        <a href="#export-all" className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground">Export All Data</a>
      </section>

      <section className="mb-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Project visibility</h2>
        <div className="flex flex-wrap gap-2">
          {scopes.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setScope(item.key)}
              className={
                scope === item.key
                  ? "rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                  : "rounded-full bg-secondary px-3 py-1.5 text-xs text-muted-foreground"
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? <p className="text-sm text-muted-foreground">Loading admin summary...</p> : null}
      {error ? <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      {summary ? (
        <>
          <section className="mb-4 grid grid-cols-3 gap-3">
            <article className="flex flex-col items-center rounded-2xl border border-border bg-card px-2 py-3">
              <p className="text-base font-semibold text-foreground">{summary.family_overview.total_active_profiles}</p>
              <span className="mt-0.5 text-[10px] text-muted-foreground">Active members</span>
            </article>
            <article className="flex flex-col items-center rounded-2xl border border-border bg-card px-2 py-3">
              <p className="text-base font-semibold text-foreground">{summary.family_overview.total_active_projects}</p>
              <span className="mt-0.5 text-[10px] text-muted-foreground">Active projects</span>
            </article>
            <article className="flex flex-col items-center rounded-2xl border border-border bg-card px-2 py-3">
              <p className="text-base font-semibold text-foreground">{summary.family_overview.total_archived_projects}</p>
              <span className="mt-0.5 text-[10px] text-muted-foreground">Archived projects</span>
            </article>
          </section>

          <section className="mb-4 rounded-2xl border border-border bg-card p-4 text-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Family overview</h2>
            <p className="text-foreground">Current project year: {summary.family_overview.current_project_year}</p>
            <p className="text-foreground">Placings total: {summary.family_overview.total_placings}</p>
            <p className="text-foreground">Total expenses: ${summary.family_overview.total_expenses.toFixed(2)}</p>
            <p className="text-foreground">Total income: ${summary.family_overview.total_income.toFixed(2)}</p>
            <p className="text-foreground">Total ribbons: {summary.family_overview.total_ribbons}</p>
          </section>

          <section className="mb-4 rounded-2xl border border-border bg-card p-4 text-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Member overview</h2>
            <div className="space-y-2">
              {summary.member_overview.map((member) => (
                <article key={member.profile_id} className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{member.profile_name}</p>
                  <p className="text-xs">Age {member.age ?? "—"} • Years active {member.years_active}</p>
                  <p className="text-xs">Projects {member.active_projects} active / {member.completed_projects} completed • Ribbons {member.lifetime_ribbons}</p>
                  <p className="text-xs">Lifetime expenses ${member.lifetime_expenses.toFixed(2)} • Lifetime income ${member.lifetime_income.toFixed(2)}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mb-4 rounded-2xl border border-border bg-card p-4 text-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Awards / ribbons overview</h2>
            <p className="text-foreground">Placings {summary.awards_overview.totals.placings} • Ribbons {summary.awards_overview.totals.ribbons}</p>
            <p className="text-foreground">Champions {summary.awards_overview.totals.champions} • Reserve champions {summary.awards_overview.totals.reserve_champions}</p>
          </section>

          <section className="mb-4 rounded-2xl border border-border bg-card p-4 text-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Helper contribution summary</h2>
            {summary.helper_overview.helpers.slice(0, 6).map((helper) => (
              <article key={`${helper.helper_profile_id ?? "unknown"}-${helper.helper_name}`} className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{helper.helper_name}</p>
                <p className="text-xs">{helper.total_actions} actions • {helper.project_count} projects</p>
              </article>
            ))}
          </section>

          <section className="mb-4 rounded-2xl border border-border bg-card p-4 text-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Projects by member</h2>
            {summary.projects_by_member.map((row) => (
              <article key={row.profile_id} className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{row.profile_name}</p>
                <p className="text-xs">Active {row.active_projects.length} • Archived {row.archived_projects.length}</p>
                <p className="text-xs">Expenses ${row.expenses_total.toFixed(2)} • Income ${row.income_total.toFixed(2)} • Ribbons {row.lifetime_ribbons}</p>
              </article>
            ))}
          </section>
        </>
      ) : null}

      <section id="export-all" className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Export all data</h2>
        <div className="flex flex-col gap-2">
          {exports?.exports.map((entry) => (
            <a
              key={entry.id}
              href={entry.href}
              className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground"
            >
              <span>{entry.label}</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">CSV</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
