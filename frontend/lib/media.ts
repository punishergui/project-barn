import { MediaItem } from "@/lib/api";

export function detectMediaType(item: MediaItem): "photo" | "video" | "ribbon" {
  const value = (item.media_type || "").toLowerCase();
  if (value === "video") return "video";
  if (value === "ribbon") return "ribbon";

  const mime = (item.mime_type || "").toLowerCase();
  if (mime.startsWith("video/")) return "video";

  const extension = item.file_name.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "mov", "m4v", "webm", "avi", "mkv"].includes(extension)) return "video";
  if ((item.ribbon_type || "").trim()) return "ribbon";

  return "photo";
}

export function ribbonBadgeClass(ribbonType?: string | null) {
  const key = (ribbonType || "").toLowerCase();
  if (key.includes("champion")) return "bg-purple-700 text-primary-foreground";
  if (key.includes("reserve")) return "bg-pink-600 text-primary-foreground";
  if (key.includes("blue") || key.includes("1")) return "bg-primary text-primary-foreground text-primary-foreground";
  if (key.includes("red") || key.includes("2")) return "bg-red-700 text-primary-foreground";
  if (key.includes("white") || key.includes("3")) return "bg-slate-200 text-slate-900";
  return "bg-secondary text-foreground text-primary-foreground";
}
