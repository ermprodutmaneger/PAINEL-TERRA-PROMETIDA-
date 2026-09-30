/* Busca global — indexa produtos, clientes, fornecedores, pedidos e notas. */

import {
  FileText,
  Factory,
  Package,
  ReceiptText,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { BancoDados } from '@/types';
import type { ContextoDerivacao } from '@/db/deriva';
import { dataBR, moeda } from './format';
import { ROTULO_STATUS_VENDA, ROTULO_SEGMENTO_CLIENTE } from '@/types';
import { totaisVenda } from './calculos';

export interface ResultadoBusca {
  id: string;
  tipo: string;
  rotuloTipo: string;
  titulo: string;
  subtitulo: string;
  destino: string;
  icone: LucideIcon;
}

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function formatarBusca(
  termo: string,
  { bd, derivado }: { bd: BancoDados; derivado: ContextoDerivacao },
): ResultadoBusca[] {
  const t = normalizar(termo.trim());
  if (t.length < 2) return [];
  const contem = (s?: string) => (s ? normalizar(s).includes(t) : false);
  const saida: ResultadoBusca[] = [];

  for (const p of derivado.produtos) {
    if (contem(p.sku) || contem(p.nome) || contem(p.marcaFornecedor) || contem(p.nomeFornecedor)) {
      saida.push({
        id: p.id,
        tipo: 'produto',
        rotuloTipo: 'Produto',
        titulo: p.nome,
        subtitulo: `${p.sku} · ${moeda(p.precoVendaUnitario)} · ${p.estoqueAtual} un. em estoque`,
        destino: '/produtos',
        icone: Package,
      });
    }
  }

  for (const c of derivado.clientes) {
    if (contem(c.nome) || contem(c.nomeFantasia) || contem(c.cidadeAtendida) || contem(c.contatoNome) || contem(c.cnpj)) {
      saida.push({
        id: c.id,
        tipo: 'cliente',
        rotuloTipo: 'Cliente',
        titulo: c.nome,
        subtitulo: `${ROTULO_SEGMENTO_CLIENTE[c.segmento]} · ${c.cidadeAtendida} · ${moeda(c.totalComprado)} comprados`,
        destino: '/clientes',
        icone: Users,
      });
    }
  }

  for (const f of derivado.fornecedores) {
    if (contem(f.nome) || contem(f.razaoSocial) || contem(f.cnpj) || contem(f.contatoNome) || contem(f.endereco.cidade)) {
      saida.push({
        id: f.id,
        tipo: 'fornecedor',
        rotuloTipo: 'Fornecedor',
        titulo: f.nome,
        subtitulo: `${f.endereco.cidade}/${f.endereco.uf} · prazo ${f.prazoPagamentoDias} dias · ${moeda(f.totalComprado)} comprados`,
        destino: '/fornecedores',
        icone: Factory,
      });
    }
  }

  for (const v of derivado.vendas) {
    if (contem(v.numero) || contem(v.nomeCliente) || contem(v.numeroNF)) {
      saida.push({
        id: v.id,
        tipo: 'venda',
        rotuloTipo: 'Pedido',
        titulo: `Pedido ${v.numero}`,
        subtitulo: `${v.nomeCliente} · ${dataBR(v.dataEmissao)} · ${moeda(totaisVenda(v).valorTotal)} · ${ROTULO_STATUS_VENDA[v.status]}`,
        destino: '/vendas',
        icone: ReceiptText,
      });
    }
  }

  for (const n of bd.notasFiscais) {
    if (contem(n.numero) || contem(n.chaveAcesso)) {
      const cli = bd.clientes.find((c) => c.id === n.clienteId);
      saida.push({
        id: n.id,
        tipo: 'nota',
        rotuloTipo: 'Nota fiscal',
        titulo: `NF ${n.numero}/${n.serie}`,
        subtitulo: `${cli?.nome ?? 'Cliente'} · ${dataBR(n.dataEmissao)} · ${moeda(n.valorTotal)}`,
        destino: '/notas-fiscais',
        icone: FileText,
      });
    }
  }

  return saida.slice(0, 40);
}
