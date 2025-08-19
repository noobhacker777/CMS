
"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Upload, Settings, Info, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Define the structure of our settings file
interface AppSettings {
  dashboardImage?: string | null;
  dashboardAreas?: string | null;
  version: number;
}

export default function SettingsPage() {
  const { toast } = useToast()
  const [isBackingUp, setIsBackingUp] = React.useState(false)
  const [isRestoring, setIsRestoring] = React.useState(false)
  const [restoreFile, setRestoreFile] = React.useState<File | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  
  const settingsToBackup: (keyof Storage)[] = ["dashboardImage", "dashboardAreas"];

  const handleBackup = async () => {
    setIsBackingUp(true)
    setError(null)
    try {
      const settings: Partial<AppSettings> = {
        version: 1
      };
      
      settingsToBackup.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
            (settings as any)[key] = value;
        }
      });

      if (Object.keys(settings).length <= 1) {
        toast({
            variant: "destructive",
            title: "No Settings Found",
            description: "There are no settings to back up.",
        });
        setIsBackingUp(false);
        return;
      }

      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "local-linker-settings.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Backup Successful!",
        description: "Your application settings have been downloaded.",
      })
    } catch (err: any) {
      setError(err.message || "An error occurred during backup.")
      toast({
        variant: "destructive",
        title: "Backup Failed",
        description: err.message || "Could not create backup.",
      })
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "application/json") {
      setRestoreFile(file)
      setError(null)
    } else {
      setRestoreFile(null)
      setError("Please select a valid .json file.")
    }
  }

  const handleRestore = async () => {
    if (!restoreFile) {
      toast({
        variant: "destructive",
        title: "Restore Failed",
        description: "Please select a settings file to restore.",
      })
      return
    }

    setIsRestoring(true)
    setError(null)
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target?.result;
            if (typeof content !== 'string') {
                throw new Error("Failed to read file content.");
            }
            const settings: AppSettings = JSON.parse(content);
            
            if (!settings.version || settings.version !== 1) {
                throw new Error("Invalid or unsupported settings file version.");
            }

            Object.keys(settings).forEach(key => {
                if (key !== 'version' && settingsToBackup.includes(key as keyof Storage)) {
                    localStorage.setItem(key, (settings as any)[key]);
                }
            });

            toast({
                title: "Restore Successful!",
                description: "Your settings have been restored. Reload the app to see changes.",
            });
            setRestoreFile(null);
            // Optionally, trigger a page reload or a state update in a shared context
            window.dispatchEvent(new Event("storage")); // This will trigger listeners on other tabs
            
        } catch (err: any) {
             setError(err.message || "An unexpected error occurred.")
              toast({
                variant: "destructive",
                title: "Restore Failed",
                description: err.message,
              })
        } finally {
            setIsRestoring(false);
        }
    };
    reader.onerror = () => {
        setError("Failed to read the selected file.");
        setIsRestoring(false);
    };
    reader.readAsText(restoreFile);
  }

  return (
    <div className="flex flex-1 items-start justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="flex items-center gap-4">
          <div className="bg-primary text-primary-foreground p-3 rounded-lg">
            <Settings className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-headline tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage your application settings.</p>
          </div>
        </div>

        {error && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Backup Settings</CardTitle>
            <CardDescription>
              Download a JSON file containing your application settings, like the dashboard image and annotations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button onClick={handleBackup} disabled={isBackingUp}>
                <Download className="mr-2" />
                {isBackingUp ? "Backing up..." : "Create and Download Backup"}
              </Button>
               <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This saves settings stored in your browser's local storage.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Restore Settings</CardTitle>
            <CardDescription>
              Upload a settings backup file (.json) to restore your application's configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Input
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="max-w-xs file:text-primary"
                disabled={isRestoring}
              />
              <Button onClick={handleRestore} disabled={!restoreFile || isRestoring}>
                <Upload className="mr-2" />
                {isRestoring ? "Restoring..." : "Restore from Backup"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
