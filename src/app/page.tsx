
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutDashboard, ZoomIn, ZoomOut, Image as ImageIcon, Trash2, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Area {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
}

export default function Home() {
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [imageType, setImageType] = React.useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [areas, setAreas] = React.useState<Area[]>([]);
  
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [drawMode, setDrawMode] = React.useState(false);
  const [startPoint, setStartPoint] = React.useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = React.useState<Omit<Area, 'id' | 'name'> | null>(null);
  const [decodedSvg, setDecodedSvg] = React.useState<string | null>(null);

  const [movingArea, setMovingArea] = React.useState<{ id: string; startX: number; startY: number; } | null>(null);

  const svgContainerRef = React.useRef<HTMLDivElement>(null);

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
      setAreas(JSON.parse(savedAreas));
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
    const updatedAreas = areas.map(area => area.id === id ? { ...area, name } : area);
    setAreas(updatedAreas);
    localStorage.setItem("dashboardAreas", JSON.stringify(updatedAreas));
  };

  const deleteArea = (id: string) => {
    const updatedAreas = areas.filter(area => area.id !== id);
    setAreas(updatedAreas);
    localStorage.setItem("dashboardAreas", JSON.stringify(updatedAreas));
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
    const point = getMousePosition(e);
    if (drawMode) {
      setIsDrawing(true);
      setStartPoint(point);
      setCurrentRect({ x: point.x, y: point.y, width: 0, height: 0 });
    }
  };

  const handleAreaMouseDown = (e: React.MouseEvent, areaId: string) => {
    e.stopPropagation();
    if (drawMode) return;

    const area = areas.find(a => a.id === areaId);
    if (!area) return;

    const point = getMousePosition(e);
    setMovingArea({
      id: areaId,
      startX: point.x - area.x,
      startY: point.y - area.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const point = getMousePosition(e);

    if (movingArea) {
      setAreas(currentAreas => currentAreas.map(area => {
        if (area.id === movingArea.id) {
          return {
            ...area,
            x: point.x - movingArea.startX,
            y: point.y - movingArea.startY,
          };
        }
        return area;
      }));
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

  const handleMouseUp = () => {
    if (movingArea) {
      localStorage.setItem("dashboardAreas", JSON.stringify(areas));
      setMovingArea(null);
    }
    
    if (isDrawing) {
      if (currentRect && currentRect.width > 0 && currentRect.height > 0) {
        const newArea: Area = {
          id: `area-${Date.now()}`,
          ...currentRect,
          name: `Area ${areas.length + 1}`,
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

  const SvgAreas = () => {
    if (imageType !== "image/svg+xml") return null;

    const allRects = [...areas];
    if (currentRect && isDrawing) {
      allRects.push({ id: 'drawing', ...currentRect, name: '' });
    }

    return (
      <svg className="absolute top-0 left-0 w-full h-full" style={{ pointerEvents: 'auto' }}>
        {allRects.map((area) => (
          <g 
            key={area.id}
            onMouseDown={(e) => area.id !== 'drawing' && handleAreaMouseDown(e, area.id)}
            style={{ cursor: drawMode ? 'default' : 'move' }}
          >
            <rect
              x={area.x}
              y={area.y}
              width={area.width}
              height={area.height}
              stroke={area.id === 'drawing' ? "blue" : "red"}
              strokeWidth="2"
              fill={area.id === 'drawing' ? "rgba(0, 0, 255, 0.1)" : "rgba(255, 0, 0, 0.1)"}
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: 'all' }}
            />
            {area.name && area.id !== 'drawing' && (
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
            )}
          </g>
        ))}
      </svg>
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
                           <SvgAreas />
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
                        <Button variant={drawMode ? "secondary" : "outline"} onClick={() => setDrawMode(!drawMode)}>
                            <Pencil /> {drawMode ? "Cancel Drawing" : "Draw Area"}
                        </Button>
                     )}
                    <Button variant="destructive" size="icon" onClick={handleRemoveImage} title="Remove Image">
                        <Trash2 />
                         <span className="sr-only">Remove Image</span>
                    </Button>
                </div>
                
                {imageType === 'image/svg+xml' && areas.length > 0 && (
                  <div className="space-y-2 pt-4">
                     <h3 className="text-lg font-semibold text-center">Annotated Areas</h3>
                     <div className="border rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto">
                        {areas.map((area) => (
                          <div key={area.id} className="flex items-center gap-2">
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
    </div>
  );
}

    