/* ============================================================================
   INDICADORES — agregação única usada pela Visão Geral, pelo Financeiro e
   pela tela de Metas. Garante que os três mostrem sempre o mesmo número.
   ========================================================================== */

import type { BancoDados, Configuracao, Meta } from '@/types';
import type { ClienteCalculado, ProdutoCalculado, VendaCalculada } from '@/db/deriva';
import { dentroDoPeriodo, vendasValidas } from '@/db/deriva';
import { diasEntre, hojeISO } from './format';
import { resumoVendas, totaisVenda, variacao } from './calculos';
import type { Periodo } from './periodo';

export interface ResumoGeral {
  vendas: VendaCalculada[];
  vendasAnteriores: VendaCalculada[];
  faturamento: number;
  faturamentoAnterior: number;
  custo: number;
  margem: number;
  margemPct: number;
  margemPctAnterior: number | null;
  lucro: number;
  lucroAnterior: number;
  ticket: number;
  ticketAnterior: number;
  pedidos: number;
  pedidosAnteriores: number;
}

export function resumirPeriodo(
  vendas: VendaCalculada[],
  periodo: Periodo,
  config: Configuracao,
  rbt12: number,
  pedidosNoMes: number,
): ResumoGeral {
  const noPeriodo = vendasValidas(vendas).filter((v) => dentroDoPeriodo(v.dataEmissao, periodo.inicio, periodo.fim));
  const noAnterior = vendasValidas(vendas).filter((v) =>
    dentroDoPeriodo(v.dataEmissao, periodo.anterior.inicio, periodo.anterior.fim),
  );

  const r = resumoVendas(noPeriodo, config, rbt12, pedidosNoMes);
  const rAnt = resumoVendas(noAnterior, config, rbt12, 1);

  return {
    vendas: noPeriodo,
    vendasAnteriores: noAnterior,
    faturamento: r.faturamento,
    faturamentoAnterior: rAnt.faturamento,
    custo: r.custo,
    margem: r.margemContribuicao,
    margemPct: r.margemMediaPct,
    margemPctAnterior: rAnt.qtd > 0 ? rAnt.margemMediaPct : null,
    lucro: r.lucroLiquido,
    lucroAnterior: rAnt.lucroLiquido,
    ticket: r.ticketMedio,
    ticketAnterior: rAnt.ticketMedio,
    pedidos: r.qtd,
    pedidosAnteriores: rAnt.qtd,
  };
}

/* ------------------------------- Financeiro ------------------------------ */

export interface ResumoFinanceiro {
  aReceberAberto: number;
  aReceberVencido: number;
  aPagarMes: number;
  aPagarVencido: number;
  entradasRealizadas: number;
  saidasRealizadas: number;
  saldoRealizado: number;
}

export function resumirFinanceiro(bd: BancoDados, periodo: Periodo): ResumoFinanceiro {
  const emAberto = bd.lancamentos.filter(
    (l) => !l.arquivado && l.status === 'PENDENTE' && (!l.dataVencimento || l.dataVencimento >= hojeISO()),
  );
  const vencidos = bd.lancamentos.filter(
    (l) =>
      !l.arquivado &&
      (l.status === 'VENCIDO' || (l.status === 'PENDENTE' && (l.dataVencimento ?? '') < hojeISO())),
  );

  const noPeriodo = bd.lancamentos.filter(
    (l) => !l.arquivado && l.status !== 'CANCELADO' && dentroDoPeriodo(l.data, periodo.inicio, periodo.fim),
  );
  const realizadas = noPeriodo.filter((l) => l.status === 'PAGO' || l.status === 'RECEBIDO');
  const entradas = realizadas.filter((l) => l.tipo === 'ENTRADA').reduce((s, l) => s + l.valor, 0);
  const saidas = realizadas.filter((l) => l.tipo === 'SAIDA').reduce((s, l) => s + l.valor, 0);

  const pagarMes = emAberto.filter((l) => l.tipo === 'SAIDA');
  const receberAberto = emAberto.filter((l) => l.tipo === 'ENTRADA');

  return {
    aReceberAberto: receberAberto.reduce((s, l) => s + l.valor, 0),
    aReceberVencido: vencidos.filter((l) => l.tipo === 'ENTRADA').reduce((s, l) => s + l.valor, 0),
    aPagarMes: pagarMes.reduce((s, l) => s + l.valor, 0),
    aPagarVencido: vencidos.filter((l) => l.tipo === 'SAIDA').reduce((s, l) => s + l.valor, 0),
    entradasRealizadas: entradas,
    saidasRealizadas: saidas,
    saldoRealizado: entradas - saidas,
  };
}

/* -------------------------------- DRE ------------------------------------ */

export interface Dre {
  receitaBruta: number;
  cmv: number;
  lucroBruto: number;
  despesasFixas: number;
  despesasVariaveis: number;
  impostos: number;
  lucroLiquido: number;
  margemBrutaPct: number;
  margemLiquidaPct: number;
}

export function calcularDRE(
  vendas: VendaCalculada[],
  lancamentos: BancoDados['lancamentos'],
  periodo: Periodo,
  config: Configuracao,
  rbt12: number,
): Dre {
  const r = resumirVendasComContexto(vendas, periodo, config, rbt12);
  const noPeriodo = lancamentos.filter(
    (l) => !l.arquivado && l.status !== 'CANCELADO' && dentroDoPeriodo(l.data, periodo.inicio, periodo.fim),
  );
  const saidas = noPeriodo.filter((l) => l.tipo === 'SAIDA');
  const despesasFixas = saidas.filter((l) => l.fixo).reduce((s, l) => s + l.valor, 0);
  // Reposição de estoque não é despesa: o custo já entra no CMV (§7). Sem isso
  // o mesmo custo seria descontado duas vezes no DRE.
  const despesasVariaveis = saidas
    .filter((l) => !l.fixo && l.categoria !== 'Impostos' && l.categoria !== 'Compras de Mercadorias')
    .reduce((s, l) => s + l.valor, 0);
  const impostos = r.impostos + saidas.filter((l) => l.categoria === 'Impostos').reduce((s, l) => s + l.valor, 0);

  const lucroBruto = r.faturamento - r.custo;
  return {
    receitaBruta: r.faturamento,
    cmv: r.custo,
    lucroBruto,
    despesasFixas,
    despesasVariaveis,
    impostos,
    lucroLiquido: lucroBruto - despesasFixas - despesasVariaveis - impostos,
    margemBrutaPct: r.faturamento > 0 ? lucroBruto / r.faturamento : 0,
    margemLiquidaPct: r.faturamento > 0 ? (lucroBruto - despesasFixas - despesasVariaveis - impostos) / r.faturamento : 0,
  };
}

function resumirVendasComContexto(vendas: VendaCalculada[], periodo: Periodo, config: Configuracao, rbt12: number) {
  const noPeriodo = vendasValidas(vendas).filter((v) => dentroDoPeriodo(v.dataEmissao, periodo.inicio, periodo.fim));
  return resumoVendas(noPeriodo, config, rbt12, Math.max(1, noPeriodo.length));
}

/* -------------------------- Painel de indicadores ------------------------ */

export type ChaveIndicador =
  | 'faturamento'
  | 'ticketMedio'
  | 'margemMedia'
  | 'novosClientes'
  | 'pedidos'
  | 'giroEstoque'
  | 'taxaRecompra'
  | 'inadimplencia'
  | 'cac'
  | 'estoqueParado';

export interface LinhaIndicador {
  chave: ChaveIndicador;
  rotulo: string;
  ajuda: string;
  realizado: number;
  meta: number | null;
  tipoValor: 'moeda' | 'percentual' | 'numero' | 'dias';
  menorMelhor: boolean;
  /** true = o número veio da meta cadastrada; false = é uma referência do painel */
  metaCadastrada: boolean;
  atingimento: number | null;
  status: 'BOM' | 'ATENCAO' | 'ABAIXO' | 'SEM_META';
}

export interface EntradaPainel {
  resumo: ResumoGeral;
  clientes: ClienteCalculado[];
  produtos: ProdutoCalculado[];
  gastos: BancoDados['gastosMarketing'];
  lancamentos: BancoDados['lancamentos'];
  meta: Meta | undefined;
  config: Configuracao;
  periodo: Periodo;
}

export function painelIndicadores(e: EntradaPainel): LinhaIndicador[] {
  const { resumo, clientes, produtos, gastos, lancamentos, meta, config, periodo } = e;
  const hoje = hojeISO();

  const novosClientes = clientes.filter(
    (c) => !c.arquivado && c.primeiroPedidoEm && dentroDoPeriodo(c.primeiroPedidoEm, periodo.inicio, periodo.fim),
  ).length;

  const clientesAtivos = clientes.filter((c) => !c.arquivado && ['CLIENTE_ATIVO', 'INADIMPLETE'].includes(c.status));
  const comPedido = clientesAtivos.filter((c) => c.numeroDePedidos >= 2).length;
  const comAoMenosUm = clientesAtivos.filter((c) => c.numeroDePedidos >= 1).length;
  const taxaRecompra = comAoMenosUm > 0 ? comPedido / comAoMenosUm : 0;

  const faturamentoPeriodo = resumo.faturamento;
  const emAberto = lancamentos.filter(
    (l) =>
      !l.arquivado &&
      l.tipo === 'ENTRADA' &&
      (l.status === 'VENCIDO' || (l.status === 'PENDENTE' && (l.dataVencimento ?? '') < hoje)),
  );
  const inadimplencia = faturamentoPeriodo > 0 ? emAberto.reduce((s, l) => s + l.valor, 0) / faturamentoPeriodo : 0;

  const investimento = gastos
    .filter((g) => !g.arquivado && dentroDoPeriodo(g.data, periodo.inicio, periodo.fim))
    .reduce((s, g) => s + g.valor, 0);
  const clientesGerados = gastos
    .filter((g) => !g.arquivado && dentroDoPeriodo(g.data, periodo.inicio, periodo.fim))
    .reduce((s, g) => s + (g.clientesGerados || 0), 0);
  const cac = clientesGerados > 0 ? investimento / clientesGerados : 0;

  // Giro de estoque = custo vendido no período ÷ estoque médio (30 dias de venda)
  const custoVendido = resumo.custo;
  const estoqueMedio = produtos.reduce((s, p) => s + p.valorEmEstoque, 0) || 1;
  const diasPeriodo = Math.max(
    1,
    Math.round(
      ((new Date(periodo.fim).getTime() - new Date(periodo.inicio).getTime()) / 86_400_000) + 1,
    ),
  );
  const estoqueMedioPeriodo = (estoqueMedio * Math.min(diasPeriodo, 30)) / 30;
  const giro = custoVendido / Math.max(estoqueMedioPeriodo, 1);

  const estoqueParado = produtos
    .filter((p) => !p.arquivado && p.estoqueAtual > 0 && (p.diasSemGiro === null || p.diasSemGiro > 90))
    .reduce((s, p) => s + p.valorEmEstoque, 0);

  const metas = meta?.metas;
  const linhas: Array<Omit<LinhaIndicador, 'atingimento' | 'status'>> = [
    {
      chave: 'faturamento',
      rotulo: 'Faturamento',
      ajuda: 'Soma de todos os pedidos emitidos no período, sem cancelados.',
      realizado: faturamentoPeriodo,
      meta: metas?.faturamento ?? null,
      tipoValor: 'moeda',
      menorMelhor: false,
      metaCadastrada: !!metas?.faturamento,
    },
    {
      chave: 'ticketMedio',
      rotulo: 'Ticket Médio',
      ajuda: 'Faturamento dividido pelo número de pedidos.',
      realizado: resumo.ticket,
      meta: metas?.ticketMedio ?? null,
      tipoValor: 'moeda',
      menorMelhor: false,
      metaCadastrada: !!metas?.ticketMedio,
    },
    {
      chave: 'margemMedia',
      rotulo: 'Margem de Contribuição',
      ajuda: 'O que sobra de cada real depois de imposto, custo do produto e entrega.',
      realizado: resumo.margemPct * 100,
      meta: metas?.margemMedia ?? config.margemAlvo,
      tipoValor: 'percentual',
      menorMelhor: false,
      metaCadastrada: !!metas?.margemMedia,
    },
    {
      chave: 'pedidos',
      rotulo: 'Pedidos no período',
      ajuda: 'Quantidade de pedidos emitidos (sem cancelados e devolvidos).',
      realizado: resumo.pedidos,
      meta: metas?.pedidos ?? null,
      tipoValor: 'numero',
      menorMelhor: false,
      metaCadastrada: !!metas?.pedidos,
    },
    {
      chave: 'novosClientes',
      rotulo: 'Novos clientes',
      ajuda: 'Clientes cujo primeiro pedido caiu dentro do período.',
      realizado: novosClientes,
      meta: metas?.novosClientes ?? null,
      tipoValor: 'numero',
      menorMelhor: false,
      metaCadastrada: !!metas?.novosClientes,
    },
    {
      chave: 'giroEstoque',
      rotulo: 'Giro de estoque',
      ajuda: 'Quantas vezes o estoque se renovou no período. Maior é melhor.',
      realizado: giro,
      meta: metas?.giroEstoque ?? null,
      tipoValor: 'numero',
      menorMelhor: false,
      metaCadastrada: !!metas?.giroEstoque,
    },
    {
      chave: 'taxaRecompra',
      rotulo: 'Taxa de recompra',
      ajuda: 'Clientes ativos com 2 ou mais pedidos ÷ clientes ativos com ao menos 1.',
      realizado: taxaRecompra * 100,
      meta: 60,
      tipoValor: 'percentual',
      menorMelhor: false,
      metaCadastrada: false,
    },
    {
      chave: 'inadimplencia',
      rotulo: 'Inadimplência',
      ajuda: 'Valores vencidos e não recebidos ÷ faturamento do período.',
      realizado: inadimplencia * 100,
      meta: 5,
      tipoValor: 'percentual',
      menorMelhor: true,
      metaCadastrada: false,
    },
    {
      chave: 'cac',
      rotulo: 'Custo de aquisição (CAC)',
      ajuda: 'Investimento em marketing ÷ clientes gerados. Menor é melhor.',
      realizado: cac,
      meta: 80,
      tipoValor: 'moeda',
      menorMelhor: true,
      metaCadastrada: false,
    },
    {
      chave: 'estoqueParado',
      rotulo: 'Estoque parado',
      ajuda: 'Valor em estoque de itens sem giro há mais de 90 dias.',
      realizado: estoqueParado,
      meta: 0,
      tipoValor: 'moeda',
      menorMelhor: true,
      metaCadastrada: false,
    },
  ];

  return linhas.map((l) => {
    if (l.meta === null) {
      return { ...l, atingimento: null, status: 'SEM_META' as const };
    }
    if (l.meta === 0) {
      const ok = l.realizado === 0;
      return { ...l, atingimento: ok ? 100 : 0, status: ok ? ('BOM' as const) : ('ABAIXO' as const) };
    }
    const bruto = (l.realizado / l.meta) * 100;
    const atingimento = l.menorMelhor ? (bruto > 0 ? 100 - Math.min(100, bruto) : 100) : bruto;
    const status = l.realizado === 0 && l.meta > 0 ? 'ABAIXO' : atingimento >= 100 ? 'BOM' : atingimento >= 70 ? 'ATENCAO' : 'ABAIXO';
    return { ...l, atingimento, status };
  });
}

export { variacao, diasEntre, totaisVenda };
