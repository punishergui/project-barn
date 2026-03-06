import { MediaItem } from "@/lib/api";
import { detectMediaType, ribbonBadgeClass } from "@/lib/media";

export function ShowsMediaCard({ item }: { item: MediaItem }) {
  const mediaUrl = item.file_url || item.url;
  const mediaType = detectMediaType(item);

  return (
    <a href={mediaUrl} className="relative space-y-1 rounded bg-neutral-800 p-2">
      {mediaType === "video" ? (
        <video src={mediaUrl} className="h-28 w-full rounded bg-black object-cover" muted playsInline preload="metadata" />
      ) : (
        <img src={mediaUrl} alt={item.caption ?? item.file_name} className="h-28 w-full rounded object-cover" loading="lazy" />
      )}
      {item.ribbon_type ? <span className={`absolute left-3 top-3 rounded px-1.5 py-0.5 text-[10px] ${ribbonBadgeClass(item.ribbon_type)}`}>{item.ribbon_type}</span> : null}
      <p className="truncate text-xs text-neutral-200">{item.caption ?? item.file_name}</p>
      <p className="text-[11px] text-neutral-400">{item.show_name || (item.show_id ? "Show" : "Project")}{item.placing_value ? ` • ${item.placing_value}` : ""}</p>
    </a>
  );
}
