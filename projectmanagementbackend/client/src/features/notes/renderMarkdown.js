/**
 * Lightweight, zero-dependency Markdown renderer.
 * Converts markdown headings, lists, blockquotes, bold, italics, code blocks,
 * links, and @mentions into sanitized HTML for live preview, discussions, and notes.
 */
export function renderMarkdown(md) {
  if (!md || typeof md !== 'string') return '';

  // 1. Sanitize HTML entities
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. Fenced code blocks (``` ... ```)
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre class="my-2 overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs dark:border-dark-border"><code>${code.trim()}</code></pre>`;
  });

  // 3. Headings
  html = html
    .replace(/^### (.+)$/gm, '<h3 class="mt-2 text-sm font-semibold text-foreground dark:text-dark-foreground">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="mt-2.5 text-base font-semibold text-foreground dark:text-dark-foreground">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="mt-2.5 text-lg font-bold text-primary dark:text-dark-primary">$1</h1>');

  // 4. Blockquotes
  html = html.replace(
    /^&gt; (.+)$/gm,
    '<blockquote class="my-1.5 border-l-2 border-primary pl-2.5 italic text-muted-foreground">$1</blockquote>',
  );

  // 5. Bullet lists
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm text-foreground/90 dark:text-dark-foreground/90">$1</li>');

  // 6. Inline code
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground dark:bg-dark-muted/60 dark:text-dark-foreground">$1</code>',
  );

  // 7. Bold & Italics
  html = html
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground dark:text-dark-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');

  // 8. Links [label](url)
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80 font-medium">$1</a>',
  );

  // 9. Mentions @username
  html = html.replace(
    /@([a-zA-Z0-9_-]+)/g,
    '<span class="font-semibold text-primary dark:text-primary-light hover:underline cursor-pointer">@$1</span>',
  );

  // 10. Paragraphs
  return html
    .split(/\n\n+/)
    .map((p) => (p.startsWith('<h') || p.startsWith('<pre') || p.startsWith('<blockquote') || p.startsWith('<li') ? p : `<p class="my-1.5 leading-relaxed">${p}</p>`))
    .join('\n');
}
