/* Período de análise compartilhado entre Visão Geral, Financeiro e Metas,
   para que os três mostrem exatamente os mesmos números. */

import { MESES, deISO, toISO } from './format';

export type TipoPeriodo = 'MES' | 'TRIMESTRE' | 'ANO' | 'PERSONALIZADO';

export interface Periodo {
  tipo: TipoPeriodo;
  inicio: string;
  fim: string;
  rotulo: string;
  /** mês/ano de referência (1–12) */
  mes: number;
  ano: number;
  /** período imediatamente anterior, do mesmo tamanho — base da variação */
  anterior: { inicio: string; fim: string };
  rotuloAnterior: string;
}

export const ROTULO_TIPO: Record<TipoPeriodo, string> = {
  MES: 'Mês',
  TRIMESTRE: 'Trimestre',
  ANO: 'Ano',
  PERSONALIZADO: 'Personalizado',
};

function chaveMes(mes: number, ano: number) {
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

export function resolverPeriodo(tipo: TipoPeriodo, ref = new Date(), custom?: { inicio: string; fim: string }): Periodo {
  const ano = ref.getFullYear();
  const mes = ref.getMonth() + 1;

  if (tipo === 'PERSONALIZADO' && custom?.inicio && custom?.fim) {
    const dias = Math.max(
      1,
      Math.round(((deISO(custom.fim)?.getTime() ?? 0) - (deISO(custom.inicio)?.getTime() ?? 0)) / 86_400_000),
    );
    const fimAnterior = toISO(new Date((deISO(custom.inicio)?.getTime() ?? 0) - 86_400_000));
    const inicioAnterior = toISO(new Date((deISO(custom.inicio)?.getTime() ?? 0) - (dias + 1) * 86_400_000));
    return {
      tipo,
      inicio: custom.inicio,
      fim: custom.fim,
      rotulo: 'Período personalizado',
      mes,
      ano,
      anterior: { inicio: inicioAnterior, fim: fimAnterior },
      rotuloAnterior: 'Período anterior',
    };
  }

  if (tipo === 'TRIMESTRE') {
    const trimestre = Math.floor((mes - 1) / 3);
    const mesIni = trimestre * 3 + 1;
    const mesFim = mesIni + 2;
    const inicio = `${chaveMes(mesIni, ano)}-01`;
    const fim = toISO(new Date(ano, mesFim, 0));
    const rotulo = `T${trimestre + 1}/${ano}`;
    return {
      tipo,
      inicio,
      fim,
      rotulo,
      mes,
      ano,
      anterior: { inicio: `${ano - 1}-01-01`, fim: `${ano - 1}-12-31` },
      rotuloAnterior: `Ano ${ano - 1}`,
    };
  }

  if (tipo === 'ANO') {
    return {
      tipo,
      inicio: `${ano}-01-01`,
      fim: `${ano}-12-31`,
      rotulo: `Ano ${ano}`,
      mes,
      ano,
      anterior: { inicio: `${ano - 1}-01-01`, fim: `${ano - 1}-12-31` },
      rotuloAnterior: `Ano ${ano - 1}`,
    };
  }

  // Mês (padrão)
  const inicio = `${chaveMes(mes, ano)}-01`;
  const fim = toISO(new Date(ano, mes, 0));
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const anoAnterior = mes === 1 ? ano - 1 : ano;
  return {
    tipo,
    inicio,
    fim,
    rotulo: `${MESES[mes - 1]} de ${ano}`,
    mes,
    ano,
    anterior: {
      inicio: `${chaveMes(mesAnterior, anoAnterior)}-01`,
      fim: toISO(new Date(anoAnterior, mesAnterior, 0)),
    },
    rotuloAnterior: `${MESES[mesAnterior - 1]} de ${anoAnterior}`,
  };
}

/** Últimos N meses terminando em (mes, ano). */
export function ultimosMeses(n: number, mes: number, ano: number): Array<{ mes: number; ano: number; rotulo: string }> {
  const lista: Array<{ mes: number; ano: number; rotulo: string }> = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ano, mes - 1 - i, 1);
    lista.push({
      mes: d.getMonth() + 1,
      ano: d.getFullYear(),
      rotulo: `${MESES[d.getMonth()].slice(0, 3).toLowerCase()}/${String(d.getFullYear()).slice(2)}`,
    });
  }
  return lista;
}

export function intervaloDoMes(mes: number, ano: number): { inicio: string; fim: string } {
  return { inicio: `${chaveMes(mes, ano)}-01`, fim: toISO(new Date(ano, mes, 0)) };
}

export function diasDoPeriodo(inicio: string, fim: string): number {
  const a = deISO(inicio);
  const b = deISO(fim);
  if (!a || !b) return 30;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1);
}
