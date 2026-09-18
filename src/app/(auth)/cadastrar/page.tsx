"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { AlertCircle, CheckCircle2, Loader2, Building, User, Award } from "lucide-react";
import type { UserRole } from "@/types/auth";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("consumer");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) {
        setErrorMsg(error.message || "Erro ao criar conta.");
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.message || "Ocorreu um erro ao processar o cadastro.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="border-slate-200/80 shadow-xl dark:border-slate-800 text-center">
        <CardHeader className="space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Conta criada com sucesso!</CardTitle>
          <CardDescription>
            Enviamos um link de confirmação para <strong>{email}</strong>. Por
            favor, verifique sua caixa de entrada e spam para ativar seu acesso.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center p-6 pt-0">
          <Link href="/entrar" className="w-full">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
              Ir para o Login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/80 shadow-xl backdrop-blur-sm dark:border-slate-800">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Criar sua conta</CardTitle>
        <CardDescription>
          Faça parte da maior infraestrutura imobiliária nacional
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Seletor de Perfil */}
          <div className="space-y-2">
            <Label>Tipo de Perfil</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole("consumer")}
                className={`flex flex-col items-center justify-center rounded-lg border p-3 text-xs font-medium transition-all ${
                  role === "consumer"
                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                    : "border-slate-200 hover:bg-slate-50 text-slate-600 dark:border-slate-800 dark:text-slate-400"
                }`}
              >
                <User className="h-4 w-4 mb-1" />
                Comprador
              </button>
              <button
                type="button"
                onClick={() => setRole("broker")}
                className={`flex flex-col items-center justify-center rounded-lg border p-3 text-xs font-medium transition-all ${
                  role === "broker"
                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                    : "border-slate-200 hover:bg-slate-50 text-slate-600 dark:border-slate-800 dark:text-slate-400"
                }`}
              >
                <Award className="h-4 w-4 mb-1" />
                Corretor
              </button>
              <button
                type="button"
                onClick={() => setRole("agency_admin")}
                className={`flex flex-col items-center justify-center rounded-lg border p-3 text-xs font-medium transition-all ${
                  role === "agency_admin"
                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                    : "border-slate-200 hover:bg-slate-50 text-slate-600 dark:border-slate-800 dark:text-slate-400"
                }`}
              >
                <Building className="h-4 w-4 mb-1" />
                Imobiliária
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fullName">Nome Completo / Razão Social</Label>
            <Input
              id="fullName"
              placeholder="Ex: João Silva ou Imobiliária Alpha"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 mt-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Criando conta...
              </>
            ) : (
              "Criar Conta Gratuita"
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center border-t border-slate-100 p-6 text-sm text-slate-500 dark:border-slate-800">
        <div>
          Já possui uma conta?{" "}
          <Link
            href="/entrar"
            className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Fazer login
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
