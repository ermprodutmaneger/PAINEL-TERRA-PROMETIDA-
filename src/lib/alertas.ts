/* ============================================================================
   MOTOR DE ALERTAS — as 12 regras do §9.
   Cada alerta tem uma chave estável (para silenciar), uma severidade e um
   destino clicável que leva direto à tela de resolução.
   ========================================================================== */

import type { BancoDados, Configuracao } from '@/types';
import type { ClienteCalculado, ProdutoCalculado, FornecedorCalculado } from '@/db/deriva';
import { aliquotaEfetivaPct, faixaAnexoI, headroomLimite, totaisVenda } from '@/lib/calculos';
import { dataBR, diasEntre, hojeISO, linkWhatsapp, moeda } from '@/lib/format';

export type Severidade = 'CRITICO' | 'ATENCAO' | 'AVISO';
export type Destino = 'produtos' | 'fornecedores' | 'clientes' | 'vendas' | 'financeiro' | 'notas-fiscais' | 'marketing' | 'metas';

export interface Alerta {
  chave: string;
  regra: number;
  severidade: Severidade;
  titulo: string;
  descricao: string;
  destino: Destino;
  /** texto enviado na URL para focar no registro */
  foco?: string;
  acao?: { rotulo: string; href: string };
}

export interface EntradaAlertas {
  bd: BancoDados;
  produtos: ProdutoCalculado[];
  clientes: ClienteCalculado[];
  fornecedores: FornecedorCalculado[];
  rbt12: number;
  silenciados: string[];
}

export function gerarAlertas(e: EntradaAlertas): Alerta[] {
  const { bd, produtos, clientes, fornecedores, rbt12 } = e;
  const config: Configuracao = bd.configuracao;
  const hoje = hojeISO();
  const alertas: Alerta[] = [];
  const add = (a: Alerta) => {
    if (!e.silenciados.includes(a.chave)) alertas.push(a);
  };

  /* 1 e 2 — Estoque baixo / zerado com venda ativa ------------------------ */
  if (config.alertas.estoqueBaixo) {
    for (const p of produtos.filter((x) => !x.arquivado && x.ativo)) {
      const temVendaAberta = bd.vendas.some(
        (v) =>
          !['ENTREGUE', 'CANCELADO', 'DEVOLVIDO'].includes(v.status) &&
          v.itens.some((i) => i.produtoId === p.id),
      );
      if (p.estoqueAtual === 0 && temVendaAberta) {
        add({
          chave: `estoque-zerado:${p.id}`,
          regra: 2,
          severidade: 'CRITICO',
          titulo: `${p.nome} está zerado`,
          descricao: `SKU ${p.sku} acabou e ainda existe pedido aberto deste produto. Reponha já.`,
          destino: 'produtos',
          foco: p.id,
        });
      } else if (p.estoqueAtual <= p.pontoDePedido && p.estoqueAtual > 0) {
        add({
          chave: `ponto-pedido:${p.id}`,
          regra: 1,
          severidade: 'AVISO',
          titulo: `${p.nome} chegou no ponto de pedido`,
          descricao: `Restam ${p.estoqueAtual} unidades (ponto de pedido: ${p.pontoDePedido}). Programar reposição.`,
          destino: 'produtos',
          foco: p.id,
        });
      }
    }
  }

  /* 3 — Validade próxima -------------------------------------------------- */
  if (config.alertas.validadeProxima) {
    for (const p of produtos.filter((x) => !x.arquivado && x.validade)) {
      const dias = diasEntre(hoje, p.validade!);
      if (dias < 0) {
        add({
          chave: `validade-vencida:${p.id}`,
          regra: 3,
          severidade: 'CRITICO',
          titulo: `${p.nome} venceu em ${dataBR(p.validade)}`,
          descricao: `SKU ${p.sku} está com validade passada. Separar e descartar.`,
          destino: 'produtos',
          foco: p.id,
        });
      } else if (dias <= 90) {
        add({
          chave: `validade-proxima:${p.id}`,
          regra: 3,
          severidade: 'ATENCAO',
          titulo: `${p.nome} vence em ${dias} dias`,
          descricao: `Validade ${dataBR(p.validade)}. Venda primeiro ou promova o lote.`,
          destino: 'produtos',
          foco: p.id,
        });
      }
    }
  }

  /* 4 — Margem de contribuição abaixo do mínimo --------------------------- */
  if (config.alertas.margemBaixa) {
    const i = aliquotaEfetivaPct(rbt12);
    for (const v of bd.vendas.filter((x) => !x.arquivado && !['CANCELADO', 'DEVOLVIDO'].includes(x.status))) {
      const t = totaisVenda(v);
      if (t.valorTotal <= 0) continue;
      const mc = t.valorTotal * (1 - i / 100 - config.comissaoPadraoPct / 100) - t.custoTotal;
      const mcPct = (mc / t.valorTotal) * 100;
      if (mcPct < config.margemMinimaAlerta) {
        add({
          chave: `margem-baixa:${v.id}`,
          regra: 4,
          severidade: 'CRITICO',
          titulo: `Pedido ${v.numero} com margem de ${mcPct.toFixed(1)}%`,
          descricao: `Abaixo do mínimo de ${config.margemMinimaAlerta}%. Reveja preço ou custo.`,
          destino: 'vendas',
          foco: v.id,
        });
      }
    }
    // Produtos com MC% abaixo do mínimo (mesma regra, visão de catálogo)
    for (const p of produtos.filter((x) => !x.arquivado && x.ativo && x.precoVendaUnitario > 0)) {
      if (p.margemContribuicaoPct * 100 < config.margemMinimaAlerta) {
        add({
          chave: `margem-produto:${p.id}`,
          regra: 4,
          severidade: 'AVISO',
          titulo: `${p.nome} está com MC de ${(p.margemContribuicaoPct * 100).toFixed(1)}%`,
          descricao: `SKU ${p.sku} rende pouco depois de impostos. Meta é ${config.margemAlvo}%.`,
          destino: 'produtos',
          foco: p.id,
        });
      }
    }
  }

  /* 5 — Cliente sem recompra ---------------------------------------------- */
  if (config.alertas.clienteSemRecompra) {
    for (const c of clientes.filter(
      (x) => !x.arquivado && ['CLIENTE_ATIVO', 'INADIMPLETE'].includes(x.status) && x.numeroDePedidos > 0,
    )) {
      if (c.diasSemComprar > 20) {
        add({
          chave: `sem-recompra:${c.id}`,
          regra: 5,
          severidade: c.inadimplencia > 0 ? 'CRITICO' : 'AVISO',
          titulo: `${c.nome} está há ${c.diasSemComprar} dias sem comprar`,
          descricao: c.inadimplencia > 0
            ? `Tem ${moeda(c.inadimplencia)} em atraso. Ligar para regularizar e retomar compras.`
            : 'Último pedido foi há mais de 20 dias. Faça um contato de retomada.',
          destino: 'clientes',
          foco: c.id,
          acao: {
            rotulo: 'Chamar no WhatsApp',
            href: linkWhatsapp(
              c.whatsapp || c.telefone,
              `Olá, ${c.nome}! Aqui é da Terra Prometida Express. Tudo bem? Estou entrando para ver como estão suas compras de temperos e condimentos. Posso montar uma proposta esta semana?`,
            ),
          },
        });
      }
    }
  }

  /* 6 — Nota fiscal vencida há mais de 3 dias ------------------------------ */
  if (config.alertas.boletoVencendo) {
    for (const n of bd.notasFiscais.filter((x) => !x.arquivado && !['PAGA', 'CANCELADA'].includes(x.status))) {
      const dias = diasEntre(n.dataVencimento, hoje);
      if (dias > 3) {
        const cliente = bd.clientes.find((c) => c.id === n.clienteId);
        add({
          chave: `nota-vencida:${n.id}`,
          regra: 6,
          severidade: 'CRITICO',
          titulo: `Nota ${n.numero}/${n.serie} vencida há ${dias} dias`,
          descricao: `${cliente?.nome ?? 'Cliente'} — ${moeda(n.valorTotal)} em atraso.`,
          destino: 'financeiro',
          foco: n.id,
        });
      }
    }
  }

  /* 7 — Venda com pagamento pendente há mais de 48h ----------------------- */
  for (const v of bd.vendas.filter((x) => !x.arquivado && x.status === 'PAGAMENTO_PENDENTE')) {
    const dias = diasEntre(v.dataEmissao, hoje);
    if (dias >= 2) {
      add({
        chave: `pagamento-pendente:${v.id}`,
        regra: 7,
        severidade: 'CRITICO',
        titulo: `Pedido ${v.numero} sem pagamento há ${dias} dias`,
        descricao: `${moeda(totaisVenda(v).valorTotal)} aguardando confirmação de pagamento.`,
        destino: 'vendas',
        foco: v.id,
      });
    }
  }

  /* 8 — RBT12 perto do sublimite da ME ------------------------------------- */
  if (config.alertas.limiteME) {
    const limite = config.tributacao.limiteME;
    if (rbt12 > 320000) {
      const faixa = faixaAnexoI(rbt12);
      add({
        chave: 'limite-me',
        regra: 8,
        severidade: 'ATENCAO',
        titulo: `RBT12 em ${moeda(rbt12)} — sublimite da ME`,
        descricao: `Só ${moeda(headroomLimite(rbt12, limite))} até o limite de ${moeda(limite)}. Alíquota efetiva hoje: ${aliquotaEfetivaPct(rbt12).toFixed(2)}% (${faixa.faixa} faixa).`,
        destino: 'financeiro',
      });
    }
  }

  /* 9 — Produto sem giro há mais de 90 dias ------------------------------- */
  if (config.alertas.estoqueBaixo) {
    for (const p of produtos.filter((x) => !x.arquivado && x.ativo)) {
      if (p.diasSemGiro !== null && p.diasSemGiro > 90 && p.estoqueAtual > 0) {
        add({
          chave: `sem-giro:${p.id}`,
          regra: 9,
          severidade: 'AVISO',
          titulo: `${p.nome} está parado há ${p.diasSemGiro} dias`,
          descricao: `${moeda(p.valorEmEstoque)} parados em estoque sem nenhuma saída.`,
          destino: 'produtos',
          foco: p.id,
        });
      } else if (p.diasSemGiro === null && p.estoqueAtual > 0 && p.valorEmEstoque > 50) {
        add({
          chave: `sem-giro-nunca:${p.id}`,
          regra: 9,
          severidade: 'AVISO',
          titulo: `${p.nome} nunca vendeu`,
          descricao: `${moeda(p.valorEmEstoque)} parados e nenhuma saída registrada.`,
          destino: 'produtos',
          foco: p.id,
        });
      }
    }
  }

  /* 10 — Dependência de fornecedor (>30% das compras) ---------------------- */
  for (const f of fornecedores.filter((x) => !x.arquivado && x.ativo)) {
    if (f.participacaoComprasPct > 30) {
      add({
        chave: `concentracao:${f.id}`,
        regra: 10,
        severidade: 'AVISO',
        titulo: `${f.nome} concentra ${f.participacaoComprasPct.toFixed(0)}% das compras`,
        descricao: 'Se ele atrasar ou subir preço, a operação para. Busque um segundo fornecedor.',
        destino: 'fornecedores',
        foco: f.id,
      });
    }
  }

  /* 11 — Produto sem fornecedor definido ----------------------------------- */
  for (const p of produtos.filter((x) => !x.arquivado)) {
    const existe = fornecedores.some((f) => f.id === p.fornecedorId);
    if (!p.fornecedorId || !existe) {
      add({
        chave: `sem-fornecedor:${p.id}`,
        regra: 11,
        severidade: 'ATENCAO',
        titulo: `${p.nome} está sem fornecedor`,
        descricao: `SKU ${p.sku} não tem fornecedor vinculado. Vincule para saber o custo e o prazo.`,
        destino: 'produtos',
        foco: p.id,
      });
    }
  }

  /* 12 — Cliente sem telefone / WhatsApp ----------------------------------- */
  for (const c of clientes.filter((x) => !x.arquivado)) {
    if (!c.whatsapp && !c.telefone) {
      add({
        chave: `sem-contato:${c.id}`,
        regra: 12,
        severidade: 'AVISO',
        titulo: `${c.nome} está sem telefone de contato`,
        descricao: 'Sem contato não dá para fazer follow-up nem cobrar.',
        destino: 'clientes',
        foco: c.id,
      });
    }
  }

  const peso: Record<Severidade, number> = { CRITICO: 0, ATENCAO: 1, AVISO: 2 };
  return alertas.sort((a, b) => peso[a.severidade] - peso[b.severidade]);
}

export const ROTULO_SEVERIDADE: Record<Severidade, string> = {
  CRITICO: 'Crítico',
  ATENCAO: 'Atenção',
  AVISO: 'Aviso',
};

export function contarPorSeveridade(alertas: Alerta[]) {
  return {
    total: alertas.length,
    criticos: alertas.filter((a) => a.severidade === 'CRITICO').length,
    atencao: alertas.filter((a) => a.severidade === 'ATENCAO').length,
    avisos: alertas.filter((a) => a.severidade === 'AVISO').length,
  };
}
