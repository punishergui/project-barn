import { MediaItem } from "@/lib/api";

export function ShowsMediaCard({ item }: { item: MediaItem }) {
  const source = item.placing_id ? "Placing" : item.timeline_entry_id ? "Timeline" : item.show_id ? "Show" : "Project";
  return (
    <a href={item.file_url || item.url} className="space-y-1 rounded bg-neutral-800 p-2">
      <img src={item.file_url || item.url} alt={item.caption ?? item.file_name} className="h-28 w-full rounded object-cover" />
      <p className="truncate text-xs text-neutral-200">{item.caption ?? item.file_name}</p>
      <p className="text-[11px] text-neutral-400">{source}</p>
    </a>
  );
}
