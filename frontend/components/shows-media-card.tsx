import { MediaItem } from "@/lib/api";

export function ShowsMediaCard({ item }: { item: MediaItem }) {
  const mediaUrl = item.file_url || item.url;
  const extension = item.file_name.split(".").pop()?.toLowerCase() ?? "";
  const isVideo = ["mp4", "mov", "webm", "m4v", "avi", "mkv"].includes(extension);
  const source = item.placing_id ? "Placing" : item.timeline_entry_id ? "Timeline" : item.show_id ? "Show" : "Project";
  return (
    <a href={mediaUrl} className="space-y-1 rounded bg-neutral-800 p-2">
      {isVideo ? (
        <video src={mediaUrl} className="h-28 w-full rounded bg-black object-cover" muted playsInline controls />
      ) : (
        <img src={mediaUrl} alt={item.caption ?? item.file_name} className="h-28 w-full rounded object-cover" />
      )}
      <p className="truncate text-xs text-neutral-200">{item.caption ?? item.file_name}</p>
      <p className="text-[11px] text-neutral-400">{source}</p>
    </a>
  );
}
