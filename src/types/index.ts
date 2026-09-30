/* ============================================================================
   MODELO DE DADOS — TERRA PROMETIDA EXPRESS
   Todas as entidades carregam `id`, `criadoEm`, `atualizadoEm` e `arquivado`.
   ========================================================================== */

export interface BaseEntidade {
  id: string;
  criadoEm: string;
  atualizadoEm: string;
  arquivado: boolean;
}

export interface Endereco {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export type FretePorContaDe = 'FORNECEDOR' | 'TERRA_PROMETIDA';

export interface Fornecedor extends BaseEntidade {
  nome: string;
  razaoSocial?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  telefone: string;
  whatsapp: string;
  email?: string;
  endereco: Endereco;
  contatoNome?: string;
  prazoPagamentoDias: number; // 0 = à vista
  pedidoMinimoValor: number;
  fretePorContaDe: FretePorContaDe;
  condicoesGerais?: string;
  observacoes?: string;
  ativo: boolean;
  totalComprado: number;
  ticketMedioCompra: number;
  numeroDePedidos: number;
}

export type CategoriaProduto =
  | 'PIMENTA_E_PIMENTAO'
  | 'SAL'
  | 'TEMPERO_EM_PO'
  | 'TEMPERO_LIQUIDO'
  | 'ALHO_E_CEBOLA'
  | 'ESPECIARIA'
  | 'MISTURAS_E_TEMPEROS_COMPLETOS'
  | 'OUTROS';

export type StatusEstoque = 'ZERADO' | 'BAIXO' | 'CRITICO' | 'SAUDAVEL' | 'EXCESSO';

export interface Produto extends BaseEntidade {
  sku: string;
  nome: string;
  categoria: CategoriaProduto;
  marcaFornecedor: string;
  fornecedorId: string;
  unidadeCompra: string;
  pesoLiquidoPorUnidade: number;
  custoUnitario: number;
  precoVendaUnitario: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  estoqueMaximo: number;
  pontoDePedido: number;
  localizacao?: string;
  validade?: string; // data ISO (yyyy-MM-dd)
  ativo: boolean;
}

export type SegmentoCliente =
  | 'RESTAURANTE'
  | 'PADARIA'
  | 'LANCHONETE'
  | 'MARMITERIA'
  | 'MERCEARIA'
  | 'COZINHA_INDUSTRIAL'
  | 'OUTRO';

export type CanalOrigem = 'INDICACAO' | 'INSTAGRAM' | 'WHATSAPP' | 'VISITA' | 'MERCADO' | 'OUTRO';

export type StatusCliente =
  | 'POTENCIAL'
  | 'CONTATADO'
  | 'ORCAMENTO'
  | 'NEGOCIACAO'
  | 'CLIENTE_ATIVO'
  | 'INADIMPLETE'
  | 'PERDIDO';

export interface Cliente extends BaseEntidade {
  nome: string;
  nomeFantasia?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  segmento: SegmentoCliente;
  telefone: string;
  whatsapp: string;
  email?: string;
  endereco: Endereco;
  contatoNome?: string;
  canalOrigem: CanalOrigem;
  cidadeAtendida: string;
  status: StatusCliente;
  segmentoPrecoId?: string;
  observacoes?: string;
  primeiroPedidoEm?: string;
  ultimoPedidoEm?: string;
  diasSemComprar: number;
  totalComprado: number;
  ticketMedio: number;
  numeroDePedidos: number;
  inadimplencia: number;
}

export type CondicaoPagamento = 'ANTECIPADO' | '7_DIAS' | '15_DIAS' | '30_DIAS';
export type BaseTabelaPreco = 'PERCENTUAL_SOBRE_CUSTO' | 'FATOR';

export interface SegmentoPreco extends BaseEntidade {
  nome: string;
  clienteIds: string[];
  fatorOuPercentual: BaseTabelaPreco;
  percentualSobreCusto?: number;
  fator?: number;
  descontoFixoPercentual?: number;
  pedidoMinimoValor: number;
  condicaoPagamento: CondicaoPagamento;
  prazoEntregaDias: number;
  ativa: boolean;
}

export type StatusVenda =
  | 'ORCAMENTO'
  | 'APROVADO'
  | 'PAGAMENTO_PENDENTE'
  | 'PAGO'
  | 'EM_SEPARACAO'
  | 'EM_TRANSITO'
  | 'ENTREGUE'
  | 'CANCELADO'
  | 'DEVOLVIDO';

export type FormaPagamento = 'PIX' | 'BOLETO' | 'DINHEIRO' | 'CARTAO' | 'TRANSFERENCIA';

export interface ItemVenda {
  produtoId: string;
  sku: string;
  descricao: string;
  quantidade: number;
  custoUnitario: number; // congelado no momento da venda (histórico preservado)
  precoUnitario: number;
  descontoItemPct?: number;
}

export interface Venda extends BaseEntidade {
  numero: string;
  clienteId: string;
  status: StatusVenda;
  dataEmissao: string;
  dataPrevistaEntrega: string;
  dataEntrega?: string;
  dataPagamento?: string;
  formaPagamento: FormaPagamento;
  itens: ItemVenda[];
  observacoes?: string;
  numeroNF?: string;
  numeroContato?: string;
}

export type ModeloNota = 'NF-E' | 'NFS-E' | 'NF' | 'CT-E';
export type StatusNota = 'PENDENTE' | 'EMITIDA' | 'ENVIADA' | 'PAGA' | 'VENCIDA' | 'CANCELADA';

export interface NotaFiscal extends BaseEntidade {
  numero: string;
  serie: string;
  modelo: ModeloNota;
  vendaId?: string;
  clienteId: string;
  dataEmissao: string;
  dataVencimento: string;
  valorTotal: number;
  valorImpostos: number;
  status: StatusNota;
  chaveAcesso?: string;
  xmlPath?: string;
  pdfPath?: string;
  valorPago?: number;
  dataPagamento?: string;
}

export type TipoLancamento = 'ENTRADA' | 'SAIDA';
export type StatusLancamento = 'PENDENTE' | 'PAGO' | 'RECEBIDO' | 'VENCIDO' | 'CANCELADO';

export interface Lancamento extends BaseEntidade {
  tipo: TipoLancamento;
  categoria: string;
  subcategoria?: string;
  descricao: string;
  valor: number;
  data: string;
  dataVencimento?: string;
  dataRealizacao?: string;
  status: StatusLancamento;
  pagoEm?: string;
  recebidoEm?: string;
  vendaId?: string;
  notaFiscalId?: string;
  fornecedorId?: string;
  clienteId?: string;
  formaPagamento?: FormaPagamento;
  comprovante?: string;
  recorrente: boolean;
  observacoes?: string;
  fixo: boolean;
}

export interface DespesaFixa extends BaseEntidade {
  descricao: string;
  categoria: string;
  valorMensalEstimado: number;
  diaDeVencimento: number;
  ativa: boolean;
  essencial: boolean;
}

export interface Cofre extends BaseEntidade {
  data: string;
  saldoInicial: number;
  entradas: number;
  saidas: number;
  saldoFinal: number;
}

export type CanalMarketing =
  | 'INSTAGRAM_ADS'
  | 'FACEBOOK_ADS'
  | 'GOOGLE_ADS'
  | 'DESIGN'
  | 'FOTOGRAFIA'
  | 'IMPRESSOS'
  | 'EVENTO'
  | 'INFLUENCER'
  | 'WHATSAPP_API'
  | 'OUTROS';

export interface GastoMarketing extends BaseEntidade {
  descricao: string;
  canal: CanalMarketing;
  valor: number;
  data: string;
  pago: boolean;
  fornecedorId?: string;
  resultado?: string;
  clientesGerados: number;
  observacoes?: string;
}

export interface MetasPeriodo {
  faturamento: number;
  ticketMedio: number;
  margemMedia: number;
  novosClientes: number;
  pedidos: number;
  giroEstoque: number;
}

export interface Meta extends BaseEntidade {
  nome: string;
  descricao?: string;
  mes: number;
  ano: number;
  metas: MetasPeriodo;
}

export interface Configuracao {
  id: 'config';
  criadoEm: string;
  atualizadoEm: string;
  empresa: {
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
    inscricaoEstadual: string;
    endereco: Endereco;
    telefone: string;
    email: string;
    site: string;
  };
  tributacao: {
    regime: 'SIMPLES_NACIONAL';
    anexo: 'I';
    me: boolean;
    limiteME: number;
    custoFixoMensal: number;
  };
  validadePropostaDias: number;
  margemMinimaAlerta: number;
  margemMinimaAceita: number;
  margemAlvo: number;
  prazoEntregaPadraoDias: number;
  pedidoMinimoPadrao: number;
  custoEntregaMedioPadrao: number;
  comissaoPadraoPct: number;
  categoriasFinanceiras: CategoriaFinanceira[];
  alertas: {
    estoqueBaixo: boolean;
    validadeProxima: boolean;
    clienteSemRecompra: boolean;
    margemBaixa: boolean;
    boletoVencendo: boolean;
    limiteME: boolean;
  };
  dadosDemonstracao: boolean;
  tema: 'CLARO' | 'ESCURO' | 'SISTEMA';
}

export interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: TipoLancamento;
  cor: string;
}

export type AreaTarefa = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
export type StatusTarefa = 'PENDENTE' | 'FAZENDO' | 'CONCLUIDA' | 'ATRASADA';

export interface Tarefa extends BaseEntidade {
  titulo: string;
  descricao?: string;
  responsavel: string;
  area: AreaTarefa;
  status: StatusTarefa;
  prazo: string;
  concluidaEm?: string;
  ordem: number;
  bloco: number;
}

export interface ContatoCliente {
  id: string;
  clienteId: string;
  data: string;
  tipo: 'WHATSAPP' | 'LIGACAO' | 'VISITA' | 'EMAIL' | 'ORCAMENTO' | 'PEDIDO';
  resumo: string;
}

export interface BancoDados {
  versao: number;
  configuracao: Configuracao;
  fornecedores: Fornecedor[];
  produtos: Produto[];
  clientes: Cliente[];
  segmentosPreco: SegmentoPreco[];
  vendas: Venda[];
  notasFiscais: NotaFiscal[];
  lancamentos: Lancamento[];
  despesasFixas: DespesaFixa[];
  cofre: Cofre[];
  gastosMarketing: GastoMarketing[];
  metas: Meta[];
  tarefas: Tarefa[];
  contatos: ContatoCliente[];
  alertasSilenciados: string[];
}

/* ====================== Rótulos em português (fonte única de verdade) ===== */

export const ROTULO_CATEGORIA_PRODUTO: Record<CategoriaProduto, string> = {
  PIMENTA_E_PIMENTAO: 'Pimenta e Pimentão',
  SAL: 'Sal',
  TEMPERO_EM_PO: 'Tempero em Pó',
  TEMPERO_LIQUIDO: 'Tempero Líquido',
  ALHO_E_CEBOLA: 'Alho e Cebola',
  ESPECIARIA: 'Especiaria',
  MISTURAS_E_TEMPEROS_COMPLETOS: 'Misturas e Temperos Completos',
  OUTROS: 'Outros',
};

export const ROTULO_SEGMENTO_CLIENTE: Record<SegmentoCliente, string> = {
  RESTAURANTE: 'Restaurante',
  PADARIA: 'Padaria',
  LANCHONETE: 'Lanchonete',
  MARMITERIA: 'Marmitaria',
  MERCEARIA: 'Mercearia',
  COZINHA_INDUSTRIAL: 'Cozinha Industrial',
  OUTRO: 'Outro',
};

export const ROTULO_STATUS_CLIENTE: Record<StatusCliente, string> = {
  POTENCIAL: 'Potencial',
  CONTATADO: 'Contatado',
  ORCAMENTO: 'Orçamento',
  NEGOCIACAO: 'Negociação',
  CLIENTE_ATIVO: 'Cliente Ativo',
  INADIMPLETE: 'Inadimplente',
  PERDIDO: 'Perdido',
};

export const ROTULO_STATUS_VENDA: Record<StatusVenda, string> = {
  ORCAMENTO: 'Orçamento',
  APROVADO: 'Aprovado',
  PAGAMENTO_PENDENTE: 'Pagamento Pendente',
  PAGO: 'Pago',
  EM_SEPARACAO: 'Em Separação',
  EM_TRANSITO: 'Em Trânsito',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
  DEVOLVIDO: 'Devolvido',
};

/** Colunas do kanban de pedidos (a ordem define o fluxo operacional). */
export const FLUXO_VENDA: StatusVenda[] = [
  'ORCAMENTO',
  'APROVADO',
  'PAGAMENTO_PENDENTE',
  'PAGO',
  'EM_SEPARACAO',
  'EM_TRANSITO',
  'ENTREGUE',
];

export const ROTULO_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  PIX: 'Pix',
  BOLETO: 'Boleto',
  DINHEIRO: 'Dinheiro',
  CARTAO: 'Cartão',
  TRANSFERENCIA: 'Transferência',
};

export const ROTULO_CONDICAO_PAGAMENTO: Record<CondicaoPagamento, string> = {
  ANTECIPADO: 'Antecipado',
  '7_DIAS': '7 dias',
  '15_DIAS': '15 dias',
  '30_DIAS': '30 dias',
};

export const ROTULO_CANAL_MARKETING: Record<CanalMarketing, string> = {
  INSTAGRAM_ADS: 'Instagram Ads',
  FACEBOOK_ADS: 'Facebook Ads',
  GOOGLE_ADS: 'Google Ads',
  DESIGN: 'Design',
  FOTOGRAFIA: 'Fotografia',
  IMPRESSOS: 'Impressos',
  EVENTO: 'Evento',
  INFLUENCER: 'Influencer',
  WHATSAPP_API: 'WhatsApp API',
  OUTROS: 'Outros',
};

export const ROTULO_STATUS_NOTA: Record<StatusNota, string> = {
  PENDENTE: 'Rascunho',
  EMITIDA: 'Emitida',
  ENVIADA: 'Enviada',
  PAGA: 'Paga',
  VENCIDA: 'Vencida',
  CANCELADA: 'Cancelada',
};

export const ROTULO_CANAL_ORIGEM: Record<CanalOrigem, string> = {
  INDICACAO: 'Indicação',
  INSTAGRAM: 'Instagram',
  WHATSAPP: 'WhatsApp',
  VISITA: 'Visita',
  MERCADO: 'Mercado',
  OUTRO: 'Outro',
};

export const ROTULO_STATUS_ESTOQUE: Record<StatusEstoque, string> = {
  ZERADO: 'Zerado',
  BAIXO: 'Baixo',
  CRITICO: 'Crítico',
  SAUDAVEL: 'Saudável',
  EXCESSO: 'Excesso',
};

export const ROTULO_AREA_TAREFA: Record<AreaTarefa, string> = {
  A: 'A — Fundação',
  B: 'B — Marca',
  C: 'C — Produtos',
  D: 'D — Clientes',
  E: 'E — Vendas',
  F: 'F — Financeiro',
  G: 'G — Logística',
  H: 'H — Gestão',
};
