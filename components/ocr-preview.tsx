"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, FileText } from "lucide-react";
import { toast } from "sonner";

interface OCRPreviewProps {
  fileName: string;
  extractedText: string;
  filePreview?: string; // Optional: base64 image or PDF preview
  tokensUsed?: number;
  onClose?: () => void;
}

export function OCRPreview({
  fileName,
  extractedText,
  filePreview,
  tokensUsed,
  onClose,
}: OCRPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
      console.error("Copy error:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h2 className="text-xl font-semibold">{fileName}</h2>
        </div>
        {tokensUsed && (
          <div className="text-sm text-muted-foreground">
            {tokensUsed.toLocaleString()} tokens used
          </div>
        )}
      </div>

      {/* Two-column layout on desktop, stacked on mobile */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Left: Original file preview (if available) */}
        {filePreview && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Original Document</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <img
                  src={filePreview}
                  alt={fileName}
                  className="h-auto w-full object-contain"
                  style={{ maxHeight: "600px" }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Right: Extracted text with markdown rendering */}
        <Card className={filePreview ? "" : "md:col-span-2"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Extracted Text</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none overflow-auto rounded-lg border bg-muted/30 p-4">
              <Markdown
                components={{
                  code(props) {
                    const { children, className, node, ...rest } = props;
                    const match = /language-(\w+)/.exec(className || "");
                    return match ? (
                      <SyntaxHighlighter
                        {...rest}
                        PreTag="div"
                        language={match[1]}
                        style={oneDark}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code
                        {...rest}
                        className="rounded bg-muted px-1 py-0.5 font-mono text-sm"
                      >
                        {children}
                      </code>
                    );
                  },
                  table(props) {
                    return (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                          {props.children}
                        </table>
                      </div>
                    );
                  },
                }}
              >
                {extractedText}
              </Markdown>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleCopy} className="gap-2">
          <Copy className="h-4 w-4" />
          Copy All Text
        </Button>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Process Another File
          </Button>
        )}
      </div>
    </div>
  );
}
