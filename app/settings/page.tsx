"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { saveApiKey, getApiKey, deleteApiKey } from "@/lib/api-key-service";
import { maskApiKey, validateApiKeyFormat } from "@/lib/encryption";
import { Loader2, Eye, EyeOff, Trash2, Check } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [apiKey, setApiKey] = useState("");
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user?.id) {
      loadApiKey();
    }
  }, [session?.user?.id]);

  const loadApiKey = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    const { apiKey: existingKey, error } = await getApiKey(session.user.id);

    if (error) {
      toast.error("Failed to load API key");
    } else if (existingKey) {
      setApiKey(existingKey);
      setMaskedKey(maskApiKey(existingKey));
      setHasExistingKey(true);
    }
    setIsLoading(false);
  };

  const handleSaveApiKey = async () => {
    if (!session?.user?.id) return;

    const keyToSave = newApiKey || apiKey;

    if (!keyToSave.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    if (!validateApiKeyFormat(keyToSave)) {
      toast.error("Invalid API key format. Key must be at least 20 characters and contain only alphanumeric characters, underscores, or hyphens");
      return;
    }

    setIsLoading(true);
    const { success, error } = await saveApiKey(session.user.id, keyToSave);

    if (success) {
      toast.success("API key saved successfully!");
      setApiKey(keyToSave);
      setMaskedKey(maskApiKey(keyToSave));
      setNewApiKey("");
      setHasExistingKey(true);
      setShowApiKey(false);
    } else {
      toast.error(error || "Failed to save API key");
    }
    setIsLoading(false);
  };

  const handleTestApiKey = async () => {
    if (!apiKey) {
      toast.error("No API key to test");
      return;
    }

    setIsTesting(true);
    try {
      // Make a simple test request to DeepInfra
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
                content: [{ type: "text", text: "Test connection" }],
              },
            ],
            max_tokens: 10,
          }),
        }
      );

      if (response.ok) {
        toast.success("API key is valid and working!");
      } else if (response.status === 401) {
        toast.error("API key is invalid or expired");
      } else {
        toast.error(`API test failed with status: ${response.status}`);
      }
    } catch (error) {
      toast.error("Failed to test API key. Check your connection.");
      console.error("API test error:", error);
    } finally {
      setIsTesting(false);
    }
  };

  const handleDeleteApiKey = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    const { success, error } = await deleteApiKey(session.user.id);

    if (success) {
      toast.success("API key deleted");
      setApiKey("");
      setMaskedKey(null);
      setNewApiKey("");
      setHasExistingKey(false);
    } else {
      toast.error(error || "Failed to delete API key");
    }
    setIsLoading(false);
  };

  if (isPending || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="container mx-auto max-w-2xl p-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your DeepInfra API key for OCR processing
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>DeepInfra API Key</CardTitle>
          <CardDescription>
            Your API key is encrypted and stored securely. Get your API key from{" "}
            <a
              href="https://deepinfra.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              DeepInfra
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasExistingKey && (
            <div className="space-y-2">
              <Label>Current API Key</Label>
              <div className="flex gap-2">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={showApiKey ? apiKey : maskedKey || ""}
                  readOnly
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newApiKey">
              {hasExistingKey ? "Update API Key" : "Enter API Key"}
            </Label>
            <Input
              id="newApiKey"
              type="text"
              placeholder="Enter your DeepInfra API key"
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              className="font-mono"
            />
            <p className="text-sm text-muted-foreground">
              Get your API key from the DeepInfra dashboard
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button onClick={handleSaveApiKey} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {hasExistingKey ? "Update Key" : "Save Key"}
          </Button>

          {hasExistingKey && (
            <>
              <Button
                variant="outline"
                onClick={handleTestApiKey}
                disabled={isTesting || !apiKey}
              >
                {isTesting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Test API Key
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isLoading}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Key
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete your API key? You won&apos;t be
                      able to process documents until you add a new key.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteApiKey}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </CardFooter>
      </Card>

      <div className="mt-4">
        <Button variant="ghost" onClick={() => router.push("/")}>
          ← Back to Home
        </Button>
      </div>
    </div>
  );
}
