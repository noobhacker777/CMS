
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Server, FileText, AlertCircle, RefreshCw, Copy } from "lucide-react";
import { FileState } from "@/lib/types";


export function MediaFilesPanel() {
    const { toast } = useToast();
    const [mediaFiles, setMediaFiles] = React.useState<FileState[]>([]);
    const [isMediaLoading, setIsMediaLoading] = React.useState(false);
    const [mediaError, setMediaError] = React.useState<string | null>(null);
    const [pythonServerUrl, setPythonServerUrl] = React.useState('');

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const url = `${window.location.protocol}//${window.location.hostname}:5000`;
            setPythonServerUrl(url);
        }
    }, []);

    const checkFileStatus = async (filename: string) => {
        if (!pythonServerUrl) return 'inaccessible';
        try {
            const link = `${pythonServerUrl}/media/${encodeURIComponent(filename)}`;
            const response = await fetch(link, { method: 'HEAD' });
            return response.ok ? 'accessible' : 'inaccessible';
        } catch (error) {
            return 'inaccessible';
        }
    };

    const fetchMediaFiles = async () => {
        setIsMediaLoading(true);
        setMediaError(null);
        setMediaFiles([]);

        try {
            if (!pythonServerUrl) {
                throw new Error("Python server URL not configured. Cannot fetch files.");
            }
            const response = await fetch(`${pythonServerUrl}/api/files?path=media`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `Server error: ${response.statusText}` }));
                throw new Error(errorData.error || `Server error: ${response.statusText}`);
            }
            const data: string[] | { error: string } = await response.json();

            if (typeof data === 'object' && data !== null && 'error' in data) {
                throw new Error(data.error);
            }

            const initialFiles = (data as string[]).map(name => ({ name, status: 'pending' as 'pending' | 'accessible' | 'inaccessible' }));
            setMediaFiles(initialFiles);

            for (const name of (data as string[])) {
                const status = await checkFileStatus(name);
                setMediaFiles(prevFiles => prevFiles.map(f => f.name === name ? { ...f, status } : f));
            }
        } catch (e: any) {
            setMediaError(e.message || 'Failed to connect to the backend server. Is it running?');
            setMediaFiles([]);
        } finally {
            setIsMediaLoading(false);
        }
    };

    React.useEffect(() => {
        if (pythonServerUrl) {
            fetchMediaFiles();
        }
    }, [pythonServerUrl]);


    const handleCopy = (filename: string) => {
        if (!pythonServerUrl) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Backend server URL is not configured.",
            });
            return;
        }
        const encodedFilename = filename.split('/').map(part => encodeURIComponent(part)).join('/');
        const link = `${pythonServerUrl}/media/${encodedFilename}`;
        navigator.clipboard.writeText(link);
        toast({
            title: "Link Copied!",
            description: <p className="truncate">{link}</p>,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Media Files</CardTitle>
                <CardDescription>Files available from your local media server.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg min-h-[200px] bg-secondary/30">
                    <ScrollArea className="h-[70vh] p-2">
                        {!pythonServerUrl ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center py-8">
                                <Server className="h-12 w-12 mb-4 text-muted-foreground/50" />
                                <p className="font-semibold">Connecting to backend server...</p>
                                <p className="text-sm">Please ensure the Python server is running.</p>
                            </div>
                        )
                            : isMediaLoading ? (
                                <div className="space-y-2 p-2">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-4/5" />
                                </div>
                            ) : mediaError ? (
                                <div className="flex flex-col items-center justify-center h-full text-destructive text-center py-8">
                                    <AlertCircle className="h-12 w-12 mb-4" />
                                    <p className="font-bold">An error occurred</p>
                                    <p className="text-sm max-w-md">{mediaError}</p>
                                </div>
                            ) : mediaFiles.length > 0 ? (
                                <ul className="space-y-2">
                                    {mediaFiles.map((file) => (
                                        <li key={file.name} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/20 transition-colors group">
                                            <div className="flex items-center gap-3 truncate">
                                                {file.status === 'pending' ? (
                                                    <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin flex-shrink-0" />
                                                ) : file.status === 'accessible' ? (
                                                    <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                                                ) : (
                                                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                                                )}
                                                <span className="truncate font-mono text-sm pt-px">{file.name}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleCopy(file.name)} className="opacity-50 group-hover:opacity-100 transition-opacity" title="Copy Link">
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center py-8">
                                    <Server className="h-12 w-12 mb-4" />
                                    <p className="font-semibold">No files to display</p>
                                    <p className="text-sm">The `media` folder is empty or could not be read.</p>
                                </div>
                            )}
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );
}
