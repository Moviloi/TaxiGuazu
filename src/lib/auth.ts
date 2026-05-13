import { NextResponse } from "next/server";

export function checkAdminAuth(request: Request): NextResponse | null {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return null;

  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
