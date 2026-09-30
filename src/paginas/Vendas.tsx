import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Columns3,
  FileDown,
  Kanban,
  MessageCircle,
  Plus,
  Printer,
  ReceiptText,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { useDados } from '@/db/store';
import { useRota } from '@/lib/rota';
import type { VendaCalculada } from '@/db/deriva';
import {
  FLUXO_VENDA,
  ROTULO_FORMA_PAGAMENTO,
  ROTULO_STATUS_VENDA,
  type StatusVenda,
  type NotaFiscal,
  type Venda,
} from '@/types';
import { cn, dataBR, hojeISO, linkWhatsapp, moeda, numero, percentualNum, somaDias } from '@/lib/format';
import { aliquotaEfetivaPct, margemContribuicao, totaisVenda } from '@/lib/calculos';
import { CabecalhoPagina, CartaoKpi, EstadoVazio, Etiqueta } from '@/components/comuns';
import { TabelaDados, texto } from '@/components/tabela-dados';
import { Botao } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CampoTexto } from '@/components/ui/input';
import { ConteudoSelecao, GatilhoSelecao, ItemSelecao, Selecao, ValorSelecao } from '@/components/ui/select';
import { BotaoExcluir } from '@/components/ui/dialog';
import { ConteudoMenu, GatilhoMenu, ItemMenu, Menu, SeparadorMenu } from '@/components/ui/misc';
import { Selo } from '@/components/ui/badge';
import { TOM_VENDA } from '@/lib/cores';
import { DialogoVenda } from './VendasDialogo';
import { DrawerVenda } from './VendasDrawer';
import { MaisVertical } from './icones-auxiliares';
import { gerarOrcamentoPDF } from '@/lib/pdf';

export default function Vendas() {
  const { derivado, atualizar, remover, configuracao, rbt12, pedidosNoMes, proximoNumeroVenda, criar } = useDados();
  const { consulta, trocarConsulta } = useRota();

  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('TODOS');
  const [cliente, setCliente] = useState('TODOS');
  const [periodoFiltro, setPeriodoFiltro] = useState('TODOS');
  const [visao, setVisao] = useState<'tabela' | 'kanban'>('kanban');
  const [editando, setEditando] = useState<Venda | null>(null);
  const [aberto, setAberto] = useState(false);
  const [detalhe, setDetalhe] = useState<VendaCalculada | null>(null);
  const clienteInicial = consulta.get('cliente');

  useEffect(() => {
    if (clienteInicial) setCliente(clienteInicial);
  }, [clienteInicial]);

  useEffect(() => {
    const aoNovo = () => {
      setEditando(null);
      setAberto(true);
    };
    const aoEditar = (e: Event) => {
      const alvo = derivado.vendas.find((v) => v.id === (e as CustomEvent<string>).detail);
      if (alvo) {
        setEditando(alvo);
        setAberto(true);
      }
    };
    window.addEventListener('tp:novo', aoNovo);
    window.addEventListener('tp:editar-venda', aoEditar);
    return () => {
      window.removeEventListener('tp:novo', aoNovo);
      window.removeEventListener('tp:editar-venda', aoEditar);
    };
  }, [derivado.vendas]);

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    const hoje = hojeISO();
    return derivado.vendas
      .filter((v) => {
        if (status !== 'TODOS' && v.status !== status) return false;
        if (cliente !== 'TODOS' && v.clienteId !== cliente) return false;
        if (periodoFiltro === 'ABERTO' && ['ENTREGUE', 'CANCELADO', 'DEVOLVIDO'].includes(v.status)) return false;
        if (periodoFiltro === '30' && v.dataEmissao < somaDias(hoje, -30)) return false;
        if (periodoFiltro === '60' && v.dataEmissao < somaDias(hoje, -60)) return false;
        if (t && !`${v.numero} ${v.nomeCliente} ${v.numeroNF ?? ''}`.toLowerCase().includes(t)) return false;
        return true;
      })
      .sort((a, b) => b.dataEmissao.localeCompare(a.dataEmissao));
  }, [derivado.vendas, busca, status, cliente, periodoFiltro]);

  const resumo = useMemo(() => {
    const abertas = derivado.vendas.filter((v) => !['ENTREGUE', 'CANCELADO', 'DEVOLVIDO'].includes(v.status));
    const entregues = derivado.vendas.filter((v) => v.status === 'ENTREGUE');
    const total = filtradas.reduce((s, v) => s + v.valorTotal, 0);
    const mc = filtradas
      .filter((v) => !['CANCELADO', 'DEVOLVIDO'].includes(v.status))
      .reduce((s, v) => {
        const m = margemContribuicao({ valorTotal: v.valorTotal, itens: v.itens }, configuracao, { rbt12, pedidosNoMes });
        return s + m.mc;
      }, 0);
    return {
      abertas: abertas.length,
      abertasValor: abertas.reduce((s, v) => s + v.valorTotal, 0),
      entregues: entregues.length,
      total,
      mc,
      mcPct: total > 0 ? mc / total : 0,
      ticket: filtradas.length > 0 ? total / filtradas.length : 0,
    };
  }, [derivado.vendas, filtradas, configuracao, rbt12, pedidosNoMes]);

  const moverStatus = (venda: VendaCalculada, novo: StatusVenda) => {
    const patch: Partial<Venda> = { status: novo };
    const hoje = hojeISO();
    if (novo === 'PAGO') patch.dataPagamento = venda.dataPagamento ?? hoje;
    if (novo === 'ENTREGUE') patch.dataEntrega = venda.dataEntrega ?? hoje;
    if (novo === 'PAGAMENTO_PENDENTE') patch.dataPagamento = undefined;
    atualizar<Venda>('vendas', venda.id, patch);
    toast.success(`${venda.numero} → ${ROTULO_STATUS_VENDA[novo]}`, {
      description: novo === 'PAGO' || novo === 'ENTREGUE' ? 'Data registrada automaticamente.' : undefined,
    });
  };

  const colunas: Array<ColumnDef<VendaCalculada, any>> = useMemo(
    () => [
      {
        id: 'numero',
        accessorKey: 'numero',
        header: 'Pedido',
        cell: ({ row }) => (
          <div className="min-w-[130px]">
            <p className="num font-semibold text-[var(--marca)] dark:text-[var(--destaque)]">{row.original.numero}</p>
            <p className="text-[11.5px] text-[var(--texto-tenue)]">{dataBR(row.original.dataEmissao)}</p>
          </div>
        ),
      },
      { id: 'cliente', accessorKey: 'nomeCliente', header: 'Cliente', cell: ({ row }) => <span className="font-medium">{row.original.nomeCliente}</span> },
      {
        id: 'itens',
        accessorFn: (r) => r.itens.length,
        meta: { ocultarAte: 'xl' },
        header: 'Itens',
        cell: ({ row }) => <span className="num">{numero(row.original.itens.length)}</span>,
      },
      {
        id: 'total',
        accessorKey: 'valorTotal',
        header: 'Total',
        cell: ({ row }) => <span className="num font-semibold">{moeda(row.original.valorTotal)}</span>,
      },
      {
        id: 'mc',
        header: 'MC %',
        cell: ({ row }) => {
          const m = margemContribuicao({ valorTotal: row.original.valorTotal, itens: row.original.itens }, configuracao, {
            rbt12,
            pedidosNoMes,
          });
          const cor = m.mcPct * 100 < configuracao.margemMinimaAlerta ? 'var(--alerta)' : 'var(--sucesso)';
          return (
            <span className="num font-semibold" style={{ color: cor }}>
              {percentualNum(m.mcPct * 100)}
            </span>
          );
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Situação',
        cell: ({ row }) => <Etiqueta tom={TOM_VENDA[row.original.status]}>{ROTULO_STATUS_VENDA[row.original.status]}</Etiqueta>,
      },
      {
        id: 'entrega',
        accessorKey: 'dataPrevistaEntrega',
        meta: { ocultarAte: '2xl' },
        header: 'Entrega prevista',
        cell: ({ row }) => <span className="num whitespace-nowrap">{dataBR(row.original.dataPrevistaEntrega)}</span>,
      },
      {
        id: 'pagamento',
        accessorKey: 'formaPagamento',
        meta: { ocultarAte: '2xl' },
        header: 'Pagamento',
        cell: ({ row }) => texto(ROTULO_FORMA_PAGAMENTO[row.original.formaPagamento]),
      },
    ],
    [configuracao, rbt12, pedidosNoMes],
  );

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        icone={ReceiptText}
        titulo="Vendas & Pedidos"
        descricao="Do orçamento à entrega. Segure o cartão e arraste para outra coluna, ou toque nele para ver as situações."
        acoes={
          <>
            <div className="flex items-center gap-0.5 rounded-lg border border-[var(--borda)] p-0.5">
              <button
                type="button"
                onClick={() => setVisao('kanban')}
                aria-label="Ver em kanban"
                aria-pressed={visao === 'kanban'}
                className="rounded-md p-2 text-[var(--texto-tenue)] transition-colors aria-pressed:bg-[var(--acento)] aria-pressed:text-[var(--texto)]"
              >
                <Kanban className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setVisao('tabela')}
                aria-label="Ver em tabela"
                aria-pressed={visao === 'tabela'}
                className="rounded-md p-2 text-[var(--texto-tenue)] transition-colors aria-pressed:bg-[var(--acento)] aria-pressed:text-[var(--texto)]"
              >
                <Columns3 className="size-4" />
              </button>
            </div>
            <Botao
              onClick={() => {
                setEditando(null);
                setAberto(true);
              }}
            >
              <Plus />
              Novo pedido
            </Botao>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoKpi
          rotulo="Pedidos em aberto"
          valor={numero(resumo.abertas)}
          apoio={moeda(resumo.abertasValor)}
          icone={ReceiptText}
        />
        <CartaoKpi rotulo="Ticket médio" valor={moeda(resumo.ticket)} icone={ReceiptText} />
        <CartaoKpi
          rotulo="Margem média"
          valor={percentualNum(resumo.mcPct * 100)}
          apoio={`Mínimo ${configuracao.margemMinimaAlerta}%`}
          cor={resumo.mcPct * 100 < configuracao.margemMinimaAlerta ? 'var(--alerta)' : 'var(--sucesso)'}
          icone={TriangleAlert}
        />
        <CartaoKpi rotulo="Pedidos entregues" valor={numero(resumo.entregues)} icone={ReceiptText} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--borda)] p-3">
          <CampoTexto
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pedido, cliente ou número da nota…"
            aria-label="Buscar pedidos"
            className="h-9 min-w-[100%] flex-1 sm:min-w-[180px] sm:max-w-xs"
          />
          <Selecao value={status} onValueChange={setStatus}>
            <GatilhoSelecao tamanho="sm" className="w-full px-2.5 sm:w-[12rem]">
              <ValorSelecao placeholder="Situação" />
            </GatilhoSelecao>
            <ConteudoSelecao>
              <ItemSelecao value="TODOS">Todas as situações</ItemSelecao>
              {(Object.keys(ROTULO_STATUS_VENDA) as StatusVenda[]).map((s) => (
                <ItemSelecao key={s} value={s}>
                  {ROTULO_STATUS_VENDA[s]}
                </ItemSelecao>
              ))}
            </ConteudoSelecao>
          </Selecao>
          <Selecao value={cliente} onValueChange={setCliente}>
            <GatilhoSelecao tamanho="sm" className="w-full px-2.5 sm:w-[13rem]">
              <ValorSelecao placeholder="Cliente" />
            </GatilhoSelecao>
            <ConteudoSelecao>
              <ItemSelecao value="TODOS">Todos os clientes</ItemSelecao>
              {derivado.clientes.map((c) => (
                <ItemSelecao key={c.id} value={c.id}>
                  {c.nome}
                </ItemSelecao>
              ))}
            </ConteudoSelecao>
          </Selecao>
          <Selecao value={periodoFiltro} onValueChange={setPeriodoFiltro}>
            <GatilhoSelecao tamanho="sm" className="w-full px-2.5 sm:w-[10.5rem]">
              <ValorSelecao placeholder="Período" />
            </GatilhoSelecao>
            <ConteudoSelecao>
              <ItemSelecao value="TODOS">Qualquer data</ItemSelecao>
              <ItemSelecao value="30">Últimos 30 dias</ItemSelecao>
              <ItemSelecao value="60">Últimos 60 dias</ItemSelecao>
              <ItemSelecao value="ABERTO">Só em aberto</ItemSelecao>
            </ConteudoSelecao>
          </Selecao>
        </div>

        {visao === 'kanban' ? (
          <KanbanVendas vendas={filtradas} aoMover={moverStatus} aoAbrir={setDetalhe} />
        ) : (
          <TabelaDados
            colunas={colunas}
            dados={filtradas}
            chave={(v) => v.id}
            aoClicarLinha={(v) => setDetalhe(v)}
            ordenacaoInicial={[{ id: 'total', desc: true }]}
            porPagina={15}
            vazio={
              <EstadoVazio
                icone={ReceiptText}
                titulo="Nenhum pedido encontrado"
                descricao="Crie um pedido e acompanhe-o do orçamento até a entrega."
                acao={
                  <Botao
                    onClick={() => {
                      setEditando(null);
                      setAberto(true);
                    }}
                  >
                    <Plus />
                    Novo pedido
                  </Botao>
                }
                compacto
              />
            }
            colunaAcoes={(v) => <MenuAcoesVenda v={v} aoAbrir={setDetalhe} aoGerarPdf={gerarPdf} />}
          />
        )}
      </Card>

      <DialogoVenda
        aberto={aberto}
        aoFechar={() => {
          setAberto(false);
          setEditando(null);
        }}
        venda={editando}
        clienteInicial={cliente !== 'TODOS' ? cliente : undefined}
        proximoNumero={proximoNumeroVenda}
        aoSalvar={(dados, criarNota: boolean) => {
          if (editando) {
            atualizar<Venda>('vendas', editando.id, dados);
            toast.success(`${editando.numero} atualizado`);
          } else {
            const nova = criar<Venda>('vendas', { ...dados, numero: proximoNumeroVenda() });
            if (criarNota) {
              const total = totaisVenda(nova).valorTotal;
              criar<NotaFiscal>('notasFiscais', {
                numero: String(1000 + derivado.vendas.length + 1),
                serie: '1',
                modelo: 'NFS-E',
                vendaId: nova.id,
                clienteId: nova.clienteId,
                dataEmissao: nova.dataEmissao,
                dataVencimento: somaDias(nova.dataEmissao, 14),
                valorTotal: total,
                valorImpostos: total * (aliquotaEfetivaPct(rbt12) / 100),
                status: 'EMITIDA',
              });
              toast.success('Nota fiscal criada em rascunho');
            }
            toast.success(`Pedido ${nova.numero} criado`);
          }
          setAberto(false);
          setEditando(null);
        }}
      />

      <DrawerVenda
        venda={detalhe}
        aoFechar={() => {
          setDetalhe(null);
          if (consulta.get('cliente')) trocarConsulta({ cliente: undefined });
        }}
        aoMover={moverStatus}
        aoEditar={(v) => {
          setDetalhe(null);
          setEditando(v);
          setAberto(true);
        }}
        aoGerarPdf={gerarPdf}
        aoExcluir={(v) => {
          remover('vendas', v.id);
          setDetalhe(null);
          toast.success(`Pedido ${v.numero} excluído`);
        }}
      />
    </div>
  );

  function gerarPdf(v: VendaCalculada) {
    const cli = derivado.clientes.find((c) => c.id === v.clienteId);
    if (!cli) {
      toast.error('Cliente não encontrado para este pedido');
      return;
    }
    const primeiroItem = v.itens[0];
    const produto = primeiroItem ? derivado.produtos.find((p) => p.id === primeiroItem.produtoId) : undefined;
    gerarOrcamentoPDF({ venda: v, cliente: cli, config: configuracao, produto });
    toast.success('Orçamento em PDF gerado');
  }
}

/* ============================== Kanban ================================== */

/**
 * Arrastar com Pointer Events em vez da API nativa de drag-and-drop: no Safari do
 * iPad/iPhone a API de HTML5 não dispara eventos, então o toque no cartão não
 * faria nada. Segurar o cartão por meio segundo "pega" o pedido; a partir daí ele
 * segue o dedo e o quadro rola sozinho quando chega perto da borda.
 */
const AGUARDA_PEGAR_MS = 240;
const DESLOCAMENTO_CANCELA = 10;

interface Arrasto {
  id: string;
  x: number;
  y: number;
  largura: number;
  deslocou: boolean;
}

function useArrastarPedido(vendas: VendaCalculada[], aoMover: (v: VendaCalculada, novo: StatusVenda) => void) {
  const [arrasto, setArrasto] = useState<Arrasto | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<StatusVenda | null>(null);
  const pendente = useRef<{ id: string; x: number; y: number; largura: number; timer: number } | null>(null);
  const quadro = useRef<HTMLDivElement>(null);

  const cancelar = () => {
    if (pendente.current) {
      window.clearTimeout(pendente.current.timer);
      pendente.current = null;
    }
  };

  // Enquanto o pedido está "na mão", o Safari do iOS não pode rolar a página:
  // o preventDefault precisa vir no touchmove nativo, não no pointermove.
  const arrastando = arrasto !== null;
  useEffect(() => {
    if (!arrastando) return;
    const bloquear = (e: TouchEvent) => e.preventDefault();
    document.addEventListener('touchmove', bloquear, { passive: false });
    return () => document.removeEventListener('touchmove', bloquear);
  }, [arrastando]);

  useEffect(() => cancelar, []);

  const iniciar = (e: React.PointerEvent, v: VendaCalculada) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const alvo = e.currentTarget as HTMLElement;
    const largura = alvo.offsetWidth;
    const timer = window.setTimeout(() => {
      pendente.current = null;
      alvo.setPointerCapture?.(e.pointerId);
      setArrasto({ id: v.id, x: e.clientX, y: e.clientY, largura, deslocou: false });
    }, AGUARDA_PEGAR_MS);
    pendente.current = { id: v.id, x: e.clientX, y: e.clientY, largura, timer };
  };

  const mover = (e: React.PointerEvent) => {
    if (pendente.current) {
      const d = Math.hypot(e.clientX - pendente.current.x, e.clientY - pendente.current.y);
      if (d > DESLOCAMENTO_CANCELA) cancelar(); // é rolagem, não arrasto
    }
    if (!arrasto) return;
    e.preventDefault();
    setArrasto((a) => (a ? { ...a, x: e.clientX, y: e.clientY, deslocou: true } : a));

    // rola o quadro quando o dedo chega perto das bordas
    const q = quadro.current;
    if (q) {
      const r = q.getBoundingClientRect();
      const margem = 70;
      if (e.clientX > r.right - margem) q.scrollLeft += 14;
      else if (e.clientX < r.left + margem) q.scrollLeft -= 14;
    }

    // coluna sob o ponteiro
    const sob = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-coluna]');
    setColunaAlvo((sob?.dataset.coluna as StatusVenda | undefined) ?? null);
  };

  const soltar = (cancelado = false) => {
    cancelar();
    if (arrasto && !cancelado) {
      const alvo = vendas.find((v) => v.id === arrasto.id);
      if (alvo && colunaAlvo && colunaAlvo !== alvo.status) aoMover(alvo, colunaAlvo);
    }
    setArrasto(null);
    setColunaAlvo(null);
  };

  const fantasma = useMemo(() => {
    if (!arrasto) return null;
    return vendas.find((v) => v.id === arrasto.id) ?? null;
  }, [arrasto, vendas]);

  return { arrasto, colunaAlvo, fantasma, iniciar, mover, soltar, quadro };
}

function KanbanVendas({
  vendas,
  aoMover,
  aoAbrir,
}: {
  vendas: VendaCalculada[];
  aoMover: (v: VendaCalculada, novo: StatusVenda) => void;
  aoAbrir: (v: VendaCalculada) => void;
}) {
  const colunas = FLUXO_VENDA;
  const { arrasto, colunaAlvo, fantasma, iniciar, mover, soltar, quadro } = useArrastarPedido(vendas, aoMover);
  const [candidatAberto, setCandidatAberto] = useState<string | null>(null);

  if (vendas.length === 0) {
    return (
      <EstadoVazio
        icone={Kanban}
        titulo="Nenhum pedido no quadro"
        descricao="Segure um pedido e arraste para outra coluna — ou toque no cartão para escolher a situação."
        compacto
      />
    );
  }
  return (
    <>
      <div
        ref={quadro}
        className="flex gap-3 overflow-x-auto p-3"
        style={{ scrollSnapType: 'x proximity' }}
        onPointerMove={mover}
        onPointerUp={() => soltar()}
        onPointerCancel={() => soltar(true)}
      >
        {colunas.map((s) => {
          const cards = vendas.filter((v) => v.status === s);
          const total = cards.reduce((acc, v) => acc + v.valorTotal, 0);
          return (
            <div
              key={s}
              data-coluna={s}
              style={{ scrollSnapAlign: 'start' }}
              className={cn(
                'flex max-h-[56vh] min-h-[260px] w-[230px] shrink-0 flex-col rounded-xl border bg-[var(--superficie-2)] transition-colors sm:w-[250px]',
                colunaAlvo === s ? 'border-[var(--marca)] bg-[var(--acento)]' : 'border-[var(--borda)]',
              )}
            >
              <div className="flex items-center justify-between gap-2 border-b border-[var(--borda)] px-3 py-2">
                <span className="text-[12px] font-semibold text-[var(--texto)]">{ROTULO_STATUS_VENDA[s]}</span>
                <Selo tom="neutro">{numero(cards.length)}</Selo>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {cards.map((v) => (
                  <div
                    key={v.id}
                    onPointerDown={(e) => iniciar(e, v)}
                    onClick={() => {
                      if (candidatAberto === v.id) {
                        setCandidatAberto(null);
                        aoAbrir(v);
                      } else {
                        setCandidatAberto(v.id);
                        window.setTimeout(() => setCandidatAberto((a) => (a === v.id ? null : a)), 900);
                      }
                    }}
                    className={cn(
                      'cartao-pedido select-none rounded-lg border border-[var(--borda)] bg-[var(--superficie)] p-2.5 transition-shadow',
                      arrasto?.id === v.id ? 'opacity-40' : 'cursor-grab active:cursor-grabbing',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="num text-[12px] font-semibold text-[var(--marca)] dark:text-[var(--destaque)]">{v.numero}</p>
                      <p className="num text-[13px] font-bold">{moeda(v.valorTotal)}</p>
                    </div>
                    <p className="mt-0.5 truncate text-[12.5px] text-[var(--texto)]">{v.nomeCliente}</p>
                    <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-[var(--texto-tenue)]">
                      <span className="num">{dataBR(v.dataPrevistaEntrega)}</span>
                      <span className="num">{v.itens.length} itens</span>
                    </div>
                    {candidatAberto === v.id && !arrasto && (
                      <div className="mt-2 flex flex-wrap gap-1 border-t border-dashed border-[var(--borda)] pt-2">
                        {FLUXO_VENDA.filter((d) => d !== v.status).map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCandidatAberto(null);
                              aoMover(v, d);
                            }}
                            className="rounded-md border border-[var(--borda-forte)] px-1.5 py-1 text-[11px] font-medium text-[var(--texto-suave)] hover:bg-[var(--acento)]"
                          >
                            {ROTULO_STATUS_VENDA[d]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {cards.length === 0 && (
                  <p className="px-1 py-3 text-center text-[11.5px] text-[var(--texto-tenue)]">
                    Segure um pedido e solte aqui
                  </p>
                )}
              </div>
              {total > 0 && (
                <p className="num border-t border-[var(--borda)] px-3 py-1.5 text-[11.5px] text-[var(--texto-suave)]">
                  {moeda(total)} nesta coluna
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* cartão que segue o dedo/mouse durante o arrasto */}
      {arrasto && fantasma && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rotate-2 rounded-lg border border-[var(--marca)] bg-[var(--superficie)] p-2.5 shadow-[var(--shadow-card)]"
          style={{ left: arrasto.x, top: arrasto.y, width: arrasto.largura }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="num text-[12px] font-semibold text-[var(--marca)] dark:text-[var(--destaque)]">{fantasma.numero}</p>
            <p className="num text-[13px] font-bold">{moeda(fantasma.valorTotal)}</p>
          </div>
          <p className="mt-0.5 truncate text-[12.5px]">{fantasma.nomeCliente}</p>
        </div>
      )}
    </>
  );
}

/* ============================ Menu de ações ============================= */

function MenuAcoesVenda({
  v,
  aoAbrir,
  aoGerarPdf,
}: {
  v: VendaCalculada;
  aoAbrir: (v: VendaCalculada) => void;
  aoGerarPdf: (v: VendaCalculada) => void;
}) {
  const { remover, derivado } = useDados();
  return (
    <Menu>
      <GatilhoMenu asChild>
        <Botao variante="fantasma" tamanho="iconeXs" aria-label={`Ações do pedido ${v.numero}`} onClick={(e) => e.stopPropagation()}>
          <MaisVertical />
        </Botao>
      </GatilhoMenu>
      <ConteudoMenu align="end">
        <ItemMenu onSelect={() => aoAbrir(v)}>Ver detalhes</ItemMenu>
        <ItemMenu onSelect={() => window.dispatchEvent(new CustomEvent('tp:editar-venda', { detail: v.id }))}>Editar pedido</ItemMenu>
        <ItemMenu onSelect={() => aoGerarPdf(v)}>
          <FileDown />
          Gerar orçamento em PDF
        </ItemMenu>
        <ItemMenu onSelect={() => window.print()}>
          <Printer />
          Imprimir
        </ItemMenu>
        {derivado.clientes.find((c) => c.id === v.clienteId) && (
          <ItemMenu
            onSelect={() => {
              const cli = derivado.clientes.find((c) => c.id === v.clienteId)!;
              window.open(
                linkWhatsapp(
                  cli.whatsapp || cli.telefone,
                  `Olá, ${cli.nome}! Seu pedido ${v.numero} no valor de ${moeda(v.valorTotal)} foi registrado. Previsão de entrega: ${dataBR(v.dataPrevistaEntrega)}.`,
                ),
                '_blank',
              );
            }}
          >
            <MessageCircle />
            Avisar no WhatsApp
          </ItemMenu>
        )}
        <SeparadorMenu />
        <BotaoExcluir
          rotulo={`Excluir pedido ${v.numero}?`}
          descricao="O pedido sai do painel. Esta ação não pode ser desfeita."
          aoConfirmar={() => {
            remover('vendas', v.id);
            toast.success(`Pedido ${v.numero} excluído`);
          }}
        >
          <ItemMenu destrutivo onSelect={(e) => e.preventDefault()}>
            <Trash2 />
            Excluir
          </ItemMenu>
        </BotaoExcluir>
      </ConteudoMenu>
    </Menu>
  );
}
