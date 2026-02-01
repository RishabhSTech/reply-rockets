import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered, Eye, Code } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Type your message...",
  className = "",
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  // Sync contentEditable with markdown value
  useEffect(() => {
    if (editorRef.current && !isComposing) {
      const formattedHtml = markdownToDisplayHtml(value);
      if (editorRef.current.innerHTML !== formattedHtml) {
        editorRef.current.innerHTML = formattedHtml;
      }
    }
  }, [value, isComposing]);

  // Convert markdown to displayable HTML (with formatting applied)
  const markdownToDisplayHtml = (markdown: string): string => {
    if (!markdown) return `<span class="text-muted-foreground">${placeholder}</span>`;
    
    let html = markdown;
    
    // Escape HTML first
    html = html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Convert **bold** to <strong> (make sure to handle multiple words)
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong style=\"font-weight: 700;\">$1</strong>");
    
    // Convert *italic* to <em> (but not ** which was already converted)
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em style=\"font-style: italic;\">$1</em>");
    
    // Convert bullet points with proper formatting
    html = html.replace(/^• (.+)$/gm, "<div style=\"margin-left: 20px; display: flex; gap: 8px;\"><span>•</span><span>$1</span></div>");
    
    // Convert numbered lists
    html = html.replace(/^(\d+)\. (.+)$/gm, "<div style=\"margin-left: 20px; display: flex; gap: 8px;\"><span>$1.</span><span>$2</span></div>");
    
    // Convert line breaks
    html = html.replace(/\n/g, "<br />");
    
    return html;
  };

  // Extract plain text from HTML while preserving markdown
  const extractMarkdownFromDisplay = (html: string): string => {
    // Remove HTML tags but keep the content and markdown syntax
    let text = html;
    
    // Convert strong tags back to **
    text = text.replace(/<strong[^>]*>(.+?)<\/strong>/g, "**$1**");
    
    // Convert em tags back to *
    text = text.replace(/<em[^>]*>(.+?)<\/em>/g, "*$1*");
    
    // Convert divs with bullets back
    text = text.replace(/<div[^>]*><span>•<\/span><span>(.+?)<\/span><\/div>/g, "• $1");
    
    // Convert divs with numbers back
    text = text.replace(/<div[^>]*><span>(\d+)\.<\/span><span>(.+?)<\/span><\/div>/g, "$1. $2");
    
    // Remove other HTML tags
    text = text.replace(/<br\s*\/?>/g, "\n");
    text = text.replace(/<[^>]+>/g, "");
    
    return text.trim();
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const html = editorRef.current?.innerHTML || "";
    const plainMarkdown = extractMarkdownFromDisplay(html);
    onChange(plainMarkdown);
  };

  const insertFormatting = (before: string, after: string = "") => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (!selectedText) {
      // If no text selected, just insert the markers
      const newText = before + after;
      const textNode = document.createTextNode(newText);
      range.insertNode(textNode);
      range.setStart(textNode, before.length);
      range.collapse(true);
    } else {
      // Wrap selected text
      const span = document.createElement("span");
      span.textContent = before + selectedText + after;
      range.surroundContents(span);
    }

    selection.removeAllRanges();
    selection.addRange(range);
    handleInput({ target: editor } as any);
  };

  const handleBold = () => {
    insertFormatting("**", "**");
  };

  const handleItalic = () => {
    insertFormatting("*", "*");
  };

  const handleBulletList = () => {
    const editor = editorRef.current;
    if (!editor) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString() || "Item";
    
    const bulletText = `• ${selectedText}`;
    const textNode = document.createTextNode(bulletText);
    range.insertNode(textNode);
    
    handleInput({ target: editor } as any);
  };

  const handleNumberedList = () => {
    const editor = editorRef.current;
    if (!editor) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString() || "Item";
    
    const numberedText = `1. ${selectedText}`;
    const textNode = document.createTextNode(numberedText);
    range.insertNode(textNode);
    
    handleInput({ target: editor } as any);
  };

  // Convert markdown to preview HTML for preview mode
  const getPreviewHtml = () => {
    let html = value;
    
    // Escape HTML
    html = html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Convert **bold** to <strong>
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    
    // Convert *italic* to <em>
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
    
    // Convert bullet points
    html = html.replace(/^•\s+(.+)$/gm, "<li style=\"margin-left: 20px; list-style: disc;\">$1</li>");
    
    // Convert numbered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, "<li style=\"margin-left: 20px; list-style: decimal;\">$1</li>");
    
    // Convert line breaks
    html = html.replace(/\n/g, "<br />");
    
    return html;
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1 border border-input rounded-md bg-secondary p-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBold}
          disabled={disabled}
          title="Bold"
          className="h-8 w-8 p-0"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleItalic}
          disabled={disabled}
          title="Italic"
          className="h-8 w-8 p-0"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <div className="w-px bg-border"></div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBulletList}
          disabled={disabled}
          title="Bullet List"
          className="h-8 w-8 p-0"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleNumberedList}
          disabled={disabled}
          title="Numbered List"
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <div className="ml-auto flex gap-1">
          <Button
            type="button"
            variant={showPreview ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            disabled={disabled}
            title="Preview email"
            className="h-8 w-8 p-0"
          >
            {showPreview ? <Code className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {showPreview ? (
        <div className={`w-full px-3 py-2 border border-input rounded-md bg-background text-sm font-serif leading-relaxed ${className}`}>
          <div dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
        </div>
      ) : (
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          className={`w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 outline-none ${className}`}
          style={{
            minHeight: className.includes("min-h") ? undefined : "300px",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
          }}
        />
      )}

      <p className="text-xs text-muted-foreground">
        Type <code className="bg-muted px-1 rounded">**text**</code> for bold, <code className="bg-muted px-1 rounded">*text*</code> for italic, or use the toolbar buttons
      </p>
    </div>
  );
}
