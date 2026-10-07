import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@pharma/contracts";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegister } from "@/features/auth/use-auth";
import { apiErrorMessage } from "@/lib/api";

const fields = [
  { name: "tenantName", label: "Pharmacy name", type: "text" },
  { name: "name", label: "Your name", type: "text" },
  { name: "email", label: "Email", type: "email" },
  { name: "password", label: "Password", type: "password" },
] as const;

export function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = (v: RegisterInput) =>
    registerMutation.mutate(v, {
      onSuccess: () => { toast.success("Account created"); navigate("/app"); },
      onError: (e) => toast.error(apiErrorMessage(e)),
    });

  return (
    <main className="mx-auto flex min-h-screen max-w-sm items-center p-6">
      <Card className="w-full">
        <CardHeader><CardTitle>Create your pharmacy account</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {fields.map((f) => (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={f.name}>{f.label}</Label>
                <Input id={f.name} type={f.type} {...register(f.name)} />
                {errors[f.name] && <p className="text-xs text-destructive">{errors[f.name]?.message}</p>}
              </div>
            ))}
            <Button type="submit" className="w-full" disabled={registerMutation.isPending}>Create account</Button>
          </form>
          <p className="text-sm text-muted-foreground">
            Already registered? <Link className="text-primary underline" to="/login">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
