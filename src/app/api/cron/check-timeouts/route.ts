import { NextRequest } from "next/server";
import { handleCheckTimeouts } from "@/lib/check-timeouts-handler";

export async function GET(request: NextRequest) {
  return handleCheckTimeouts(request);
}
