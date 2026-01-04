"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { getApiKey } from "@/lib/api-key-service";
import { extractText, fileToBase64 } from "@/lib/deepseek-client";
import { OCRUploader } from "@/components/ocr-uploader";
import { OCRPreview } from "@/components/ocr-preview";
import { BatchProcessor } from "@/components/batch-processor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Settings, Loader2, Sparkles, LogOut } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";

type ViewMode = "upload" | "single-preview" | "batch-processing";

export default function Page() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoadingKey, setIsLoadingKey] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [singleResult, setSingleResult] = useState<{
    text: string;
    tokens: number;
    fileName: string;
    filePreview?: string;
  } | null>(null);
  const [showNoKeyDialog, setShowNoKeyDialog] = useState(false);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin");
    }
  }, [session, isPending, router]);

  // Load API key
  useEffect(() => {
    if (session?.user?.id) {
      loadApiKey();
    }
  }, [session?.user?.id]);

  const loadApiKey = async () => {
    if (!session?.user?.id) return;

    setIsLoadingKey(true);
    const { apiKey: key, error } = await getApiKey(session.user.id);

    if (error) {
      toast.error("Failed to load API key");
    } else if (!key) {
      setShowNoKeyDialog(true);
    } else {
      setApiKey(key);
    }
    setIsLoadingKey(false);
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
  };

  const handleExtractText = async () => {
    if (!apiKey) {
      toast.error("Please add your API key in Settings");
      setShowNoKeyDialog(true);
      return;
    }

    if (files.length === 0) {
      toast.error("Please upload at least one file");
      return;
    }

    // Single file: show preview
    if (files.length === 1) {
      await processSingleFile(files[0]);
    } else {
      // Multiple files: show batch processor
      setViewMode("batch-processing");
    }
  };

  const processSingleFile = async (file: File) => {
    if (!apiKey) return;

    setIsProcessing(true);

    try {
      // Convert to base64
      const base64 = await fileToBase64(file);
      const filePreview = file.type.startsWith("image/")
        ? `data:${file.type};base64,${base64}`
        : undefined;

      // Extract text
      const { data, error } = await extractText(base64, apiKey, file.type);

      if (error) {
        toast.error(`Error: ${error.message}`);
        if (error.type === "invalid_key") {
          setShowNoKeyDialog(true);
        }
      } else if (data) {
        setSingleResult({
          text: data.text,
          tokens: data.tokensUsed,
          fileName: file.name,
          filePreview,
        });
        setViewMode("single-preview");
        toast.success("Text extracted successfully!");
      }
    } catch (error) {
      toast.error("Failed to process file");
      console.error("Processing error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setViewMode("upload");
    setSingleResult(null);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/signin");
  };

  if (isPending || isLoadingKey) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">vOCR</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {session.user.email}
            </span>
            <Link href="/settings">
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto p-4 py-8">
        {viewMode === "upload" && (
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold">Extract Text from Documents</h2>
              <p className="mt-2 text-muted-foreground">
                Upload images or PDFs to extract text using DeepSeek OCR
              </p>
            </div>

            <OCRUploader onFilesSelected={handleFilesSelected} />

            {files.length > 0 && (
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={handleExtractText}
                  disabled={isProcessing}
                  className="gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Extract Text ({files.length})
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {viewMode === "single-preview" && singleResult && (
          <div className="mx-auto max-w-6xl">
            <OCRPreview
              fileName={singleResult.fileName}
              extractedText={singleResult.text}
              filePreview={singleResult.filePreview}
              tokensUsed={singleResult.tokens}
              onClose={handleReset}
            />
          </div>
        )}

        {viewMode === "batch-processing" && files.length > 1 && apiKey && (
          <div className="mx-auto max-w-4xl">
            <BatchProcessor files={files} apiKey={apiKey} onComplete={handleReset} />
            <div className="mt-4">
              <Button variant="outline" onClick={handleReset}>
                ← Start Over
              </Button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {viewMode === "upload" && files.length === 0 && (
          <div className="mx-auto mt-12 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Welcome to vOCR</CardTitle>
                <CardDescription>
                  Here&apos;s what you can do with this tool:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                    1
                  </div>
                  <div>
                    <strong>Upload Documents:</strong> Drag and drop or browse for images (JPG, PNG, WebP) or PDFs
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                    2
                  </div>
                  <div>
                    <strong>Extract Text:</strong> Our AI-powered OCR will extract all text while preserving formatting
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                    3
                  </div>
                  <div>
                    <strong>Copy or Download:</strong> Single files show a beautiful preview, multiple files can be downloaded as a ZIP
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* No API Key Dialog */}
      <AlertDialog open={showNoKeyDialog} onOpenChange={setShowNoKeyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>API Key Required</AlertDialogTitle>
            <AlertDialogDescription>
              You need to add your DeepInfra API key to use OCR features. Get your free API key from DeepInfra and add it in Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push("/settings")}>
              Go to Settings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
