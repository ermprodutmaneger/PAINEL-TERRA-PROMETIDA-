/* Tema claro/escuro — aplica a classe `dark` e persiste a preferência. */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type PreferenciaTema = 'CLARO' | 'ESCURO' | 'SISTEMA';
const CHAVE = 'terra-prometida-express/tema';

interface CtxTema {
  preferencia: PreferenciaTema;
  escuro: boolean;
  definir: (p: PreferenciaTema) => void;
  alternar: () => void;
}

const Contexto = createContext<CtxTema | null>(null);

function preferenciaInicial(): PreferenciaTema {
  const salvo = localStorage.getItem(CHAVE);
  return salvo === 'CLARO' || salvo === 'ESCURO' || salvo === 'SISTEMA' ? salvo : 'SISTEMA';
}

function escuroDoSistema(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ProvedorTema({ children }: { children: ReactNode }) {
  const [preferencia, setPreferencia] = useState<PreferenciaTema>(preferenciaInicial);
  const [escuro, setEscuro] = useState(() =>
    preferenciaInicial() === 'ESCURO' ||
      (preferenciaInicial() === 'SISTEMA' && escuroDoSistema()),
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', escuro);
    root.style.colorScheme = escuro ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', escuro ? '#10130F' : '#2F5D3A');
  }, [escuro]);

  useEffect(() => {
    if (preferencia !== 'SISTEMA') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const aoMudar = () => setEscuro(mq.matches);
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, [preferencia]);

  const definir = useCallback((p: PreferenciaTema) => {
    localStorage.setItem(CHAVE, p);
    setPreferencia(p);
    setEscuro(p === 'ESCURO' || (p === 'SISTEMA' && escuroDoSistema()));
  }, []);

  const alternar = useCallback(() => {
    definir(escuro ? 'CLARO' : 'ESCURO');
  }, [definir, escuro]);

  return (
    <Contexto.Provider value={{ preferencia, escuro, definir, alternar }}>{children}</Contexto.Provider>
  );
}

export function useTema(): CtxTema {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useTema precisa estar dentro de <ProvedorTema>');
  return ctx;
}
