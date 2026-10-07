import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@pharma/contracts";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/features/auth/google-button";
import { useLogin } from "@/features/auth/use-auth";
import { apiErrorMessage } from "@/lib/api";

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (v: LoginInput) =>
    login.mutate(v, { onSuccess: () => navigate("/app"), onError: (e) => toast.error(apiErrorMessage(e)) });

  return (
    <main className="mx-auto flex min-h-screen max-w-sm items-center p-6">
      <Card className="w-full">
        <CardHeader><CardTitle>Sign in</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={login.isPending}>Sign in</Button>
          </form>
          <GoogleButton />
          <p className="text-sm text-muted-foreground">
            New pharmacy? <Link className="text-primary underline" to="/register">Create an account</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
