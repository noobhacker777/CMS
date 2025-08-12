"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Folder, FileText, Copy, RefreshCw, AlertCircle, Server } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from '@/components/ui/separator';

const SERVER_URL = 'http://localhost:5000';

export function LocalLinker() {
    const [folderPath, setFolderPath] = useState('');
    const [files, setFiles] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchFiles = async () => {
        if (!folderPath) {
            setError("Please provide a folder path.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setFiles([]);

        try {
            const response = await fetch(`${SERVER_URL}/api/files?path=${encodeURIComponent(folderPath)}`);
            if (!response.ok) {
                let errorMessage = `Error: ${response.status} ${response.statusText}. Ensure the backend is running and the path is correct.`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (e) {
                    // Response was not JSON
                }
                throw new Error(errorMessage);
            }
            const data: string[] = await response.json();
            setFiles(data);
            if (data.length === 0) {
                 toast({
                    title: "Directory is empty",
                    description: "No files found in the specified path.",
                });
            }
        } catch (e: any) {
            setError(e.message || 'Failed to connect to the backend server. Is it running?');
            setFiles([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (filename: string) => {
        const encodedFilename = filename.split('/').map(part => encodeURIComponent(part)).join('/');
        const link = `${SERVER_URL}/media/${encodedFilename}`;
        navigator.clipboard.writeText(link);
        toast({
            title: "Link Copied!",
            description: <p className="truncate">{link}</p>,
        });
    };

    return (
        <Card className="w-full max-w-2xl shadow-2xl shadow-primary/10">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="bg-primary text-primary-foreground p-3 rounded-lg">
                        <Server className="h-8 w-8" />
                    </div>
                    <div>
                        <CardTitle className="text-3xl font-headline tracking-tight">Local Linker</CardTitle>
                        <CardDescription>Browse and generate links to your local files.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="folderPath" className="text-sm font-medium text-muted-foreground">Media Folder Path</label>
                        <div className="flex gap-2">
                            <Input
                                id="folderPath"
                                value={folderPath}
                                onChange={(e) => setFolderPath(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchFiles()}
                                placeholder="e.g., /Users/YourUser/Videos"
                                className="font-code"
                            />
                            <Button onClick={fetchFiles} disabled={isLoading}>
                                {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Folder className="mr-2 h-4 w-4" />}
                                Load Files
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Available Files</h3>
                        <div className="border rounded-lg p-4 min-h-[240px] bg-secondary/30">
                            {isLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-4/5" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ) : error ? (
                                <div className="flex flex-col items-center justify-center h-full text-destructive text-center py-8">
                                    <AlertCircle className="h-12 w-12 mb-4" />
                                    <p className="font-bold">An error occurred</p>
                                    <p className="text-sm max-w-md">{error}</p>
                                </div>
                            ) : files.length > 0 ? (
                                <ul className="space-y-2">
                                    {files.map((file, index) => (
                                        <li key={index} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/20 transition-colors group">
                                            <div className="flex items-center gap-3 truncate">
                                                <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                                                <span className="truncate font-code text-sm pt-px">{file}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleCopy(file)} className="opacity-50 group-hover:opacity-100 transition-opacity">
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center py-8">
                                    <Folder className="h-12 w-12 mb-4" />
                                    <p className="font-semibold">No files to display</p>
                                    <p className="text-sm">Enter a path on your server and click "Load Files".</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Alert>
                    <Server className="h-4 w-4" />
                    <AlertTitle className="font-bold">Backend Server Required</AlertTitle>
                    <AlertDescription>
                        This UI requires a local Python server. Please ensure it's running and has an endpoint at <code className="font-code bg-muted px-1 py-0.5 rounded text-xs">{SERVER_URL}/api/files?path=...</code> that returns a JSON list of filenames.
                    </AlertDescription>
                </Alert>
            </CardFooter>
        </Card>
    );
}
