import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard } from "lucide-react";

export default function Home() {
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
              <CardDescription>Welcome to your application dashboard.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p>
            Use the sidebar to navigate to different sections of the application.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
