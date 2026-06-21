import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { aiEnabled, suggestHashtags } from "@/lib/ai";

// POST /api/ai/hashtags { caption?, image?, mime? } — suggest hashtags.
export async function POST(req: Request) {
  const limited = await rateLimit(req, "ai-hashtags", 15, 60_000);
  if (limited) return limited;

  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  if (!aiEnabled) return NextResponse.json({ error: "AI features aren't configured." }, { status: 503 });

  const { caption, image, mime } = (await req.json().catch(() => ({}))) as {
    caption?: string;
    image?: string;
    mime?: string;
  };
  if (!caption && !image) {
    return NextResponse.json({ error: "Add a caption or image first." }, { status: 400 });
  }
  if (image && image.length > 9_000_000) {
    return NextResponse.json({ error: "Image too large." }, { status: 413 });
  }

  const hashtags = await suggestHashtags({ caption, base64: image, mime });
  if (!hashtags) {
    return NextResponse.json({ error: "Couldn't suggest hashtags. Try again." }, { status: 502 });
  }
  return NextResponse.json({ hashtags });
}
