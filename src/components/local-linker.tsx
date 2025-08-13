
"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Folder, FileText, Copy, RefreshCw, AlertCircle, Server, UploadCloud, FileClock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

export function LocalLinker() {
    const [folderPath, setFolderPath] = useState('');
    const [files, setFiles] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [droppedFile, setDroppedFile] = useState<File | null>(null);
    const [serverUrl, setServerUrl] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const logPollInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const url = `${window.location.protocol}//${window.location.hostname}:5000`;
            setServerUrl(url);
        }
    }, []);

    const fetchLogs = async () => {
        if (!serverUrl) return;
        try {
            const response = await fetch(`${serverUrl}/api/logs`);
            if (response.ok) {
                const newLogs: string[] = await response.json();
                setLogs(newLogs.reverse()); // Show newest logs first
            }
        } catch (e) {
            // Silently fail, as this is a background task. 
            // The main error display will handle server connection issues.
        }
    };

    useEffect(() => {
        // Start polling for logs when the component mounts and serverUrl is available
        if (serverUrl) {
            fetchLogs(); // Initial fetch
            logPollInterval.current = setInterval(fetchLogs, 5000); // Poll every 5 seconds
        }

        // Cleanup interval on component unmount
        return () => {
            if (logPollInterval.current) {
                clearInterval(logPollInterval.current);
            }
        };
    }, [serverUrl]);

    const fetchFiles = async () => {
        if (!folderPath) {
            setError("Please provide a folder path.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setFiles([]);
        setDroppedFile(null);

        try {
            const response = await fetch(`${serverUrl}/api/files?path=${encodeURIComponent(folderPath)}`);
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
        const link = `${serverUrl}/media/${encodedFilename}`;
        navigator.clipboard.writeText(link);
        toast({
            title: "Link Copied!",
            description: <p className="truncate">{link}</p>,
        });
    };
    
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        setFiles([]);
        setError(null);

        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles && droppedFiles.length > 0) {
            setDroppedFile(droppedFiles[0]);
        }
    };


    return (
        <Card className="w-full max-w-4xl shadow-2xl shadow-primary/10 grid grid-cols-1 lg:grid-cols-2 lg:gap-x-6">
            <div className="flex flex-col">
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
                <CardContent className="flex-grow">
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
                                    disabled={!serverUrl}
                                />
                                <Button onClick={fetchFiles} disabled={isLoading || !serverUrl}>
                                    {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Folder className="mr-2 h-4 w-4" />}
                                    Load
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Separator className="flex-1" />
                            <span className="text-xs text-muted-foreground">OR</span>
                            <Separator className="flex-1" />
                        </div>

                         <div 
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                                ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
                                ${!serverUrl ? 'pointer-events-none opacity-50' : ''}`}
                        >
                            <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                                <UploadCloud className="h-8 w-8" />
                                <p className="font-semibold">Drag & drop a file here</p>
                                <p className="text-xs">The file will not be uploaded, only its link generated.</p>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Available Files</h3>
                            <div className="border rounded-lg p-2 min-h-[200px] bg-secondary/30">
                                <ScrollArea className="h-[200px] p-2">
                                {!serverUrl ? (
                                     <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center py-8">
                                        <Server className="h-12 w-12 mb-4 text-muted-foreground/50" />
                                        <p className="font-semibold">Connecting to backend server...</p>
                                        <p className="text-sm">Please ensure the Python server is running.</p>
                                    </div>
                                )
                                : isLoading ? (
                                    <div className="space-y-2 p-2">
                                        <Skeleton className="h-10 w-full" />
                                        <Skeleton className="h-10 w-full" />
                                        <Skeleton className="h-10 w-4/5" />
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
                                ) : droppedFile ? (
                                    <ul className="space-y-2">
                                         <li className="flex items-center justify-between p-2 rounded-md bg-accent/20 transition-colors group">
                                             <div className="flex items-center gap-3 truncate">
                                                 <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                                                 <span className="truncate font-code text-sm pt-px">{droppedFile.name}</span>
                                             </div>
                                             <Button variant="ghost" size="icon" onClick={() => handleCopy(droppedFile.name)} className="opacity-100 transition-opacity">
                                                 <Copy className="h-4 w-4" />
                                             </Button>
                                         </li>
                                     </ul>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center py-8">
                                        <Folder className="h-12 w-12 mb-4" />
                                        <p className="font-semibold">No files to display</p>
                                        <p className="text-sm">Enter a path and click "Load Files" or drop a file above.</p>
                                    </div>
                                )}
                                </ScrollArea>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="mt-auto">
                     <Alert>
                        <Server className="h-4 w-4" />
                        <AlertTitle className="font-bold">Backend Server Required</AlertTitle>
                        <AlertDescription>
                            This UI requires a local Python server. Please ensure it's running.
                        </AlertDescription>
                    </Alert>
                </CardFooter>
            </div>
            
            <div className="flex flex-col bg-secondary/30 rounded-b-lg lg:rounded-lg">
                 <CardHeader>
                    <div className="flex items-center gap-3">
                        <FileClock className="h-6 w-6 text-primary" />
                        <div>
                            <CardTitle className="text-2xl font-headline tracking-tight">Server Logs</CardTitle>
                             <CardDescription>Real-time events from the Python server.</CardDescription>
                        </div>
                    </div>
                 </CardHeader>
                 <CardContent className="flex-grow min-h-0">
                    <ScrollArea className="h-full max-h-[580px] border rounded-lg bg-background p-1 font-code text-xs">
                        <div className="p-3">
                        {logs.length > 0 ? (
                            logs.map((log, index) => (
                                <p key={index} className="whitespace-pre-wrap leading-relaxed [&:not(:last-child)]:mb-2">
                                    {log}
                                </p>
                            ))
                        ) : (
                             <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center py-8">
                                <FileClock className="h-12 w-12 mb-4" />
                                <p className="font-semibold">No log messages</p>
                                <p className="text-sm">Server logs will appear here as you interact with the app.</p>
                            </div>
                        )}
                        </div>
                    </ScrollArea>
                 </CardContent>
            </div>
        </Card>
    );
}
