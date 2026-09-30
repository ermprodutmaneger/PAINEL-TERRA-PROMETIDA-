import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Calculator, Package, Plus, Search, Trash2 } from 'lucide-react';
import { useDados } from '@/db/store';
import {
  ROTULO_FORMA_PAGAMENTO,
  ROTULO_STATUS_VENDA,
  type BaseEntidade,
  type FormaPagamento,
  type ItemVenda,
  type StatusVenda,
  type Venda,
} from '@/types';
import { dataBR, hojeISO, linkWhatsapp, moeda, numero as num, numeroParaInput, paraNumero, percentualNum, somaDias, cn } from '@/lib/format';
import { aliquotaEfetivaPct, margemContribuicao, precoNecessario, totaisVenda } from '@/lib/calculos';
import { Botao } from '@/components/ui/button';
import { AreaTexto, Campo, CampoTexto } from '@/components/ui/input';
import { ConteudoSelecao, GatilhoSelecao, ItemSelecao, Selecao, ValorSelecao } from '@/components/ui/select';
import { ConteudoDialog, Dialog, DialogCabecalho, DialogCorpo, DialogDescricao, DialogRodape, DialogTitulo } from '@/components/ui/dialog';
import { ConteudoPopover, GatilhoPopover, Popover, SeparadorMenu } from '@/components/ui/misc';
import { Selo } from '@/components/ui/badge';
import { mensagemCatalogo } from './dados-texto';

const STATUS: StatusVenda[] = ['ORCAMENTO', 'APROVADO', 'PAGAMENTO_PENDENTE', 'PAGO', 'EM_SEPARACAO', 'EM_TRANSITO', 'ENTREGUE'];

const esquema = z.object({
  clienteId: z.string().min(1, 'Escolha o cliente'),
  status: z.enum(STATUS as [StatusVenda, ...StatusVenda[]]),
  dataEmissao: z.string().min(1),
  dataPrevistaEntrega: z.string().min(1),
  formaPagamento: z.enum(['PIX', 'BOLETO', 'DINHEIRO', 'CARTAO', 'TRANSFERENCIA']),
  observacoes: z.string().optional(),
  custoEntrega: z.coerce.number().min(0),
  descontoGeralPct: z.coerce.number().min(0).max(100),
});

type FormVenda = z.infer<typeof esquema>;

export function DialogoVenda({
  aberto,
  aoFechar,
  venda,
  clienteInicial,
  proximoNumero,
  aoSalvar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  venda: Venda | null;
  clienteInicial?: string;
  proximoNumero: () => string;
  aoSalvar: (dados: Omit<Venda, keyof BaseEntidade | 'numero'>, criarNota: boolean) => void;
}) {
  const { derivado, configuracao, rbt12, pedidosNoMes } = useDados();
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [criarNota, setCriarNota] = useState(false);
  const [buscaItem, setBuscaItem] = useState('');
  const [custoEntrega, setCustoEntrega] = useState(configuracao.custoEntregaMedioPadrao);
  const [descontoGeral, setDescontoGeral] = useState(0);
  const [margemDesejada, setMargemDesejada] = useState(configuracao.margemAlvo);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormVenda>({
    resolver: zodResolver(esquema),
    defaultValues: {
      clienteId: '',
      status: 'ORCAMENTO',
      dataEmissao: hojeISO(),
      dataPrevistaEntrega: somaDias(hojeISO(), configuracao.prazoEntregaPadraoDias),
      formaPagamento: 'PIX',
      observacoes: '',
      custoEntrega: configuracao.custoEntregaMedioPadrao,
      descontoGeralPct: 0,
    },
  });

  useEffect(() => {
    if (!aberto) return;
    if (venda) {
      reset({
        clienteId: venda.clienteId,
        status: venda.status,
        dataEmissao: venda.dataEmissao,
        dataPrevistaEntrega: venda.dataPrevistaEntrega,
        formaPagamento: venda.formaPagamento,
        observacoes: venda.observacoes ?? '',
        custoEntrega: 0,
        descontoGeralPct: 0,
      });
      setItens(venda.itens);
      setCriarNota(false);
    } else {
      reset({
        clienteId: clienteInicial ?? '',
        status: 'ORCAMENTO',
        dataEmissao: hojeISO(),
        dataPrevistaEntrega: somaDias(hojeISO(), configuracao.prazoEntregaPadraoDias),
        formaPagamento: 'PIX',
        observacoes: '',
        custoEntrega: configuracao.custoEntregaMedioPadrao,
        descontoGeralPct: 0,
      });
      setItens([]);
      setCustoEntrega(configuracao.custoEntregaMedioPadrao);
      setDescontoGeral(0);
      setCriarNota(false);
    }
  }, [aberto, venda, reset, clienteInicial, configuracao]);

  const clienteId = watch('clienteId');
  const cliente = derivado.clientes.find((c) => c.id === clienteId);

  // Ao escolher o cliente, sugere a condição de pagamento da tabela de preço
  useEffect(() => {
    if (!cliente || venda) return;
    if (cliente.condicaoPagamentoTabela === 'ANTECIPADO') setValue('formaPagamento', 'PIX');
    else if (cliente.condicaoPagamentoTabela) setValue('formaPagamento', 'BOLETO');
  }, [cliente, setValue, venda]);

  /* ------------------------- Cálculo em tempo real --------------------- */
  const comDesconto = useMemo(
    () =>
      itens.map((i) => ({
        ...i,
        descontoItemPct: Math.min(100, (i.descontoItemPct ?? 0) + descontoGeral),
      })),
    [itens, descontoGeral],
  );

  const totais = useMemo(() => totaisVenda({ itens: comDesconto }), [comDesconto]);
  const aliquota = aliquotaEfetivaPct(rbt12);
  const margem = useMemo(
    () => margemContribuicao({ valorTotal: totais.valorTotal, itens: comDesconto, custoEntrega }, configuracao, { rbt12, pedidosNoMes }),
    [totais.valorTotal, comDesconto, custoEntrega, configuracao, rbt12, pedidosNoMes],
  );

  const custoItens = comDesconto.reduce((s, i) => s + i.quantidade * i.custoUnitario, 0);
  const precoParaMeta = useMemo(() => {
    if (custoItens <= 0) return 0;
    return precoNecessario(custoItens + custoEntrega, margemDesejada, aliquota);
  }, [custoItens, custoEntrega, margemDesejada, aliquota]);

  const filtrados = useMemo(() => {
    const t = buscaItem.trim().toLowerCase();
    if (!t) return derivado.produtos.filter((p) => !p.arquivado && p.ativo).slice(0, 8);
    return derivado.produtos
      .filter((p) => !p.arquivado && `${p.sku} ${p.nome}`.toLowerCase().includes(t))
      .slice(0, 8);
  }, [buscaItem, derivado.produtos]);

  const adicionar = (produtoId: string) => {
    const p = derivado.produtos.find((x) => x.id === produtoId);
    if (!p) return;
    const existente = itens.find((i) => i.produtoId === produtoId);
    if (existente) {
      setItens((ls) => ls.map((i) => (i.produtoId === produtoId ? { ...i, quantidade: i.quantidade + 1 } : i)));
    } else {
      // custo e preço são congelados agora: alterar o cadastro do produto
      // depois NÃO muda este pedido (§15 — histórico preservado)
      setItens((ls) => [
        ...ls,
        {
          produtoId: p.id,
          sku: p.sku,
          descricao: p.nome,
          quantidade: 1,
          custoUnitario: p.custoUnitario,
          precoUnitario: p.precoVendaUnitario,
          descontoItemPct: 0,
        },
      ]);
    }
    setBuscaItem('');
  };

  const atualizarItem = (idx: number, patch: Partial<ItemVenda>) =>
    setItens((ls) => ls.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const salvar = handleSubmit((dados) => {
    if (itens.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido.');
      return;
    }
    aoSalvar(
      {
        clienteId: dados.clienteId,
        status: dados.status,
        dataEmissao: dados.dataEmissao,
        dataPrevistaEntrega: dados.dataPrevistaEntrega,
        dataPagamento: dados.status === 'PAGO' ? (venda?.dataPagamento ?? dados.dataEmissao) : venda?.dataPagamento,
        dataEntrega: dados.status === 'ENTREGUE' ? (venda?.dataEntrega ?? dados.dataEmissao) : venda?.dataEntrega,
        formaPagamento: dados.formaPagamento,
        itens: comDesconto,
        observacoes: dados.observacoes,
        numeroNF: venda?.numeroNF,
      },
      criarNota,
    );
  });

  const abaixoDoMinimo = totais.valorTotal > 0 && margem.mcPct * 100 < configuracao.margemMinimaAlerta;
  const clienteTabela = derivado.clientes.find((c) => c.id === clienteId);
  const pedidoMinimo = clienteTabela?.pedidoMinimoTabela ?? configuracao.pedidoMinimoPadrao;
  const abaixoDoPedidoMinimo = totais.valorTotal > 0 && totais.valorTotal < pedidoMinimo;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <ConteudoDialog largura="xl">
        <DialogCabecalho>
          <DialogTitulo>{venda ? `Editar pedido ${venda.numero}` : 'Novo pedido'}</DialogTitulo>
          <DialogDescricao>
            A margem é recalculada a cada item digitado. Custos e preços ficam congelados neste pedido.
          </DialogDescricao>
        </DialogCabecalho>
        <form onSubmit={salvar} className="flex min-h-0 flex-1 flex-col">
          <DialogCorpo className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            {/* ------------------------- Coluna principal ------------------ */}
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo rotulo="Cliente" obrigatorio erro={errors.clienteId?.message} className="sm:col-span-2" htmlFor="vcliente">
                  <Selecao value={clienteId} onValueChange={(v) => setValue('clienteId', v)}>
                    <GatilhoSelecao>
                      <ValorSelecao placeholder="Escolha o cliente…" />
                    </GatilhoSelecao>
                    <ConteudoSelecao>
                      {derivado.clientes
                        .filter((c) => !c.arquivado)
                        .map((c) => (
                          <ItemSelecao key={c.id} value={c.id}>
                            {c.nome} — {c.cidadeAtendida}
                          </ItemSelecao>
                        ))}
                    </ConteudoSelecao>
                  </Selecao>
                </Campo>

                {cliente && (
                  <div className="sm:col-span-2 flex flex-wrap items-center gap-2 rounded-lg bg-[var(--acento)] px-3 py-2 text-[12px] text-[var(--texto-suave)]">
                    <Selo tom="terra">{cliente.nomeTabelaPreco ?? 'Tabela padrão'}</Selo>
                    <span>
                      Pedido mínimo {moeda(cliente.pedidoMinimoTabela)} · entrega em{' '}
                      {cliente.condicaoPagamentoTabela === '7_DIAS'
                        ? '7 dias'
                        : cliente.condicaoPagamentoTabela === '15_DIAS'
                          ? '15 dias'
                          : cliente.condicaoPagamentoTabela === '30_DIAS'
                            ? '30 dias'
                            : 'antecipado'}
                    </span>
                    <a
                      href={linkWhatsapp(cliente.whatsapp || cliente.telefone, mensagemCatalogo(cliente.nome))}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto text-[var(--marca)] hover:underline dark:text-[var(--destaque)]"
                    >
                      Enviar catálogo
                    </a>
                  </div>
                )}

                <Campo rotulo="Situação" htmlFor="vstatus">
                  <Selecao value={watch('status')} onValueChange={(v) => setValue('status', v as StatusVenda)}>
                    <GatilhoSelecao>
                      <ValorSelecao />
                    </GatilhoSelecao>
                    <ConteudoSelecao>
                      {STATUS.map((s) => (
                        <ItemSelecao key={s} value={s}>
                          {ROTULO_STATUS_VENDA[s]}
                        </ItemSelecao>
                      ))}
                    </ConteudoSelecao>
                  </Selecao>
                </Campo>
                <Campo rotulo="Forma de pagamento" htmlFor="vpag">
                  <Selecao value={watch('formaPagamento')} onValueChange={(v) => setValue('formaPagamento', v as FormaPagamento)}>
                    <GatilhoSelecao>
                      <ValorSelecao />
                    </GatilhoSelecao>
                    <ConteudoSelecao>
                      {(Object.keys(ROTULO_FORMA_PAGAMENTO) as FormaPagamento[]).map((f) => (
                        <ItemSelecao key={f} value={f}>
                          {ROTULO_FORMA_PAGAMENTO[f]}
                        </ItemSelecao>
                      ))}
                    </ConteudoSelecao>
                  </Selecao>
                </Campo>
                <Campo rotulo="Data de emissão" htmlFor="vemissao">
                  <CampoTexto id="vemissao" type="date" {...register('dataEmissao')} />
                </Campo>
                <Campo rotulo="Entrega prevista" htmlFor="ventrega">
                  <CampoTexto id="ventrega" type="date" {...register('dataPrevistaEntrega')} />
                </Campo>
              </div>

              {/* ------------------------- Itens -------------------------- */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">Itens do pedido</h4>
                  <CampoTexto
                    value={buscaItem}
                    onChange={(e) => setBuscaItem(e.target.value)}
                    placeholder="Buscar produto…"
                    aria-label="Buscar produto para adicionar"
                    className="h-8 w-40 sm:w-56"
                  />
                </div>

                {buscaItem.trim() && (
                  <ul
                    aria-label="Resultados da busca de produtos"
                    className="mb-2 max-h-56 overflow-y-auto rounded-lg border border-[var(--borda)]"
                  >
                    {filtrados.length === 0 && <li className="p-3 text-[12.5px] text-[var(--texto-suave)]">Nenhum produto encontrado.</li>}
                    {filtrados.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => adicionar(p.id)}
                          className="flex w-full items-center justify-between gap-2 border-b border-[var(--borda)] px-3 py-2 text-left last:border-0 hover:bg-[var(--acento)]"
                        >
                          <span className="min-w-0">
                            <span className="num block text-[11.5px] font-semibold text-[var(--marca)] dark:text-[var(--destaque)]">{p.sku}</span>
                            <span className="block truncate text-[12.5px] text-[var(--texto)]">{p.nome}</span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="num block text-[12.5px] font-semibold">{moeda(p.precoVendaUnitario)}</span>
                            <span className="num block text-[11px] text-[var(--texto-tenue)]">{num(p.estoqueAtual)} em estoque</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {itens.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[var(--borda-forte)] px-4 py-8 text-center">
                    <Package className="mx-auto mb-2 size-6 text-[var(--texto-tenue)]" aria-hidden />
                    <p className="text-[13px] font-medium text-[var(--texto)]">Nenhum item no pedido</p>
                    <p className="mt-0.5 text-[12.5px] text-[var(--texto-suave)]">
                      Busque um produto acima e clique para adicionar.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-[var(--borda)]">
                    <table className="w-full min-w-[540px] text-[13px]">
                      <thead className="bg-[var(--acento)] text-[11.5px] uppercase tracking-wide text-[var(--texto-suave)]">
                        <tr>
                          <th className="px-2.5 py-1.5 text-left font-semibold">Produto</th>
                          <th className="w-16 px-2 py-1.5 text-right font-semibold">Qtd.</th>
                          <th className="w-24 px-2 py-1.5 text-right font-semibold">Custo</th>
                          <th className="w-24 px-2 py-1.5 text-right font-semibold">Preço</th>
                          <th className="w-16 px-2 py-1.5 text-right font-semibold">Desc.</th>
                          <th className="w-24 px-2 py-1.5 text-right font-semibold">Total</th>
                          <th className="w-9" />
                        </tr>
                      </thead>
                      <tbody>
                        {itens.map((item, idx) => {
                          const linha = comDesconto[idx] ?? item;
                          const totalLinha = item.quantidade * item.precoUnitario * (1 - linha.descontoItemPct / 100);
                          return (
                            <tr key={item.produtoId + idx} className="border-t border-[var(--borda)]">
                              <td className="px-2.5 py-1.5">
                                <p className="num text-[11px] font-semibold text-[var(--marca)] dark:text-[var(--destaque)]">{item.sku}</p>
                                <p className="truncate text-[12.5px]">{item.descricao}</p>
                              </td>
                              <td className="px-2 py-1.5">
                                <CampoTexto
                                  type="number"
                                  min={1}
                                  value={numeroParaInput(item.quantidade, 0)}
                                  aria-label={`Quantidade de ${item.descricao}`}
                                  className="h-8 px-2 text-right"
                                  onChange={(e) => atualizarItem(idx, { quantidade: Math.max(0, Number(e.target.value)) })}
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <CampoTexto
                                  type="number"
                                  step="0.01"
                                  value={numeroParaInput(item.custoUnitario)}
                                  aria-label={`Custo de ${item.descricao}`}
                                  className="h-8 px-2 text-right"
                                  onChange={(e) => atualizarItem(idx, { custoUnitario: paraNumero(e.target.value) })}
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <CampoTexto
                                  type="number"
                                  step="0.01"
                                  value={numeroParaInput(item.precoUnitario)}
                                  aria-label={`Preço de ${item.descricao}`}
                                  className="h-8 px-2 text-right"
                                  onChange={(e) => atualizarItem(idx, { precoUnitario: paraNumero(e.target.value) })}
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <CampoTexto
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={numeroParaInput(item.descontoItemPct ?? 0, 0)}
                                  aria-label={`Desconto de ${item.descricao}`}
                                  className="h-8 px-2 text-right"
                                  onChange={(e) => atualizarItem(idx, { descontoItemPct: paraNumero(e.target.value) })}
                                />
                              </td>
                              <td className="num px-2 py-1.5 text-right font-semibold">{moeda(totalLinha)}</td>
                              <td className="px-1 py-1.5">
                                <Botao
                                  type="button"
                                  variante="fantasma"
                                  tamanho="iconeXs"
                                  aria-label={`Remover ${item.descricao}`}
                                  onClick={() => setItens((ls) => ls.filter((_, i) => i !== idx))}
                                >
                                  <Trash2 />
                                </Botao>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Popover>
                    <GatilhoPopover asChild>
                      <Botao type="button" variante="contorno" tamanho="sm">
                        <Search />
                        Adicionar produto
                      </Botao>
                    </GatilhoPopover>
                    <ConteudoPopover className="w-80">
                      <CampoTexto
                        autoFocus
                        value={buscaItem}
                        onChange={(e) => setBuscaItem(e.target.value)}
                        placeholder="Buscar por SKU ou nome…"
                        aria-label="Buscar produto"
                      />
                      <ul className="mt-2 max-h-60 overflow-y-auto">
                        {filtrados.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => adicionar(p.id)}
                              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[var(--acento)]"
                            >
                              <span className="min-w-0 truncate text-[12.5px]">
                                <span className="num text-[11px] font-semibold text-[var(--marca)] dark:text-[var(--destaque)]">{p.sku}</span>{' '}
                                {p.nome}
                              </span>
                              <span className="num shrink-0 text-[12px] font-semibold">{moeda(p.precoVendaUnitario)}</span>
                            </button>
                          </li>
                        ))}
                        {filtrados.length === 0 && <li className="px-2 py-3 text-[12.5px] text-[var(--texto-suave)]">Nada encontrado.</li>}
                      </ul>
                    </ConteudoPopover>
                  </Popover>
                  <span className="text-[12px] text-[var(--texto-tenue)]">{itens.length} itens</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Campo rotulo="Desconto geral (%)" dica="Aplicado a todos os itens" htmlFor="vdesc">
                  <CampoTexto
                    id="vdesc"
                    type="number"
                    min={0}
                    max={100}
                    value={numeroParaInput(descontoGeral, 0)}
                    onChange={(e) => setDescontoGeral(Math.min(100, Math.max(0, paraNumero(e.target.value))))}
                  />
                </Campo>
                <Campo rotulo="Custo da entrega (R$)" htmlFor="vent">
                  <CampoTexto
                    id="vent"
                    type="number"
                    step="0.01"
                    value={numeroParaInput(custoEntrega)}
                    onChange={(e) => setCustoEntrega(paraNumero(e.target.value))}
                  />
                </Campo>
                <div className="flex items-end">
                  <label className="flex h-9 items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={criarNota}
                      onChange={(e) => setCriarNota(e.target.checked)}
                      className="size-3.5 accent-[var(--marca)]"
                    />
                    Gerar nota fiscal
                  </label>
                </div>
              </div>

              <Campo rotulo="Observações" htmlFor="vobs">
                <AreaTexto id="vobs" {...register('observacoes')} placeholder="Combinações de entrega, forma de pagamento…" />
              </Campo>
            </div>

            {/* ------------------------- Painel lateral ------------------- */}
            <div className="space-y-3 lg:sticky lg:top-0 lg:self-start">
              <div
                className={cn(
                  'rounded-xl border p-3.5',
                  abaixoDoMinimo ? 'border-[var(--alerta)] bg-[var(--alerta-suave)]' : 'border-[var(--borda)] bg-[var(--acento)]',
                )}
              >
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">Margem em tempo real</p>
                {itens.length === 0 ? (
                  <>
                    <p className="num mt-1 text-[30px] font-semibold leading-none text-[var(--texto-tenue)]">—</p>
                    <p className="mt-0.5 text-[12px] text-[var(--texto-suave)]">Adicione itens para ver a margem.</p>
                  </>
                ) : (
                  <>
                    <p
                      className="num mt-1 text-[30px] font-semibold leading-none"
                      style={{ color: abaixoDoMinimo ? 'var(--alerta)' : 'var(--sucesso)' }}
                    >
                      {percentualNum(margem.mcPct * 100)}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--texto-suave)]">
                      {moeda(margem.mc)} de margem em {moeda(totais.valorTotal)}
                    </p>
                  </>
                )}

                <div className="mt-3 space-y-1">
                  <Linha rotulo="Subtotal" valor={moeda(totais.valorBruto)} />
                  <Linha rotulo="Descontos" valor={`− ${moeda(totais.valorDesconto)}`} />
                  <Linha rotulo="Total do pedido" valor={moeda(totais.valorTotal)} forte />
                  <Linha rotulo={`Impostos (${percentualNum(aliquota, 2)})`} valor={`− ${moeda(margem.impostos)}`} />
                  <Linha rotulo="Custo dos produtos" valor={`− ${moeda(margem.custosProd)}`} />
                  <Linha rotulo="Entrega" valor={`− ${moeda(margem.entrega)}`} />
                  {configuracao.comissaoPadraoPct > 0 && (
                    <Linha rotulo="Comissão" valor={`− ${moeda(margem.comissao)}`} />
                  )}
                  <Linha rotulo="Margem de contribuição" valor={moeda(margem.mc)} forte />
                  <Linha rotulo="Rateio de despesa fixa" valor={`− ${moeda(margem.rateioDespesaFixa)}`} />
                  <p className="pt-1 text-[11px] leading-snug text-[var(--texto-tenue)]">
                    Custo fixo mensal dividido pelos pedidos do mês.
                  </p>
                  <Linha rotulo="Lucro estimado" valor={moeda(margem.lucro)} forte />
                </div>

                {abaixoDoMinimo && (
                  <p className="mt-3 flex items-start gap-1.5 rounded-md bg-[var(--superficie)] px-2.5 py-2 text-[12px] font-medium text-[var(--alerta)]">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    Abaixo do mínimo de {configuracao.margemMinimaAlerta}%. Para {configuracao.margemAlvo}% de margem, o total
                    deveria ser {moeda(precoParaMeta)}.
                  </p>
                )}
                {abaixoDoPedidoMinimo && (
                  <p className="mt-2 rounded-md bg-[var(--atencao-suave)] px-2.5 py-2 text-[12px] text-[var(--atencao)]">
                    Abaixo do pedido mínimo de {moeda(pedidoMinimo)} desta tabela de preço.
                  </p>
                )}
              </div>

              {/* ----------------------- Simulador §7.3 ------------------ */}
              <div className="rounded-xl border border-[var(--borda)] p-3.5">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">
                  <Calculator className="size-3.5" aria-hidden />
                  Simulador de preço
                </p>
                <p className="mt-1 text-[12px] text-[var(--texto-suave)]">
                  Quanto cobrar para {margemDesejada}% de margem?
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={1}
                    value={margemDesejada}
                    onChange={(e) => setMargemDesejada(Number(e.target.value))}
                    aria-label="Margem desejada"
                    className="h-1.5 flex-1 accent-[var(--marca)]"
                  />
                  <span className="num w-10 text-right text-[12.5px] font-semibold">{margemDesejada}%</span>
                </div>
                <p className="num mt-2 text-[19px] font-semibold text-[var(--marca)] dark:text-[var(--destaque)]">
                  {moeda(precoParaMeta)}
                </p>
                <p className="mt-1 text-[11.5px] leading-snug text-[var(--texto-tenue)]">
                  Custo dos itens {moeda(custoItens)} + entrega {moeda(custoEntrega)}, dividido por (1 − imposto − margem).
                </p>
                <div className="mt-2 flex gap-1.5">
                  {[10, 15, 20, 25, 30].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMargemDesejada(m)}
                      className={cn(
                        'num flex-1 rounded-md border px-1 py-1 text-[11.5px] font-medium transition-colors',
                        margemDesejada === m
                          ? 'border-[var(--marca)] bg-[var(--marca)] text-white'
                          : 'border-[var(--borda)] hover:bg-[var(--acento)]',
                      )}
                    >
                      {m}%
                    </button>
                  ))}
                </div>
                {custoItens > 0 && (
                  <Botao
                    type="button"
                    tamanho="sm"
                    variante="contorno"
                    className="mt-2 w-full"
                    onClick={() => {
                      const fator = precoParaMeta / Math.max(totais.valorTotal, 0.01);
                      setItens((ls) => ls.map((i) => ({ ...i, precoUnitario: Number((i.precoUnitario * fator).toFixed(2)) })));
                      setDescontoGeral(0);
                      toast.success(`Preços ajustados para ${margemDesejada}% de margem`);
                    }}
                  >
                    <Plus />
                    Aplicar aos itens
                  </Botao>
                )}
              </div>

              {venda && (
                <div className="rounded-xl border border-[var(--borda)] p-3.5 text-[12px] text-[var(--texto-suave)]">
                  <p className="font-semibold text-[var(--texto)]">Histórico preservado</p>
                  <p className="mt-1">
                    Este pedido guarda o custo e o preço de cada item no momento da venda. Mudar o cadastro do produto não
                    altera este valor.
                  </p>
                  <p className="mt-1.5 num">Emitido em {dataBR(venda.dataEmissao)}</p>
                  <SeparadorMenu className="my-2 h-px bg-[var(--borda)]" />
                  <p className="num">Itens: {venda.itens.length}</p>
                </div>
              )}
            </div>
          </DialogCorpo>
          <DialogRodape>
            <span className="mr-auto text-[12px] text-[var(--texto-tenue)] sm:hidden">
              Total {moeda(totais.valorTotal)} · MC {percentualNum(margem.mcPct * 100)}
            </span>
            <Botao type="button" variante="contorno" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit">{venda ? 'Salvar pedido' : `Criar ${proximoNumero()}`}</Botao>
          </DialogRodape>
        </form>
      </ConteudoDialog>
    </Dialog>
  );
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-dashed border-[var(--borda)] py-1 last:border-0">
      <span className="text-[12px] text-[var(--texto-suave)]">{rotulo}</span>
      <span className={cn('num text-[12.5px]', forte ? 'font-semibold text-[var(--texto)]' : 'text-[var(--texto)]')}>{valor}</span>
    </div>
  );
}


