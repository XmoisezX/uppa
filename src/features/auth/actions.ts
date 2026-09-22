"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface AuthActionResult {
  error?: string;
  success?: boolean;
}

/**
 * Realiza autenticação com e-mail e senha
 */
export async function loginAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Por favor, preencha todos os campos." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message || "Falha ao entrar. Verifique seus dados." };
  }

  revalidatePath("/", "layout");
  const emailLower = email?.trim().toLowerCase() || "";
  if (emailLower === "moiseztorres100@gmail.com") {
    redirect("/admin");
  } else {
    redirect("/painel");
  }
}

/**
 * Cria uma nova conta de usuário
 */
export async function signupAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = (formData.get("role") as string) || "consumer";

  if (!email || !password || !fullName) {
    return { error: "Por favor, preencha todos os campos obrigatórios." };
  }

  if (password.length < 6) {
    return { error: "A senha deve conter no mínimo 6 caracteres." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message || "Erro ao realizar cadastro." };
  }

  return {
    success: true,
  };
}

/**
 * Envia e-mail para recuperação de senha
 */
export async function resetPasswordAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Informe o seu e-mail cadastrado." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/auth/callback?next=/painel/configuracoes`,
  });

  if (error) {
    return { error: error.message || "Erro ao solicitar recuperação de senha." };
  }

  return {
    success: true,
  };
}

/**
 * Encerra a sessão do usuário
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/entrar");
}
