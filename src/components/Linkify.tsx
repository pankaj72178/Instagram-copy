import Link from "next/link";

// Renders text with @mentions → /username and #hashtags → /tags/tag as links.
export default function Linkify({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  const regex = /([@#])([a-zA-Z0-9_]+)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    const [full, sym, name] = m;
    // only treat as token at a word boundary (avoid emails like a@b)
    const before = m.index === 0 ? "" : text[m.index - 1];
    if (before && !/\s/.test(before)) continue;

    if (m.index > last) nodes.push(text.slice(last, m.index));
    const href = sym === "@" ? `/${name.toLowerCase()}` : `/tags/${name.toLowerCase()}`;
    nodes.push(
      <Link key={key++} href={href} className="font-medium text-indigo-400 hover:underline">
        {full}
      </Link>
    );
    last = m.index + full.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <span className="whitespace-pre-line">{nodes}</span>;
}
