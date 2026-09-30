/* Cores semânticas por status — fonte única para badges, gráficos e tabelas. */

import type { StatusCliente, StatusEstoque, StatusNota, StatusVenda } from '@/types';

export type Tom = 'terra' | 'mostarda' | 'terracota' | 'verde' | 'cinza';
export type TomSelo = 'terra' | 'mostarda' | 'terracota' | 'positivo' | 'neutro' | 'cinza';

export const TOM_SELO: Record<Tom, TomSelo> = {
  terra: 'terra',
  mostarda: 'mostarda',
  terracota: 'terracota',
  verde: 'positivo',
  cinza: 'neutro',
};

export const COR_SOLIDA: Record<Tom, string> = {
  terra: '#2F5D3A',
  mostarda: '#E3A21C',
  terracota: '#B5553A',
  verde: '#6E9B78',
  cinza: '#8A857C',
};

export const TOM_VENDA: Record<StatusVenda, Tom> = {
  ORCAMENTO: 'cinza',
  APROVADO: 'mostarda',
  PAGAMENTO_PENDENTE: 'terracota',
  PAGO: 'terra',
  EM_SEPARACAO: 'mostarda',
  EM_TRANSITO: 'terra',
  ENTREGUE: 'verde',
  CANCELADO: 'cinza',
  DEVOLVIDO: 'terracota',
};

export const TOM_CLIENTE: Record<StatusCliente, Tom> = {
  POTENCIAL: 'cinza',
  CONTATADO: 'mostarda',
  ORCAMENTO: 'mostarda',
  NEGOCIACAO: 'terra',
  CLIENTE_ATIVO: 'verde',
  INADIMPLETE: 'terracota',
  PERDIDO: 'cinza',
};

export const TOM_NOTA: Record<StatusNota, Tom> = {
  PENDENTE: 'cinza',
  EMITIDA: 'mostarda',
  ENVIADA: 'terra',
  PAGA: 'verde',
  VENCIDA: 'terracota',
  CANCELADA: 'cinza',
};

export const TOM_ESTOQUE: Record<StatusEstoque, Tom> = {
  ZERADO: 'terracota',
  CRITICO: 'terracota',
  BAIXO: 'mostarda',
  SAUDAVEL: 'verde',
  EXCESSO: 'mostarda',
};

export const TOM_SEGMENTO: Record<string, Tom> = {
  RESTAURANTE: 'terra',
  PADARIA: 'mostarda',
  LANCHONETE: 'terracota',
  MARMITERIA: 'verde',
  MERCEARIA: 'cinza',
  COZINHA_INDUSTRIAL: 'terra',
  OUTRO: 'cinza',
};

export const TOM_LANCAMENTO: Record<'ENTRADA' | 'SAIDA', Tom> = {
  ENTRADA: 'verde',
  SAIDA: 'terracota',
};

/** Paleta fixa para gráficos de categoria (mantém a identidade da marca). */
export const PALETA_GRAFICO = [
  '#2F5D3A',
  '#E3A21C',
  '#6E9B78',
  '#B5553A',
  '#F5C65B',
  '#8A857C',
  '#3F7B4E',
  '#D4705A',
  '#4A6B52',
  '#C08A1B',
];
