"use client";

import { ChevronRight } from "lucide-react";
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
    <div className="px-4 pb-4">
      <h1 className="mb-1 font-serif text-2xl text-foreground">Admin Data Tools</h1>
      <p className="mb-4 text-sm text-muted-foreground">Backup/export controls for durability checks.</p>

      {error ? <p className="mb-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-red-500">{error}</p> : null}

      {summary ? (
        <section className="mb-4 rounded-2xl border border-border bg-card p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col">
              <p className="text-xs text-muted-foreground">Database path</p>
              <p className="font-mono text-xs font-semibold text-foreground">{summary.paths.database}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-xs text-muted-foreground">Media path</p>
              <p className="font-mono text-xs font-semibold text-foreground">{summary.paths.media}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-xs text-muted-foreground">Database size</p>
              <p className="font-mono text-sm font-semibold text-foreground">{humanSize(summary.database_size_bytes)}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-xs text-muted-foreground">Media size</p>
              <p className="font-mono text-sm font-semibold text-foreground">{humanSize(summary.media_size_bytes)}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-xs text-muted-foreground">Media files</p>
              <p className="font-mono text-sm font-semibold text-foreground">{summary.media_count}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-xs text-muted-foreground">Orphan media</p>
              <p className="font-mono text-sm font-semibold text-foreground">{summary.orphan_media_count}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <a href="/api/export/all" className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground">
          <span>Download full export bundle (.zip)</span>
          <ChevronRight size={14} className="text-muted-foreground" />
        </a>
        <button type="button" onClick={() => scanOrphans().catch(() => undefined)} disabled={scanning} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground disabled:opacity-60">
          <span>{scanning ? "Scanning..." : "Run orphan media scan"}</span>
          <ChevronRight size={14} className="text-muted-foreground" />
        </button>
      </section>
    </div>
  );
}
