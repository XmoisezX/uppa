"use client";

import React, { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { createAgencyAction, updateAgencyAction } from "./actions";
import type { UserAgencyMembership } from "@/types/agency";

export function AgencySettingsView({
  membership,
}: {
  membership: UserAgencyMembership | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Se o usuário já possui imobiliária vinculada
  if (membership && !isEditing) {
    const { agency, role } = membership;
    const canEdit = role === "owner" || role === "admin";

    return (
      <div className="space-y-6">
        <Card className="border-slate-200/80 shadow-sm dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">{agency.name}</CardTitle>
                <CardDescription className="text-xs">
                  Slug público: /imobiliaria/{agency.slug}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-indigo-600 capitalize">
                {role === "owner" ? "Proprietário (Owner)" : role}
              </Badge>
              {agency.verifiedAt && (
                <Badge variant="success" className="gap-1">
                  <ShieldCheck className="h-3 w-3" /> Verificado
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <span className="text-xs text-slate-500 font-medium">CRECI</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{agency.creci}</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <span className="text-xs text-slate-500 font-medium">WhatsApp de Leads</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{agency.whatsapp}</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <span className="text-xs text-slate-500 font-medium">E-mail de Contato</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{agency.email}</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <span className="text-xs text-slate-500 font-medium">Telefone Fixo</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{agency.phone || "Não informado"}</p>
            </div>

            {agency.description && (
              <div className="md:col-span-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <span className="text-xs text-slate-500 font-medium">Descrição Institucional</span>
                <p className="text-slate-700 dark:text-slate-300 mt-1">{agency.description}</p>
              </div>
            )}
          </CardContent>

          {canEdit && (
            <CardFooter className="flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
              <Button onClick={() => setIsEditing(true)} variant="outline">
                Editar Dados da Imobiliária
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    );
  }

  // Formulário de Criação (Onboarding) ou Edição
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData(e.currentTarget);

    try {
      if (membership && isEditing) {
        formData.append("agencyId", membership.agency.id);
        const res = await updateAgencyAction(null, formData);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setSuccessMsg("Dados da imobiliária atualizados com sucesso!");
          setIsEditing(false);
        }
      } else {
        const res = await createAgencyAction(null, formData);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setSuccessMsg("Imobiliária cadastrada com sucesso! Você foi vinculado como Owner.");
          window.location.reload();
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Ocorreu um erro ao salvar os dados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-200/80 shadow-md dark:border-slate-800">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          {membership ? "Editar Imobiliária" : "Cadastrar Imobiliária Parceira"}
        </CardTitle>
        <CardDescription>
          {membership
            ? "Atualize as informações cadastrais da sua imobiliária"
            : "Complete o cadastro para gerenciar seus corretores, imóveis e receber leads"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome Fantasia da Imobiliária *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={membership?.agency.name || ""}
                placeholder="Ex: Aliança Imóveis"
                required
                disabled={loading}
              />
            </div>

            {!membership && (
              <div className="space-y-1.5">
                <Label htmlFor="slug">Slug da URL *</Label>
                <Input
                  id="slug"
                  name="slug"
                  placeholder="ex: alianca-imoveis"
                  required
                  disabled={loading}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="creci">CRECI (com estado) *</Label>
              <Input
                id="creci"
                name="creci"
                defaultValue={membership?.agency.creci || ""}
                placeholder="Ex: 12345-J"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">WhatsApp Comercial (com DDD) *</Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                defaultValue={membership?.agency.whatsapp || ""}
                placeholder="Ex: 53999998888"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail Corporativo *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={membership?.agency.email || ""}
                placeholder="contato@aliancaimoveis.com.br"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone Fixo</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={membership?.agency.phone || ""}
                placeholder="Ex: 5332221100"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="legalName">Razão Social</Label>
              <Input
                id="legalName"
                name="legalName"
                defaultValue={membership?.agency.legalName || ""}
                placeholder="Ex: Aliança Empreendimentos Imobiliários Ltda"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="document">CNPJ / CPF</Label>
              <Input
                id="document"
                name="document"
                defaultValue={membership?.agency.document || ""}
                placeholder="Ex: 00.000.000/0001-00"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição / Apresentação</Label>
            <textarea
              id="description"
              name="description"
              defaultValue={membership?.agency.description || ""}
              rows={3}
              placeholder="Fale sobre a história e atuação da sua imobiliária..."
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : membership ? (
                "Salvar Alterações"
              ) : (
                "Cadastrar e Tornar-se Owner"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
