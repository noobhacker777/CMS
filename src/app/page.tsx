
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { Area, Pin } from "@/lib/types";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SvgViewer } from "@/components/dashboard/svg-viewer";
import { AnnotatedAreasList } from "@/components/dashboard/annotated-areas-list";
import { MediaFilesPanel } from "@/components/dashboard/media-files-panel";
import { PinDialog } from "@/components/dashboard/pin-dialog";


export default function Home() {
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [imageType, setImageType] = React.useState<string | null>(null);
  const [decodedSvg, setDecodedSvg] = React.useState<string | null>(null);
  
  const [areas, setAreas] = React.useState<Area[]>([]);
  const [editingPin, setEditingPin] = React.useState<Partial<Pin> & { areaId?: string } | null>(null);
  const [pinDialogOpen, setPinDialogOpen] = React.useState(false);
  const [pinDialogError, setPinDialogError] = React.useState<string | null>(null);
  
  const { toast } = useToast();

  const loadStateFromLocalStorage = React.useCallback(() => {
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
            console.error("Failed to decode SVG", e);
            setDecodedSvg(null);
        }
      }
    }
    if (savedAreas) {
      try {
        const parsedAreas = JSON.parse(savedAreas);
        if (Array.isArray(parsedAreas)) {
          const sanitizedAreas = parsedAreas.map((area: any) => ({ ...area, pins: area.pins || [] }));
          setAreas(sanitizedAreas);
        } else {
          setAreas([]);
        }
      } catch (error) {
        console.error("Failed to parse dashboardAreas from localStorage", error);
        setAreas([]);
      }
    }
  }, []);

  React.useEffect(() => {
    loadStateFromLocalStorage();
    window.addEventListener('storage', loadStateFromLocalStorage);
    return () => {
        window.removeEventListener('storage', loadStateFromLocalStorage);
    };
  }, [loadStateFromLocalStorage]);

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
        setAreas([]);
        localStorage.removeItem("dashboardAreas");
      };
      reader.readAsDataURL(file);
    } else {
        toast({
            variant: "destructive",
            title: "Invalid File Type",
            description: "Please select a valid SVG file.",
        });
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

  return (
    <div className="grid flex-1 items-start gap-4 p-4 sm:p-6 md:p-8 lg:grid-cols-3 xl:grid-cols-3">
        <div className="grid auto-rows-max items-start gap-4 lg:col-span-2">
            <DashboardHeader />
            <SvgViewer
              selectedImage={selectedImage}
              imageType={imageType}
              decodedSvg={decodedSvg}
              areas={areas}
              setAreas={setAreas}
              setEditingPin={setEditingPin}
              setPinDialogOpen={setPinDialogOpen}
              onFileChange={handleFileChange}
              onRemoveImage={handleRemoveImage}
            />
            <AnnotatedAreasList
                areas={areas}
                setAreas={setAreas}
                setEditingPin={setEditingPin}
                setPinDialogOpen={setPinDialogOpen}
            />
        </div>
        <div className="grid auto-rows-max items-start gap-4 lg:col-span-1">
            <MediaFilesPanel />
        </div>
      <PinDialog
        pinDialogOpen={pinDialogOpen}
        setPinDialogOpen={setPinDialogOpen}
        editingPin={editingPin}
        setEditingPin={setEditingPin}
        pinDialogError={pinDialogError}
        setPinDialogError={setPinDialogError}
        savePin={savePin}
      />
    </div>
  );
}
