
"use client";

import * as React from "react";
import { Area, Pin } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Edit, MapPin } from "lucide-react";

interface AnnotatedAreasListProps {
    areas: Area[];
    setAreas: React.Dispatch<React.SetStateAction<Area[]>>;
    setEditingPin: (pin: Partial<Pin> & { areaId?: string } | null) => void;
    setPinDialogOpen: (open: boolean) => void;
}

export function AnnotatedAreasList({
    areas,
    setAreas,
    setEditingPin,
    setPinDialogOpen,
}: AnnotatedAreasListProps) {
    if (areas.length === 0) {
        return null;
    }
    
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

    const deletePin = (areaId: string, pinId: string) => {
        const updatedAreas = areas.map(area => {
            if (area.id === areaId) {
                return { ...area, pins: area.pins.filter(pin => pin.id !== pinId) };
            }
            return area;
        });
        setAreas(updatedAreas);
        localStorage.setItem("dashboardAreas", JSON.stringify(updatedAreas));
    };

    return (
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
                                        <MapPin className="h-4 w-4 text-primary" />
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
    );
}
