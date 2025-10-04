export function splitIntoChunks(text, opts = { max: 800, overlap: 100 }) {
  if (typeof text !== "string") throw new Error("splitIntoChunks: text must be a string");
  const max = Number(opts.max ?? 800);
  const overlap = Number(opts.overlap ?? 100);
  if (max <= 0 || overlap < 0) throw new Error("splitIntoChunks: invalid max/overlap");

  const chunks = [];
  let i = 0;

  while (i < text.length) {
    const end = Math.min(text.length, i + max);
    chunks.push(text.slice(i, end));
    const next = end - overlap;
    if (next <= i) break;
    i = next;
  }
  return chunks;
}
