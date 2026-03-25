/**
 * Split stored reps strings (e.g. "10 each side", "8-12 per leg", "10eac") into
 * a numeric/count token and a remainder for direction / qualifier text.
 * Data is still persisted as a single `reps` string; this is display/edit only.
 */
export interface ParsedRepsDisplay {
  count: string;
  note: string;
}

export function parseRepsDisplay(raw: string): ParsedRepsDisplay {
  const s = raw.trim();
  if (!s) return { count: "", note: "" };

  // e.g. "10+ each side"
  const withPlus = s.match(/^(\d+)\+\s*(.*)$/);
  if (withPlus) {
    return {
      count: `${withPlus[1]}+`,
      note: (withPlus[2] || "").trim(),
    };
  }

  // Range or single integer at start, then optional rest: "8-12", "10 each side"
  const spaced = s.match(/^(\d+(?:\s*[-–]\s*\d+)?)\s+(.+)$/i);
  if (spaced) {
    return {
      count: spaced[1].replace(/\s*[-–]\s*/g, "-").trim(),
      note: spaced[2].trim(),
    };
  }

  // Stuck: "10eac", "12/side" (digits then non-space continuation)
  const stuck = s.match(/^(\d+)([/A-Za-z].*)$/);
  if (stuck) {
    return { count: stuck[1], note: stuck[2].trim() };
  }

  // Only a number or range, no note
  if (/^\d+(?:\s*[-–]\s*\d+)?$/.test(s)) {
    return { count: s.replace(/\s*[-–]\s*/g, "-"), note: "" };
  }

  // Non-numeric prescriptions: AMRAP, to failure, time-based text, etc.
  return { count: "", note: s };
}

export function joinRepsDisplay(parts: ParsedRepsDisplay): string {
  const c = parts.count.trim();
  const n = parts.note.trim();
  if (c && n) return `${c} ${n}`;
  return c || n;
}
