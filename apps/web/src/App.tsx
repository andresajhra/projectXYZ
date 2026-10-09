import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useHello } from "@/features/hello/use-hello";
import { isTauri, tauriHello } from "@/lib/platform";

export default function App() {
  const { data: apiData, isPending, isError, refetch, isFetching } = useHello();
  const [pingCount, setPingCount] = useState(0);

  const desktopQuery = useQuery({
    queryKey: ["tauri-hello"],
    queryFn: () => tauriHello("Desktop"),
    enabled: isTauri,
  });

  const handlePing = async () => {
    setPingCount((c) => c + 1);
    await refetch();
    if (isTauri) {
      await desktopQuery.refetch();
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background flex flex-col items-center justify-center p-6 text-foreground antialiased">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Pharma ERP · Monorepox
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Hello World</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Unified architecture for pharmacy POS, inventory management, and cross-platform hardware control.
          </p>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Backend API Card */}
          <Card className="border border-border/80 shadow-sm backdrop-blur-sm bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Backend API</CardTitle>
                <Badge ok={!isError && !!apiData}>
                  {isPending ? "Connecting..." : isError ? "Offline" : "Online"}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                NestJS 11 · Port 3000 · <code className="text-primary font-mono">GET /api/hello</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {isPending && <p className="text-muted-foreground">Checking connection to API...</p>}
              {isError && (
                <p className="text-destructive font-medium">
                  Cannot reach backend. Start it with <code className="bg-muted px-1 py-0.5 rounded">pnpm dev</code>.
                </p>
              )}
              {apiData && (
                <div className="space-y-1 bg-muted/40 p-3 rounded-lg border border-border/40 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service:</span>
                    <span className="font-semibold text-foreground">{apiData.service}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Message:</span>
                    <span className="text-foreground">{apiData.message}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-border/40">
                    <span className="text-muted-foreground">Database:</span>
                    <Badge ok={apiData.database === "up"}>
                      PostgreSQL {apiData.database}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Desktop & Shell Card */}
          <Card className="border border-border/80 shadow-sm backdrop-blur-sm bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Runtime Shell</CardTitle>
                <Badge ok={true}>{isTauri ? "Tauri Native" : "Web Browser"}</Badge>
              </div>
              <CardDescription className="text-xs">
                {isTauri ? "Native Desktop POS Container (Rust)" : "Vite + React 19 Frontend (:5173)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {isTauri ? (
                <div className="space-y-1 bg-muted/40 p-3 rounded-lg border border-border/40 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IPC Command:</span>
                    <span className="font-semibold text-foreground">invoke('hello')</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bridge:</span>
                    <span className="text-foreground">{desktopQuery.data ?? "Connecting..."}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/40 p-3 rounded-lg border border-border/40 text-muted-foreground leading-relaxed">
                  Running in Web mode. Run <code className="bg-background px-1 py-0.5 rounded text-foreground font-mono">pnpm dev:desktop</code> to launch the native Tauri shell.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monorepo Apps Catalog */}
        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium text-muted-foreground">Active Packages:</span>
              <span className="px-2 py-0.5 bg-muted rounded font-mono">apps/api</span>
              <span className="px-2 py-0.5 bg-muted rounded font-mono">apps/web</span>
              <span className="px-2 py-0.5 bg-muted rounded font-mono">apps/desktop</span>
              <span className="px-2 py-0.5 bg-muted rounded font-mono">apps/mobile</span>
              <span className="px-2 py-0.5 bg-muted rounded font-mono">packages/contracts</span>
            </div>

            <div className="flex items-center gap-3">
              {pingCount > 0 && (
                <span className="text-xs text-muted-foreground font-mono">
                  Pings: {pingCount}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePing}
                disabled={isFetching}
                className="gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <span className={`w-2 h-2 rounded-full bg-emerald-500 ${isFetching ? "animate-ping" : ""}`} />
                {isFetching ? "Pinging..." : "Ping System"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
