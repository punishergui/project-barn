"use client";

import { useEffect, useState } from "react";

import { apiClientJson } from "@/lib/api";

type DataSummary = {
  paths: { database: string; media: string };
  database_size_bytes: number;
  media_size_bytes: number;
  media_count: number;
  orphan_media_count: number;
};

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export default function AdminDataPage() {
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const load = async () => {
    try {
      setSummary(await apiClientJson<DataSummary>("/admin/data/summary"));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load data tools.");
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const scanOrphans = async () => {
    setScanning(true);
    try {
      await apiClientJson<{ success: boolean; new_orphans: number }>("/admin/data/orphan-media-scan", { method: "POST" });
      await load();
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Unable to run orphan scan.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-4 px-4 pb-4">
      <section className="barn-card space-y-1">
        <h1 className="text-2xl font-semibold">Admin Data Tools</h1>
        <p className="text-sm text-[var(--barn-muted)]">Backup/export controls for durability checks.</p>
      </section>

      {error ? <p className="barn-row text-sm text-red-200">{error}</p> : null}

      {summary ? (
        <section className="barn-card space-y-2 text-sm">
          <p>Database path: <span className="font-mono text-xs">{summary.paths.database}</span></p>
          <p>Media path: <span className="font-mono text-xs">{summary.paths.media}</span></p>
          <p>Database size: {humanSize(summary.database_size_bytes)}</p>
          <p>Media size: {humanSize(summary.media_size_bytes)} ({summary.media_count} files)</p>
          <p>Orphan media: {summary.orphan_media_count}</p>
        </section>
      ) : null}

      <section className="barn-card space-y-2 text-sm">
        <a href="/api/export/all" className="quick-action-card justify-start px-3">Download full export bundle (.zip)</a>
        <button type="button" onClick={() => scanOrphans().catch(() => undefined)} disabled={scanning} className="quick-action-card justify-start px-3 disabled:opacity-60">
          {scanning ? "Scanning..." : "Run orphan media scan"}
        </button>
      </section>
    </div>
  );
}
