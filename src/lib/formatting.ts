/**
 * Converts Markdown-style formatting to HTML
 * Supports: **bold**, *italic*, bullets (•), and numbered lists
 */
export function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Convert **bold** to <strong>
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Convert *italic* to <em>
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Convert bullet lists (lines starting with •)
  html = html.replace(/^• (.+)$/gm, "<li>$1</li>");

  // Convert numbered lists (lines starting with number followed by .)
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Wrap consecutive <li> tags in <ul> or <ol>
  html = html.replace(/(<li>.+<\/li>)(\n<li>.+<\/li>)*/g, (match) => {
    // Check if it starts with a number (ordered list) or bullet (unordered list)
    const isOrdered = /^\d+\./.test(markdown.substring(0, markdown.indexOf(match)));
    const listTag = isOrdered ? "ol" : "ul";
    return `<${listTag}>${match}</${listTag}>`;
  });

  // Convert line breaks to <br />
  html = html.replace(/\n/g, "<br />");

  return html;
}

/**
 * Escapes HTML special characters for safe display
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
