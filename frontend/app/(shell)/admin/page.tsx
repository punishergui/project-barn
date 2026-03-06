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
      <div className="w-full space-y-3 px-4 pb-4">
        <h1 className="text-xl font-semibold">Parent Admin Dashboard</h1>
        <p className="barn-row text-sm">Parent profile required for this screen.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 px-4 pb-4">
      <section className="barn-card space-y-2">
        <h1 className="text-2xl font-semibold">Parent Admin Dashboard</h1>
        <p className="text-sm text-[var(--barn-muted)]">Family management center for members, projects, archives, awards, helpers, and exports.</p>
        <p className="text-xs text-[var(--barn-muted)]">Parent unlocked: {auth?.is_unlocked ? "Yes" : "No"}</p>
      </section>

      <section className="barn-card grid grid-cols-2 gap-2 text-sm">
        <Link href="/settings/profiles" className="quick-action-card justify-start px-3">Manage Profiles</Link>
        <Link href="/projects" className="quick-action-card justify-start px-3">Manage Projects</Link>
        <Link href="/notifications" className="quick-action-card justify-start px-3">Manage Reminders</Link>
        <Link href="/reports" className="quick-action-card justify-start px-3">Open Reports</Link>
        <a href="#export-all" className="quick-action-card col-span-2 justify-start px-3">Export All Data</a>
      </section>

      <section className="barn-card space-y-2">
        <h2 className="text-base font-semibold">Project visibility</h2>
        <div className="flex flex-wrap gap-2">
          {scopes.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setScope(item.key)}
              className={`rounded px-3 py-2 text-xs ${scope === item.key ? "bg-[var(--barn-red)] text-white" : "bg-neutral-800"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? <p className="text-sm text-[var(--barn-muted)]">Loading admin summary...</p> : null}
      {error ? <p className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

      {summary ? (
        <>
          <section className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <article className="barn-chip">{summary.family_overview.total_active_profiles}<span>Active members</span></article>
            <article className="barn-chip">{summary.family_overview.total_active_projects}<span>Active projects</span></article>
            <article className="barn-chip">{summary.family_overview.total_archived_projects}<span>Archived projects</span></article>
            <article className="barn-chip">${summary.family_overview.total_expenses.toFixed(2)}<span>Total expenses</span></article>
            <article className="barn-chip">${summary.family_overview.total_income.toFixed(2)}<span>Total income</span></article>
            <article className="barn-chip">{summary.family_overview.total_ribbons}<span>Total ribbons</span></article>
          </section>

          <section className="barn-card space-y-2 text-sm">
            <h2 className="text-base font-semibold">Family overview</h2>
            <p>Current project year: {summary.family_overview.current_project_year}</p>
            <p>Placings total: {summary.family_overview.total_placings}</p>
          </section>

          <section className="barn-card space-y-2 text-sm">
            <h2 className="text-base font-semibold">Member overview</h2>
            <div className="space-y-2">
              {summary.member_overview.map((member) => (
                <article key={member.profile_id} className="barn-row">
                  <p className="font-medium">{member.profile_name}</p>
                  <p className="text-xs text-[var(--barn-muted)]">Age {member.age ?? "—"} • Years active {member.years_active}</p>
                  <p className="text-xs text-[var(--barn-muted)]">Projects {member.active_projects} active / {member.completed_projects} completed • Ribbons {member.lifetime_ribbons}</p>
                  <p className="text-xs text-[var(--barn-muted)]">Lifetime expenses ${member.lifetime_expenses.toFixed(2)} • Lifetime income ${member.lifetime_income.toFixed(2)}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="barn-card space-y-2 text-sm">
            <h2 className="text-base font-semibold">Awards / ribbons overview</h2>
            <p>Placings {summary.awards_overview.totals.placings} • Ribbons {summary.awards_overview.totals.ribbons}</p>
            <p>Champions {summary.awards_overview.totals.champions} • Reserve champions {summary.awards_overview.totals.reserve_champions}</p>
          </section>

          <section className="barn-card space-y-2 text-sm">
            <h2 className="text-base font-semibold">Helper contribution summary</h2>
            {summary.helper_overview.helpers.slice(0, 6).map((helper) => (
              <article key={`${helper.helper_profile_id ?? "unknown"}-${helper.helper_name}`} className="barn-row">
                <p className="font-medium">{helper.helper_name}</p>
                <p className="text-xs text-[var(--barn-muted)]">{helper.total_actions} actions • {helper.project_count} projects</p>
              </article>
            ))}
          </section>

          <section className="barn-card space-y-2 text-sm">
            <h2 className="text-base font-semibold">Projects by member</h2>
            {summary.projects_by_member.map((row) => (
              <article key={row.profile_id} className="barn-row">
                <p className="font-medium">{row.profile_name}</p>
                <p className="text-xs text-[var(--barn-muted)]">Active {row.active_projects.length} • Archived {row.archived_projects.length}</p>
                <p className="text-xs text-[var(--barn-muted)]">Expenses ${row.expenses_total.toFixed(2)} • Income ${row.income_total.toFixed(2)} • Ribbons {row.lifetime_ribbons}</p>
              </article>
            ))}
          </section>
        </>
      ) : null}

      <section id="export-all" className="barn-card space-y-2 text-sm">
        <h2 className="text-base font-semibold">Export all data</h2>
        <p className="text-[var(--barn-muted)]">Read-only family export center.</p>
        <div className="grid gap-2">
          {exports?.exports.map((entry) => (
            <a key={entry.id} href={entry.href} className="rounded bg-neutral-800 px-3 py-2 text-sm">
              {entry.label}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
