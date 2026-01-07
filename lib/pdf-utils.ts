"use client";

export interface PDFPage {
  pageNumber: number;
  imageBase64: string;
  width: number;
  height: number;
}

/**
 * Check if a file is a PDF
 */
export function isPDF(file: File): boolean {
  return file.type === "application/pdf";
}

/**
 * Convert a PDF file to an array of PNG images (one per page)
 * Uses dynamic import to avoid SSR issues with pdf.js
 * @param file - The PDF file to convert
 * @param scale - Scale factor for rendering (default 2 for good quality)
 * @returns Array of base64-encoded PNG images
 */
export async function pdfToImages(
  file: File,
  scale: number = 2
): Promise<PDFPage[]> {
  // Dynamic import to ensure pdf.js only loads in browser
  const pdfjsLib = await import("pdfjs-dist");

  // Use local worker from node_modules (bundled by Next.js)
  // Disable worker to avoid CORS/loading issues - runs in main thread
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: PDFPage[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    // Create canvas for rendering
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Failed to get canvas context");
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render PDF page to canvas
    await page.render({
      canvasContext: context,
      viewport,
      canvas,
    }).promise;

    // Convert canvas to base64 PNG (remove data:image/png;base64, prefix)
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];

    pages.push({
      pageNumber: i,
      imageBase64: base64,
      width: viewport.width,
      height: viewport.height,
    });
  }

  return pages;
}
