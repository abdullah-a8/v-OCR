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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { saveApiKey, getApiKey, deleteApiKey } from "@/lib/api-key-service";
import { maskApiKey, validateApiKeyFormat } from "@/lib/encryption";
import { Loader2, Eye, EyeOff, Trash2, Pencil, X, ArrowLeft, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { UserAvatar } from "@/components/user-avatar";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [apiKey, setApiKey] = useState("");
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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

    setIsPageLoading(true);
    const { apiKey: existingKey, error } = await getApiKey(session.user.id);

    if (error) {
      toast.error("Failed to load API key");
    } else if (existingKey) {
      setApiKey(existingKey);
      setMaskedKey(maskApiKey(existingKey));
      setHasExistingKey(true);
    }
    setIsPageLoading(false);
  };

  const handleStartEdit = () => {
    setEditValue(apiKey);
    setIsEditing(true);
    setShowApiKey(true);
  };

  const handleCancelEdit = () => {
    setEditValue("");
    setIsEditing(false);
    setShowApiKey(false);
  };

  const handleSaveApiKey = async () => {
    if (!session?.user?.id) return;

    const keyToSave = isEditing ? editValue : editValue;

    if (!keyToSave.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    if (!validateApiKeyFormat(keyToSave)) {
      toast.error("Invalid format. Key must be at least 20 characters.");
      return;
    }

    setIsLoading(true);
    const { success, error } = await saveApiKey(session.user.id, keyToSave);

    if (success) {
      toast.success("API key saved!");
      setApiKey(keyToSave);
      setMaskedKey(maskApiKey(keyToSave));
      setEditValue("");
      setHasExistingKey(true);
      setIsEditing(false);
      setShowApiKey(false);
    } else {
      toast.error(error || "Failed to save API key");
    }
    setIsLoading(false);
  };

  const handleTestApiKey = async () => {
    const keyToTest = isEditing ? editValue : apiKey;

    if (!keyToTest) {
      toast.error("No API key to test");
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(
        "https://api.deepinfra.com/v1/openai/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${keyToTest}`,
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
        toast.success("API key is valid!");
      } else if (response.status === 401) {
        toast.error("API key is invalid or expired");
      } else {
        toast.error(`Test failed: ${response.status}`);
      }
    } catch (error) {
      toast.error("Connection failed");
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
      setEditValue("");
      setHasExistingKey(false);
      setIsEditing(false);
    } else {
      toast.error(error || "Failed to delete API key");
    }
    setIsLoading(false);
  };

  if (isPending || isPageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen">
      {/* Header with back button */}
      <header className="border-b">
        <div className="container mx-auto flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your API key
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto max-w-lg p-4 py-8 space-y-6">
        {/* API Key Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">DeepInfra API Key</CardTitle>
            <CardDescription>
              Get your API key from{" "}
              <a
                href="https://deepinfra.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                DeepInfra
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing key: View/Edit mode */}
            {hasExistingKey && !isEditing ? (
              <div className="space-y-3">
                <Label>Your API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={showApiKey ? apiKey : maskedKey || ""}
                    readOnly
                    className="font-mono bg-muted"
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
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleStartEdit}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>

                {/* Test button - full width on mobile */}
                <Button
                  variant="outline"
                  onClick={handleTestApiKey}
                  disabled={isTesting}
                  className="w-full"
                >
                  {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Test Connection
                </Button>
              </div>
            ) : (
              /* Edit mode or new key entry */
              <div className="space-y-3">
                <Label htmlFor="apiKey">
                  {hasExistingKey ? "Edit API Key" : "Enter API Key"}
                </Label>
                <Input
                  id="apiKey"
                  type="text"
                  placeholder="Enter your DeepInfra API key"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="font-mono"
                  autoFocus
                />

                {/* Action buttons - stacked on mobile */}
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
                  <Button
                    onClick={handleSaveApiKey}
                    disabled={isLoading || !editValue.trim()}
                    className="w-full sm:flex-1"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {hasExistingKey ? "Save Changes" : "Save Key"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleTestApiKey}
                    disabled={isTesting || !editValue.trim()}
                    className="w-full sm:flex-1"
                  >
                    {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Test
                  </Button>

                  {hasExistingKey && (
                    <Button
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="w-full sm:w-auto"
                    >
                      <X className="mr-2 h-4 w-4 sm:mr-0" />
                      <span className="sm:hidden">Cancel</span>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone - Only shown when key exists */}
        {hasExistingKey && (
          <Card className="border-destructive/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Permanently delete your API key
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground w-full sm:w-auto"
                      disabled={isLoading}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Key
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You won&apos;t be able to process documents until you add a new key.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteApiKey}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={session.user.name}
                  email={session.user.email}
                  image={session.user.image}
                  size="md"
                />
                <div className="min-w-0">
                  {session.user.name && (
                    <p className="font-medium truncate">{session.user.name}</p>
                  )}
                  <p className="text-sm text-muted-foreground truncate">
                    {session.user.email}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  await signOut();
                  router.push("/auth/signin");
                }}
                className="w-full sm:w-auto"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
