import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";

const columns: ColumnDef<{ key: string }>[] = [{ accessorKey: "key", header: "Your permissions" }];

export function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Hi, {user?.name}</h1>
          <p className="text-sm text-muted-foreground">Roles: {user?.roles.join(", ")}</p>
        </div>
        <Button variant="outline" onClick={() => { logout(); navigate("/"); }}>Sign out</Button>
      </header>
      <DataTable columns={columns} data={(user?.permissions ?? []).map((key) => ({ key }))} />
    </main>
  );
}
