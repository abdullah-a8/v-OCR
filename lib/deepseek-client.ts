"use client";

/**
 * DeepSeek OCR Client Wrapper
 * Handles communication with DeepInfra API for OCR processing
 */

export interface OCRResponse {
  text: string;
  tokensUsed: number;
}

export interface OCRError {
  type: "invalid_key" | "rate_limit" | "network" | "timeout" | "server" | "unknown";
  message: string;
  retryAfter?: number; // seconds to wait before retry
}

/**
 * Prompt types for different OCR tasks
 * Based on official DeepSeek-OCR documentation
 */
export type OCRPromptType = "document" | "general" | "free" | "figure";

const OCR_PROMPTS: Record<OCRPromptType, string> = {
  // For documents - preserves layout, tables, markdown formatting (no grounding coordinates)
  document: "Convert the document to markdown.",
  // For general images with text (no grounding coordinates)
  general: "OCR this image.",
  // Plain text extraction without layout preservation
  free: "Free OCR.",
  // For figures and charts
  figure: "Parse the figure.",
};

export async function extractText(
  imageBase64: string,
  apiKey: string,
  mimeType: string = "image/jpeg",
  promptType: OCRPromptType = "document" // Rich markdown with tables/headers
): Promise<{ data?: OCRResponse; error?: OCRError }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for larger documents

    const response = await fetch(
      "https://api.deepinfra.com/v1/openai/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-ai/DeepSeek-OCR",
          messages: [
            {
              role: "user",
              content: [
                // Image MUST come before text per DeepInfra multimodal docs
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${imageBase64}`,
                  },
                },
                {
                  type: "text",
                  text: OCR_PROMPTS[promptType],
                },
              ],
            },
          ],
          temperature: 0.0,
          max_tokens: 4096, // Model context is 8192, leave room for input tokens
          frequency_penalty: 1.0, // Prevent repetition loops
          presence_penalty: 0.5,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    // Handle HTTP errors
    if (!response.ok) {
      return { error: await handleErrorResponse(response) };
    }

    const data = await response.json();

    // Extract text and token usage
    const extractedText = data.choices?.[0]?.message?.content || "";
    const tokensUsed = data.usage?.total_tokens || 0;

    return {
      data: {
        text: extractedText,
        tokensUsed,
      },
    };
  } catch (error) {
    return { error: handleException(error) };
  }
}

/**
 * Handle HTTP error responses
 */
async function handleErrorResponse(response: Response): Promise<OCRError> {
  const status = response.status;

  try {
    const errorData = await response.json();
    const errorMessage = errorData.error?.message || errorData.message || "Unknown error";

    switch (status) {
      case 401:
      case 403:
        return {
          type: "invalid_key",
          message: "Invalid API key. Please update your key in Settings.",
        };

      case 429:
        const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);
        return {
          type: "rate_limit",
          message: `Rate limit reached. Please wait ${retryAfter} seconds.`,
          retryAfter,
        };

      case 500:
      case 502:
      case 503:
        return {
          type: "server",
          message: "DeepInfra server error. Please try again later.",
        };

      default:
        return {
          type: "unknown",
          message: errorMessage,
        };
    }
  } catch {
    return {
      type: "unknown",
      message: `HTTP ${status} error occurred`,
    };
  }
}

/**
 * Handle exceptions (network errors, timeouts, etc.)
 */
function handleException(error: unknown): OCRError {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return {
        type: "timeout",
        message: "Request timed out. Try a smaller file or check your connection.",
      };
    }

    if (error.message.includes("fetch")) {
      return {
        type: "network",
        message: "Network error. Please check your internet connection.",
      };
    }

    return {
      type: "unknown",
      message: error.message,
    };
  }

  return {
    type: "unknown",
    message: "An unexpected error occurred",
  };
}

/**
 * Convert a File object to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Validate file before processing
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ACCEPTED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `${file.name}: Format not supported. Use JPG, PNG, WebP, or PDF.`,
    };
  }

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `${file.name}: File exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB).`,
    };
  }

  return { valid: true };
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
