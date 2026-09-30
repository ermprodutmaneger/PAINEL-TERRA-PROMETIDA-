/* Roteador mínimo baseado na History API — SPA, sem dependência extra. */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export const ROTAS = [
  { caminho: '/', rotulo: 'Visão Geral', icone: 'LayoutDashboard', atalho: 'D' },
  { caminho: '/produtos', rotulo: 'Produtos', icone: 'Package', atalho: 'P' },
  { caminho: '/fornecedores', rotulo: 'Fornecedores', icone: 'Factory', atalho: 'F' },
  { caminho: '/clientes', rotulo: 'Clientes', icone: 'Users', atalho: 'C' },
  { caminho: '/vendas', rotulo: 'Vendas & Pedidos', icone: 'ReceiptText', atalho: 'V' },
  { caminho: '/financeiro', rotulo: 'Financeiro', icone: 'Wallet', atalho: '$' },
  { caminho: '/notas-fiscais', rotulo: 'Notas Fiscais', icone: 'FileText', atalho: '' },
  { caminho: '/marketing', rotulo: 'Marketing', icone: 'Megaphone', atalho: '' },
  { caminho: '/metas', rotulo: 'Metas & Indicadores', icone: 'Target', atalho: '' },
  { caminho: '/configuracoes', rotulo: 'Configurações', icone: 'Settings', atalho: '' },
] as const;

export type CaminhoRota = (typeof ROTAS)[number]['caminho'];

export interface EstadoRota {
  caminho: string;
  consulta: URLSearchParams;
  ir: (caminho: string, consulta?: Record<string, string>) => void;
  trocarConsulta: (patch: Record<string, string | undefined>) => void;
}

const Contexto = createContext<EstadoRota | null>(null);

function ler(): { path: string; search: string } {
  return { path: window.location.pathname || '/', search: window.location.search };
}

export function ProvedorRota({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState(ler);

  useEffect(() => {
    const aoMudar = () => setEstado(ler());
    window.addEventListener('popstate', aoMudar);
    return () => window.removeEventListener('popstate', aoMudar);
  }, []);

  const ir = useCallback((caminho: string, consulta?: Record<string, string>) => {
    const params = new URLSearchParams(consulta);
    const busca = params.toString();
    window.history.pushState({}, '', `${caminho}${busca ? `?${busca}` : ''}`);
    setEstado(ler());
    window.scrollTo({ top: 0 });
  }, []);

  const trocarConsulta = useCallback((patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) params.delete(k);
      else params.set(k, v);
    }
    const busca = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${busca ? `?${busca}` : ''}`);
    setEstado(ler());
  }, []);

  const valor = useMemo<EstadoRota>(
    () => ({ caminho: estado.path, consulta: new URLSearchParams(estado.search), ir, trocarConsulta }),
    [estado, ir, trocarConsulta],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useRota(): EstadoRota {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useRota precisa estar dentro de <ProvedorRota>');
  return ctx;
}
