"use client";

import { useMemo, useState } from "react";

import { AuthStatus, MediaItem, apiClientJson } from "@/lib/api";
import { detectMediaType, ribbonBadgeClass } from "@/lib/media";

type Props = {
  items: MediaItem[];
  initialIndex: number;
  auth: AuthStatus | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
};

export function MediaViewer({ items, initialIndex, auth, onClose, onChanged }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const current = items[index];
  const mediaType = useMemo(() => (current ? detectMediaType(current) : "photo"), [current]);

  if (!current) return null;

  const go = (delta: number) => {
    setIndex((previous) => {
      const next = previous + delta;
      if (next < 0) return items.length - 1;
      if (next >= items.length) return 0;
      return next;
    });
  };

  const remove = async () => {
    await apiClientJson(`/media/${current.id}`, { method: "DELETE" });
    await onChanged();
    if (items.length <= 1) {
      onClose();
    } else {
      setIndex((previous) => Math.max(0, previous - 1));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white" onTouchStart={(event) => setTouchStart(event.changedTouches[0]?.clientX ?? null)} onTouchEnd={(event) => {
      if (touchStart === null) return;
      const end = event.changedTouches[0]?.clientX ?? touchStart;
      const delta = end - touchStart;
      if (Math.abs(delta) > 40) go(delta > 0 ? -1 : 1);
      setTouchStart(null);
    }}>
      <div className="flex items-center justify-between px-3 py-2 text-xs">
        <button className="rounded bg-white/10 px-3 py-2" onClick={onClose}>Close</button>
        <p>{index + 1} / {items.length}</p>
        {auth?.role === "parent" && auth.is_unlocked ? <button className="rounded bg-red-800 px-3 py-2" onClick={() => remove().catch(() => undefined)}>Delete</button> : <span />}
      </div>

      <div className="flex flex-1 items-center justify-center px-2">
        {mediaType === "video" ? (
          <video src={current.file_url || current.url} className="max-h-[75vh] w-full rounded object-contain" controls playsInline autoPlay />
        ) : (
          <img src={current.file_url || current.url} alt={current.caption || current.file_name} className="max-h-[75vh] w-full rounded object-contain" />
        )}
      </div>

      <div className="space-y-1 px-4 pb-4 text-sm">
        <div className="flex flex-wrap gap-2 text-xs">
          {current.show_name ? <span className="rounded bg-white/15 px-2 py-1">{current.show_name}</span> : null}
          {current.placing_value ? <span className={`rounded px-2 py-1 ${ribbonBadgeClass(current.ribbon_type)}`}>{current.placing_value}{current.ribbon_type ? ` • ${current.ribbon_type}` : ""}</span> : null}
          {current.helper_profile_name ? <span className="rounded bg-white/15 px-2 py-1">By {current.helper_profile_name}</span> : null}
        </div>
        <p>{current.caption || current.file_name}</p>
        {current.tags?.length ? <p className="text-xs text-neutral-300">Tags: {current.tags.join(", ")}</p> : null}
      </div>

      <div className="absolute inset-y-0 left-0 flex items-center">
        <button className="rounded-r bg-black/40 px-3 py-5 text-xl" onClick={() => go(-1)}>‹</button>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center">
        <button className="rounded-l bg-black/40 px-3 py-5 text-xl" onClick={() => go(1)}>›</button>
      </div>
    </div>
  );
}
