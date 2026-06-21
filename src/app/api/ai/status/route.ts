import { NextResponse } from "next/server";
import { aiEnabled } from "@/lib/ai";

// GET /api/ai/status — whether AI features are configured (no secrets exposed).
export function GET() {
  return NextResponse.json({ enabled: aiEnabled });
}
