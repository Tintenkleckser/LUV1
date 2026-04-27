'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Download, FileText, Hash, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ExportButtonsProps {
  content: string;
  filenameBase?: string;
}

/**
 * Strips Markdown formatting to produce clean plain text.
 * Suitable for pasting into Word, Pages, LibreOffice etc.
 */
function stripMarkdown(md: string): string {
  let text = md;

  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}\s*$/gm, '');

  // Convert tables to tab-separated lines
  text = text.replace(/^\|(.+)\|$/gm, (_, row) => {
    return row
      .split('|')
      .map((cell: string) => cell.trim())
      .join('\t');
  });
  // Remove table separator lines (|---|---|)
  text = text.replace(/^[\s|:-]+$/gm, '');

  // Remove headings markers but keep text
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Remove bold/italic markers
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/___(.+?)___/g, '$1');
  text = text.replace(/__(.+?)__/g, '$1');
  text = text.replace(/_(.+?)_/g, '$1');

  // Remove inline code backticks
  text = text.replace(/`([^`]+)`/g, '$1');

  // Remove code block fences
  text = text.replace(/^```[\s\S]*?```$/gm, (block) => {
    return block.replace(/^```\w*\n?/gm, '').replace(/```$/gm, '');
  });

  // Remove link syntax [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove image syntax ![alt](url) -> alt
  text = text.replace(/!\[([^\]]*)?\]\([^)]+\)/g, '$1');

  // Convert list markers to simple dashes
  text = text.replace(/^\s*[-*+]\s+/gm, '- ');
  text = text.replace(/^\s*\d+\.\s+/gm, (match) => match);

  // Remove blockquote markers
  text = text.replace(/^>\s?/gm, '');

  // Collapse multiple blank lines
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
}

export function ExportButtons({ content, filenameBase = 'KI-Analyse' }: ExportButtonsProps) {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);

  if (!content) return null;

  const handleCopyText = async () => {
    const plainText = stripMarkdown(content);
    const ok = await copyToClipboard(plainText);
    if (ok) {
      setCopiedText(true);
      toast.success('Als Text kopiert \u2013 bereit zum Einf\u00fcgen in Word, Pages etc.');
      setTimeout(() => setCopiedText(false), 2000);
    } else {
      toast.error('Kopieren fehlgeschlagen');
    }
  };

  const handleCopyMarkdown = async () => {
    const ok = await copyToClipboard(content);
    if (ok) {
      setCopiedMd(true);
      toast.success('Als Markdown kopiert \u2013 bereit zum Einf\u00fcgen in Notion etc.');
      setTimeout(() => setCopiedMd(false), 2000);
    } else {
      toast.error('Kopieren fehlgeschlagen');
    }
  };

  const handleDownloadText = () => {
    const plainText = stripMarkdown(content);
    downloadFile(plainText, `${filenameBase}.txt`, 'text/plain;charset=utf-8');
    toast.success('Textdatei heruntergeladen');
  };

  const handleDownloadMarkdown = () => {
    downloadFile(content, `${filenameBase}.md`, 'text/markdown;charset=utf-8');
    toast.success('Markdown-Datei heruntergeladen');
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/50">
      <span className="text-xs text-muted-foreground mr-1">Exportieren:</span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyText}
        className="h-7 text-xs gap-1.5"
      >
        {copiedText ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
        Text kopieren
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyMarkdown}
        className="h-7 text-xs gap-1.5"
      >
        {copiedMd ? <Check className="w-3 h-3 text-green-600" /> : <Hash className="w-3 h-3" />}
        Markdown kopieren
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDownloadText}
        className="h-7 text-xs gap-1.5 text-muted-foreground"
        title="Als .txt herunterladen"
      >
        <Download className="w-3 h-3" />
        .txt
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDownloadMarkdown}
        className="h-7 text-xs gap-1.5 text-muted-foreground"
        title="Als .md herunterladen"
      >
        <Download className="w-3 h-3" />
        .md
      </Button>
    </div>
  );
}
