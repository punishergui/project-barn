import { redirect } from "next/navigation";

import { SessionResponse } from "@/lib/api";
import { apiJsonServer } from "@/lib/apiServer";

export default async function HomePage() {
  try {
    const session = await apiJsonServer<SessionResponse>("/session");
    redirect(session.active_profile ? "/dashboard" : "/profile-picker");
  } catch {
    redirect("/profile-picker");
  }
}
