// AI features powered by Claude. All functions degrade gracefully: if
// ANTHROPIC_API_KEY isn't set, they return null / safe defaults and the app
// behaves exactly as before.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-4-8";

export const aiEnabled = !!process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!aiEnabled) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
function asImageMime(m: string): ImageMime | null {
  return (["image/jpeg", "image/png", "image/webp", "image/gif"] as const).includes(m as ImageMime)
    ? (m as ImageMime)
    : null;
}

function firstText(msg: Anthropic.Message): string {
  for (const block of msg.content) if (block.type === "text") return block.text.trim();
  return "";
}

/** Suggest a short, catchy caption for an image. Returns null if AI is off or it fails. */
export async function suggestCaption(base64: string, mime: string): Promise<string | null> {
  const c = getClient();
  const media = asImageMime(mime);
  if (!c || !media) return null;
  try {
    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: 200,
      system:
        "You write short, engaging Instagram captions. Return ONLY the caption text — no surrounding quotes, no explanation. Keep it under 150 characters and include 1–3 relevant hashtags.",
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: media, data: base64 } },
            { type: "text", text: "Write a caption for this photo." },
          ],
        },
      ],
    });
    return firstText(msg) || null;
  } catch (e) {
    console.error("suggestCaption failed:", e);
    return null;
  }
}

/** Generate concise accessibility alt text for an image. */
export async function generateAltText(base64: string, mime: string): Promise<string | null> {
  const c = getClient();
  const media = asImageMime(mime);
  if (!c || !media) return null;
  try {
    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: 120,
      system:
        "You write concise, factual alt text for images (accessibility). One sentence, under 125 characters, describing the key visual content. Return ONLY the alt text.",
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: media, data: base64 } },
            { type: "text", text: "Describe this image for a screen reader." },
          ],
        },
      ],
    });
    return firstText(msg).slice(0, 200) || null;
  } catch (e) {
    console.error("generateAltText failed:", e);
    return null;
  }
}

/** Moderate user text. Returns {flagged, reason} or null if AI is off / fails (fail-open). */
export async function moderateText(
  text: string
): Promise<{ flagged: boolean; reason: string } | null> {
  const c = getClient();
  if (!c || !text.trim()) return null;
  try {
    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: 150,
      system:
        "You are a content moderator for a social app. Decide if the text clearly violates policy: hate speech, harassment, threats, sexual exploitation, graphic violence, or promotion of illegal/dangerous acts. Be lenient with ordinary or edgy-but-harmless content. Respond ONLY with JSON: {\"flagged\": boolean, \"reason\": string}.",
      messages: [{ role: "user", content: `Moderate this text:\n\n${text}` }],
    });
    const raw = firstText(msg);
    const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as { flagged?: boolean; reason?: string };
    return { flagged: !!parsed.flagged, reason: parsed.reason || "" };
  } catch (e) {
    console.error("moderateText failed:", e);
    return null;
  }
}
