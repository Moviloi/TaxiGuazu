import { NextResponse } from "next/server";
import { getEnv } from "@/config/env";

export function checkAdminAuth(request: Request): NextResponse | null {
  let adminKey: string;
  try {
    adminKey = getEnv().ADMIN_API_KEY;
  } catch {
    return null;
  }

  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
