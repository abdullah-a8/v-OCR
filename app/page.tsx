"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { getApiKey } from "@/lib/api-key-service";
import { extractText, fileToBase64, validateFile } from "@/lib/deepseek-client";
import { pdfToImages, isPDF } from "@/lib/pdf-utils";
import { OCRUploader } from "@/components/ocr-uploader";
import { CapturePreviewModal } from "@/components/capture-preview-modal";
import { OCRPreview } from "@/components/ocr-preview";
import { ProcessingOverlay } from "@/components/processing-overlay";
import { BatchProcessor } from "@/components/batch-processor";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

type ViewMode = "upload" | "processing" | "single-preview" | "batch-processing";

interface ProcessingState {
  fileName: string;
  filePreview?: string;
  currentStep: string;
  currentPage?: number;
  totalPages?: number;
}

export default function Page() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoadingKey, setIsLoadingKey] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("upload");
  const [processingState, setProcessingState] = useState<ProcessingState | null>(null);
  const [singleResult, setSingleResult] = useState<{
    text: string;
    tokens: number;
    fileName: string;
    filePreview?: string;
  } | null>(null);
  const [showNoKeyDialog, setShowNoKeyDialog] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

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

  const handleCameraCapture = (file: File) => {
    // Validate file using existing validateFile function
    const validation = validateFile(file);

    if (!validation.valid) {
      toast.error(validation.error || "Invalid file");
      return;
    }

    // Store temporarily and show preview
    setCapturedFile(file);
    setShowPreviewModal(true);
  };

  const handleConfirmCapture = () => {
    if (capturedFile) {
      setFiles((prev) => [...prev, capturedFile]);
      toast.success("Photo added!");
    }
    setShowPreviewModal(false);
    setCapturedFile(null);
  };

  const handleRetakeCapture = () => {
    setShowPreviewModal(false);
    setCapturedFile(null);
    // Camera will re-trigger when user clicks button again
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setCapturedFile(null);
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

    // Single file: show processing overlay then preview
    if (files.length === 1) {
      await processSingleFile(files[0]);
    } else {
      // Multiple files: show batch processor
      setViewMode("batch-processing");
    }
  };

  const processSingleFile = async (file: File) => {
    if (!apiKey) return;

    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);

    // Set initial processing state
    setViewMode("processing");
    setProcessingState({
      fileName: file.name,
      currentStep: "Preparing file...",
    });

    try {
      let allText = "";
      let totalTokens = 0;
      let filePreview: string | undefined;

      if (isPDF(file)) {
        // Update state for PDF conversion
        setProcessingState((prev) => ({
          ...prev!,
          currentStep: "Converting PDF to images...",
        }));

        const pages = await pdfToImages(file);

        // Set preview from first page
        if (pages.length > 0) {
          filePreview = `data:image/png;base64,${pages[0].imageBase64}`;
          setProcessingState((prev) => ({
            ...prev!,
            filePreview,
            totalPages: pages.length,
            currentPage: 0,
          }));
        }

        for (let i = 0; i < pages.length; i++) {
          // Check if cancelled
          if (controller.signal.aborted) {
            return;
          }

          const page = pages[i];

          setProcessingState((prev) => ({
            ...prev!,
            currentStep: `Extracting text from page ${i + 1}...`,
            currentPage: i + 1,
          }));

          const { data, error } = await extractText(
            page.imageBase64,
            apiKey,
            "image/png"
          );

          if (error) {
            toast.error(`Error on page ${i + 1}: ${error.message}`);
            if (error.type === "invalid_key") {
              setShowNoKeyDialog(true);
              handleReset();
              return;
            }
          } else if (data) {
            // Add page separator for multi-page PDFs
            if (pages.length > 1 && i > 0) {
              allText += `\n\n---\n\n## Page ${i + 1}\n\n`;
            } else if (pages.length > 1) {
              allText += `## Page 1\n\n`;
            }
            allText += data.text;
            totalTokens += data.tokensUsed;
          }
        }
      } else {
        // Regular image processing
        setProcessingState((prev) => ({
          ...prev!,
          currentStep: "Reading image...",
        }));

        const base64 = await fileToBase64(file);
        filePreview = `data:${file.type};base64,${base64}`;

        setProcessingState((prev) => ({
          ...prev!,
          filePreview,
          currentStep: "Analyzing document...",
        }));

        // Check if cancelled
        if (controller.signal.aborted) {
          return;
        }

        setProcessingState((prev) => ({
          ...prev!,
          currentStep: "Extracting text with AI...",
        }));

        const { data, error } = await extractText(base64, apiKey, file.type);

        if (error) {
          toast.error(`Error: ${error.message}`);
          if (error.type === "invalid_key") {
            setShowNoKeyDialog(true);
          }
          handleReset();
          return;
        } else if (data) {
          allText = data.text;
          totalTokens = data.tokensUsed;
        }
      }

      if (allText) {
        setSingleResult({
          text: allText,
          tokens: totalTokens,
          fileName: file.name,
          filePreview,
        });
        setViewMode("single-preview");
        toast.success("Text extracted successfully!");
      } else {
        toast.error("No text could be extracted");
        handleReset();
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error("Failed to process file");
        console.error("Processing error:", error);
      }
      handleReset();
    } finally {
      setAbortController(null);
      setProcessingState(null);
    }
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
    }
    toast.info("Processing cancelled");
    handleReset();
  };

  const handleReset = () => {
    setFiles([]);
    setViewMode("upload");
    setSingleResult(null);
    setProcessingState(null);
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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b shrink-0">
        <div className="container mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">vOCR</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/settings">
              <UserAvatar
                name={session.user.name}
                email={session.user.email}
                image={session.user.image}
                size="sm"
                className="cursor-pointer hover:ring-primary/50 transition-all"
              />
            </Link>
          </div>
        </div>
      </header>

      {/* Main content - centered vertically on mobile */}
      <main className="flex-1 flex items-center justify-center p-4">
        {viewMode === "upload" && (
          <div className="w-full max-w-2xl space-y-8">
            {/* Hero text - simple and friendly */}
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Scan & Extract
              </h2>
              <p className="text-lg text-muted-foreground">
                Drop your documents, get clean text
              </p>
            </div>

            <OCRUploader
              onFilesSelected={handleFilesSelected}
              onCameraCapture={handleCameraCapture}
            />

            {files.length > 0 && (
              <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                <Button
                  size="lg"
                  onClick={handleExtractText}
                  className="gap-2 text-base px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <Sparkles className="h-5 w-5" />
                  {files.length === 1 ? "Extract Text" : `Extract from ${files.length} files`}
                </Button>
              </div>
            )}
          </div>
        )}

        {viewMode === "processing" && processingState && (
          <ProcessingOverlay
            fileName={processingState.fileName}
            filePreview={processingState.filePreview}
            currentStep={processingState.currentStep}
            currentPage={processingState.currentPage}
            totalPages={processingState.totalPages}
            onCancel={handleCancel}
          />
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

      <CapturePreviewModal
        file={capturedFile}
        isOpen={showPreviewModal}
        onRetake={handleRetakeCapture}
        onConfirm={handleConfirmCapture}
        onClose={handleClosePreview}
      />
    </div>
  );
}
