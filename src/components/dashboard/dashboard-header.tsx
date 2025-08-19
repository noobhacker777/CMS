
"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard } from "lucide-react";

export function DashboardHeader() {
    return (
        <Card className="w-full">
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
        </Card>
    );
}
