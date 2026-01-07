"use client";

import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { validateFile } from "@/lib/deepseek-client";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface OCRUploaderProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
}

export function OCRUploader({ onFilesSelected, maxFiles = 10 }: OCRUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return;

      const fileArray = Array.from(newFiles);
      const validFiles: File[] = [];
      const errors: string[] = [];

      // Validate each file
      for (const file of fileArray) {
        const validation = validateFile(file);
        if (validation.valid) {
          validFiles.push(file);
        } else if (validation.error) {
          errors.push(validation.error);
        }
      }

      // Check total file count
      const totalFiles = files.length + validFiles.length;
      if (totalFiles > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed. Only added first ${maxFiles - files.length} files.`);
        validFiles.splice(maxFiles - files.length);
      }

      // Show errors
      errors.forEach((error) => toast.error(error));

      // Add valid files
      if (validFiles.length > 0) {
        const updatedFiles = [...files, ...validFiles];
        setFiles(updatedFiles);
        onFilesSelected(updatedFiles);
        toast.success(`${validFiles.length} file${validFiles.length > 1 ? "s" : ""} added`);
      }
    },
    [files, maxFiles, onFilesSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [handleFiles]
  );

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesSelected(updatedFiles);
    toast.info("File removed");
  };

  const clearAll = () => {
    setFiles([]);
    onFilesSelected([]);
    toast.info("All files cleared");
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone - entire area is clickable */}
      <label htmlFor="file-upload" className="block cursor-pointer">
        <Card
          className={`border-2 border-dashed transition-all ${isDragging
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
            }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className={`mb-4 rounded-full bg-primary/10 p-4 transition-transform ${isDragging ? "scale-110" : ""}`}>
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Upload Documents</h3>
            <p className="mb-2 text-sm text-muted-foreground">
              Drag and drop files here, or tap to browse
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP, PDF • Max 10MB
            </p>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              onChange={handleFileInput}
            />
          </CardContent>
        </Card>
      </label>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-medium">
                Uploaded Files ({files.length}/{maxFiles})
              </h4>
              {files.length > 1 && (
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  Clear All
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
                >
                  <div className="shrink-0">{getFileIcon(file)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {file.type.startsWith("image/") ? "Image" : "PDF"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeFile(index)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
