/* Geração do PDF de orçamento com a identidade visual da marca. */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ClienteCalculado, ProdutoCalculado } from '@/db/deriva';
import type { Configuracao, Venda } from '@/types';
import { dataBR, moeda, numeroParaCampo, rotuloMesLongo } from './format';
import { totaisVenda } from './calculos';
import { ROTULO_FORMA_PAGAMENTO, ROTULO_STATUS_VENDA } from '@/types';

const TERRA: [number, number, number] = [47, 93, 58];
const MOSTARDA: [number, number, number] = [227, 162, 28];
const GRAFITE: [number, number, number] = [34, 32, 28];
const CINZA: [number, number, number] = [138, 133, 124];
const AREIA: [number, number, number] = [245, 240, 230];

export interface ContextoOrcamento {
  venda: Venda;
  cliente: ClienteCalculado;
  config: Configuracao;
  produto?: ProdutoCalculado;
}

export function gerarOrcamentoPDF({ venda, cliente, config, produto }: ContextoOrcamento): void {
  const t = totaisVenda(venda);
  const validoAte = dataBR(
    new Date(new Date(venda.dataEmissao).getTime() + config.validadePropostaDias * 86_400_000).toISOString(),
  );

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth();
  const margem = 14;
  let y = 18;

  /* ------------------------------- Cabeçalho --------------------------- */
  doc.setFillColor(...TERRA);
  doc.roundedRect(margem, y, 11, 11, 2, 2, 'F');
  // folha estilizada (mesma marca do cabeçalho do sistema)
  doc.setDrawColor(...MOSTARDA);
  doc.setLineWidth(0.7);
  doc.line(margem + 5.5, y + 8, margem + 5.5, y + 3.5);
  doc.line(margem + 5.5, y + 5.5, margem + 2.4, y + 5.5);
  doc.line(margem + 5.5, y + 5.5, margem + 8.6, y + 5.5);
  doc.line(margem + 2.4, y + 5.5, margem + 2.4, y + 4.4);
  doc.line(margin8(margem), y + 5.5, margem + 8.6, y + 5.5);
  doc.line(margem + 8.6, y + 5.5, margem + 8.6, y + 4.4);

  doc.setTextColor(...GRAFITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TERRA PROMETIDA EXPRESS', margem + 14, y + 4.5);
  doc.setFontSize(7.5);
  doc.setTextColor(...MOSTARDA);
  doc.text('E X P R E S S', margem + 14, y + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...CINZA);
  const emp = config.empresa;
  doc.text(emp.razaoSocial, largura - margem, y + 2, { align: 'right' });
  doc.text(`CNPJ ${emp.cnpj} · IE ${emp.inscricaoEstadual}`, largura - margem, y + 6, { align: 'right' });
  doc.text(`${emp.endereco.logradouro}, ${emp.endereco.numero} — ${emp.endereco.bairro}`, largura - margem, y + 10, { align: 'right' });
  doc.text(`${emp.endereco.cidade}/${emp.endereco.uf} · ${emp.telefone}`, largura - margem, y + 14, { align: 'right' });

  y += 19;
  doc.setDrawColor(...TERRA);
  doc.setLineWidth(1.1);
  doc.line(margem, y, largura - margem, y);
  doc.setDrawColor(...MOSTARDA);
  doc.setLineWidth(0.5);
  doc.line(margem, y + 1.6, margem + 38, y + 1.6);

  y += 10;
  doc.setTextColor(...GRAFITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('ORÇAMENTO', margem, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...CINZA);
  doc.text(`Nº ${venda.numero}`, largura - margem, y, { align: 'right' });

  y += 6;
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAFITE);
  const linhasCabecalho: Array<[string, string]> = [
    ['Cliente', `${cliente.nome}${cliente.cnpj ? ` — CNPJ ${cliente.cnpj}` : ''}`],
    ['Contato', `${cliente.contatoNome ?? '—'} · ${cliente.whatsapp || cliente.telefone}`],
    ['Emissão', `${dataBR(venda.dataEmissao)} · Válido até ${validoAte}`],
    ['Entrega prevista', dataBR(venda.dataPrevistaEntrega)],
    ['Condição de pagamento', cliente.condicaoPagamentoTabela ?? ROTULO_FORMA_PAGAMENTO[venda.formaPagamento]],
  ];
  for (const [rotulo, valor] of linhasCabecalho) {
    doc.setTextColor(...CINZA);
    doc.text(rotulo, margem, y);
    doc.setTextColor(...GRAFITE);
    doc.text(valor, margem + 36, y);
    y += 5;
  }

  y += 4;

  /* --------------------------------- Tabela ---------------------------- */
  autoTable(doc, {
    startY: y,
    head: [['Item', 'Código', 'Descrição', 'Qtd.', 'Preço unit.', 'Total']],
    body: venda.itens.map((it, i) => [
      String(i + 1),
      it.sku,
      it.descricao,
      numeroParaCampo(it.quantidade, it.quantidade % 1 === 0 ? 0 : 2),
      moeda(it.precoUnitario),
      moeda(it.quantidade * it.precoUnitario * (1 - (it.descontoItemPct ?? 0) / 100)),
    ]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, lineColor: [228, 220, 203], lineWidth: 0.2, textColor: GRAFITE },
    headStyles: { fillColor: TERRA, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.6 },
    alternateRowStyles: { fillColor: [250, 247, 240] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 22 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 17, halign: 'right' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: margem, right: margem, bottom: 44 },
  });

  const fimTabela = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  let y2 = fimTabela + 8;

  /* --------------------------------- Totais ---------------------------- */
  const totais: Array<[string, string, boolean?]> = [
    ['Subtotal', moeda(t.valorBruto)],
    ...(t.valorDesconto > 0 ? ([['Desconto', `- ${moeda(t.valorDesconto)}`]] as Array<[string, string]>) : []),
    ['Total do pedido', moeda(t.valorTotal), true],
  ];
  if (produto) {
    totais.push(['Margem de contribuição estimada', `${moeda(produto.margemContribuicao)} (${(produto.margemContribuicaoPct * 100).toFixed(1)}%)`]);
  }

  for (const [rotulo, valor, destaque] of totais) {
    doc.setFont('helvetica', destaque ? 'bold' : 'normal');
    doc.setFontSize(destaque ? 10 : 8.5);
    doc.setTextColor(...(destaque ? TERRA : GRAFITE));
    doc.text(rotulo, largura - margem - 46, y2, { align: 'right' });
    doc.text(valor, largura - margem, y2, { align: 'right' });
    y2 += destaque ? 6.5 : 5;
  }

  /* ------------------------------ Condições ---------------------------- */
  y2 += 3;
  const alturaPagina = doc.internal.pageSize.getHeight();
  if (y2 < alturaPagina - 52) {
    doc.setFillColor(...AREIA);
    doc.roundedRect(margem, y2, largura - margem * 2, 27, 2, 2, 'F');
    doc.setTextColor(...TERRA);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.text('CONDIÇÕES DA PROPOSTA', margem + 4, y2 + 6);
    doc.setTextColor(...GRAFITE);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    const condicoes = [
      `Validade da proposta: ${config.validadePropostaDias} dias a partir de ${dataBR(venda.dataEmissao)} (até ${validoAte}).`,
      `Pedido mínimo: ${moeda(cliente.pedidoMinimoTabela)}${cliente.nomeTabelaPreco ? ` (${cliente.nomeTabelaPreco})` : ''}.`,
      `Prazo de entrega: ${cliente.condicaoPagamentoTabela ? 'conforme tabela de preço do cliente' : `${config.prazoEntregaPadraoDias} dias úteis`}, a partir da confirmação do pagamento.`,
      `Pagamento: ${cliente.condicaoPagamentoTabela === 'ANTECIPADO' ? 'antecipado (à vista)' : cliente.condicaoPagamentoTabela === '7_DIAS' ? '7 dias' : cliente.condicaoPagamentoTabela === '15_DIAS' ? '15 dias' : cliente.condicaoPagamentoTabela === '30_DIAS' ? '30 dias' : ROTULO_FORMA_PAGAMENTO[venda.formaPagamento]}.`,
      'Preços sujeitos a alteração sem aviso prévio. Estoque sujeito a confirmação no momento do pedido.',
    ];
    condicoes.forEach((c, i) => {
      const linhas = doc.splitTextToSize(`• ${c}`, largura - margem * 2 - 8) as string[];
      doc.text(linhas, margem + 4, y2 + 11 + i * 4.2);
    });
  }

  /* --------------------------------- Rodapé ---------------------------- */
  doc.setDrawColor(...CINZA);
  doc.setLineWidth(0.2);
  doc.line(margem, alturaPagina - 15, largura - margem, alturaPagina - 15);
  doc.setFontSize(6.8);
  doc.setTextColor(...CINZA);
  doc.text(
    `${emp.razaoSocial} · CNPJ ${emp.cnpj} · ${emp.telefone} · ${emp.email}`,
    margem,
    alturaPagina - 11,
  );
  doc.text('Terra Prometida Express — temperos e condimentos', margem, alturaPagina - 7.5);
  doc.text(`${emp.endereco.cidade}/${emp.endereco.uf}`, largura - margem, alturaPagina - 7.5, { align: 'right' });
  doc.text(
    `Emitido em ${rotuloMesLongo(new Date().getMonth() + 1, new Date().getFullYear())} · ${dataBR(new Date().toISOString())}`,
    largura - margem,
    alturaPagina - 11,
    { align: 'right' },
  );

  doc.save(`orcamento-${venda.numero}.pdf`);
}

// pequeno atalho usado no desenho do logo
function margin8(margem: number): number {
  return margem;
}

export { ROTULO_STATUS_VENDA };
