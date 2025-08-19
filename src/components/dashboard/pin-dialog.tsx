
"use client";

import * as React from "react";
import { Pin } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PinDialogProps {
    pinDialogOpen: boolean;
    setPinDialogOpen: (open: boolean) => void;
    editingPin: Partial<Pin> & { areaId?: string } | null;
    setEditingPin: (pin: Partial<Pin> & { areaId?: string } | null) => void;
    pinDialogError: string | null;
    setPinDialogError: (error: string | null) => void;
    savePin: () => void;
}

export function PinDialog({
    pinDialogOpen,
    setPinDialogOpen,
    editingPin,
    setEditingPin,
    pinDialogError,
    setPinDialogError,
    savePin,
}: PinDialogProps) {
    return (
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
}
