/**
 * Lightweight, zero-dependency Markdown renderer.
 * Converts markdown headings, lists, blockquotes, bold, italics, and code blocks
 * into sanitized HTML for live preview and note rendering.
 */
export function renderMarkdown(md) {
  if (!md || typeof md !== 'string') return '';
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 class="mt-2 text-sm font-semibold">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="mt-2.5 text-base font-semibold">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="mt-2.5 text-lg font-bold text-primary">$1</h1>')
    .replace(
      /^&gt; (.+)$/gm,
      '<blockquote class="border-l-2 border-primary pl-2.5 italic text-muted dark:text-dark-muted my-1.5">$1</blockquote>',
    )
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(
      /`([^`]+)`/g,
      '<code class="rounded bg-surface-alt dark:bg-dark-surface-alt px-1 py-0.5 text-xs font-mono">$1</code>',
    )
    .split(/\n\n+/)
    .map((p) => (p.startsWith('<') ? p : `<p class="leading-relaxed my-1">${p}</p>`))
    .join('\n');
}
