
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutDashboard, ZoomIn, ZoomOut, Image as ImageIcon, Trash2, Pencil, X, MapPin, Edit, Move, Copy, Server, FileText, AlertCircle, RefreshCw, PanelRightOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface Pin {
  id: string;
  x: number;
  y: number;
  name: string;
  zone?: string;
  subzone?: string;
  url?: string;
}

interface Area {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  pins: Pin[];
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

type FileStatus = 'pending' | 'accessible' | 'inaccessible';
interface FileState {
    name: string;
    status: FileStatus;
}


export default function Home() {
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [imageType, setImageType] = React.useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [areas, setAreas] = React.useState<Area[]>([]);
  
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [drawMode, setDrawMode] = React.useState(false);
  const [startPoint, setStartPoint] = React.useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = React.useState<Omit<Area, 'id' | 'name' | 'pins'> | null>(null);
  const [decodedSvg, setDecodedSvg] = React.useState<string | null>(null);

  const [movingItem, setMovingItem] = React.useState<{ type: 'area' | 'pin', id: string; startX: number; startY: number; } | null>(null);
  const [resizingItem, setResizingItem] = React.useState<{ areaId: string; handle: ResizeHandle; startX: number; startY: number; originalArea: Area; } | null>(null);
  const dragThreshold = 5; 
  const [isDraggingItem, setIsDraggingItem] = React.useState(false);

  const [pinDialogOpen, setPinDialogOpen] = React.useState(false);
  const [editingPin, setEditingPin] = React.useState<Partial<Pin> & { areaId?: string } | null>(null);
  const [pinDialogError, setPinDialogError] = React.useState<string | null>(null);

  const svgContainerRef = React.useRef<HTMLDivElement>(null);
  
  // State for media file panel
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
        
        const initialFiles = (data as string[]).map(name => ({ name, status: 'pending' as FileStatus }));
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


  React.useEffect(() => {
    const savedImage = localStorage.getItem("dashboardImage");
    const savedImageType = localStorage.getItem("dashboardImageType");
    const savedAreas = localStorage.getItem("dashboardAreas");
    if (savedImage && savedImageType) {
      setSelectedImage(savedImage);
      setImageType(savedImageType);
      if (savedImageType === 'image/svg+xml' && savedImage.startsWith('data:image/svg+xml;base64,')) {
        try {
            setDecodedSvg(atob(savedImage.split(',')[1]));
        } catch (e) {
            console.error("Failed to decode SVG", e)
            setDecodedSvg(null);
        }
      }
    }
    if (savedAreas) {
      const parsedAreas = JSON.parse(savedAreas);
      const sanitizedAreas = parsedAreas.map((area: any) => ({ ...area, pins: area.pins || [] }));
      setAreas(sanitizedAreas);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "image/svg+xml") {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setSelectedImage(result);
        setImageType(file.type);
        if (result.startsWith('data:image/svg+xml;base64,')) {
            try {
                 setDecodedSvg(atob(result.split(',')[1]));
            } catch (e) {
                console.error("Error decoding base64 string", e);
                setDecodedSvg(null);
            }
        } else {
          setDecodedSvg(null);
        }
        localStorage.setItem("dashboardImage", result);
        localStorage.setItem("dashboardImageType", file.type);
        setZoomLevel(1);
        setAreas([]);
        localStorage.removeItem("dashboardAreas");
      };
      reader.readAsDataURL(file);
    } else {
        alert("Please select a valid SVG file.");
    }
  };
  
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImageType(null);
    setAreas([]);
    setDecodedSvg(null);
    localStorage.removeItem("dashboardImage");
    localStorage.removeItem("dashboardImageType");
    localStorage.removeItem("dashboardAreas");
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.2));

  const updateAreaName = (id: string, name: string) => {
    setAreas(currentAreas => {
      const updatedAreas = currentAreas.map(area => area.id === id ? { ...area, name } : area);
      localStorage.setItem("dashboardAreas", JSON.stringify(updatedAreas));
      return updatedAreas;
    });
  };
  
  const savePin = () => {
    if (!editingPin || !editingPin.name) return;
    setPinDialogError(null);
  
    const { areaId, ...pinData } = editingPin;
  
    setAreas(currentAreas => {
      const targetArea = currentAreas.find(a => a.id === areaId);
      if (!targetArea) return currentAreas;
  
      const isNameDuplicate = targetArea.pins.some(
        p => p.name.toLowerCase() === editingPin.name?.toLowerCase() && p.id !== editingPin.id
      );
  
      if (isNameDuplicate) {
        setPinDialogError(`A pin with the name "${editingPin.name}" already exists in this area.`);
        return currentAreas;
      }
  
      const updatedAreas = currentAreas.map(area => {
        if (area.id === areaId) {
          const pinExists = area.pins.some(p => p.id === pinData.id);
          let updatedPins;
  
          if (pinExists) {
            updatedPins = area.pins.map(p => p.id === pinData.id ? { ...p, ...pinData } as Pin : p);
          } else {
            const newPin: Pin = {
              id: `pin-${Date.now()}`,
              name: 'New Pin',
              ...pinData,
            } as Pin;
            updatedPins = [...area.pins, newPin];
          }
          return { ...area, pins: updatedPins };
        }
        return area;
      });
  
      localStorage.setItem("dashboardAreas", JSON.stringify(updatedAreas));
      
      setPinDialogOpen(false);
      setEditingPin(null);
  
      return updatedAreas;
    });
  };

  const deleteArea = (id: string) => {
    setAreas(currentAreas => {
      const updatedAreas = currentAreas.filter(area => area.id !== id);
      localStorage.setItem("dashboardAreas", JSON.stringify(updatedAreas));
      return updatedAreas;
    });
  };
  
  const deletePin = (areaId: string, pinId: string) => {
    setAreas(currentAreas => {
      const updatedAreas = currentAreas.map(area => {
        if (area.id === areaId) {
          const updatedPins = area.pins.filter(pin => pin.id !== pinId);
          return { ...area, pins: updatedPins };
        }
        return area;
      });
      localStorage.setItem("dashboardAreas", JSON.stringify(updatedAreas));
      return updatedAreas;
    });
  };
  
  const getMousePosition = (e: React.MouseEvent) => {
    const container = svgContainerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const svgElement = container.querySelector("svg");
    if (!svgElement) return { x: 0, y: 0 };

    const viewBox = svgElement.viewBox.baseVal;
    if (!viewBox || viewBox.width === 0 || viewBox.height === 0) {
        const svgWidth = svgElement.width.baseVal.value;
        const svgHeight = svgElement.height.baseVal.value;
        if (svgWidth === 0 || svgHeight === 0) return { x: e.clientX, y: e.clientY };
        const x = (e.clientX - rect.left) * (svgWidth / rect.width);
        const y = (e.clientY - rect.top) * (svgHeight / rect.height);
        return { x, y };
    }

    const x = (e.clientX - rect.left) * (viewBox.width / rect.width) + viewBox.x;
    const y = (e.clientY - rect.top) * (viewBox.height / rect.height) + viewBox.y;
    
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (drawMode) {
        const point = getMousePosition(e);
        setIsDrawing(true);
        setStartPoint(point);
        setCurrentRect({ x: point.x, y: point.y, width: 0, height: 0 });
    }
  };

  const handleItemMouseDown = (e: React.MouseEvent, type: 'area' | 'pin', itemId: string) => {
    e.stopPropagation();
    if (drawMode) return;

    const point = getMousePosition(e);
    const originalAreas = JSON.parse(localStorage.getItem('dashboardAreas') || '[]');

    if (type === 'area') {
      const area = originalAreas.find((a: Area) => a.id === itemId);
      if (!area) return;
      setMovingItem({ type: 'area', id: itemId, startX: point.x - area.x, startY: point.y - area.y });
    } else {
      let pin;
      let areaWithPin;
      for (const a of originalAreas) {
        pin = a.pins.find((p: Pin) => p.id === itemId);
        if (pin) {
          areaWithPin = a;
          break;
        }
      }
      if (!pin) return;
      setMovingItem({ type: 'pin', id: itemId, startX: point.x - pin.x, startY: point.y - pin.y });
    }
  };

   const handleResizeMouseDown = (e: React.MouseEvent, areaId: string, handle: ResizeHandle) => {
    e.stopPropagation();
    if (drawMode) return;
    const point = getMousePosition(e);
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    setResizingItem({
        areaId,
        handle,
        startX: point.x,
        startY: point.y,
        originalArea: { ...area }
    });
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const point = getMousePosition(e);

    if (resizingItem) {
        let { areaId, handle, startX, startY, originalArea } = resizingItem;
        let { x, y, width, height } = originalArea;
        const dx = point.x - startX;
        const dy = point.y - startY;

        if (handle.includes('e')) {
            width = Math.max(10, width + dx);
        }
        if (handle.includes('w')) {
            width = Math.max(10, width - dx);
            x = x + dx;
        }
        if (handle.includes('s')) {
            height = Math.max(10, height + dy);
        }
        if (handle.includes('n')) {
            height = Math.max(10, height - dy);
            y = y + dy;
        }

        setAreas(currentAreas => currentAreas.map(area => 
            area.id === areaId ? { ...area, x, y, width, height } : area
        ));
        return;
    }

    if (movingItem) {
      const dx = point.x - movingItem.startX;
      const dy = point.y - movingItem.startY;
      
      if (!isDraggingItem && (Math.abs(point.x - (movingItem.startX)) > dragThreshold || Math.abs(point.y - (movingItem.startY)) > dragThreshold)) {
          setIsDraggingItem(true);
      }

      if (isDraggingItem) {
          setAreas(currentAreas => {
            return currentAreas.map(area => {
              if (movingItem.type === 'area' && area.id === movingItem.id) {
                const newX = point.x - movingItem.startX;
                const newY = point.y - movingItem.startY;
                const deltaX = newX - area.x;
                const deltaY = newY - area.y;
                  
                const updatedPins = area.pins.map(pin => ({
                    ...pin,
                    x: pin.x + deltaX,
                    y: pin.y + deltaY
                }));

                return { ...area, x: newX, y: newY, pins: updatedPins };
              }
              if (movingItem.type === 'pin') {
                const pinIndex = area.pins.findIndex(p => p.id === movingItem.id);
                if (pinIndex > -1) {
                  const updatedPins = [...area.pins];
                  updatedPins[pinIndex] = { ...updatedPins[pinIndex], x: point.x - movingItem.startX, y: point.y - movingItem.startY };
                  return { ...area, pins: updatedPins };
                }
              }
              return area;
            });
          });
      }
      return;
  }

    if (!isDrawing || !startPoint) return;
    const newRect = {
      x: Math.min(startPoint.x, point.x),
      y: Math.min(startPoint.y, point.y),
      width: Math.abs(point.x - startPoint.x),
      height: Math.abs(point.y - startPoint.y),
    };
    setCurrentRect(newRect);
  };
  
  const handleMouseUp = (e: React.MouseEvent) => {
    if (resizingItem) {
        localStorage.setItem("dashboardAreas", JSON.stringify(areas));
        setResizingItem(null);
    }

    if (movingItem) {
        if (!isDraggingItem) { // This was a click, not a drag
            const point = getMousePosition(e);
            if (movingItem.type === 'area') {
                const area = areas.find(a => a.id === movingItem.id);
                if (area) {
                     setEditingPin({
                        x: point.x,
                        y: point.y,
                        areaId: area.id,
                        name: `Pin ${area.pins.length + 1}`
                    });
                    setPinDialogOpen(true);
                }
            } else if (movingItem.type === 'pin') {
                 let pin;
                 let areaWithPin;
                 for (const a of areas) {
                     pin = a.pins.find((p: Pin) => p.id === movingItem.id);
                     if (pin) {
                         areaWithPin = a;
                         break;
                     }
                 }
                 if(pin && areaWithPin) {
                    setEditingPin({ ...pin, areaId: areaWithPin.id });
                    setPinDialogOpen(true);
                 }
            }
        } else {
             localStorage.setItem("dashboardAreas", JSON.stringify(areas));
        }
      setMovingItem(null);
      setIsDraggingItem(false);
    }
    
    if (isDrawing) {
      if (currentRect && currentRect.width > 5 && currentRect.height > 5) {
        const newArea: Area = {
          id: `area-${Date.now()}`,
          ...currentRect,
          name: `Area ${areas.length + 1}`,
          pins: [],
        };
        const updatedAreas = [...areas, newArea];
        setAreas(updatedAreas);
        localStorage.setItem("dashboardAreas", JSON.stringify(updatedAreas));
      }
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentRect(null);
    }
  };

  const PinDialog = () => (
    <Dialog open={pinDialogOpen} onOpenChange={(open) => {
      if (!open) {
        setEditingPin(null);
        setPinDialogError(null);
      }
      setPinDialogOpen(open);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingPin?.id ? 'Edit Pin' : 'Add Pin'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pin-name">Display Name</Label>
            <Input 
              id="pin-name" 
              value={editingPin?.name || ''} 
              onChange={e => {
                setEditingPin({ ...editingPin, name: e.target.value });
                if (pinDialogError) setPinDialogError(null);
              }} 
            />
            {pinDialogError && <p className="text-sm text-destructive">{pinDialogError}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pin-zone">Zone</Label>
            <Input id="pin-zone" value={editingPin?.zone || ''} onChange={e => setEditingPin({ ...editingPin, zone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pin-subzone">Subzone</Label>
            <Input id="pin-subzone" value={editingPin?.subzone || ''} onChange={e => setEditingPin({ ...editingPin, subzone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pin-url">URL (optional)</Label>
            <Input id="pin-url" value={editingPin?.url || ''} onChange={e => setEditingPin({ ...editingPin, url: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={savePin}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const getResizeCursor = (handle: ResizeHandle) => {
    switch (handle) {
      case 'nw':
      case 'se':
        return 'nwse-resize';
      case 'ne':
      case 'sw':
        return 'nesw-resize';
      default:
        return 'auto';
    }
  };

  const SvgItems = () => {
    if (imageType !== "image/svg+xml") return null;

    const handleSize = 6;

    return (
      <TooltipProvider>
        <svg className="absolute top-0 left-0 w-full h-full" style={{ pointerEvents: 'auto' }}>
          {areas.map((area) => (
            <React.Fragment key={area.id}>
              <g 
                onMouseDown={(e) => handleItemMouseDown(e, 'area', area.id)}
                style={{ cursor: drawMode ? 'default' : (isDraggingItem && movingItem?.id === area.id ? 'grabbing' : 'grab') }}
              >
                <rect
                  x={area.x}
                  y={area.y}
                  width={area.width}
                  height={area.height}
                  stroke={resizingItem?.areaId === area.id ? "blue" : "red"}
                  strokeWidth="2"
                  fill="rgba(255, 0, 0, 0.1)"
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: 'all' }}
                />
                <text
                  x={area.x + 5}
                  y={area.y + 15}
                  fill="red"
                  fontSize="12"
                  fontWeight="bold"
                  style={{ paintOrder: "stroke", stroke: "white", strokeWidth: "2px", strokeLinejoin: "round", pointerEvents: 'none' }}
                >
                  {area.name}
                </text>
              </g>

              {!drawMode && (
                <>
                  {(['nw', 'ne', 'sw', 'se'] as ResizeHandle[]).map(handle => {
                    let cx, cy;
                    switch (handle) {
                      case 'nw': cx = area.x; cy = area.y; break;
                      case 'ne': cx = area.x + area.width; cy = area.y; break;
                      case 'sw': cx = area.x; cy = area.y + area.height; break;
                      case 'se': cx = area.x + area.width; cy = area.y + area.height; break;
                    }
                    return (
                        <circle
                            key={handle}
                            cx={cx}
                            cy={cy}
                            r={handleSize / zoomLevel}
                            fill="blue"
                            stroke="white"
                            strokeWidth={2 / zoomLevel}
                            onMouseDown={(e) => handleResizeMouseDown(e, area.id, handle)}
                            style={{ cursor: getResizeCursor(handle), pointerEvents: 'all' }}
                        />
                    );
                  })}
                </>
              )}

              {area.pins.map(pin => (
                 <Tooltip key={pin.id}>
                    <TooltipTrigger asChild>
                      <g 
                        onMouseDown={(e) => handleItemMouseDown(e, 'pin', pin.id)}
                        style={{ cursor: drawMode ? 'default' : (isDraggingItem && movingItem?.id === pin.id ? 'grabbing' : 'grab') }}
                      >
                          <circle cx={pin.x} cy={pin.y} r="5" fill="blue" stroke="white" strokeWidth="2" style={{ pointerEvents: 'all' }}/>
                           {pin.name && (
                              <text
                                x={pin.x + 8}
                                y={pin.y + 4}
                                fill="blue"
                                fontSize="10"
                                fontWeight="bold"
                                style={{ paintOrder: "stroke", stroke: "white", strokeWidth: "2px", strokeLinejoin: "round", pointerEvents: 'none' }}
                              >
                                {pin.name}
                              </text>
                            )}
                      </g>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-bold">{pin.name}</p>
                        {pin.zone && <p>Zone: {pin.zone}</p>}
                        {pin.subzone && <p>Subzone: {pin.subzone}</p>}
                        {pin.url && <p className="text-blue-500">URL: {pin.url}</p>}
                      </div>
                    </TooltipContent>
                  </Tooltip>
              ))}
            </React.Fragment>
          ))}
          {currentRect && isDrawing && (
             <rect
                x={currentRect.x}
                y={currentRect.y}
                width={currentRect.width}
                height={currentRect.height}
                stroke="blue"
                strokeWidth="2"
                fill="rgba(0, 0, 255, 0.1)"
                vectorEffect="non-scaling-stroke"
              />
          )}
        </svg>
      </TooltipProvider>
    );
  };
  
  return (
    <div className="flex flex-1 items-start justify-center p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="bg-primary text-primary-foreground p-3 rounded-lg">
                <LayoutDashboard className="h-8 w-8" />
            </div>
            <div>
              <CardTitle className="text-3xl font-headline tracking-tight">Dashboard</CardTitle>
              <CardDescription>An image viewer with zoom and annotation capabilities.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <Input 
              type="file" 
              accept="image/svg+xml" 
              onChange={handleFileChange}
              className="file:text-primary file:font-medium"
              disabled={!!selectedImage}
            />
            
            {selectedImage && decodedSvg && (
              <div className="space-y-4">
                <div 
                    ref={svgContainerRef}
                    className={cn(
                        "border rounded-lg p-4 overflow-hidden bg-secondary/30 flex justify-center items-center h-96 relative",
                        drawMode && "cursor-crosshair"
                    )}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <div 
                      className="overflow-hidden flex justify-center items-center w-full h-full"
                    >
                      {imageType === 'image/svg+xml' ? (
                          <div 
                            className="relative min-w-full min-h-full"
                            style={{ 
                              transform: `scale(${zoomLevel})`, 
                              transition: 'transform 0.1s ease-out',
                            }}
                          >
                           <div dangerouslySetInnerHTML={{ __html: decodedSvg }} style={{ pointerEvents: 'none' }}/>
                           <SvgItems />
                          </div>
                      ) : (
                         <img 
                          src={selectedImage} 
                          alt="Selected preview"
                          style={{ 
                              transform: `scale(${zoomLevel})`, 
                              transition: 'transform 0.1s ease-out',
                              maxWidth: '100%',
                              maxHeight: '100%',
                              objectFit: 'contain'
                          }} 
                      />
                      )}
                    </div>
                </div>

                <div className="flex justify-center items-center gap-2 flex-wrap">
                    <Button variant="outline" onClick={handleZoomOut}>
                        <ZoomOut /> Zoom Out
                    </Button>
                    <Button variant="outline" onClick={handleZoomIn}>
                        <ZoomIn /> Zoom In
                    </Button>
                     {imageType === 'image/svg+xml' && (
                       <>
                        <Button variant={drawMode ? "secondary" : "outline"} onClick={() => { setDrawMode(!drawMode)}}>
                            <Pencil /> {drawMode ? "Cancel Drawing" : "Draw Area"}
                        </Button>
                       </>
                     )}
                     <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" title="Show Media Files">
                                <PanelRightOpen /> Media Files
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="w-[400px] sm:w-[540px]">
                            <SheetHeader>
                                <SheetTitle>Media Files</SheetTitle>
                            </SheetHeader>
                            <div className="py-4">
                               <div className="border rounded-lg p-2 min-h-[200px] bg-secondary/30">
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
                            </div>
                        </SheetContent>
                    </Sheet>
                    <Button variant="destructive" size="icon" onClick={handleRemoveImage} title="Remove Image">
                        <Trash2 />
                         <span className="sr-only">Remove Image</span>
                    </Button>
                </div>
                
                {imageType === 'image/svg+xml' && areas.length > 0 && (
                  <div className="space-y-2 pt-4">
                     <h3 className="text-lg font-semibold text-center">Annotated Areas</h3>
                     <div className="border rounded-lg p-4 space-y-4 max-h-60 overflow-y-auto">
                        {areas.map((area) => (
                          <div key={area.id} className="space-y-3 bg-secondary/50 p-3 rounded-md">
                            <div className="flex items-center gap-2">
                              <Input
                                value={area.name}
                                onChange={(e) => updateAreaName(area.id, e.target.value)}
                                placeholder="Enter area name"
                                className="h-9"
                              />
                              <Button variant="ghost" size="icon" onClick={() => deleteArea(area.id)}>
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                            {area.pins.length > 0 && (
                              <div className="pl-4 border-l-2 border-primary/50 space-y-2">
                                {area.pins.map(pin => (
                                   <div key={pin.id} className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-primary"/>
                                      <div className="flex-grow text-sm">
                                        <p className="font-semibold">{pin.name}</p>
                                        <p className="text-xs text-muted-foreground">{pin.zone} / {pin.subzone}</p>
                                      </div>
                                      <Button variant="ghost" size="icon" onClick={() => {
                                        setEditingPin({ ...pin, areaId: area.id });
                                        setPinDialogOpen(true);
                                      }}>
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => deletePin(area.id, pin.id)}>
                                        <X className="h-3 w-3 text-destructive" />
                                      </Button>
                                   </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                     </div>
                  </div>
                )}
              </div>
            )}

            {!selectedImage && (
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed border-border rounded-lg h-96">
                <ImageIcon className="h-16 w-16 mb-4" />
                <p className="font-semibold">No image selected</p>
                <p className="text-sm">Choose an SVG file to view it here.</p>
              </div>
            )}
        </CardContent>
      </Card>
      <PinDialog />
    </div>
  );
}
