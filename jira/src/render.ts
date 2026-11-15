import type { JiraIssue } from "./types.js";

const CANVAS = 144;
export const MINIMUM_FONT_SIZE = 8;
const AVERAGE_CHARACTER_WIDTH = 0.62;

type TextLayout = {
  lines: string[];
  size: number;
  lineHeight: number;
  truncated: boolean;
};

export function statusColor(status: string, category = ""): string {
  const value = status.toLowerCase();
  if (/block|impediment|stuck/.test(value)) return "#B42318";
  if (/review|qa|test|verify/.test(value)) return "#7A5AF8";
  if (/progress|develop|doing|active/.test(value)) return "#1570EF";
  if (/wait|hold|pending/.test(value)) return "#DC6803";
  if (/done|closed|resolved/.test(value) || category === "done") return "#067647";
  return "#344054";
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "None";
  if (seconds === 0) return "0m";
  const hours = Math.floor((seconds) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [hours && `${hours}h`, minutes && `${minutes}m`]
    .filter(Boolean)
    .slice(0, 2)
    .join(" ") || "<1m";
}

export function renderIssue(issue: JiraIssue): string {
  const key = fitTextBlock(issue.key, 124, 25, 22, 12, 1);
  const summary = fitTextBlock(issue.summary, 120, 68, 18, 11, 4);
  const status = fitTextBlock(issue.status.toUpperCase(), 120, 16, 12, 8, 1);
  return svg(statusColor(issue.status, issue.statusCategory), [
    ...renderTextLayout(key, 10, 7, 800),
    ...renderTextLayout(summary, 12, 48, 600),
    ...renderTextLayout(status, 12, 122, 700, 0.85),
  ]);
}

export function fitSingleLineFontSize(
  value: string,
  preferredSize: number,
  minimumSize: number,
  availableWidth: number,
): number {
  return fitTextBlock(value, availableWidth, preferredSize * 1.3, preferredSize, minimumSize, 1).size;
}

export function fitTextBlock(
  value: string,
  availableWidth: number,
  availableHeight: number,
  preferredSize: number,
  minimumSize = MINIMUM_FONT_SIZE,
  maximumLines = Number.POSITIVE_INFINITY,
): TextLayout {
  const normalized = value.trim() || "—";
  const minimum = Math.max(MINIMUM_FONT_SIZE, minimumSize);
  let fallback: TextLayout | undefined;

  for (let size = preferredSize; size >= minimum; size--) {
    const lineHeight = Math.ceil(size * 1.24);
    const characters = Math.max(1, Math.floor(availableWidth / (size * AVERAGE_CHARACTER_WIDTH)));
    const lines = Math.max(1, Math.min(maximumLines, Math.floor(availableHeight / lineHeight)));
    const wrapped = wrapWithOverflow(normalized, characters, lines);
    const layout = { ...wrapped, size, lineHeight };
    fallback = layout;
    if (!wrapped.truncated) return layout;
  }

  return fallback!;
}

export function renderDetail(issue: JiraIssue, slot: number): string {
  const color = statusColor(issue.status, issue.statusCategory);
  switch (slot) {
    case 0:
      return renderIssue(issue);
    case 1:
      return detailCell(color, "STATUS", issue.status, { preferredSize: 24, maximumLines: 4 });
    case 2:
      return detailCell(
        "#175CD3",
        "TIME",
        `Logged ${formatDuration(issue.timeSpentSeconds)}\nEstimate ${formatDuration(issue.originalEstimateSeconds)}`,
        { preferredSize: 20, maximumLines: 4 },
      );
    case 3:
      return detailCell("#067647", "ACTION", "START", {
        preferredSize: 30,
        maximumLines: 2,
      });
    case 4:
    case 5:
      return svg("#101828", []);
    default:
      return renderMessage("#101828", "JIRA", "Details");
  }
}

export function renderMessage(background: string, heading: string, body: string): string {
  const headingLayout = fitTextBlock(heading, 120, 24, 18, 10, 1);
  const bodyLayout = fitTextBlock(body, 120, 78, 16, 9, 6);
  return svg(background, [
    ...renderTextLayout(headingLayout, 12, 10, 800),
    ...renderTextLayout(bodyLayout, 12, 51, 600),
  ]);
}

function detailCell(
  background: string,
  label: string,
  value: string,
  options: { preferredSize: number; minimumSize?: number; maximumLines?: number },
): string {
  const labelLayout = fitTextBlock(label, 124, 16, 12, 9, 1);
  const valueLayout = fitTextBlock(
    value,
    124,
    105,
    options.preferredSize,
    options.minimumSize ?? MINIMUM_FONT_SIZE,
    options.maximumLines,
  );
  return svg(background, [
    ...renderTextLayout(labelLayout, 10, 8, 800, 0.8),
    ...renderTextLayout(valueLayout, 10, 31, 700),
  ]);
}

function renderTextLayout(
  layout: TextLayout,
  x: number,
  top: number,
  weight: number,
  opacity = 1,
): string[] {
  return layout.lines.map((line, index) =>
    text(line, x, top + layout.size + index * layout.lineHeight, layout.size, weight, opacity),
  );
}

export function wrap(value: string, maxCharacters: number, maxLines: number): string[] {
  return wrapWithOverflow(value, maxCharacters, maxLines).lines;
}

function wrapWithOverflow(value: string, maxCharacters: number, maxLines: number): {
  lines: string[];
  truncated: boolean;
} {
  const paragraphs = value.trim().split(/\n+/);
  const lines: string[] = [];
  let truncated = false;

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let current = "";
    for (const originalWord of words) {
      let word = originalWord;
      while (word.length > maxCharacters) {
        if (current) {
          if (lines.length >= maxLines) { truncated = true; break; }
          lines.push(current);
          current = "";
        }
        if (lines.length >= maxLines) { truncated = true; break; }
        lines.push(word.slice(0, maxCharacters));
        word = word.slice(maxCharacters);
      }
      if (truncated) break;
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxCharacters) {
        current = candidate;
      } else {
        if (lines.length >= maxLines) { truncated = true; break; }
        lines.push(current);
        current = word;
      }
    }
    if (truncated) break;
    if (current) {
      if (lines.length >= maxLines) truncated = true;
      else lines.push(current);
    }
  }

  if (truncated && lines.length) {
    const last = lines.length - 1;
    lines[last] = `${lines[last].slice(0, Math.max(1, maxCharacters - 1)).trimEnd()}…`;
  }
  return { lines: lines.length ? lines : ["—"], truncated };
}

function text(
  value: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  opacity = 1,
): string {
  return `<text x="${x}" y="${y}" fill="#fff" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" opacity="${opacity}">${escapeXml(value)}</text>`;
}

function svg(background: string, children: string[]): string {
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}"><rect width="144" height="144" rx="14" fill="${background}"/>${children.join("")}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(source)}`;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character]!);
}
