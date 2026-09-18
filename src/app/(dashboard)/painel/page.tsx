import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  MessageSquare,
  TrendingUp,
  PlusCircle,
  FileCode,
  ArrowUpRight,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Painel da Imobiliária
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Visão Geral
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Acompanhe o desempenho do seu estoque, geração de contatos e status de integração.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/painel/imoveis">
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <PlusCircle className="h-4 w-4" />
              Novo Imóvel
            </Button>
          </Link>
          <Link href="/painel/integracoes">
            <Button variant="outline" className="gap-2">
              <FileCode className="h-4 w-4" />
              Feed XML
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Cards de Métricas Principais (Seção 54) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Imóveis Ativos
            </CardTitle>
            <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">0</div>
            <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
              <span>Nenhum anúncio publicado ainda</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Visualizações (30d)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">0</div>
            <p className="mt-1 text-xs text-slate-500">
              Métricas de visualização em tempo real
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Leads Recebidos
            </CardTitle>
            <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">0</div>
            <p className="mt-1 text-xs text-slate-500">
              Formulários e contatos diretos
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Cliques no WhatsApp
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">0</div>
            <p className="mt-1 text-xs text-slate-500">
              Contatos imediatos de compradores
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção Próximos Passos & Integração */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Primeiros Passos</CardTitle>
            <CardDescription>
              Configure sua imobiliária para começar a receber leads
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold dark:bg-indigo-950 dark:text-indigo-400">
                1
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Conecte sua conta do Supabase
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Defina as credenciais no arquivo .env.local para habilitar o banco de dados.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-600 text-xs font-bold dark:bg-slate-800 dark:text-slate-400">
                2
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Cadastre ou importe seus imóveis
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Na próxima fase serão aplicadas as migrations com suporte geográfico PostGIS.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status de Sincronização XML */}
        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Integração de Feeds</CardTitle>
              <Badge variant="outline" className="text-xs">
                Aguardando Configuração
              </Badge>
            </div>
            <CardDescription>
              Status de sincronização com CRMs parceiros (VRSync / XML)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
              <Clock className="mx-auto h-8 w-8 text-slate-400" />
              <h4 className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                Nenhum feed vinculado
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                O importador VRSync será ativado na Fase 4 conforme o MASTER_PLAN.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
