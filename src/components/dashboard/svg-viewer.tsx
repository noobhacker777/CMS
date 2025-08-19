
"use client";

import * as React from "react";
import { Area, Pin, Point } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Image as ImageIcon, ZoomIn, ZoomOut, Trash2, Pencil } from "lucide-react";

interface SvgViewerProps {
    selectedImage: string | null;
    imageType: string | null;
    decodedSvg: string | null;
    areas: Area[];
    setAreas: React.Dispatch<React.SetStateAction<Area[]>>;
    setEditingPin: (pin: Partial<Pin> & { areaId?: string } | null) => void;
    setPinDialogOpen: (open: boolean) => void;
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveImage: () => void;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

export function SvgViewer({
    selectedImage,
    imageType,
    decodedSvg,
    areas,
    setAreas,
    setEditingPin,
    setPinDialogOpen,
    onFileChange,
    onRemoveImage,
}: SvgViewerProps) {
    const [zoomLevel, setZoomLevel] = React.useState(1);
    const [drawMode, setDrawMode] = React.useState(false);
    const [isDrawing, setIsDrawing] = React.useState(false);
    const [startPoint, setStartPoint] = React.useState<Point | null>(null);
    const [currentRect, setCurrentRect] = React.useState<Omit<Area, 'id' | 'name' | 'pins'> | null>(null);
    const [movingItem, setMovingItem] = React.useState<{ type: 'area' | 'pin', id: string; startX: number; startY: number; } | null>(null);
    const [resizingItem, setResizingItem] = React.useState<{ areaId: string; handle: ResizeHandle; startX: number; startY: number; originalArea: Area; } | null>(null);
    const [isDraggingItem, setIsDraggingItem] = React.useState(false);
    const dragThreshold = 5;
    const svgContainerRef = React.useRef<HTMLDivElement>(null);

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 3));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.2));

    const getMousePosition = (e: React.MouseEvent): Point => {
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
            for (const a of originalAreas) {
                pin = a.pins.find((p: Pin) => p.id === itemId);
                if (pin) break;
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

            if (handle.includes('e')) width = Math.max(10, width + dx);
            if (handle.includes('w')) { width = Math.max(10, width - dx); x += dx; }
            if (handle.includes('s')) height = Math.max(10, height + dy);
            if (handle.includes('n')) { height = Math.max(10, height - dy); y += dy; }
            
            const updatedAreas = areas.map(area =>
                area.id === areaId ? { ...area, x, y, width, height } : area
            );
            setAreas(updatedAreas);
            return;
        }

        if (movingItem) {
            if (!isDraggingItem && (Math.abs(point.x - movingItem.startX) > dragThreshold || Math.abs(point.y - movingItem.startY) > dragThreshold)) {
                setIsDraggingItem(true);
            }

            if (isDraggingItem) {
                const updatedAreas = areas.map(area => {
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
                setAreas(updatedAreas);
            }
            return;
        }

        if (isDrawing && startPoint && currentRect) {
            const newRect = {
                x: Math.min(startPoint.x, point.x),
                y: Math.min(startPoint.y, point.y),
                width: Math.abs(point.x - startPoint.x),
                height: Math.abs(point.y - startPoint.y),
            };
            setCurrentRect(newRect);
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (resizingItem) {
            localStorage.setItem("dashboardAreas", JSON.stringify(areas));
            setResizingItem(null);
        }

        if (movingItem) {
            if (!isDraggingItem) { // Click
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
                    let pin, areaWithPin;
                    for (const a of areas) {
                        pin = a.pins.find((p: Pin) => p.id === movingItem.id);
                        if (pin) { areaWithPin = a; break; }
                    }
                    if (pin && areaWithPin) {
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

        if (isDrawing && currentRect && currentRect.width > 5 && currentRect.height > 5) {
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
    };

    const getResizeCursor = (handle: ResizeHandle) => {
        switch (handle) {
            case 'nw': case 'se': return 'nwse-resize';
            case 'ne': case 'sw': return 'nesw-resize';
            default: return 'auto';
        }
    };

    return (
        <Card>
            <CardContent className="space-y-4">
                <Input
                    type="file"
                    accept="image/svg+xml"
                    onChange={onFileChange}
                    className="file:text-primary file:font-medium"
                    disabled={!!selectedImage}
                />
                {selectedImage && decodedSvg ? (
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
                            <div className="overflow-hidden flex justify-center items-center w-full h-full">
                                <div
                                    className="relative min-w-full min-h-full"
                                    style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.1s ease-out' }}
                                >
                                    <div dangerouslySetInnerHTML={{ __html: decodedSvg }} style={{ pointerEvents: 'none' }} />
                                    <SvgItems
                                        areas={areas}
                                        zoomLevel={zoomLevel}
                                        drawMode={drawMode}
                                        isDraggingItem={isDraggingItem}
                                        movingItem={movingItem}
                                        resizingItem={resizingItem}
                                        currentRect={currentRect}
                                        isDrawing={isDrawing}
                                        handleItemMouseDown={handleItemMouseDown}
                                        handleResizeMouseDown={handleResizeMouseDown}
                                        getResizeCursor={getResizeCursor}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center items-center gap-2 flex-wrap">
                            <Button variant="outline" onClick={handleZoomOut}><ZoomOut /> Zoom Out</Button>
                            <Button variant="outline" onClick={handleZoomIn}><ZoomIn /> Zoom In</Button>
                            <Button variant={drawMode ? "secondary" : "outline"} onClick={() => setDrawMode(!drawMode)}>
                                <Pencil /> {drawMode ? "Cancel Drawing" : "Draw Area"}
                            </Button>
                            <Button variant="destructive" size="icon" onClick={onRemoveImage} title="Remove Image">
                                <Trash2 />
                                <span className="sr-only">Remove Image</span>
                            </Button>
                        </div>
                    </div>
                ) : (
                     <div className="flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed border-border rounded-lg h-96">
                        <ImageIcon className="h-16 w-16 mb-4" />
                        <p className="font-semibold">No image selected</p>
                        <p className="text-sm">Choose an SVG file to view it here.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Sub-component for rendering SVG items
const SvgItems = ({ areas, zoomLevel, drawMode, isDraggingItem, movingItem, resizingItem, currentRect, isDrawing, handleItemMouseDown, handleResizeMouseDown, getResizeCursor }: any) => {
    const handleSize = 6;

    return (
        <TooltipProvider>
            <svg className="absolute top-0 left-0 w-full h-full" style={{ pointerEvents: 'auto' }}>
                {areas.map((area: Area) => (
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
                                        <circle cx={pin.x} cy={pin.y} r="5" fill="blue" stroke="white" strokeWidth="2" style={{ pointerEvents: 'all' }} />
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
