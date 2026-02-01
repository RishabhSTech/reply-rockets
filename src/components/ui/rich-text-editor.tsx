import { useState, useRef } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const insertFormatting = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    const newValue = beforeText + before + selectedText + after + afterText;
    onChange(newValue);

    // Restore cursor position after state update
    setTimeout(() => {
      if (textarea) {
        const newPosition = start + before.length + selectedText.length;
        textarea.focus();
        textarea.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  const handleBold = () => {
    insertFormatting("**", "**");
  };

  const handleItalic = () => {
    insertFormatting("*", "*");
  };

  const handleBulletList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    const lines = selectedText.split("\n");
    const bulletedLines = lines
      .map((line) => (line.trim() ? `• ${line.trim()}` : line))
      .join("\n");

    const newValue =
      beforeText + (beforeText.endsWith("\n") ? "" : "\n") + bulletedLines + (afterText.startsWith("\n") ? "" : "\n") + afterText;
    onChange(newValue);

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(
          beforeText.length + bulletedLines.length + 1,
          beforeText.length + bulletedLines.length + 1
        );
      }
    }, 0);
  };

  const handleNumberedList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    const lines = selectedText.split("\n");
    const numberedLines = lines
      .map((line, index) => (line.trim() ? `${index + 1}. ${line.trim()}` : line))
      .join("\n");

    const newValue =
      beforeText + (beforeText.endsWith("\n") ? "" : "\n") + numberedLines + (afterText.startsWith("\n") ? "" : "\n") + afterText;
    onChange(newValue);

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(
          beforeText.length + numberedLines.length + 1,
          beforeText.length + numberedLines.length + 1
        );
      }
    }, 0);
  };

  // Convert markdown to preview HTML
  const getPreviewHtml = () => {
    let html = value;
    
    // Escape HTML special characters
    html = html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Convert **bold** to <strong>
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    
    // Convert *italic* to <em>
    html = html.replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, "<em>$1</em>");
    
    // Convert bullet points
    html = html.replace(/^•\s+(.+)$/gm, "<li style=\"margin-left: 20px; list-style: disc; margin-bottom: 4px;\">$1</li>");
    
    // Convert numbered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, "<li style=\"margin-left: 20px; list-style: decimal; margin-bottom: 4px;\">$1</li>");
    
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
          title="Bold - **text**"
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
          title="Italic - *text*"
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
            title="Toggle preview"
            className="h-8 w-8 p-0"
          >
            {showPreview ? <Code className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {showPreview ? (
        <div className={`w-full px-3 py-2 border border-input rounded-md bg-background text-sm font-serif leading-relaxed overflow-auto max-h-96 ${className}`}>
          <div dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 border border-input rounded-md bg-background text-sm resize-none font-mono ${className}`}
        />
      )}
    </div>
  );
}
