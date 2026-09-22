"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, ArrowRight, Loader2, Shield } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirectTo") || null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message || "E-mail ou senha incorretos.");
        return;
      }

      // Determina destino inteligente pós-login
      const emailLower = (data?.user?.email || email).trim().toLowerCase();
      let destination = "/painel";

      if (redirectTo && !redirectTo.startsWith("/entrar") && !redirectTo.startsWith("/cadastrar")) {
        destination = redirectTo;
      } else if (emailLower === "moiseztorres100@gmail.com") {
        destination = "/admin";
      } else {
        // Checa se o usuário possui registro ativo em admin_users
        try {
          const { data: adminCheck } = await supabase
            .from("admin_users")
            .select("id")
            .eq("id", data?.user?.id)
            .eq("status", "active")
            .maybeSingle();

          if (adminCheck) {
            destination = "/admin";
          }
        } catch {
          // Mantém /painel caso a tabela ainda não exista
        }
      }

      router.push(destination);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err?.message || "Ocorreu um erro ao tentar entrar.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-slate-200/80 shadow-xl backdrop-blur-sm dark:border-slate-800">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Acessar sua conta</CardTitle>
        <CardDescription>
          Digite seu e-mail e senha para acessar o painel
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {redirectTo === "/admin" && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/40 dark:text-amber-300">
              <Shield className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Autenticação exigida para acessar a <strong>Administração do Portal (/admin)</strong>.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="exemplo@imobiliaria.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Link
                href="/recuperar-senha"
                className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Entrando...
              </>
            ) : (
              <>
                Entrar
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 text-center">
          <span>Administradores Master são direcionados automaticamente para o </span>
          <strong className="text-slate-700 dark:text-slate-300">/admin</strong>.
        </div>
      </CardContent>

      <CardFooter className="flex flex-col space-y-2 border-t border-slate-100 p-6 text-center text-sm text-slate-500 dark:border-slate-800">
        <div>
          Ainda não tem conta?{" "}
          <Link
            href="/cadastrar"
            className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Criar conta grátis
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
