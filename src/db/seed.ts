/* ============================================================================
   DADOS DE EXEMPLO (SEED) — 3 meses de operação fictícia e coerente.
   Tudo é relativo à data de hoje, então o painel sempre abre "vivo".
   ========================================================================== */

import type {
  BancoDados,
  Cliente,
  Cofre,
  Configuracao,
  ContatoCliente,
  DespesaFixa,
  Fornecedor,
  GastoMarketing,
  Lancamento,
  Meta,
  NotaFiscal,
  Produto,
  SegmentoPreco,
  Tarefa,
  Venda,
} from '@/types';
import { hojeISO, somaDias, toISO, uuid } from '@/lib/format';
import { totaisVenda } from '@/lib/calculos';

const H = hojeISO();
const d = (n: number) => somaDias(H, -n);

const base = () => ({ id: uuid(), criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(), arquivado: false });

/* ------------------------------- Configuração ----------------------------- */

export const CONFIG_PADRAO: Configuracao = {
  id: 'config',
  criadoEm: new Date().toISOString(),
  atualizadoEm: new Date().toISOString(),
  empresa: {
    razaoSocial: 'TERRA PROMETIDA EXPRESS LTDA - ME',
    nomeFantasia: 'Terra Prometida Express',
    cnpj: '46.370.984/0001-01',
    inscricaoEstadual: '115.482.903.117',
    endereco: {
      logradouro: 'Rua das Palmeiras',
      numero: '740',
      bairro: 'Vila Industrial',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '03124-000',
    },
    telefone: '(11) 4002-8922',
    email: 'comercial@terraprometida.com.br',
    site: 'www.terraprometida.com.br',
  },
  tributacao: {
    regime: 'SIMPLES_NACIONAL',
    anexo: 'I',
    me: true,
    limiteME: 360000,
    custoFixoMensal: 2463,
  },
  validadePropostaDias: 7,
  margemMinimaAlerta: 15,
  margemMinimaAceita: 12,
  margemAlvo: 20,
  prazoEntregaPadraoDias: 3,
  pedidoMinimoPadrao: 150,
  custoEntregaMedioPadrao: 18,
  comissaoPadraoPct: 0,
  categoriasFinanceiras: [
    { id: 'cat-receita', nome: 'Vendas', tipo: 'ENTRADA', cor: '#2F5D3A' },
    { id: 'cat-compras', nome: 'Compras de Mercadorias', tipo: 'SAIDA', cor: '#B5553A' },
    { id: 'cat-frete', nome: 'Frete e Entregas', tipo: 'SAIDA', cor: '#8A857C' },
    { id: 'cat-despesa-fixa', nome: 'Despesas Fixas', tipo: 'SAIDA', cor: '#6E9B78' },
    { id: 'cat-impostos', nome: 'Impostos', tipo: 'SAIDA', cor: '#E3A21C' },
    { id: 'cat-marketing', nome: 'Marketing', tipo: 'SAIDA', cor: '#F5C65B' },
    { id: 'cat-outros', nome: 'Outros', tipo: 'SAIDA', cor: '#8A857C' },
  ],
  alertas: {
    estoqueBaixo: true,
    validadeProxima: true,
    clienteSemRecompra: true,
    margemBaixa: true,
    boletoVencendo: true,
    limiteME: true,
  },
  dadosDemonstracao: true,
  tema: 'SISTEMA',
};

/* ------------------------------- Fornecedores ----------------------------- */

export function seedFornecedores(): Fornecedor[] {
  return [
    {
      ...base(),
      nome: 'Distribuidora Central de Especiarias',
      razaoSocial: 'Distribuidora Central de Especiarias Ltda',
      cnpj: '12.845.310/0001-45',
      inscricaoEstadual: '108.442.331.204',
      telefone: '(11) 3255-1100',
      whatsapp: '(11) 98877-1100',
      email: 'pedidos@dcespeciarias.com.br',
      endereco: {
        logradouro: 'Av. do Estado',
        numero: '1250',
        bairro: 'Vila Nova Cachoeirinha',
        cidade: 'São Paulo',
        uf: 'SP',
        cep: '03124-000',
      },
      contatoNome: 'Rogério Tavares',
      prazoPagamentoDias: 14,
      pedidoMinimoValor: 400,
      fretePorContaDe: 'FORNECEDOR',
      condicoesGerais: 'Frete CIF para capital. Pedido mínimo de R$ 400,00. Embalagem planner.',
      observacoes: 'Entrega em até 4 dias úteis. Embalagem planner inclusa.',
      ativo: true,
      totalComprado: 0,
      ticketMedioCompra: 0,
      numeroDePedidos: 0,
    },
    {
      ...base(),
      nome: 'Indústrias Doce Tempero',
      razaoSocial: 'Industrias Doce Tempero S.A.',
      cnpj: '05.772.918/0001-03',
      inscricaoEstadual: '110.998.774.512',
      telefone: '(19) 3232-7700',
      whatsapp: '(19) 99654-2233',
      email: 'comercial@docetempero.com.br',
      endereco: {
        logradouro: 'Rod. Anhanguera, km 98',
        numero: 's/n',
        bairro: 'Jardim Industrial',
        cidade: 'Campinas',
        uf: 'SP',
        cep: '13000-000',
      },
      contatoNome: 'Cláudia Menezes',
      prazoPagamentoDias: 21,
      pedidoMinimoValor: 650,
      fretePorContaDe: 'TERRA_PROMETIDA',
      condicoesGerais: 'Faturamento 30/60/90. Frete por conta do comprador acima de R$ 900,00.',
      ativo: true,
      totalComprado: 0,
      ticketMedioCompra: 0,
      numeroDePedidos: 0,
    },
    {
      ...base(),
      nome: 'Spezaria Brasil Especiarias',
      razaoSocial: 'Spezaria Brasil Comercio de Especiarias ME',
      cnpj: '33.190.774/0001-62',
      inscricaoEstadual: '121.330.998.004',
      telefone: '(11) 2450-9090',
      whatsapp: '(11) 99120-4477',
      email: 'contato@spezariabrasil.com.br',
      endereco: {
        logradouro: 'Rua Tapajós',
        numero: '318',
        bairro: 'Centro',
        cidade: 'Guarulhos',
        uf: 'SP',
        cep: '07110-000',
      },
      contatoNome: 'Nilson Prado',
      prazoPagamentoDias: 7,
      pedidoMinimoValor: 250,
      fretePorContaDe: 'FORNECEDOR',
      condicoesGerais: 'Especiarias importadas e nacionalizadas. Pedido mínimo R$ 250,00.',
      ativo: true,
      totalComprado: 0,
      ticketMedioCompra: 0,
      numeroDePedidos: 0,
    },
    {
      ...base(),
      nome: 'Importadora de Especiarias do Vale',
      razaoSocial: 'Importadora de Especiarias do Vale Ltda',
      cnpj: '18.664.203/0001-91',
      inscricaoEstadual: '115.220.664.881',
      telefone: '(13) 3225-4400',
      whatsapp: '(13) 99610-3322',
      email: 'vendas@especiariasdovale.com.br',
      endereco: {
        logradouro: 'Av. Atlântica',
        numero: '2210',
        bairro: 'Embaré',
        cidade: 'Santos',
        uf: 'SP',
        cep: '11700-000',
      },
      contatoNome: 'Marisa Antunes',
      prazoPagamentoDias: 30,
      pedidoMinimoValor: 1200,
      fretePorContaDe: 'TERRA_PROMETIDA',
      condicoesGerais: 'Importação direta. Pedido mínimo R$ 1.200,00. Prazo de 30 dias.',
      ativo: true,
      totalComprado: 0,
      ticketMedioCompra: 0,
      numeroDePedidos: 0,
    },
    {
      ...base(),
      nome: 'Alimentos Regionais Sabor & Cia',
      razaoSocial: 'Alimentos Regionais Sabor e Cia ME',
      cnpj: '41.220.905/0001-27',
      inscricaoEstadual: '109.774.332.015',
      telefone: '(16) 3212-6600',
      whatsapp: '(16) 99840-1122',
      email: 'pedidos@saborregional.com.br',
      endereco: {
        logradouro: 'Av. Thomaz Alberto Whately',
        numero: '1455',
        bairro: 'Jardim Shiro',
        cidade: 'Ribeirão Preto',
        uf: 'SP',
        cep: '14000-000',
      },
      contatoNome: 'Anderson Lima',
      prazoPagamentoDias: 0,
      pedidoMinimoValor: 150,
      fretePorContaDe: 'FORNECEDOR',
      condicoesGerais: 'Pagamento à vista no boleto. Pedido mínimo R$ 150,00.',
      ativo: true,
      totalComprado: 0,
      ticketMedioCompra: 0,
      numeroDePedidos: 0,
    },
    {
      ...base(),
      nome: 'Commercial de Temperos e Especiarias',
      razaoSocial: 'Commercial de Temperos e Especiarias Ltda',
      cnpj: '61.443.780/0001-09',
      inscricaoEstadual: '107.334.990.221',
      telefone: '(19) 3845-1000',
      whatsapp: '(19) 99876-5544',
      email: 'sac@commercialtemperos.com.br',
      endereco: {
        logradouro: 'Rod. Santos Dumont, km 12',
        numero: 's/n',
        bairro: 'Distrito Industrial',
        cidade: 'Jundiaí',
        uf: 'SP',
        cep: '13200-000',
      },
      contatoNome: 'Patrícia Soares',
      prazoPagamentoDias: 21,
      pedidoMinimoValor: 800,
      fretePorContaDe: 'TERRA_PROMETIDA',
      condicoesGerais: 'Atacado com condições especiais acima de R$ 2.000,00.',
      ativo: true,
      totalComprado: 0,
      ticketMedioCompra: 0,
      numeroDePedidos: 0,
    },
  ];
}

/* --------------------------------- Produtos ------------------------------- */

export function seedProdutos(fornecedores: Fornecedor[]): Produto[] {
  const [dc, doce, spez, vale, sabor] = fornecedores.map((f) => f.id);
  const p = (
    dados: Omit<Produto, keyof ReturnType<typeof base>>,
  ): Produto => ({ ...base(), ...dados });

  return [
    p({
      sku: 'PIM-500', nome: 'Pimenta-do-reino moída 500g', categoria: 'PIMENTA_E_PIMENTAO',
      marcaFornecedor: 'Central', fornecedorId: dc, unidadeCompra: 'Cx. c/ 12 und.',
      pesoLiquidoPorUnidade: 0.5, custoUnitario: 6.4, precoVendaUnitario: 11.9,
      estoqueAtual: 48, estoqueMinimo: 12, estoqueMaximo: 120, pontoDePedido: 24,
      localizacao: 'Estoque A1', ativo: true,
    }),
    p({
      sku: 'PIM-1000', nome: 'Pimenta-do-reino em grãos 1kg', categoria: 'PIMENTA_E_PIMENTAO',
      marcaFornecedor: 'Central', fornecedorId: dc, unidadeCompra: 'Cx. c/ 8 und.',
      pesoLiquidoPorUnidade: 1, custoUnitario: 11.8, precoVendaUnitario: 22.5,
      estoqueAtual: 22, estoqueMinimo: 8, estoqueMaximo: 60, pontoDePedido: 16,
      localizacao: 'Estoque A1', ativo: true,
    }),
    p({
      sku: 'PAP-500', nome: 'Páprica Defumada 500g', categoria: 'PIMENTA_E_PIMENTAO',
      marcaFornecedor: 'Spezaria', fornecedorId: spez, unidadeCompra: 'Cx. c/ 12 und.',
      pesoLiquidoPorUnidade: 0.5, custoUnitario: 9.9, precoVendaUnitario: 11.9,
      estoqueAtual: 30, estoqueMinimo: 10, estoqueMaximo: 50, pontoDePedido: 18,
      localizacao: 'Estoque A2', ativo: true,
    }),
    p({
      sku: 'SAL-1000', nome: 'Sal refinado iodado 1kg', categoria: 'SAL',
      marcaFornecedor: 'Sabor & Cia', fornecedorId: sabor, unidadeCompra: 'Cx. c/ 20 und.',
      pesoLiquidoPorUnidade: 1, custoUnitario: 2.2, precoVendaUnitario: 4.5,
      estoqueAtual: 140, estoqueMinimo: 40, estoqueMaximo: 300, pontoDePedido: 70,
      localizacao: 'Estoque B1', ativo: true,
    }),
    p({
      sku: 'TEM-500', nome: 'Tempero de carne em pó 500g', categoria: 'TEMPERO_EM_PO',
      marcaFornecedor: 'Central', fornecedorId: dc, unidadeCompra: 'Cx. c/ 12 und.',
      pesoLiquidoPorUnidade: 0.5, custoUnitario: 7.2, precoVendaUnitario: 14.5,
      estoqueAtual: 35, estoqueMinimo: 12, estoqueMaximo: 80, pontoDePedido: 20,
      localizacao: 'Estoque B2', ativo: true,
    }),
    p({
      sku: 'TEM-1000', nome: 'Tempero de frango 1kg', categoria: 'TEMPERO_EM_PO',
      marcaFornecedor: 'Doce Tempero', fornecedorId: doce, unidadeCompra: 'Cx. c/ 10 und.',
      pesoLiquidoPorUnidade: 1, custoUnitario: 12.5, precoVendaUnitario: 24.9,
      estoqueAtual: 0, estoqueMinimo: 8, estoqueMaximo: 50, pontoDePedido: 15,
      localizacao: 'Estoque B2', ativo: true,
    }),
    p({
      sku: 'AJO-500', nome: 'Alho em pó 500g', categoria: 'ALHO_E_CEBOLA',
      marcaFornecedor: 'Do Vale', fornecedorId: vale, unidadeCompra: 'Cx. c/ 12 und.',
      pesoLiquidoPorUnidade: 0.5, custoUnitario: 14.8, precoVendaUnitario: 29.9,
      estoqueAtual: 11, estoqueMinimo: 6, estoqueMaximo: 30, pontoDePedido: 10,
      localizacao: 'Estoque C1', ativo: true,
    }),
    p({
      sku: 'CEB-1000', nome: 'Cebola em pó 1kg', categoria: 'ALHO_E_CEBOLA',
      marcaFornecedor: 'Doce Tempero', fornecedorId: doce, unidadeCompra: 'Cx. c/ 8 und.',
      pesoLiquidoPorUnidade: 1, custoUnitario: 22, precoVendaUnitario: 45,
      estoqueAtual: 3, estoqueMinimo: 4, estoqueMaximo: 20, pontoDePedido: 8,
      localizacao: 'Estoque C1', ativo: true,
    }),
    p({
      sku: 'CAN-500', nome: 'Canela em pó 500g', categoria: 'ESPECIARIA',
      marcaFornecedor: 'Spezaria', fornecedorId: spez, unidadeCompra: 'Cx. c/ 12 und.',
      pesoLiquidoPorUnidade: 0.5, custoUnitario: 8.9, precoVendaUnitario: 19.9,
      estoqueAtual: 26, estoqueMinimo: 8, estoqueMaximo: 50, pontoDePedido: 15,
      localizacao: 'Estoque C2', ativo: true,
    }),
    p({
      sku: 'PAO-200', nome: 'Pão de padaria artesanal 200g', categoria: 'OUTROS',
      marcaFornecedor: 'Sabor & Cia', fornecedorId: sabor, unidadeCompra: 'Cx. c/ 10 und.',
      pesoLiquidoPorUnidade: 0.2, custoUnitario: 3.1, precoVendaUnitario: 7.9,
      estoqueAtual: 40, estoqueMinimo: 6, estoqueMaximo: 60, pontoDePedido: 12,
      localizacao: 'Estoque D1', ativo: true,
    }),
    p({
      sku: 'MOL-500', nome: 'Molho de tomate 500g', categoria: 'TEMPERO_LIQUIDO',
      marcaFornecedor: 'Central', fornecedorId: dc, unidadeCompra: 'Cx. c/ 12 und.',
      pesoLiquidoPorUnidade: 0.5, custoUnitario: 5.4, precoVendaUnitario: 6.5,
      estoqueAtual: 60, estoqueMinimo: 15, estoqueMaximo: 120, pontoDePedido: 30,
      localizacao: 'Estoque D2', ativo: true,
    }),
    p({
      sku: 'TAM-1KG', nome: 'Tempero completo 1kg', categoria: 'MISTURAS_E_TEMPEROS_COMPLETOS',
      marcaFornecedor: 'Doce Tempero', fornecedorId: doce, unidadeCompra: 'Cx. c/ 6 und.',
      pesoLiquidoPorUnidade: 1, custoUnitario: 18.9, precoVendaUnitario: 34.9,
      estoqueAtual: 9, estoqueMinimo: 6, estoqueMaximo: 30, pontoDePedido: 8,
      localizacao: 'Estoque E1', validade: somaDias(H, 58), ativo: true,
    }),
  ];
}

/* ------------------------------ Tabelas de preço -------------------------- */

export function seedSegmentosPreco(clientes: Cliente[]): SegmentoPreco[] {
  const porNome = (n: string) => clientes.find((c) => c.nome.includes(n))?.id ?? '';
  return [
    {
      ...base(),
      nome: 'Food Service A — Restaurantes',
      clienteIds: clientes.filter((c) => c.segmento === 'RESTAURANTE').map((c) => c.id),
      fatorOuPercentual: 'PERCENTUAL_SOBRE_CUSTO',
      percentualSobreCusto: 45,
      descontoFixoPercentual: 3,
      pedidoMinimoValor: 400,
      condicaoPagamento: 'ANTECIPADO',
      prazoEntregaDias: 2,
      ativa: true,
    },
    {
      ...base(),
      nome: 'Food Service B — Padarias e Confeitarias',
      clienteIds: clientes.filter((c) => ['PADARIA', 'MARMITERIA'].includes(c.segmento)).map((c) => c.id),
      fatorOuPercentual: 'PERCENTUAL_SOBRE_CUSTO',
      percentualSobreCusto: 38,
      descontoFixoPercentual: 2,
      pedidoMinimoValor: 250,
      condicaoPagamento: 'ANTECIPADO',
      prazoEntregaDias: 2,
      ativa: true,
    },
    {
      ...base(),
      nome: 'Revenda — Mercearias',
      clienteIds: clientes.filter((c) => ['MERCEARIA', 'COZINHA_INDUSTRIAL'].includes(c.segmento)).map((c) => c.id),
      fatorOuPercentual: 'FATOR',
      fator: 1.55,
      descontoFixoPercentual: 0,
      pedidoMinimoValor: 600,
      condicaoPagamento: '15_DIAS',
      prazoEntregaDias: 4,
      ativa: true,
    },
    {
      ...base(),
      nome: porNome('Espaço') ? 'Parceiros — Rede Hoteleira' : 'Clientes em Negociação',
      clienteIds: clientes.filter((c) => c.status === 'NEGOCIACAO' || c.status === 'CONTATADO').map((c) => c.id),
      fatorOuPercentual: 'PERCENTUAL_SOBRE_CUSTO',
      percentualSobreCusto: 42,
      pedidoMinimoValor: 800,
      condicaoPagamento: '15_DIAS',
      prazoEntregaDias: 5,
      ativa: false,
    },
  ];
}

/* --------------------------------- Clientes ------------------------------- */

export function seedClientes(): Cliente[] {
  const end = (l: string, n: string, b: string, c: string, uf: string, cep: string) => ({
    logradouro: l, numero: n, bairro: b, cidade: c, uf, cep,
  });
  const cl = (dados: Omit<Cliente, keyof ReturnType<typeof base>>): Cliente => ({ ...base(), ...dados });

  return [
    cl({
      nome: 'Restaurante Chão de Brasa', nomeFantasia: 'Chão de Brasa', cnpj: '38.412.776/0001-30',
      inscricaoEstadual: '112.887.004.551', segmento: 'RESTAURANTE',
      telefone: '(11) 3555-2210', whatsapp: '(11) 99812-4477', email: 'compras@chaodebrasa.com.br',
      endereco: end('Rua Harmonia', '318', 'Vila Madalena', 'São Paulo', 'SP', '05435-000'),
      contatoNome: 'Eduardo Ramos', canalOrigem: 'INDICACAO', cidadeAtendida: 'São Paulo',
      status: 'CLIENTE_ATIVO', observacoes: 'Compra toda semana. Prefere entrega às terças e sextas.',
      primeiroPedidoEm: d(88), ultimoPedidoEm: d(4), diasSemComprar: 4,
      totalComprado: 0, ticketMedio: 0, numeroDePedidos: 0, inadimplencia: 0,
    }),
    cl({
      nome: 'Pizzaria Forno de Pedra', nomeFantasia: 'Forno de Pedra',
      segmento: 'LANCHONETE',
      telefone: '(11) 2771-8890', whatsapp: '(11) 99145-3320', email: 'pedidos@hornopedra.com.br',
      endereco: end('Av. Pompéia', '1120', 'Pompéia', 'São Paulo', 'SP', '05402-000'),
      contatoNome: 'Renata Alves', canalOrigem: 'INSTAGRAM', cidadeAtendida: 'São Paulo',
      status: 'CLIENTE_ATIVO', observacoes: 'Muito sensível a preço. Pede sempre o tempero de pizza.',
      primeiroPedidoEm: d(74), ultimoPedidoEm: d(9), diasSemComprar: 9,
      totalComprado: 0, ticketMedio: 0, numeroDePedidos: 0, inadimplencia: 0,
    }),
    cl({
      nome: 'Casa de Pasto do Zé', nomeFantasia: 'Pasto do Zé',
      segmento: 'RESTAURANTE',
      telefone: '(11) 2975-6612', whatsapp: '(11) 98455-7712', email: 'pastodoze@email.com',
      endereco: end('Rua Tapirapé', '77', 'Tatuapé', 'São Paulo', 'SP', '03310-000'),
      contatoNome: 'José Brazil', canalOrigem: 'WHATSAPP', cidadeAtendida: 'São Paulo',
      status: 'CLIENTE_ATIVO', observacoes: 'Compra grande e recorrente. Pede 60 dias de fatura.',
      primeiroPedidoEm: d(91), ultimoPedidoEm: d(16), diasSemComprar: 16,
      totalComprado: 0, ticketMedio: 0, numeroDePedidos: 0, inadimplencia: 0,
    }),
    cl({
      nome: 'Padaria Trigo Novo', nomeFantasia: 'Trigo Novo',
      segmento: 'PADARIA',
      telefone: '(11) 3723-4410', whatsapp: '(11) 99002-1188', email: 'contato@trigonovo.com.br',
      endereco: end('Rua Heitor Penteado', '905', 'Vila Mariana', 'São Paulo', 'SP', '04105-000'),
      contatoNome: 'Sueli Ferraz', canalOrigem: 'VISITA', cidadeAtendida: 'São Paulo',
      status: 'CLIENTE_ATIVO', observacoes: 'Usa canela e fermento em grande volume.',
      primeiroPedidoEm: d(62), ultimoPedidoEm: d(2), diasSemComprar: 2,
      totalComprado: 0, ticketMedio: 0, numeroDePedidos: 0, inadimplencia: 0,
    }),
    cl({
      nome: 'Marmitaria da Esquina', nomeFantasia: 'Marmitaria da Esquina',
      segmento: 'MARMITERIA',
      telefone: '(11) 3335-9090', whatsapp: '(11) 98220-6634', email: 'marmitescadaesquina@email.com',
      endereco: end('Rua Bertolina', '140', 'Vila Mariana', 'São Paulo', 'SP', '04105-000'),
      contatoNome: 'Carla Menezes', canalOrigem: 'INSTAGRAM', cidadeAtendida: 'São Paulo',
      status: 'ORCAMENTO', observacoes: 'Recebeu orçamento dia 22. Decide até sexta.',
      diasSemComprar: 0, totalComprado: 0, ticketMedio: 0, numeroDePedidos: 0, inadimplencia: 0,
    }),
    cl({
      nome: 'Mercearia do Bairro', nomeFantasia: 'Mercearia do Bairro',
      segmento: 'MERCEARIA',
      telefone: '(11) 2665-1234', whatsapp: '(11) 97333-8811', email: 'merceariadobairro@email.com',
      endereco: end('Rua Antônio Bandeira', '61', 'Tucuruvi', 'São Paulo', 'SP', '02405-000'),
      contatoNome: 'Marcos Pires', canalOrigem: 'MERCADO', cidadeAtendida: 'São Paulo',
      status: 'INADIMPLETE', observacoes: 'Faturou R$ 1.480,00 e está com pagamento em atraso.',
      primeiroPedidoEm: d(46), ultimoPedidoEm: d(46), diasSemComprar: 46,
      totalComprado: 0, ticketMedio: 0, numeroDePedidos: 0, inadimplencia: 0,
    }),
    cl({
      nome: 'Cozinha Industrial Bom Prato', nomeFantasia: 'Bom Prato',
      cnpj: '09.220.551/0001-14',
      segmento: 'COZINHA_INDUSTRIAL',
      telefone: '(11) 5644-2211', whatsapp: '(11) 99610-5544', email: 'suprimentos@bomprato.com.br',
      endereco: end('Rua Fernando Mendes de Almeida', '510', 'Vila Veredas',
        'São Paulo', 'SP', '04307-000'),
      contatoNome: 'Silvia Duarte', canalOrigem: 'INDICACAO', cidadeAtendida: 'São Paulo',
      status: 'NEGOCIACAO', observacoes: 'Contrato em negociação. Volume potencial de 40 caixas/mês.',
      diasSemComprar: 0, totalComprado: 0, ticketMedio: 0, numeroDePedidos: 0, inadimplencia: 0,
    }),
    cl({
      nome: 'Espaço Gourmet Vila Madalena', nomeFantasia: 'Espaço Gourmet',
      segmento: 'RESTAURANTE',
      telefone: '(11) 3815-9920', whatsapp: '(11) 98120-4411', email: 'gourmet@email.com',
      endereco: end('Rua Aspicuelta', '245', 'Vila Madalena', 'São Paulo', 'SP', '05433-011'),
      contatoNome: 'Luana Freire', canalOrigem: 'WHATSAPP', cidadeAtendida: 'São Paulo',
      status: 'CONTATADO', observacoes: 'Primeiro contato pelo Instagram. Sem pedido ainda.',
      diasSemComprar: 0, totalComprado: 0, ticketMedio: 0, numeroDePedidos: 0, inadimplencia: 0,
    }),
  ];
}

/* ---------------------------------- Vendas -------------------------------- */

interface ModeloVenda {
  cliente: string;
  dias: number;
  status: Venda['status'];
  itens: Array<[sku: string, qtd: number, preco?: number]>;
  pagamento: Venda['formaPagamento'];
  entregaEmDias?: number;
  pago?: boolean;
}

const MODELOS: ModeloVenda[] = [
  { cliente: 'Restaurante Chão de Brasa', dias: 88, status: 'ENTREGUE', pagamento: 'PIX', itens: [['PIM-500', 12], ['TEM-500', 6], ['SAL-1000', 24]], pago: true, entregaEmDias: 3 },
  { cliente: 'Padaria Trigo Novo', dias: 80, status: 'ENTREGUE', pagamento: 'PIX', itens: [['CAN-500', 10], ['TEM-1000', 4], ['SAL-1000', 20]], pago: true, entregaEmDias: 2 },
  { cliente: 'Casa de Pasto do Zé', dias: 73, status: 'ENTREGUE', pagamento: 'BOLETO', itens: [['TAM-1KG', 12], ['PIM-1000', 10], ['CEB-1000', 6]], pago: true, entregaEmDias: 4 },
  { cliente: 'Restaurante Chão de Brasa', dias: 66, status: 'ENTREGUE', pagamento: 'PIX', itens: [['PIM-500', 20], ['TEM-500', 10], ['AJO-500', 6]], pago: true, entregaEmDias: 3 },
  { cliente: 'Pizzaria Forno de Pedra', dias: 59, status: 'ENTREGUE', pagamento: 'PIX', itens: [['PIM-1000', 6], ['PAP-500', 8], ['MOL-500', 12]], pago: true, entregaEmDias: 2 },
  { cliente: 'Casa de Pasto do Zé', dias: 52, status: 'ENTREGUE', pagamento: 'BOLETO', itens: [['TEM-1000', 12], ['TAM-1KG', 8], ['PIM-500', 24]], pago: true, entregaEmDias: 4 },
  { cliente: 'Padaria Trigo Novo', dias: 45, status: 'ENTREGUE', pagamento: 'PIX', itens: [['CAN-500', 14], ['PIM-500', 10], ['SAL-1000', 30]], pago: true, entregaEmDias: 2 },
  { cliente: 'Mercearia do Bairro', dias: 46, status: 'ENTREGUE', pagamento: 'BOLETO', itens: [['SAL-1000', 60], ['PIM-500', 30], ['MOL-500', 24]], pago: true, entregaEmDias: 3 },
  { cliente: 'Restaurante Chão de Brasa', dias: 33, status: 'ENTREGUE', pagamento: 'PIX', itens: [['PIM-500', 24], ['PAP-500', 10], ['TEM-500', 8], ['AJO-500', 4]], pago: true, entregaEmDias: 3 },
  { cliente: 'Casa de Pasto do Zé', dias: 27, status: 'ENTREGUE', pagamento: 'BOLETO', itens: [['TEM-1000', 14], ['TAM-1KG', 10], ['CEB-1000', 8], ['PIM-1000', 14]], pago: true, entregaEmDias: 4 },
  { cliente: 'Pizzaria Forno de Pedra', dias: 22, status: 'ENTREGUE', pagamento: 'PIX', itens: [['MOL-500', 24], ['PAP-500', 14], ['PIM-500', 16], ['CAN-500', 8]], pago: true, entregaEmDias: 2 },
  { cliente: 'Restaurante Chão de Brasa', dias: 17, status: 'ENTREGUE', pagamento: 'PIX', itens: [['PIM-500', 30], ['TEM-1000', 10], ['AJO-500', 10], ['CAN-500', 10], ['SAL-1000', 20]], pago: true, entregaEmDias: 3 },
  { cliente: 'Padaria Trigo Novo', dias: 12, status: 'PAGAMENTO_PENDENTE', pagamento: 'BOLETO', itens: [['CAN-500', 16], ['TEM-1000', 8], ['SAL-1000', 30]], entregaEmDias: 2 },
  { cliente: 'Marmitaria da Esquina', dias: 6, status: 'ORCAMENTO', pagamento: 'PIX', itens: [['TEM-500', 18], ['SAL-1000', 36], ['PAO-200', 12]], entregaEmDias: 2 },
  { cliente: 'Restaurante Chão de Brasa', dias: 3, status: 'PAGO', pagamento: 'PIX', pago: true, itens: [['PIM-500', 40], ['TEM-1000', 12], ['AJO-500', 10], ['CAN-500', 8], ['TAM-1KG', 6]], entregaEmDias: 2 },
  { cliente: 'Casa de Pasto do Zé', dias: 1, status: 'APROVADO', pagamento: 'BOLETO', itens: [['TAM-1KG', 12], ['PIM-1000', 18], ['CEB-1000', 8], ['PIM-500', 30]], entregaEmDias: 4 },
];

export function seedVendas(produtos: Produto[], clientes: Cliente[]): Venda[] {
  const porSku = new Map(produtos.map((p) => [p.sku, p]));
  const porNome = (n: string) => clientes.find((c) => c.nome === n);

  return MODELOS.map((m, i) => {
    const cliente = porNome(m.cliente);
    const itens = m.itens.map(([sku, qtd, preco]) => {
      const prod = porSku.get(sku);
      return {
        produtoId: prod?.id ?? '',
        sku,
        descricao: prod?.nome ?? sku,
        quantidade: qtd,
        // custo e preço congelados no momento da venda — histórico preservado
        custoUnitario: prod?.custoUnitario ?? 0,
        precoUnitario: preco ?? prod?.precoVendaUnitario ?? 0,
        descontoItemPct: 0,
      };
    });

    const dataEmissao = d(m.dias);
    const status = m.status;
    return {
      ...base(),
      numero: `V-${String(i + 1).padStart(4, '0')}`,
      clienteId: cliente?.id ?? '',
      status,
      dataEmissao,
      dataPrevistaEntrega: somaDias(dataEmissao, m.entregaEmDias ?? 2),
      dataEntrega: status === 'ENTREGUE' ? somaDias(dataEmissao, m.entregaEmDias ?? 2) : undefined,
      dataPagamento: m.pago ? somaDias(dataEmissao, 0) : status === 'PAGO' ? dataEmissao : undefined,
      formaPagamento: m.pagamento,
      itens,
      numeroNF: status === 'ENTREGUE' ? `000${(i % 800) + 12}` : undefined,
      observacoes:
        status === 'ORCAMENTO'
          ? 'Orçamento enviado por WhatsApp. Validade de 7 dias.'
          : status === 'PAGAMENTO_PENDENTE'
            ? 'Boleto enviado. Cliente ainda não pagou.'
            : undefined,
    };
  });
}

/* ------------------------------ Despesas fixas ---------------------------- */

export function seedDespesasFixas(): DespesaFixa[] {
  const df = (dados: Omit<DespesaFixa, keyof ReturnType<typeof base>>): DespesaFixa => ({ ...base(), ...dados });
  return [
    df({ descricao: 'Aluguel do galpão', categoria: 'Despesas Fixas', valorMensalEstimado: 780, diaDeVencimento: 10, ativa: true, essencial: true }),
    df({ descricao: 'Pró-labore', categoria: 'Despesas Fixas', valorMensalEstimado: 880, diaDeVencimento: 5, ativa: true, essencial: true }),
    df({ descricao: 'Energia elétrica', categoria: 'Despesas Fixas', valorMensalEstimado: 185, diaDeVencimento: 15, ativa: true, essencial: true }),
    df({ descricao: 'Internet e telefone', categoria: 'Despesas Fixas', valorMensalEstimado: 109.9, diaDeVencimento: 10, ativa: true, essencial: true }),
    df({ descricao: 'Contabilidade', categoria: 'Despesas Fixas', valorMensalEstimado: 250, diaDeVencimento: 10, ativa: true, essencial: true }),
    df({ descricao: 'Água e esgoto', categoria: 'Despesas Fixas', valorMensalEstimado: 72.5, diaDeVencimento: 15, ativa: true, essencial: true }),
    df({ descricao: 'IPTU e taxa municipal', categoria: 'Despesas Fixas', valorMensalEstimado: 110, diaDeVencimento: 10, ativa: true, essencial: false }),
    df({ descricao: 'Sistema de gestão e chip', categoria: 'Despesas Fixas', valorMensalEstimado: 75, diaDeVencimento: 20, ativa: true, essencial: false }),
  ];
}

/* ------------------------------- Financeiro ------------------------------- */

export function seedLancamentos(
  fornecedores: Fornecedor[],
  clientes: Cliente[],
  vendas: Venda[] = [],
): Lancamento[] {
  const L = (dados: Omit<Lancamento, keyof ReturnType<typeof base>>): Lancamento => ({ ...base(), ...dados });
  const f = (n: string) => fornecedores.find((x) => x.nome.includes(n))?.id;
  const c = (n: string) => clientes.find((x) => x.nome.includes(n))?.id;
  const l: Lancamento[] = [];

  // Compras de mercadorias (contas a pagar)
  const compras: Array<[string, number, number, number]> = [
    ['Distribuidora Central', 88, 1480, 14],
    ['Distribuidora Central', 64, 1120, 14],
    ['Spezaria Brasil', 72, 680, 7],
    ['Indústrias Doce Tempero', 58, 2150, 21],
    ['Alimentos Regionais', 76, 420, 0],
    ['Distribuidora Central', 38, 1640, 14],
    ['Importadora de Especiarias', 44, 2380, 30],
    ['Spezaria Brasil', 26, 540, 7],
    ['Indústrias Doce Tempero', 22, 1890, 21],
    ['Commercial de Temperos', 36, 2640, 21],
    ['Distribuidora Central', 9, 1265, 14],
    ['Alimentos Regionais', 5, 380, 0],
  ];
  for (const [nome, dias, valor, prazo] of compras) {
    const venc = somaDias(d(dias), prazo);
    const pago = venc < H;
    l.push(
      L({
        tipo: 'SAIDA', categoria: 'Compras de Mercadorias', subcategoria: 'Reposição de estoque',
        descricao: `Pedido de compras — ${fornecedores.find((x) => x.nome.includes(nome))?.nome ?? nome}`,
        valor, data: d(dias), dataVencimento: venc,
        status: pago ? 'PAGO' : 'PENDENTE', pagoEm: pago ? venc : undefined,
        fornecedorId: f(nome), formaPagamento: prazo === 0 ? 'PIX' : 'BOLETO',
        recorrente: false, fixo: false,
      }),
    );
  }

  // Despesas fixas dos últimos 3 meses
  const fixas: Array<[string, string, number, number]> = [
    ['Aluguel do galpão', 'Aluguel', 780, 10],
    ['Pró-labore', 'Pessoal', 880, 5],
    ['Energia elétrica', 'Utilidades', 185, 15],
    ['Internet e telefone', 'Utilidades', 109.9, 10],
    ['Contabilidade', 'Serviços', 250, 10],
    ['Água e esgoto', 'Utilidades', 72.5, 15],
    ['IPTU e taxa municipal', 'Taxas', 110, 10],
    ['Sistema de gestão e chip', 'Serviços', 75, 20],
  ];
  for (const mes of [62, 32, 2]) {
    for (const [descricao, sub, valor, dia] of fixas) {
      const data = somaDias(d(mes), dia - 1);
      const vencido = data <= H;
      l.push(
        L({
          tipo: 'SAIDA', categoria: 'Despesas Fixas', subcategoria: sub, descricao,
          valor, data, dataVencimento: data,
          status: vencido ? 'PAGO' : 'PENDENTE', pagoEm: vencido ? data : undefined,
          formaPagamento: 'BOLETO', recorrente: true, fixo: true,
        }),
      );
    }
  }

  // Toda venda já paga ou entregue gera a entrada correspondente no caixa
  for (const v of vendas) {
    if (v.status !== 'ENTREGUE' && v.status !== 'PAGO') continue;
    const data = v.dataEmissao;
    const nome = clientes.find((c) => c.id === v.clienteId)?.nome ?? 'cliente';
    l.push(
      L({
        tipo: 'ENTRADA', categoria: 'Vendas', subcategoria: 'Faturamento recebido',
        descricao: `Venda ${v.numero} — ${nome}`, valor: totaisVenda(v).valorTotal,
        data, dataVencimento: data, status: 'RECEBIDO', recebidoEm: data,
        clienteId: v.clienteId, vendaId: v.id, formaPagamento: v.formaPagamento,
        recorrente: false, fixo: false,
      }),
    );
  }

  // Contas a receber em atraso
  l.push(
    L({
      tipo: 'ENTRADA', categoria: 'Vendas', subcategoria: 'Faturamento a prazo',
      descricao: 'Venda V-0008 — Mercearia do Bairro', valor: 1480, data: d(46),
      dataVencimento: d(31), status: 'VENCIDO', clienteId: c('Mercearia do Bairro'),
      formaPagamento: 'BOLETO', recorrente: false, fixo: false,
    }),
  );
  l.push(
    L({
      tipo: 'ENTRADA', categoria: 'Vendas', subcategoria: 'Faturamento a prazo',
      descricao: 'Venda V-0012 — Padaria Trigo Novo (boleto em aberto)', valor: 719.5, data: d(14),
      dataVencimento: d(1), status: 'PENDENTE', clienteId: c('Padaria Trigo Novo'),
      formaPagamento: 'BOLETO', recorrente: false, fixo: false,
    }),
  );

  // Impostos e custos avulsos
  l.push(
    L({
      tipo: 'SAIDA', categoria: 'Impostos', subcategoria: 'Simples Nacional',
      descricao: 'DAS proporcional — competência anterior', valor: 168.4, data: d(20),
      dataVencimento: d(20), status: 'PAGO', pagoEm: d(20), formaPagamento: 'BOLETO',
      recorrente: true, fixo: true,
    }),
  );
  l.push(
    L({
      tipo: 'SAIDA', categoria: 'Frete e Entregas', subcategoria: 'Motoboy',
      descricao: 'Entregas da semana — 6 rotas', valor: 240, data: d(11),
      dataVencimento: d(8), status: 'PAGO', pagoEm: d(8), formaPagamento: 'PIX',
      recorrente: false, fixo: false,
    }),
  );
  l.push(
    L({
      tipo: 'SAIDA', categoria: 'Frete e Entregas', subcategoria: 'Motoboy',
      descricao: 'Entregas da semana — 4 rotas', valor: 165, data: d(4),
      dataVencimento: d(1), status: 'PENDENTE', formaPagamento: 'PIX',
      recorrente: false, fixo: false,
    }),
  );
  l.push(
    L({
      tipo: 'SAIDA', categoria: 'Outros', subcategoria: 'Material de escritório',
      descricao: 'Impressora de etiquetas e bobinas', valor: 189.9, data: d(34),
      dataVencimento: d(30), status: 'PAGO', pagoEm: d(30), formaPagamento: 'CARTAO',
      recorrente: false, fixo: false,
    }),
  );

  return l;
}

export function seedCofre(lancamentos: Lancamento[]): Cofre[] {
  const mapa = new Map<string, { e: number; s: number }>();
  for (const l of lancamentos) {
    if (l.status !== 'PAGO' && l.status !== 'RECEBIDO') continue;
    const k = (l.pagoEm ?? l.recebidoEm ?? l.data).slice(0, 7);
    const v = mapa.get(k) ?? { e: 0, s: 0 };
    if (l.tipo === 'ENTRADA') v.e += l.valor;
    else v.s += l.valor;
    mapa.set(k, v);
  }
  const chaves = [...mapa.keys()].sort();
  let saldo = 3000; // capital de giro inicial informado pelo dono
  return chaves.map((k) => {
    const v = mapa.get(k)!;
    const anterior = saldo;
    saldo = saldo + v.e - v.s;
    return {
      ...base(),
      data: `${k}-28`,
      saldoInicial: anterior,
      entradas: v.e,
      saidas: v.s,
      saldoFinal: saldo,
    };
  });
}

/* ------------------------------- Notas fiscais ---------------------------- */

export function seedNotas(vendas: Venda[], clientes: Cliente[]): NotaFiscal[] {
  const notas: NotaFiscal[] = [];
  const entregues = vendas.filter((v) => v.status === 'ENTREGUE' || v.status === 'PAGO');
  entregues.forEach((v, i) => {
    const valor = v.itens.reduce((s, it) => s + it.quantidade * it.precoUnitario, 0);
    const venc = somaDias(v.dataEmissao, 14);
    const atrasada = venc < H && i % 3 === 1;
    notas.push({
      ...base(),
      numero: `000${12 + i}`,
      serie: '1',
      modelo: 'NFS-E',
      vendaId: v.id,
      clienteId: v.clienteId,
      dataEmissao: v.dataEmissao,
      dataVencimento: venc,
      valorTotal: valor,
      valorImpostos: valor * 0.04,
      status: atrasada ? 'VENCIDA' : i % 3 === 0 ? 'PAGA' : i % 3 === 2 ? 'ENVIADA' : 'EMITIDA',
      valorPago: !atrasada && i % 3 === 0 ? valor : undefined,
      dataPagamento: !atrasada && i % 3 === 0 ? venc : undefined,
      chaveAcesso: `3526${String(100000000000000 + i * 7919).padStart(44, '0')}`.slice(0, 44),
    });
  });
  // Nota em rascunho de uma venda ainda em separação
  const separacao = vendas.find((v) => v.status === 'APROVADO');
  if (separacao) {
    notas.push({
      ...base(),
      numero: `000${12 + notas.length}`,
      serie: '1',
      modelo: 'NFS-E',
      vendaId: separacao.id,
      clienteId: separacao.clienteId,
      dataEmissao: H,
      dataVencimento: somaDias(H, 14),
      valorTotal: separacao.itens.reduce((s, it) => s + it.quantidade * it.precoUnitario, 0),
      valorImpostos: separacao.itens.reduce((s, it) => s + it.quantidade * it.precoUnitario, 0) * 0.04,
      status: 'PENDENTE',
    });
  }
  void clientes;
  return notas;
}

/* -------------------------------- Marketing ------------------------------- */

export function seedMarketing(): GastoMarketing[] {
  const g = (dados: Omit<GastoMarketing, keyof ReturnType<typeof base>>): GastoMarketing => ({ ...base(), ...dados });
  return [
    g({ descricao: 'Impulsionamento — Cardápio de especiarias', canal: 'INSTAGRAM_ADS', valor: 180, data: d(86), pago: true, clientesGerados: 2, resultado: 'Dois novos contatos de restaurants na Vila Madalena.' }),
    g({ descricao: 'Banner de catálogo no perfil', canal: 'DESIGN', valor: 120, data: d(72), pago: true, clientesGerados: 0, resultado: 'Padaria Trigo Novo perguntou sobre o catálogo depois de ver o post.' }),
    g({ descricao: 'Impulsionamento — Temperos para churrasco', canal: 'INSTAGRAM_ADS', valor: 240, data: d(58), pago: true, clientesGerados: 3, resultado: 'Três pedidos na região de São Paulo e Guarulhos.' }),
    g({ descricao: 'Cartões de visita e panfletos', canal: 'IMPRESSOS', valor: 210, data: d(45), pago: true, clientesGerados: 2, resultado: 'Distribuído no glean gastronômico de Campinas.' }),
    g({ descricao: 'Anúncio no Google Maps — temperos e condimentos', canal: 'GOOGLE_ADS', valor: 300, data: d(30), pago: true, clientesGerados: 1, resultado: 'Marmitaria da Esquina pediu orçamento.' }),
    g({ descricao: 'Fotografia de produtos para o catálogo', canal: 'FOTOGRAFIA', valor: 380, data: d(16), pago: false, clientesGerados: 0, resultado: 'Em produção. 120 fotos de 12 SKUs.' }),
    g({ descricao: 'Impulsionamento — Vitrine de Temporada', canal: 'FACEBOOK_ADS', valor: 150, data: d(12), pago: false, clientesGerados: 1, resultado: 'Um cliente de cozinha industrial respondeu.' }),
    g({ descricao: 'Feira Gastronômica de Jundiaí', canal: 'EVENTO', valor: 460, data: d(6), pago: true, clientesGerados: 3, resultado: 'Três contatos com pedido mínimo acima de R$ 800,00.' }),
  ];
}

/* ---------------------------------- Metas --------------------------------- */

export function seedMetas(): Meta[] {
  const hoje = new Date();
  const meses: Meta[] = [];
  // 3 meses já vividos + 5 meses de plano = 8 metas por ano de trabalho.
  for (let back = 2; back >= -5; back--) {
    const dt = new Date(hoje.getFullYear(), hoje.getMonth() - back, 1);
    const mes = dt.getMonth() + 1;
    const ano = dt.getFullYear();
    // O plano de 90 dias começa pequeno e cresce mês a mês.
    const escala = back >= 1 ? 1 + (1 - back) * 0.05 : back === 2 ? 0.75 : back === 1 ? 0.88 : 1;
    meses.push({
      ...base(),
      nome: `Meta ${String(mes).padStart(2, '0')}/${ano}`,
      descricao: back > 0 ? 'Planejado para o período' : 'Ciclo de faturamento do mês',
      mes,
      ano,
      metas: {
        faturamento: Math.round(14000 * escala),
        ticketMedio: 1100,
        margemMedia: 30,
        novosClientes: Math.max(2, Math.round(3 * escala)),
        pedidos: Math.round(12 * escala),
        giroEstoque: 1.2,
      },
    });
  }
  return meses;
}

/* ---------------------------------- Tarefas -------------------------------- */

export function seedTarefas(): Tarefa[] {
  const t = (dados: Omit<Tarefa, keyof ReturnType<typeof base>>): Tarefa => ({ ...base(), ...dados });
  return [
    t({ titulo: 'Formalizar ME no Simples Nacional (Anexo I)', descricao: 'Confirmar enquadramento e limite de R$ 360.000.', responsavel: 'Ezequiel', area: 'A', status: 'CONCLUIDA', prazo: d(80), concluidaEm: d(76), ordem: 1, bloco: 1 }),
    t({ titulo: 'Abrir conta PJ e organizar fluxo de caixa', responsavel: 'Ezequiel', area: 'A', status: 'CONCLUIDA', prazo: d(74), concluidaEm: d(71), ordem: 2, bloco: 1 }),
    t({ titulo: 'Definir 8 a 12 SKUs de giro alto', descricao: 'Lista de estoque cirúrgico com ponto de pedido.', responsavel: 'Ezequiel', area: 'C', status: 'CONCLUIDA', prazo: d(66), concluidaEm: d(63), ordem: 3, bloco: 1 }),
    t({ titulo: 'Fechar contratos com 3 fornecedores', descricao: 'Central, Doce Tempero e Spezaria.', responsavel: 'Ezequiel', area: 'C', status: 'CONCLUIDA', prazo: d(52), concluidaEm: d(50), ordem: 4, bloco: 1 }),
    t({ titulo: 'Montar catálogo digital e tabela de preço', responsavel: 'Ezequiel', area: 'B', status: 'FAZENDO', prazo: d(-4), ordem: 5, bloco: 2 }),
    t({ titulo: 'Padronizar embalagens e rótulo com marca', responsavel: 'Ezequiel', area: 'B', status: 'FAZENDO', prazo: d(-12), ordem: 6, bloco: 2 }),
    t({ titulo: 'Fechar contrato com cozinha industrial', descricao: 'Bom Prato — 40 caixas/mês.', responsavel: 'Ezequiel', area: 'D', status: 'PENDENTE', prazo: d(-9), ordem: 7, bloco: 2 }),
    t({ titulo: 'Campanha de recuperação de clientes parados', responsavel: 'Ezequiel', area: 'D', status: 'PENDENTE', prazo: d(-18), ordem: 8, bloco: 2 }),
    t({ titulo: 'Criar tabela de preço por segmento', descricao: 'Food Service A, B e Revenda.', responsavel: 'Ezequiel', area: 'E', status: 'PENDENTE', prazo: d(-22), ordem: 9, bloco: 3 }),
    t({ titulo: 'Definir rota de entrega semanal fixa', responsavel: 'Ezequiel', area: 'G', status: 'PENDENTE', prazo: d(-26), ordem: 10, bloco: 3 }),
    t({ titulo: 'Reservar capital para reposição de estoque', descricao: 'Manter R$ 3.000 de giro separado.', responsavel: 'Ezequiel', area: 'F', status: 'PENDENTE', prazo: d(-31), ordem: 11, bloco: 3 }),
    t({ titulo: 'Meta de faturamento: R$ 14.000/mês', responsavel: 'Ezequiel', area: 'H', status: 'PENDENTE', prazo: d(12), ordem: 12, bloco: 3 }),
  ];
}

/* --------------------------------- Contatos ------------------------------- */

export function seedContatos(clientes: Cliente[]): ContatoCliente[] {
  const linhas: Array<[string, number, ContatoCliente['tipo'], string]> = [
    ['Restaurante Chão de Brasa', 88, 'PEDIDO', 'Primeiro pedido de R$ 1.040,00 via WhatsApp.'],
    ['Restaurante Chão de Brasa', 62, 'PEDIDO', 'Reposição mensal combinada.'],
    ['Restaurante Chão de Brasa', 33, 'PEDIDO', 'Aumentou volume de pimenta-do-reino.'],
    ['Restaurante Chão de Brasa', 4, 'PEDIDO', 'Pedido pago via Pix, entrega agendada.'],
    ['Padaria Trigo Novo', 74, 'PEDIDO', 'Primeiro pedido após visita à loja.'],
    ['Padaria Trigo Novo', 44, 'PEDIDO', 'Fechou encomenda mensal de canela.'],
    ['Padaria Trigo Novo', 2, 'ORCAMENTO', 'Boleto enviado, aguardando pagamento.'],
    ['Casa de Pasto do Zé', 91, 'VISITA', 'Visita comercial com amostras.'],
    ['Casa de Pasto do Zé', 70, 'PEDIDO', 'Maior pedido do período: R$ 1.620,00.'],
    ['Casa de Pasto do Zé', 26, 'LIGACAO', 'Ligação para tratar atraso de 2 dias.'],
    ['Pizzaria Forno de Pedra', 58, 'PEDIDO', 'Conheceu pelo Instagram.'],
    ['Pizzaria Forno de Pedra', 20, 'PEDIDO', 'Pediuферmento para promoção de cuarta.'],
    ['Mercearia do Bairro', 46, 'PEDIDO', 'Faturou em 30 dias.'],
    ['Mercearia do Bairro', 12, 'LIGACAO', 'Cobrança de boleto vencido. Sem resposta.'],
    ['Marmitaria da Esquina', 6, 'ORCAMENTO', 'Orçamento enviado, validade de 7 dias.'],
    ['Marmitaria da Esquina', 4, 'WHATSAPP', 'Pediu para incluir pão no catálogo.'],
    ['Espaço Gourmet Vila Madalena', 18, 'WHATSAPP', 'Primeiro contato. Perguntou sobre procedência das especiarias.'],
    ['Espaço Gourmet Vila Madalena', 9, 'EMAIL', 'Enviamos catálogo digital.'],
    ['Cozinha Industrial Bom Prato', 20, 'LIGACAO', 'Conversa sobre contrato mensal.'],
    ['Cozinha Industrial Bom Prato', 7, 'ORCAMENTO', 'Proposta de contrato enviada.'],
  ];
  return linhas.map(([nome, dias, tipo, resumo]) => {
    const cli = clientes.find((c) => c.nome === nome);
    return {
      id: uuid(),
      clienteId: cli?.id ?? '',
      data: d(dias),
      tipo,
      resumo,
    };
  });
}

/* ------------------------------- Montagem final --------------------------- */

export function criarSeed(): BancoDados {
  const configuracao = structuredClone(CONFIG_PADRAO);
  const fornecedores = seedFornecedores();
  const produtos = seedProdutos(fornecedores);
  const clientes = seedClientes();
  const segmentosPreco = seedSegmentosPreco(clientes);
  const vendas = seedVendas(produtos, clientes);
  const lancamentos = seedLancamentos(fornecedores, clientes, vendas);
  const cofre = seedCofre(lancamentos);

  return {
    versao: 1,
    configuracao,
    fornecedores,
    produtos,
    clientes: clientes.map((c, i) => ({ ...c, segmentoPrecoId: segmentosPreco[i % 3]?.id })),
    segmentosPreco,
    vendas,
    notasFiscais: seedNotas(vendas, clientes),
    lancamentos,
    despesasFixas: seedDespesasFixas(),
    cofre,
    gastosMarketing: seedMarketing(),
    metas: seedMetas(),
    tarefas: seedTarefas(),
    contatos: seedContatos(clientes),
    alertasSilenciados: [],
  };
}

export function bancoVazio(config?: Configuracao): BancoDados {
  return {
    versao: 1,
    configuracao: structuredClone(config ?? CONFIG_PADRAO),
    fornecedores: [],
    produtos: [],
    clientes: [],
    segmentosPreco: [],
    vendas: [],
    notasFiscais: [],
    lancamentos: [],
    despesasFixas: [],
    cofre: [],
    gastosMarketing: [],
    metas: [],
    tarefas: [],
    contatos: [],
    alertasSilenciados: [],
  };
}

export { toISO };
