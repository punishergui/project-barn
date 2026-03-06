import { apiClientJson } from "@/lib/api";

type UploadResponse = { url: string };

type UploadKind = "avatar" | "project-image" | "project-media" | "receipt";

type UploadRule = {
  maxBytes: number;
  acceptedMimePrefixes: string[];
  acceptedMimeTypes?: string[];
};

const MB = 1024 * 1024;

const uploadRules: Record<UploadKind, UploadRule> = {
  avatar: { maxBytes: 5 * MB, acceptedMimePrefixes: ["image/"] },
  "project-image": { maxBytes: 10 * MB, acceptedMimePrefixes: ["image/"] },
  "project-media": { maxBytes: 25 * MB, acceptedMimePrefixes: ["image/", "video/"] },
  receipt: {
    maxBytes: 12 * MB,
    acceptedMimePrefixes: ["image/", "application/pdf"],
    acceptedMimeTypes: ["application/pdf"]
  }
};

function validateUploadFile(file: File, kind: UploadKind) {
  const rule = uploadRules[kind];
  if (file.size > rule.maxBytes) {
    throw new Error(`File is too large. Limit is ${Math.floor(rule.maxBytes / MB)}MB.`);
  }

  const mimeType = file.type.toLowerCase();
  const typeAllowed = rule.acceptedMimePrefixes.some((prefix) => mimeType.startsWith(prefix));
  const exactAllowed = (rule.acceptedMimeTypes ?? []).includes(mimeType);

  if (!typeAllowed && !exactAllowed) {
    throw new Error("File type is not supported for this upload.");
  }
}

async function upload(path: string, fields: Record<string, string>, file: File, kind: UploadKind): Promise<string> {
  validateUploadFile(file, kind);

  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => formData.set(key, value));
  formData.set("file", file);

  const response = await apiClientJson<UploadResponse>(path, { method: "POST", body: formData });
  return response.url;
}

export function uploadProfileAvatar(file: File, profileId?: number): Promise<string> {
  const fields = profileId ? { profile_id: String(profileId) } : {};
  return upload("/uploads/profile-avatar", fields, file, "avatar");
}

export function uploadProjectHero(projectId: number, file: File): Promise<string> {
  return upload("/uploads/project-hero", { project_id: String(projectId) }, file, "project-image");
}

export function uploadProjectMedia(projectId: number, file: File, caption?: string): Promise<string> {
  return upload("/uploads/project-media", { project_id: String(projectId), caption: caption ?? "" }, file, "project-media");
}

export function uploadReceipt(expenseId: number, file: File, caption?: string): Promise<string> {
  return upload("/uploads/receipt", { expense_id: String(expenseId), caption: caption ?? "" }, file, "receipt");
}

export const uploadExpenseReceipt = uploadReceipt;
