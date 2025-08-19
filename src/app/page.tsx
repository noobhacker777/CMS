
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutDashboard, ZoomIn, ZoomOut, Image as ImageIcon, Trash2 } from "lucide-react";

export default function Home() {
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = React.useState(1);

  React.useEffect(() => {
    const savedImage = localStorage.getItem("dashboardImage");
    if (savedImage) {
      setSelectedImage(savedImage);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setSelectedImage(result);
          localStorage.setItem("dashboardImage", result);
        };
        reader.readAsDataURL(file);
        setZoomLevel(1); 
      } else {
        alert("Please select a valid image file (SVG, PNG, JPG).");
      }
    }
  };
  
  const handleRemoveImage = () => {
    setSelectedImage(null);
    localStorage.removeItem("dashboardImage");
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 3)); // Max zoom 3x
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.2)); // Min zoom 0.2x
  };

  return (
    <div className="flex flex-1 items-center justify-center p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="bg-primary text-primary-foreground p-3 rounded-lg">
                <LayoutDashboard className="h-8 w-8" />
            </div>
            <div>
              <CardTitle className="text-3xl font-headline tracking-tight">Dashboard</CardTitle>
              <CardDescription>An image viewer with zoom capabilities.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <Input 
              type="file" 
              accept="image/svg+xml, image/png, image/jpeg" 
              onChange={handleFileChange}
              className="file:text-primary file:font-medium"
              disabled={!!selectedImage}
            />
            
            {selectedImage && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 overflow-hidden bg-secondary/30 flex justify-center items-center h-96">
                    <div 
                      className="overflow-hidden flex justify-center items-center w-full h-full"
                    >
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
                    </div>
                </div>

                <div className="flex justify-center items-center gap-2">
                    <Button variant="outline" onClick={handleZoomOut}>
                        <ZoomOut />
                        Zoom Out
                    </Button>
                    <Button variant="outline" onClick={handleZoomIn}>
                        <ZoomIn />
                        Zoom In
                    </Button>
                    <Button variant="destructive" size="icon" onClick={handleRemoveImage}>
                        <Trash2 />
                         <span className="sr-only">Remove Image</span>
                    </Button>
                </div>
              </div>
            )}

            {!selectedImage && (
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed border-border rounded-lg h-96">
                <ImageIcon className="h-16 w-16 mb-4" />
                <p className="font-semibold">No image selected</p>
                <p className="text-sm">Choose a file to view it here.</p>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
