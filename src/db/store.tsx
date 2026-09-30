/* ============================================================================
   PROVIDER DE DADOS — estado único da aplicação + persistência automática.
   Recarregar a página nunca perde nada: tudo é gravado em IndexedDB.
   ========================================================================== */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import type {
  BancoDados,
  BaseEntidade,
  Configuracao,
  ContatoCliente,
  Venda,
} from '@/types';
import { agora, uuid } from '@/lib/format';
import { carregarBanco, apagarBanco, salvarBanco } from './persistencia';
import { bancoVazio, criarSeed, CONFIG_PADRAO } from './seed';
import { calcularRBT12, derivar, vendasDoMes, type ContextoDerivacao } from './deriva';
import { mesDe } from './deriva';

export type NomeColecao = Exclude<keyof BancoDados, 'versao' | 'configuracao' | 'alertasSilenciados'>;

export type CriarFn = <C extends BaseEntidade>(
  colecao: NomeColecao,
  dados: Omit<C, keyof BaseEntidade> & Partial<C>,
) => C;
export type AtualizarFn = <C extends BaseEntidade>(colecao: NomeColecao, id: string, patch: Partial<C>) => void;

export interface AcoesDados {
  criar: CriarFn;
  atualizar: AtualizarFn;
  remover: (colecao: NomeColecao, id: string) => void;
  arquivar: (colecao: NomeColecao, id: string, arquivado: boolean) => void;
  atualizarConfig: (patch: Partial<Configuracao>) => void;
  substituir: (banco: BancoDados) => void;
  reiniciarComSeed: () => void;
  limparDemonstracao: () => void;
  apagarTudo: () => void;
  silenciarAlerta: (chave: string) => void;
  proximoNumeroVenda: () => string;
  /** Contatos do cliente não carregam `criadoEm`/`atualizadoEm` no modelo. */
  registrarContato: (dados: Omit<ContatoCliente, 'id'>) => void;
}

export interface ContextoDados extends AcoesDados {
  bd: BancoDados;
  derivado: ContextoDerivacao;
  configuracao: Configuracao;
  carregando: boolean;
  rbt12: number;
  pedidosNoMes: number;
}

const Contexto = createContext<ContextoDados | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [bd, setBd] = useState<BancoDados>(() => bancoVazio());
  const [carregando, setCarregando] = useState(true);
  const primeiraCarga = useRef(true);

  /* ------------------------------ Carga inicial ------------------------- */
  useEffect(() => {
    let vivo = true;
    (async () => {
      const [salvo] = await Promise.all([carregarBanco(), esperaMinima(420)]);
      if (!vivo) return;
      setBd(salvo ?? criarSeed());
      primeiraCarga.current = false;
      setCarregando(false);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  /* --------------------------- Gravação automática --------------------- */
  useEffect(() => {
    if (primeiraCarga.current || carregando) return;
    const t = setTimeout(() => void salvarBanco(bd), 220);
    return () => clearTimeout(t);
  }, [bd, carregando]);

  /* ------------------------------ Ações CRUD --------------------------- */
  type Lista = BaseEntidade[];

  const criar = useCallback(
    ((colecao: NomeColecao, dados: Record<string, unknown>) => {
      const registro = {
        ...dados,
        id: uuid(),
        criadoEm: agora(),
        atualizadoEm: agora(),
        arquivado: false,
      };
      setBd((atual) => ({ ...atual, [colecao]: [registro, ...(atual[colecao] as unknown as Lista)] }) as BancoDados);
      return registro;
    }) as CriarFn,
    [],
  );

  const atualizar = useCallback(
    ((colecao: NomeColecao, id: string, patch: Record<string, unknown>) => {
      setBd(
        (atual) =>
          ({
            ...atual,
            [colecao]: (atual[colecao] as unknown as Lista).map((r) =>
              r.id === id ? ({ ...r, ...patch, id: r.id, atualizadoEm: agora() } as BaseEntidade) : r,
            ),
          }) as BancoDados,
      );
    }) as AtualizarFn,
    [],
  );

  const remover = useCallback((colecao: NomeColecao, id: string) => {
    setBd(
      (atual) =>
        ({
          ...atual,
          [colecao]: (atual[colecao] as unknown as Lista).filter((r) => r.id !== id),
        }) as BancoDados,
    );
  }, []);

  const arquivar = useCallback(
    (colecao: NomeColecao, id: string, valor: boolean) => {
      (atualizar as AtualizarFn)(colecao, id, { arquivado: valor } as Partial<BaseEntidade>);
    },
    [atualizar],
  );

  const atualizarConfig = useCallback((patch: Partial<Configuracao>) => {
    setBd((atual) => ({ ...atual, configuracao: { ...atual.configuracao, ...patch, atualizadoEm: agora() } }));
  }, []);

  const substituir = useCallback((banco: BancoDados) => setBd(banco), []);

  const reiniciarComSeed = useCallback(() => {
    setBd(criarSeed());
  }, []);

  const limparDemonstracao = useCallback(() => {
    setBd((atual) => {
      const vazio = bancoVazio({ ...atual.configuracao, dadosDemonstracao: false });
      return vazio;
    });
  }, []);

  const apagarTudo = useCallback(async () => {
    await apagarBanco();
    setBd(bancoVazio());
  }, []);

  const silenciarAlerta = useCallback((chave: string) => {
    setBd((atual) =>
      atual.alertasSilenciados.includes(chave)
        ? atual
        : { ...atual, alertasSilenciados: [...atual.alertasSilenciados, chave] },
    );
  }, []);

  const registrarContato = useCallback((dados: Omit<ContatoCliente, 'id'>) => {
    setBd((atual) => ({ ...atual, contatos: [{ id: uuid(), ...dados }, ...atual.contatos] }));
  }, []);

  const proximoNumeroVenda = useCallback(() => {
    const maior = bd.vendas.reduce((max, v) => {
      const n = Number(v.numero.replace(/\D/g, '')) || 0;
      return n > max ? n : max;
    }, 0);
    return `V-${String(maior + 1).padStart(4, '0')}`;
  }, [bd.vendas]);

  /* ------------------------------ Derivados ----------------------------- */
  const derivado = useMemo(() => derivar(bd), [bd]);
  const rbt12 = useMemo(() => calcularRBT12(bd.vendas), [bd.vendas]);
  const pedidosNoMes = useMemo(() => {
    const hoje = new Date();
    return vendasDoMes(bd.vendas, hoje.getFullYear(), hoje.getMonth() + 1).length;
  }, [bd.vendas]);

  const valor: ContextoDados = {
    bd,
    derivado,
    configuracao: bd.configuracao,
    carregando,
    rbt12,
    pedidosNoMes,
    criar,
    atualizar,
    remover,
    arquivar,
    atualizarConfig,
    substituir,
    reiniciarComSeed,
    limparDemonstracao,
    apagarTudo,
    silenciarAlerta,
    proximoNumeroVenda,
    registrarContato,
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useDados(): ContextoDados {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useDados precisa estar dentro de <DataProvider>');
  return ctx;
}

/* ------------------------------ Utilidades ------------------------------- */

function esperaMinima(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Atalho tipado para criar uma venda já com número sequencial. */
export function useCriarVenda() {
  const { criar, proximoNumeroVenda } = useDados();
  return useCallback(
    (dados: Omit<Venda, keyof BaseEntidade | 'numero' | 'id' | 'criadoEm' | 'atualizadoEm' | 'arquivado'>) => {
      const venda = criar<Venda>('vendas', { ...dados, numero: proximoNumeroVenda() });
      toast.success(`Pedido ${venda.numero} criado`);
      return venda;
    },
    [criar, proximoNumeroVenda],
  );
}

export { mesDe, CONFIG_PADRAO };
