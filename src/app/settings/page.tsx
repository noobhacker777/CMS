
"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Upload, Settings, Info, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function SettingsPage() {
  const { toast } = useToast()
  const [pythonServerUrl, setPythonServerUrl] = React.useState("")
  const [isBackingUp, setIsBackingUp] = React.useState(false)
  const [isRestoring, setIsRestoring] = React.useState(false)
  const [restoreFile, setRestoreFile] = React.useState<File | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const url = `${window.location.protocol}//${window.location.hostname}:5000`
      setPythonServerUrl(url)
    }
  }, [])

  const handleBackup = async () => {
    if (!pythonServerUrl) {
      toast({ variant: "destructive", title: "Server URL not found" })
      return
    }
    setIsBackingUp(true)
    setError(null)
    try {
      const response = await fetch(`${pythonServerUrl}/api/backup`)
      if (!response.ok) {
        throw new Error("Failed to start backup.")
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "media_backup.zip"
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      toast({
        title: "Backup Successful!",
        description: "Your media folder has been downloaded as a zip file.",
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
    if (file && file.type === "application/zip") {
      setRestoreFile(file)
      setError(null)
    } else {
      setRestoreFile(null)
      setError("Please select a valid .zip file.")
    }
  }

  const handleRestore = async () => {
    if (!restoreFile || !pythonServerUrl) {
      toast({
        variant: "destructive",
        title: "Restore Failed",
        description: "Please select a zip file to restore.",
      })
      return
    }

    setIsRestoring(true)
    setError(null)
    const formData = new FormData()
    formData.append("file", restoreFile)

    try {
      const response = await fetch(`${pythonServerUrl}/api/restore`, {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to restore files.")
      }
      
      toast({
        title: "Restore Successful!",
        description: "Your files have been restored to the media folder.",
      })
      setRestoreFile(null)

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
      toast({
        variant: "destructive",
        title: "Restore Failed",
        description: err.message,
      })
    } finally {
      setIsRestoring(false)
    }
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
            <p className="text-muted-foreground">Manage your application data.</p>
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
            <CardTitle>Backup</CardTitle>
            <CardDescription>
              Download a zip archive of all files currently in your `media` folder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button onClick={handleBackup} disabled={isBackingUp || !pythonServerUrl}>
                <Download className="mr-2" />
                {isBackingUp ? "Backing up..." : "Create and Download Backup"}
              </Button>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This process may take a few moments depending on the size of your media library.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Restore</CardTitle>
            <CardDescription>
              Upload a zip archive to restore your `media` folder. Existing files with the same name will be overwritten.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Input
                type="file"
                accept=".zip,application/zip"
                onChange={handleFileChange}
                className="max-w-xs file:text-primary"
                disabled={isRestoring || !pythonServerUrl}
              />
              <Button onClick={handleRestore} disabled={!restoreFile || isRestoring || !pythonServerUrl}>
                <Upload className="mr-2" />
                {isRestoring ? "Restoring..." : "Restore from Backup"}
              </Button>
            </div>
             {!pythonServerUrl && (
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Cannot perform action: Python server URL is not configured.
                    </AlertDescription>
                </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
