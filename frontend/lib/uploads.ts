import { apiClientJson } from "@/lib/api";

type UploadResponse = { url: string };

async function upload(path: string, fields: Record<string, string>, file: File): Promise<string> {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => formData.set(key, value));
  formData.set("file", file);
  const response = await apiClientJson<UploadResponse>(path, { method: "POST", body: formData });
  return response.url;
}

export function uploadProfileAvatar(file: File): Promise<string> {
  return upload("/uploads/profile-avatar", {}, file);
}

export function uploadProjectHero(projectId: number, file: File): Promise<string> {
  return upload("/uploads/project-hero", { project_id: String(projectId) }, file);
}

export function uploadProjectMedia(projectId: number, file: File, caption?: string): Promise<string> {
  return upload("/uploads/project-media", { project_id: String(projectId), caption: caption ?? "" }, file);
}

export function uploadReceipt(expenseId: number, file: File, caption?: string): Promise<string> {
  return upload("/uploads/receipt", { expense_id: String(expenseId), caption: caption ?? "" }, file);
}

export const uploadExpenseReceipt = uploadReceipt;
