/* ============================================================================
   DERIVAÇÕES — todo campo calculado que aparece nas telas.
   Nada aqui é persistido: é sempre recalculado a partir dos dados brutos,
   garantindo que Visão Geral, Financeiro, Produtos e Metas mostrem
   exatamente o mesmo número.
   ========================================================================== */

import type {
  BancoDados,
  Cliente,
  Configuracao,
  Fornecedor,
  Produto,
  StatusEstoque,
  Venda,
} from '@/types';
import { diasEntre, hojeISO, deISO, toISO } from '@/lib/format';
import { statusEstoque, totaisVenda } from '@/lib/calculos';

export interface ProdutoCalculado extends Produto {
  margemBrutaPct: number;
  custoTotalPedidoMinimo: number;
  impostoPct: number;
  comissaoPct: number;
  custoEntregaRateado: number;
  margemContribuicao: number;
  margemContribuicaoPct: number;
  valorEmEstoque: number;
  statusEstoque: StatusEstoque;
  giroMensal: number;
  unidadesVendidasPeriodo: number;
  receitaPeriodo: number;
  diasSemGiro: number | null;
  diasEstoque: number | null;
  nomeFornecedor: string;
}

export interface ClienteCalculado extends Cliente {
  totalComprado: number;
  ticketMedio: number;
  numeroDePedidos: number;
  inadimplencia: number;
  diasSemComprar: number;
  primeiroPedidoEm?: string;
  ultimoPedidoEm?: string;
  nomeTabelaPreco?: string;
  condicaoPagamentoTabela?: string;
  pedidoMinimoTabela: number;
}

export interface FornecedorCalculado extends Fornecedor {
  totalComprado: number;
  ticketMedioCompra: number;
  numeroDePedidos: number;
  participacaoComprasPct: number;
  numProdutos: number;
}

export type VendaCalculada = Venda & {
  valorBruto: number;
  valorDesconto: number;
  valorTotal: number;
  custoTotal: number;
  nomeCliente: string;
};

export interface ContextoDerivacao {
  produtos: ProdutoCalculado[];
  clientes: ClienteCalculado[];
  fornecedores: FornecedorCalculado[];
  vendas: VendaCalculada[];
  nomeProduto: (id: string) => string;
}

/** Vendas que entram no faturamento: tudo que não foi cancelado ou devolvido. */
export function vendasValidas<T extends { status: string }>(vendas: T[]): T[] {
  return vendas.filter((v) => v.status !== 'CANCELADO' && v.status !== 'DEVOLVIDO');
}

export function dentroDoPeriodo(iso: string | undefined, inicio: string, fim: string): boolean {
  if (!iso) return false;
  const d = iso.slice(0, 10);
  return d >= inicio && d <= fim;
}

/**
 * Enriquece produtos, clientes e fornecedores com todos os campos derivados.
 * Chamado uma única vez por mudança de dados, no provider.
 */
export function derivar(bd: BancoDados): ContextoDerivacao {
  const hoje = hojeISO();
  const config: Configuracao = bd.configuracao;
  const inicio90 = toISO(new Date(Date.now() - 90 * 86_400_000));
  const inicio30 = toISO(new Date(Date.now() - 30 * 86_400_000));

  /* ------------------------------ Vendas --------------------------------- */
  const vendas: VendaCalculada[] = bd.vendas.map((v) => {
    const t = totaisVenda(v);
    return {
      ...v,
      ...t,
      nomeCliente: bd.clientes.find((c) => c.id === v.clienteId)?.nome ?? 'Cliente removido',
    };
  });
  const vendasBoas = vendasValidas(vendas);

  /* ----------------------------- Clientes -------------------------------- */
  const porCliente = new Map<string, Venda[]>();
  for (const v of vendasBoas) {
    const arr = porCliente.get(v.clienteId) ?? [];
    arr.push(v);
    porCliente.set(v.clienteId, arr);
  }

  const clientes: ClienteCalculado[] = bd.clientes.map((c) => {
    const suas = (porCliente.get(c.id) ?? []).sort((a, b) => a.dataEmissao.localeCompare(b.dataEmissao));
    const total = suas.reduce((s, v) => s + totaisVenda(v).valorTotal, 0);
    const ultimo = suas.length > 0 ? suas[suas.length - 1].dataEmissao : undefined;
    const primeiro = suas.length > 0 ? suas[0].dataEmissao : undefined;
    // Inadimplência: lançamentos de entrada vencidos e não recebidos do cliente.
    const atraso = bd.lancamentos
      .filter(
        (l) =>
          l.clienteId === c.id &&
          l.tipo === 'ENTRADA' &&
          (l.status === 'VENCIDO' || (l.status === 'PENDENTE' && (l.dataVencimento ?? '') < hoje)),
      )
      .reduce((s, l) => s + l.valor, 0);
    const tabela = bd.segmentosPreco.find((t) => t.id === c.segmentoPrecoId);
    const diasSemComprar = ultimo ? Math.max(0, diasEntre(ultimo, hoje)) : 0;

    return {
      ...c,
      totalComprado: total,
      ticketMedio: suas.length > 0 ? total / suas.length : 0,
      numeroDePedidos: suas.length,
      inadimplencia: atraso,
      diasSemComprar,
      primeiroPedidoEm: primeiro ?? c.primeiroPedidoEm,
      ultimoPedidoEm: ultimo ?? c.ultimoPedidoEm,
      nomeTabelaPreco: tabela?.nome,
      condicaoPagamentoTabela: tabela?.condicaoPagamento,
      pedidoMinimoTabela: tabela?.pedidoMinimoValor ?? config.pedidoMinimoPadrao,
    };
  });

  /* ---------------------------- Fornecedores ------------------------------ */
  // Compras = lançamentos de SAÍDA da categoria de compras ligados ao fornecedor.
  const comprasPorFornecedor = new Map<string, { total: number; n: number }>();
  for (const l of bd.lancamentos) {
    if (l.tipo !== 'SAIDA' || !l.fornecedorId) continue;
    if (!/compra|mercadoria/i.test(l.categoria)) continue;
    const cur = comprasPorFornecedor.get(l.fornecedorId) ?? { total: 0, n: 0 };
    cur.total += l.valor;
    cur.n += 1;
    comprasPorFornecedor.set(l.fornecedorId, cur);
  }
  const totalComprasGeral = [...comprasPorFornecedor.values()].reduce((s, c) => s + c.total, 0);
  const produtosPorFornecedor = new Map<string, number>();
  for (const p of bd.produtos) {
    produtosPorFornecedor.set(p.fornecedorId, (produtosPorFornecedor.get(p.fornecedorId) ?? 0) + 1);
  }

  const fornecedores: FornecedorCalculado[] = bd.fornecedores.map((f) => {
    const c = comprasPorFornecedor.get(f.id) ?? { total: 0, n: 0 };
    return {
      ...f,
      totalComprado: c.total,
      ticketMedioCompra: c.n > 0 ? c.total / c.n : 0,
      numeroDePedidos: c.n,
      participacaoComprasPct: totalComprasGeral > 0 ? (c.total / totalComprasGeral) * 100 : 0,
      numProdutos: produtosPorFornecedor.get(f.id) ?? 0,
    };
  });

  /* ------------------------------ Produtos -------------------------------- */
  const unidadesPorProduto = new Map<string, number>();
  const unidades30 = new Map<string, number>();
  const receitaPorProduto = new Map<string, number>();
  const ultimaVendaProduto = new Map<string, string>();

  for (const v of vendasBoas) {
    for (const it of v.itens) {
      unidadesPorProduto.set(it.produtoId, (unidadesPorProduto.get(it.produtoId) ?? 0) + it.quantidade);
      receitaPorProduto.set(it.produtoId, (receitaPorProduto.get(it.produtoId) ?? 0) + it.quantidade * it.precoUnitario);
      if (dentroDoPeriodo(v.dataEmissao, inicio30, hoje)) {
        unidades30.set(it.produtoId, (unidades30.get(it.produtoId) ?? 0) + it.quantidade);
      }
      const atual = ultimaVendaProduto.get(it.produtoId);
      if (!atual || v.dataEmissao > atual) ultimaVendaProduto.set(it.produtoId, v.dataEmissao);
    }
  }

  // Rateio do custo de entrega: custo médio ÷ nº médio de itens por pedido.
  const totalItens = vendasBoas.reduce((s, v) => s + v.itens.length, 0);
  const mediaItensPorVenda = vendasBoas.length > 0 ? Math.max(1, totalItens / vendasBoas.length) : 1;
  const custoEntregaRateado = config.custoEntregaMedioPadrao / mediaItensPorVenda;

  // RBT12 e pedidos do mês (entrada das fórmulas de margem)
  const rbt12 = vendasBoas
    .filter((v) => v.dataEmissao >= inicio90)
    .reduce((s, v) => s + totaisVenda(v).valorTotal, 0);
  const i = aliquota(rbt12);
  const comissaoPct = config.comissaoPadraoPct;

  const produtos: ProdutoCalculado[] = bd.produtos.map((p) => {
    const preco = p.precoVendaUnitario;
    const impostos = preco * i;
    const comissao = preco * (comissaoPct / 100);
    // O frete é custo do PEDIDO (§7.2 usa venda.custoEntrega), não do item. Por isso
    // a margem do produto não o desconta — ele aparece rateado em custoEntregaRateado.
    const mc = preco - impostos - p.custoUnitario - comissao;
    const unidades = unidadesPorProduto.get(p.id) ?? 0;
    const ultima = ultimaVendaProduto.get(p.id);
    const fornecedor = bd.fornecedores.find((f) => f.id === p.fornecedorId);
    const consumoDiario = unidades / 90;

    return {
      ...p,
      margemBrutaPct: preco > 0 ? (preco - p.custoUnitario) / preco : 0,
      custoTotalPedidoMinimo: p.custoUnitario * 6, // 1 caixa com 6 unidades
      impostoPct: i * 100,
      comissaoPct,
      custoEntregaRateado,
      margemContribuicao: mc,
      margemContribuicaoPct: preco > 0 ? mc / preco : 0,
      valorEmEstoque: p.custoUnitario * p.estoqueAtual,
      statusEstoque: statusEstoque(p),
      giroMensal: unidades30.get(p.id) ?? 0,
      unidadesVendidasPeriodo: unidades,
      receitaPeriodo: receitaPorProduto.get(p.id) ?? 0,
      diasSemGiro: ultima ? diasEntre(ultima, hoje) : null,
      diasEstoque: consumoDiario > 0 ? p.estoqueAtual / consumoDiario : null,
      nomeFornecedor: fornecedor?.nome ?? 'Sem fornecedor',
    };
  });

  return {
    produtos,
    clientes,
    fornecedores,
    vendas,
    nomeProduto: (id: string) => bd.produtos.find((p) => p.id === id)?.nome ?? 'Produto removido',
  };
}

/* Pequeno atalho local para não criar dependência circular com §7. */
function aliquota(rbt12: number): number {
  // Espelha ANEXO_I do módulo de cálculo (§7.1) sem importar o módulo inteiro.
  const faixas: Array<[number, number, number]> = [
    [180000, 4, 0],
    [360000, 7.3, 5940],
    [720000, 9.5, 13860],
    [1800000, 10.7, 22500],
    [3600000, 14.3, 87300],
    [4800000, 19, 378000],
  ];
  if (rbt12 <= 0) return 0;
  const [, aliq, ded] = faixas.find(([limite]) => rbt12 <= limite)!;
  return (rbt12 * (aliq / 100) - ded) / rbt12;
}

/** RBT12 (receita bruta acumulada dos últimos 12 meses) a partir das vendas. */
export function calcularRBT12(vendas: Venda[], meses = 12): number {
  const limite = toISO(new Date(Date.now() - (meses * 30 + 1) * 86_400_000));
  const hoje = hojeISO();
  return vendasValidas(vendas)
    .filter((v) => dentroDoPeriodo(v.dataEmissao, limite, hoje))
    .reduce((s, v) => s + totaisVenda(v).valorTotal, 0);
}

export function vendasDoMes(vendas: Venda[], ano: number, mes: number): Venda[] {
  const pre = `${ano}-${String(mes).padStart(2, '0')}`;
  return vendasValidas(vendas).filter((v) => v.dataEmissao.startsWith(pre));
}

export function inicioFimMes(ano: number, mes: number): { inicio: string; fim: string } {
  return {
    inicio: `${ano}-${String(mes).padStart(2, '0')}-01`,
    fim: toISO(new Date(ano, mes, 0)),
  };
}

export function mesDe(iso: string): { ano: number; mes: number } {
  const d = deISO(iso);
  return d ? { ano: d.getFullYear(), mes: d.getMonth() + 1 } : { ano: new Date().getFullYear(), mes: 1 };
}
