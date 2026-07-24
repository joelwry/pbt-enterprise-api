"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { loginSchema, type LoginFormValues } from "@/features/auth/login-schema";
import { useLogin, getAuthErrorMessage } from "@/features/auth/hooks/use-login";

export function LoginForm() {
  const router = useRouter();
  const { mutate, isPending, error } = useLogin();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  function onSubmit(values: LoginFormValues) {
    mutate(values, {
      onSuccess: () => router.push("/dashboard"),
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]"
        >
          {getAuthErrorMessage(error)}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@email.com"
          autoComplete="email"
          invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && <p className="text-xs text-error">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••••"
          autoComplete="current-password"
          invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-error">{errors.password.message}</p>}
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Controller
            control={control}
            name="rememberMe"
            render={({ field }) => (
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <span className="text-sm text-text-secondary">Remember me</span>
        </label>
        <Button variant="link" type="button" className="text-sm">
          Forgot password?
        </Button>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            Sign In
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
