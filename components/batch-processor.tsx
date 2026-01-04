"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { extractText, fileToBase64 } from "@/lib/deepseek-client";
import { Download, Copy, CheckCircle2, XCircle, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export type FileResult = {
  filename: string;
  file: File;
  status: "pending" | "processing" | "success" | "error";
  extractedText?: string;
  error?: string;
  tokensUsed?: number;
};

interface BatchProcessorProps {
  files: File[];
  apiKey: string;
  onComplete?: () => void;
}

export function BatchProcessor({ files, apiKey, onComplete }: BatchProcessorProps) {
  const [results, setResults] = useState<FileResult[]>(
    files.map((file) => ({
      filename: file.name,
      file,
      status: "pending" as const,
    }))
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const processFiles = async () => {
    setIsProcessing(true);
    const updatedResults = [...results];

    for (let i = 0; i < files.length; i++) {
      setCurrentIndex(i);
      const file = files[i];

      // Update status to processing
      updatedResults[i] = { ...updatedResults[i], status: "processing" };
      setResults([...updatedResults]);

      try {
        // Convert file to base64
        const base64 = await fileToBase64(file);

        // Extract text
        const { data, error } = await extractText(base64, apiKey, file.type);

        if (error) {
          updatedResults[i] = {
            ...updatedResults[i],
            status: "error",
            error: error.message,
          };
          toast.error(`${file.name}: ${error.message}`);
        } else if (data) {
          updatedResults[i] = {
            ...updatedResults[i],
            status: "success",
            extractedText: data.text,
            tokensUsed: data.tokensUsed,
          };
          toast.success(`${file.name}: Text extracted successfully`);
        }
      } catch (error) {
        updatedResults[i] = {
          ...updatedResults[i],
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
        toast.error(`${file.name}: Processing failed`);
      }

      setResults([...updatedResults]);

      // Small delay between requests to avoid rate limiting
      if (i < files.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsProcessing(false);
    setCurrentIndex(files.length);

    // Check if all succeeded
    const successCount = updatedResults.filter((r) => r.status === "success").length;
    if (successCount === files.length) {
      toast.success(`All ${files.length} files processed successfully!`);
    } else {
      toast.info(`Completed: ${successCount} succeeded, ${files.length - successCount} failed`);
    }
  };

  const handleDownloadZip = async () => {
    const successfulResults = results.filter((r) => r.status === "success");

    if (successfulResults.length === 0) {
      toast.error("No successful extractions to download");
      return;
    }

    try {
      const zip = new JSZip();

      successfulResults.forEach((result) => {
        // Convert filename: "document.pdf" → "document.txt"
        const txtFilename = result.filename.replace(/\.[^.]+$/, ".txt");
        zip.file(txtFilename, result.extractedText || "");
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const timestamp = new Date().toISOString().split("T")[0];
      saveAs(blob, `ocr-results-${timestamp}.zip`);

      toast.success(`Downloaded ${successfulResults.length} files as ZIP`);
    } catch (error) {
      toast.error("Failed to generate ZIP file");
      console.error("ZIP generation error:", error);
    }
  };

  const copyToClipboard = async (text: string, filename: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${filename}: Copied to clipboard`);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const retryFailed = async () => {
    const failedIndices = results
      .map((r, i) => (r.status === "error" ? i : -1))
      .filter((i) => i !== -1);

    if (failedIndices.length === 0) {
      toast.info("No failed files to retry");
      return;
    }

    setIsProcessing(true);
    const updatedResults = [...results];

    for (const i of failedIndices) {
      setCurrentIndex(i);
      const file = files[i];

      updatedResults[i] = { ...updatedResults[i], status: "processing", error: undefined };
      setResults([...updatedResults]);

      try {
        const base64 = await fileToBase64(file);
        const { data, error } = await extractText(base64, apiKey, file.type);

        if (error) {
          updatedResults[i] = { ...updatedResults[i], status: "error", error: error.message };
        } else if (data) {
          updatedResults[i] = {
            ...updatedResults[i],
            status: "success",
            extractedText: data.text,
            tokensUsed: data.tokensUsed,
          };
        }
      } catch (error) {
        updatedResults[i] = {
          ...updatedResults[i],
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }

      setResults([...updatedResults]);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsProcessing(false);
    toast.success("Retry completed");
  };

  const progressPercentage = ((currentIndex + 1) / files.length) * 100;
  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;
  const allComplete = results.every((r) => r.status === "success" || r.status === "error");

  const getStatusBadge = (status: FileResult["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "processing":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case "success":
        return (
          <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            Done
          </Badge>
        );
      case "error":
        return (
          <Badge variant="secondary" className="gap-1 bg-red-500/10 text-red-600 dark:text-red-400">
            <XCircle className="h-3 w-3" />
            Error
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Batch Processing</h2>
          <p className="text-sm text-muted-foreground">
            {files.length} file{files.length > 1 ? "s" : ""} queued
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isProcessing && !allComplete && (
            <Button onClick={processFiles} className="gap-2">
              <FileText className="h-4 w-4" />
              Start Processing
            </Button>
          )}
          {allComplete && successCount > 0 && (
            <Button onClick={handleDownloadZip} className="gap-2">
              <Download className="h-4 w-4" />
              Download All ({successCount})
            </Button>
          )}
          {allComplete && errorCount > 0 && (
            <Button variant="outline" onClick={retryFailed} className="gap-2">
              Retry Failed ({errorCount})
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  Processing {currentIndex + 1} of {files.length}...
                </span>
                <span className="text-muted-foreground">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} />
              <p className="text-xs text-muted-foreground">
                {results[currentIndex]?.filename}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={`${result.filename}-${index}`}
                className="flex flex-col gap-2 rounded-lg border p-3 hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{result.filename}</p>
                    {result.error && (
                      <p className="text-xs text-red-600 dark:text-red-400">{result.error}</p>
                    )}
                    {result.tokensUsed && (
                      <p className="text-xs text-muted-foreground">
                        {result.tokensUsed.toLocaleString()} tokens
                      </p>
                    )}
                  </div>
                  {getStatusBadge(result.status)}
                  {result.status === "success" && result.extractedText && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => copyToClipboard(result.extractedText!, result.filename)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {allComplete && (
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span>
              {successCount} succeeded
            </span>
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span>
                {errorCount} failed
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
