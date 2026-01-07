"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Sparkles, X } from "lucide-react";

interface ProcessingOverlayProps {
    fileName: string;
    filePreview?: string;
    currentStep: string;
    currentPage?: number;
    totalPages?: number;
    onCancel?: () => void;
}

export function ProcessingOverlay({
    fileName,
    filePreview,
    currentStep,
    currentPage,
    totalPages,
    onCancel,
}: ProcessingOverlayProps) {
    const [dots, setDots] = useState("");

    // Animated dots for "Processing..."
    useEffect(() => {
        const interval = setInterval(() => {
            setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
        }, 400);
        return () => clearInterval(interval);
    }, []);

    // Calculate progress percentage
    const progress = totalPages && currentPage
        ? Math.round((currentPage / totalPages) * 100)
        : null;

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="rounded-full bg-primary/10 p-3">
                            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                        </div>
                        {/* Spinning ring */}
                        <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold">Extracting Text{dots}</h2>
                        <p className="text-sm text-muted-foreground">{currentStep}</p>
                    </div>
                </div>
                {onCancel && (
                    <Button variant="ghost" size="icon" onClick={onCancel}>
                        <X className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {/* Progress bar for multi-page PDFs */}
            {progress !== null && totalPages && totalPages > 1 && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </span>
                        <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            )}

            {/* Main content - skeleton preview */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Left: Image preview with overlay */}
                <Card className="overflow-hidden">
                    <CardContent className="p-0 relative">
                        {filePreview ? (
                            <div className="relative">
                                <img
                                    src={filePreview}
                                    alt={fileName}
                                    className="w-full h-auto object-contain opacity-50"
                                    style={{ maxHeight: "400px" }}
                                />
                                {/* Scanning line animation */}
                                <div
                                    className="absolute left-0 right-0 h-1 bg-primary/50 animate-[scan_2s_ease-in-out_infinite]"
                                    style={{
                                        boxShadow: "0 0 20px 10px rgba(var(--primary), 0.3)",
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="p-6 space-y-3">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                                <Skeleton className="h-48 w-full" />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right: Skeleton text output */}
                <Card>
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Skeleton className="h-4 w-4 rounded-full" />
                            <Skeleton className="h-4 w-24" />
                        </div>

                        {/* Simulated text lines with staggered appearance */}
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-full" style={{ animationDelay: "0ms" }} />
                            <Skeleton className="h-4 w-[90%]" style={{ animationDelay: "100ms" }} />
                            <Skeleton className="h-4 w-[95%]" style={{ animationDelay: "200ms" }} />
                            <Skeleton className="h-4 w-[80%]" style={{ animationDelay: "300ms" }} />
                            <Skeleton className="h-4 w-[85%]" style={{ animationDelay: "400ms" }} />
                            <Skeleton className="h-4 w-[70%]" style={{ animationDelay: "500ms" }} />
                        </div>

                        <div className="h-4" />

                        {/* Second paragraph skeleton */}
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-[88%]" style={{ animationDelay: "600ms" }} />
                            <Skeleton className="h-4 w-full" style={{ animationDelay: "700ms" }} />
                            <Skeleton className="h-4 w-[92%]" style={{ animationDelay: "800ms" }} />
                            <Skeleton className="h-4 w-[60%]" style={{ animationDelay: "900ms" }} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* File info */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="truncate max-w-[200px]">{fileName}</span>
            </div>
        </div>
    );
}
