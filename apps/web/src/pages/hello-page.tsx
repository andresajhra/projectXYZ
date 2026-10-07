import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useHello } from "@/features/hello/use-hello";
import { isTauri, tauriHello } from "@/lib/platform";

export function HelloPage() {
  const api = useHello();
  const desktop = useQuery({
    queryKey: ["tauri-hello"],
    queryFn: () => tauriHello("Pharma ERP"),
    enabled: isTauri,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Pharma ERP: hello world</h1>

      <Card>
        <CardHeader>
          <CardTitle>Backend (NestJS)</CardTitle>
          <CardDescription>GET /api/hello</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3 text-sm">
          {api.isPending && "Connecting…"}
          {api.isError && <span className="text-destructive">Cannot reach the API. Is it running on port 3000?</span>}
          {api.data && (
            <>
              <span>{api.data.message}</span>
              <Badge ok={api.data.database === "up"}>database {api.data.database}</Badge>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Desktop (Tauri)</CardTitle>
          <CardDescription>{isTauri ? "invoke('hello')" : "Running in the browser"}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {isTauri ? (desktop.data ?? "Calling Rust…") : "Open this app with `pnpm dev:desktop` to see the Rust response."}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button asChild><Link to="/login">Sign in</Link></Button>
        <Button asChild variant="outline"><Link to="/register">Create account</Link></Button>
      </div>
    </main>
  );
}
