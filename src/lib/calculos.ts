/* ============================================================================
   MÓDULO DE CÁLCULO — fonte única de verdade para TODA a aplicação.
   Regras implementadas exatamente conforme §7 do projeto. Nenhuma fórmula
   alternativa é usada em nenhuma tela.
   ========================================================================== */

import type { Configuracao, Lancamento, Meta, Produto, StatusEstoque, Venda } from '@/types';

/* ---------------------------------------------------------------- 7.1 ---- */
/** Simples Nacional — Anexo I (Comércio), pela faixa de RBT12. */
export const ANEXO_I = [
  { limiteInferior: 0, limiteSuperior: 180000, aliquota: 4.0, deduzir: 0, faixa: '1ª' },
  { limiteInferior: 180000.01, limiteSuperior: 360000, aliquota: 7.3, deduzir: 5940, faixa: '2ª' },
  { limiteInferior: 360000.01, limiteSuperior: 720000, aliquota: 9.5, deduzir: 13860, faixa: '3ª' },
  { limiteInferior: 720000.01, limiteSuperior: 1800000, aliquota: 10.7, deduzir: 22500, faixa: '4ª' },
  { limiteInferior: 1800000.01, limiteSuperior: 3600000, aliquota: 14.3, deduzir: 87300, faixa: '5ª' },
  { limiteInferior: 3600000.01, limiteSuperior: 4800000, aliquota: 19.0, deduzir: 378000, faixa: '6ª' },
] as const;

export function faixaAnexoI(rbt12: number) {
  return ANEXO_I.find((x) => rbt12 <= x.limiteSuperior) ?? ANEXO_I[ANEXO_I.length - 1];
}

/** Alíquota efetiva como FRAÇÃO (0.04 = 4%). */
export function aliquotaEfetiva(rbt12: number): number {
  const f = faixaAnexoI(rbt12);
  if (rbt12 <= 0) return 0;
  return (rbt12 * (f.aliquota / 100) - f.deduzir) / rbt12;
}

/** Alíquota efetiva como PERCENTUAL (4 = 4%). */
export function aliquotaEfetivaPct(rbt12: number): number {
  return aliquotaEfetiva(rbt12) * 100;
}

/** DAS proporcional ao RBT12 (§7.1). */
export function dasMensal(rbt12: number): number {
  if (rbt12 <= 0) return 0;
  return rbt12 * 0.11 * aliquotaEfetiva(rbt12);
}

/** Quanto ainda cabe faturar no ano corrente antes de estourar um limite. */
export function headroomLimite(rbt12: number, limite: number): number {
  return Math.max(0, limite - rbt12);
}

/** Dias restantes até o sublimite, na velocidade de faturamento dos últimos 90 dias. */
export function diasAteLimite(rbt12: number, limite: number, faturamento90d: number): number | null {
  const restante = headroomLimite(rbt12, limite);
  if (restante <= 0) return 0;
  const diario = faturamento90d / 90;
  if (diario <= 0) return null;
  return Math.floor(restante / diario);
}

/* ---------------------------------------------------------------- 7.2 ---- */

export interface ContextoCalculo {
  /** Receita bruta acumulada dos últimos 12 meses. */
  rbt12: number;
  /** Número de pedidos do mês corrente (para ratear despesa fixa). */
  pedidosNoMes: number;
  /** Custo fixo mensal — sobrepõe Configuração quando informado. */
  custoFixoMensal?: number;
  /** Custo de entrega a ratear. */
  custoEntrega?: number;
}

export interface ResultadoMargem {
  impostos: number;
  custosProd: number;
  entrega: number;
  comissao: number;
  mc: number;
  mcPct: number;
  rateioDespesaFixa: number;
  lucro: number;
}

/**
 * Margem de contribuição de uma venda (§7.2).
 * `impostoPct` = alíquota efetiva do Simples Nacional (fração) no RBT12 atual.
 */
export function margemContribuicao(
  venda: { valorTotal: number; itens: Array<{ quantidade: number; custoUnitario: number }> } & { custoEntrega?: number },
  config: Configuracao,
  ctx: ContextoCalculo,
): ResultadoMargem {
  const i = aliquotaEfetiva(ctx.rbt12);
  const impostos = venda.valorTotal * i;
  const custosProd = venda.itens.reduce((s, it) => s + it.quantidade * it.custoUnitario, 0);
  const entrega = venda.custoEntrega ?? ctx.custoEntrega ?? 0;
  const comissao = venda.valorTotal * (config.comissaoPadraoPct / 100);

  const mc = venda.valorTotal - impostos - custosProd - entrega - comissao;
  const mcPct = venda.valorTotal > 0 ? mc / venda.valorTotal : 0;
  const custoFixo = ctx.custoFixoMensal ?? config.tributacao.custoFixoMensal;
  const rateioDespesaFixa = custoFixo / Math.max(ctx.pedidosNoMes, 1);
  const lucro = mc - rateioDespesaFixa;

  return { impostos, custosProd, entrega, comissao, mc, mcPct, rateioDespesaFixa, lucro };
}

/** Totalizadores de uma venda — derivados, nunca persistidos. */
export function totaisVenda(venda: Pick<Venda, 'itens'>) {
  const valorBruto = venda.itens.reduce(
    (s, it) => s + it.quantidade * it.precoUnitario,
    0,
  );
  const valorDesconto = venda.itens.reduce(
    (s, it) => s + it.quantidade * it.precoUnitario * ((it.descontoItemPct ?? 0) / 100),
    0,
  );
  const custoTotal = venda.itens.reduce((s, it) => s + it.quantidade * it.custoUnitario, 0);
  return { valorBruto, valorDesconto, valorTotal: valorBruto - valorDesconto, custoTotal };
}

/** Margem de contribuição de um produto avulso (mesma regra da venda, R$ 1). */
export function margemProduto(
  produto: Pick<Produto, 'custoUnitario' | 'precoVendaUnitario'>,
  config: Configuracao,
  ctx: ContextoCalculo,
  custoEntregaRateado = 0,
) {
  const i = aliquotaEfetiva(ctx.rbt12);
  const preco = produto.precoVendaUnitario;
  const impostos = preco * i;
  const comissao = preco * (config.comissaoPadraoPct / 100);
  const mc = preco - impostos - produto.custoUnitario - custoEntregaRateado - comissao;
  const mcPct = preco > 0 ? mc / preco : 0;
  const custoFixo = ctx.custoFixoMensal ?? config.tributacao.custoFixoMensal;
  const rateioDespesaFixa = custoFixo / Math.max(ctx.pedidosNoMes, 1);
  return {
    impostoPct: i * 100,
    comissaoPct: config.comissaoPadraoPct,
    margemBrutaPct: preco > 0 ? (preco - produto.custoUnitario) / preco : 0,
    margemBruta: preco - produto.custoUnitario,
    impostos,
    comissao,
    margemContribuicao: mc,
    margemContribuicaoPct: mcPct,
    rateioDespesaFixa,
    lucroEstimado: mc - rateioDespesaFixa,
  };
}

/* ---------------------------------------------------------------- 7.3 ---- */

/** Preço de venda necessário para a margem desejada (§7.3). */
export function precoNecessario(
  custoTotal: number,
  margemDesejadaPct: number,
  impostoPct: number,
): number {
  const den = 1 - impostoPct / 100 - margemDesejadaPct / 100;
  if (den <= 0) return 0;
  return custoTotal / den;
}

/* ---------------------------------------------------------------- 7.4 ---- */

/** Ponto de equilíbrio mensal (§7.4). */
export function pontoDeEquilibrioMensal(
  custoFixoMensal: number,
  margemContribuicaoMediaPct: number,
): number {
  if (margemContribuicaoMediaPct <= 0) return 0;
  return custoFixoMensal / (margemContribuicaoMediaPct / 100);
}

/* ---------------------------------------------------------------- 7.6 ---- */

export function statusEstoque(p: {
  estoqueAtual: number;
  estoqueMinimo: number;
  pontoDePedido: number;
  estoqueMaximo: number;
}): StatusEstoque {
  if (p.estoqueAtual === 0) return 'ZERADO';
  if (p.estoqueAtual <= p.estoqueMinimo) return 'CRITICO';
  if (p.estoqueAtual <= p.pontoDePedido) return 'BAIXO';
  if (p.estoqueMaximo > 0 && p.estoqueAtual > p.estoqueMaximo) return 'EXCESSO';
  return 'SAUDAVEL';
}

/* ---------------------------------------------------------------- 7.5 ---- */

export interface ResumoPeriodo {
  vendas: Venda[];
  custoTotal: number;
  lucro: number;
}

/** Agrega vendas num período, já com margem de contribuição calculada. */
export function resumoVendas(
  vendas: Venda[],
  config: Configuracao,
  rbt12: number,
  pedidosNoMes: number,
  custoFixoMensal?: number,
) {
  let faturamento = 0;
  let custo = 0;
  let mc = 0;
  let impostos = 0;
  let comissao = 0;
  let entrega = 0;

  for (const v of vendas) {
    const t = totaisVenda(v);
    const m = margemContribuicao(
      { valorTotal: t.valorTotal, itens: v.itens, custoEntrega: 0 },
      config,
      { rbt12, pedidosNoMes, custoFixoMensal },
    );
    faturamento += t.valorTotal;
    custo += t.custoTotal;
    mc += m.mc;
    impostos += m.impostos;
    comissao += m.comissao;
    entrega += m.entrega;
  }

  const qtd = vendas.length;
  const rateio = (custoFixoMensal ?? config.tributacao.custoFixoMensal) / Math.max(pedidosNoMes, 1);

  return {
    qtd,
    faturamento,
    custo,
    impostos,
    comissao,
    entrega,
    margemContribuicao: mc,
    margemMediaPct: faturamento > 0 ? mc / faturamento : 0,
    ticketMedio: qtd > 0 ? faturamento / qtd : 0,
    lucroLiquido: mc - rateio * qtd,
    rateioDespesaFixa: rateio,
  };
}

export interface Indicadores {
  faturamento: number;
  ticketMedio: number;
  margemMediaPct: number;
  custoAquisicaoCAC: number;
  taxaRecompra: number;
  diasSemComprarMedio: number;
  giroEstoque: number;
  inadimplencia: number;
  estoqueParado: number;
  lucroLiquido: number;
}

/* ============================ Contexto de taux de variação ================ */

export function variacao(atual: number, anterior: number): number | null {
  if (!Number.isFinite(anterior) || anterior === 0) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

/* ================================ Metas ================================== */

export type ChaveMeta = keyof Meta['metas'];

export function compararComMeta(valor: number, meta: number): number {
  if (!meta) return 0;
  return (valor / meta) * 100;
}

export function statusAtingimento(pct: number): 'BOM' | 'ATENCAO' | 'ABAIXO' {
  if (pct >= 100) return 'BOM';
  if (pct >= 70) return 'ATENCAO';
  return 'ABAIXO';
}

/* ============================== Fluxo de caixa =========================== */

export function classificarLancamento(l: Lancamento, hoje: string): Lancamento['status'] {
  if (l.status === 'CANCELADO') return 'CANCELADO';
  if (l.status !== 'PENDENTE') return l.status;
  if (l.dataVencimento && l.dataVencimento < hoje) return 'VENCIDO';
  return 'PENDENTE';
}

export function idadeAging(dias: number): { rotulo: string; nivel: 'ok' | 'proximo' | 'atraso' | 'critico' } {
  if (dias < 0) return { rotulo: `vence em ${Math.abs(dias)}d`, nivel: 'proximo' };
  if (dias === 0) return { rotulo: 'vence hoje', nivel: 'proximo' };
  if (dias <= 3) return { rotulo: `atrasado há ${dias}d`, nivel: 'atraso' };
  return { rotulo: `atrasado há ${dias}d`, nivel: 'critico' };
}
