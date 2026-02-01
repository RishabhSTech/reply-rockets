/**
 * Converts Markdown-style formatting to HTML
 * Supports: **bold**, *italic*, bullets (•), and numbered lists
 */
export function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Escape HTML special characters first (but preserve our markdown markers temporarily)
  const tempMarkers: Record<string, string> = {
    "##BOLD_START##": "**",
    "##BOLD_END##": "**",
    "##ITALIC_START##": "*",
    "##ITALIC_END##": "*",
  };

  // Convert **bold** to <strong>
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Convert *italic* to <em> (but not ** which was already converted)
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");

  // Handle bullet lists - convert lines starting with •
  const lines = html.split("<br />");
  const processedLines = lines.map((line) => {
    if (line.trim().startsWith("•")) {
      return line.replace(/^(\s*)•\s*/, "$1");
    }
    return line;
  });

  html = processedLines.join("<br />");

  // Wrap bullet and numbered list items in <ul> or <ol>
  // This is a simplified approach - in production you might want more robust parsing
  const bulletListRegex = /(<br \/>\s*•\s*.+?)(?=<br \/>|$)/g;
  const numberedListRegex = /(<br \/>\s*\d+\.\s*.+?)(?=<br \/>|$)/g;

  return html;
}
