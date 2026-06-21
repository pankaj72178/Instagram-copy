import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { aiEnabled, suggestCaption } from "@/lib/ai";

// POST /api/ai/caption { image: base64, mime } — suggest a caption for an image.
export async function POST(req: Request) {
  const limited = await rateLimit(req, "ai-caption", 15, 60_000);
  if (limited) return limited;

  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  if (!aiEnabled) {
    return NextResponse.json({ error: "AI features aren't configured." }, { status: 503 });
  }

  const { image, mime } = (await req.json().catch(() => ({}))) as {
    image?: string;
    mime?: string;
  };
  if (!image || !mime) {
    return NextResponse.json({ error: "Missing image" }, { status: 400 });
  }
  // Guard against oversized payloads (base64 of ~6MB).
  if (image.length > 9_000_000) {
    return NextResponse.json({ error: "Image too large for caption suggestions." }, { status: 413 });
  }

  const caption = await suggestCaption(image, mime);
  if (!caption) {
    return NextResponse.json({ error: "Couldn't generate a caption. Try again." }, { status: 502 });
  }
  return NextResponse.json({ caption });
}
