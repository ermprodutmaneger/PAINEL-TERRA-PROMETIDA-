import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Building,
  Columns3,
  Kanban,
  MessageCircle,
  Phone,
  Plus,
  ReceiptText,
  Send,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { useDados } from '@/db/store';
import { useRota } from '@/lib/rota';
import type { ClienteCalculado } from '@/db/deriva';
import {
  ROTULO_CANAL_ORIGEM,
  ROTULO_SEGMENTO_CLIENTE,
  ROTULO_STATUS_CLIENTE,
  type CanalOrigem,
  type Cliente,
  type SegmentoCliente,
  type StatusCliente,
} from '@/types';
import { dataBR, linkWhatsapp, moeda, numero } from '@/lib/format';
import type { Tom } from '@/lib/cores';
import { CabecalhoPagina, CartaoKpi, EstadoVazio, Etiqueta } from '@/components/comuns';
import { TabelaDados, texto } from '@/components/tabela-dados';
import { Botao } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AreaTexto, Campo, CampoTexto } from '@/components/ui/input';
import { ConteudoSelecao, GatilhoSelecao, ItemSelecao, Selecao, ValorSelecao } from '@/components/ui/select';
import {
  BotaoExcluir,
  ConteudoDialog,
  Dialog,
  DialogCabecalho,
  DialogCorpo,
  DialogDescricao,
  DialogRodape,
  DialogTitulo,
} from '@/components/ui/dialog';
import {
  ConteudoDrawer,
  Drawer,
  DrawerCabecalho,
  DrawerCorpo,
  DrawerDescricao,
  DrawerRodape,
  DrawerTitulo,
} from '@/components/ui/sheet';
import { ConteudoMenu, GatilhoMenu, ItemMenu, Menu, SeparadorMenu } from '@/components/ui/misc';
import { Selo } from '@/components/ui/badge';
import { MaisVertical } from './icones-auxiliares';

const SEGMENTOS = Object.keys(ROTULO_SEGMENTO_CLIENTE) as SegmentoCliente[];
const STATUS_FUNIL: Array<{ status: StatusCliente; rotulo: string }> = [
  { status: 'POTENCIAL', rotulo: 'Potencial' },
  { status: 'CONTATADO', rotulo: 'Contatado' },
  { status: 'ORCAMENTO', rotulo: 'Orçamento' },
  { status: 'NEGOCIACAO', rotulo: 'Negociação' },
  { status: 'CLIENTE_ATIVO', rotulo: 'Cliente Ativo' },
];

const esquema = z.object({
  nome: z.string().min(3, 'Informe o nome do cliente'),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  segmento: z.enum(SEGMENTOS as [SegmentoCliente, ...SegmentoCliente[]]),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional().refine((v) => !v || /\S+@\S+\.\S+/.test(v), 'E-mail inválido'),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().min(2, 'Informe a cidade'),
  uf: z.string().length(2),
  cep: z.string().optional(),
  contatoNome: z.string().optional(),
  canalOrigem: z.enum(['INDICACAO', 'INSTAGRAM', 'WHATSAPP', 'VISITA', 'MERCADO', 'OUTRO']),
  cidadeAtendida: z.string().optional(),
  status: z.enum(['POTENCIAL', 'CONTATADO', 'ORCAMENTO', 'NEGOCIACAO', 'CLIENTE_ATIVO', 'INADIMPLETE', 'PERDIDO']),
  segmentoPrecoId: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormCliente = z.infer<typeof esquema>;

export default function Clientes() {
  const { derivado, criar, atualizar, bd } = useDados();
  const { consulta, trocarConsulta } = useRota();
  const [busca, setBusca] = useState('');
  const [segmento, setSegmento] = useState('TODOS');
  const [status, setStatus] = useState('TODOS');
  const [cidade, setCidade] = useState('TODAS');
  const [soSemRecompra, setSoSemRecompra] = useState(false);
  const [arquivados, setArquivados] = useState(false);
  const [visao, setVisao] = useState<'tabela' | 'funil'>('tabela');
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [aberto, setAberto] = useState(false);
  const [detalhe, setDetalhe] = useState<ClienteCalculado | null>(null);

  const foco = consulta.get('foco');

  useEffect(() => {
    if (foco === 'sem-recompra') setSoSemRecompra(true);
    if (!foco) return;
    const c = derivado.clientes.find((x) => x.id === foco);
    if (c) setDetalhe(c);
  }, [foco, derivado.clientes]);

  useEffect(() => {
    const aoNovo = () => {
      setEditando(null);
      setAberto(true);
    };
    const aoEditar = (e: Event) => {
      const alvo = derivado.clientes.find((c) => c.id === (e as CustomEvent<string>).detail);
      if (alvo) {
        setEditando(alvo);
        setAberto(true);
      }
    };
    window.addEventListener('tp:novo', aoNovo);
    window.addEventListener('tp:editar-cliente', aoEditar);
    return () => {
      window.removeEventListener('tp:novo', aoNovo);
      window.removeEventListener('tp:editar-cliente', aoEditar);
    };
  }, [derivado.clientes]);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return derivado.clientes.filter((c) => {
      if (c.arquivado !== arquivados) return false;
      if (segmento !== 'TODOS' && c.segmento !== segmento) return false;
      if (status !== 'TODOS' && c.status !== status) return false;
      if (cidade !== 'TODAS' && c.cidadeAtendida !== cidade) return false;
      if (soSemRecompra && !(c.diasSemComprar > 20 && ['CLIENTE_ATIVO', 'INADIMPLETE'].includes(c.status))) return false;
      if (t && !`${c.nome} ${c.nomeFantasia ?? ''} ${c.cidadeAtendida} ${c.contatoNome ?? ''} ${c.cnpj ?? ''}`.toLowerCase().includes(t))
        return false;
      return true;
    });
  }, [derivado.clientes, busca, segmento, status, cidade, soSemRecompra, arquivados]);

  const cidades = useMemo(() => [...new Set(derivado.clientes.map((c) => c.cidadeAtendida))].sort(), [derivado.clientes]);

  const resumo = useMemo(() => {
    const ativos = derivado.clientes.filter((c) => !c.arquivado && c.status === 'CLIENTE_ATIVO');
    const semRecompra = derivados().filter((c) => c.diasSemComprar > 20 && ['CLIENTE_ATIVO', 'INADIMPLETE'].includes(c.status));
    const inadimplentes = derivados().filter((c) => c.inadimplencia > 0);
    const total = derivados().reduce((s, c) => s + c.totalComprado, 0);
    return { ativos: ativos.length, semRecompra, inadimplentes, total, funil: derivado.clientes.filter((c) => !c.arquivado) };
    function derivados() {
      return derivado.clientes.filter((c) => !c.arquivado);
    }
  }, [derivado.clientes]);

  const moverStatus = (c: Cliente, novo: StatusCliente) => {
    atualizar<Cliente>('clientes', c.id, { status: novo });
    toast.success(`${c.nome} movido para ${ROTULO_STATUS_CLIENTE[novo]}`);
  };

  const colunas: Array<ColumnDef<ClienteCalculado, any>> = useMemo(
    () => [
      {
        id: 'nome',
        accessorKey: 'nome',
        header: 'Cliente',
        cell: ({ row }) => (
          <div className="min-w-[170px]">
            <p className="font-medium text-[var(--texto)]">{row.original.nome}</p>
            <p className="text-[11.5px] text-[var(--texto-tenue)]">
              {row.original.nomeFantasia ?? ''} {row.original.cidadeAtendida}
            </p>
          </div>
        ),
      },
      {
        id: 'segmento',
        accessorKey: 'segmento',
        header: 'Segmento',
        cell: ({ row }) => <Etiqueta tom={tomSegmento(row.original.segmento)}>{ROTULO_SEGMENTO_CLIENTE[row.original.segmento]}</Etiqueta>,
      },
      { id: 'cidade', accessorKey: 'cidadeAtendida', meta: { ocultarAte: 'xl' }, header: 'Cidade', cell: ({ row }) => texto(row.original.cidadeAtendida) },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Situação',
        cell: ({ row }) => <Etiqueta tom={tomStatus(row.original.status)}>{ROTULO_STATUS_CLIENTE[row.original.status]}</Etiqueta>,
      },
      {
        id: 'ultimo',
        accessorKey: 'ultimoPedidoEm',
        meta: { ocultarAte: '2xl' },
        header: 'Último pedido',
        cell: ({ row }) => texto(row.original.ultimoPedidoEm ? dataBR(row.original.ultimoPedidoEm) : null, 'sem compras'),
      },
      {
        id: 'dias',
        accessorKey: 'diasSemComprar',
        header: 'Dias sem comprar',
        cell: ({ row }) => {
          const d = row.original.diasSemComprar;
          if (row.original.numeroDePedidos === 0) return <span className="text-[var(--texto-tenue)]">—</span>;
          return (
            <span
              className="num font-semibold"
              style={{ color: d > 20 ? 'var(--alerta)' : d > 10 ? 'var(--atencao)' : 'var(--sucesso)' }}
            >
              {d > 20 ? '⚠ ' : ''}
              {numero(d)} d
            </span>
          );
        },
      },
      {
        id: 'ticket',
        accessorKey: 'ticketMedio',
        header: 'Ticket médio',
        cell: ({ row }) => <span className="num">{moeda(row.original.ticketMedio)}</span>,
      },
      {
        id: 'total',
        accessorKey: 'totalComprado',
        header: 'Total comprado',
        cell: ({ row }) => <span className="num font-semibold">{moeda(row.original.totalComprado)}</span>,
      },
      {
        id: 'inadimplencia',
        accessorKey: 'inadimplencia',
        meta: { ocultarAte: '2xl' },
        header: 'Em atraso',
        cell: ({ row }) =>
          row.original.inadimplencia > 0 ? (
            <span className="num font-semibold text-[var(--alerta)]">{moeda(row.original.inadimplencia)}</span>
          ) : (
            <span className="text-[var(--texto-tenue)]">—</span>
          ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        icone={Users}
        titulo="Clientes"
        descricao="Quem compra, há quanto tempo não compra e quanto cada um vale."
        acoes={
          <>
            <div className="flex items-center gap-0.5 rounded-lg border border-[var(--borda)] p-0.5">
              <button
                type="button"
                onClick={() => setVisao('tabela')}
                aria-label="Ver em tabela"
                aria-pressed={visao === 'tabela'}
                className="rounded-md p-2 text-[var(--texto-tenue)] transition-colors aria-pressed:bg-[var(--acento)] aria-pressed:text-[var(--texto)]"
              >
                <Columns3 className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setVisao('funil')}
                aria-label="Ver funil"
                aria-pressed={visao === 'funil'}
                className="rounded-md p-2 text-[var(--texto-tenue)] transition-colors aria-pressed:bg-[var(--acento)] aria-pressed:text-[var(--texto)]"
              >
                <Kanban className="size-4" />
              </button>
            </div>
            <Botao
              onClick={() => {
                setEditando(null);
                setAberto(true);
              }}
            >
              <Plus />
              Novo cliente
            </Botao>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoKpi rotulo="Clientes ativos" valor={numero(resumo.ativos)} icone={Users} />
        <CartaoKpi
          rotulo="Sem comprar há 20+ dias"
          valor={numero(resumo.semRecompra.length)}
          apoio="Precisa de contato"
          cor={resumo.semRecompra.length > 0 ? 'var(--alerta)' : 'var(--sucesso)'}
          icone={MessageCircle}
          onClick={() => setSoSemRecompra(true)}
        />
        <CartaoKpi
          rotulo="Em atraso"
          valor={numero(resumo.inadimplentes.length)}
          apoio={moeda(resumo.inadimplentes.reduce((s, c) => s + c.inadimplencia, 0))}
          cor={resumo.inadimplentes.length > 0 ? 'var(--alerta)' : 'var(--sucesso)'}
          icone={ReceiptText}
        />
        <CartaoKpi rotulo="Total já vendido" valor={moeda(resumo.total)} icone={ShoppingCart} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--borda)] p-3">
          <CampoTexto
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, cidade ou contato…"
            aria-label="Buscar clientes"
            className="h-9 min-w-[100%] flex-1 sm:min-w-[180px] sm:max-w-xs"
          />
          <Selecao value={segmento} onValueChange={setSegmento}>
            <GatilhoSelecao tamanho="sm" className="w-full px-2.5 sm:w-[11.5rem]">
              <ValorSelecao placeholder="Segmento" />
            </GatilhoSelecao>
            <ConteudoSelecao>
              <ItemSelecao value="TODOS">Todos os segmentos</ItemSelecao>
              {SEGMENTOS.map((s) => (
                <ItemSelecao key={s} value={s}>
                  {ROTULO_SEGMENTO_CLIENTE[s]}
                </ItemSelecao>
              ))}
            </ConteudoSelecao>
          </Selecao>
          <Selecao value={status} onValueChange={setStatus}>
            <GatilhoSelecao tamanho="sm" className="w-full px-2.5 sm:w-[11rem]">
              <ValorSelecao placeholder="Situação" />
            </GatilhoSelecao>
            <ConteudoSelecao>
              <ItemSelecao value="TODOS">Todas as situações</ItemSelecao>
              {(Object.keys(ROTULO_STATUS_CLIENTE) as StatusCliente[]).map((s) => (
                <ItemSelecao key={s} value={s}>
                  {ROTULO_STATUS_CLIENTE[s]}
                </ItemSelecao>
              ))}
            </ConteudoSelecao>
          </Selecao>
          <Selecao value={cidade} onValueChange={setCidade}>
            <GatilhoSelecao tamanho="sm" className="w-full px-2.5 sm:w-[10.5rem]">
              <ValorSelecao placeholder="Cidade" />
            </GatilhoSelecao>
            <ConteudoSelecao>
              <ItemSelecao value="TODAS">Todas as cidades</ItemSelecao>
              {cidades.map((c) => (
                <ItemSelecao key={c} value={c}>
                  {c}
                </ItemSelecao>
              ))}
            </ConteudoSelecao>
          </Selecao>
          <label className="flex items-center gap-1.5 text-[12.5px] text-[var(--texto-suave)]">
            <input
              type="checkbox"
              checked={soSemRecompra}
              onChange={(e) => setSoSemRecompra(e.target.checked)}
              className="size-3.5 accent-[var(--marca)]"
            />
            Sem recompra
          </label>
          <label className="flex items-center gap-1.5 text-[12.5px] text-[var(--texto-suave)]">
            <input type="checkbox" checked={arquivados} onChange={(e) => setArquivados(e.target.checked)} className="size-3.5 accent-[var(--marca)]" />
            Arquivados
          </label>
          {(soSemRecompra || busca || segmento !== 'TODOS' || status !== 'TODOS' || cidade !== 'TODAS') && (
            <Botao
              tamanho="sm"
              variante="fantasma"
              onClick={() => {
                setBusca('');
                setSegmento('TODOS');
                setStatus('TODOS');
                setCidade('TODAS');
                setSoSemRecompra(false);
              }}
            >
              Limpar filtros
            </Botao>
          )}
        </div>

        {visao === 'tabela' ? (
          <TabelaDados
            colunas={colunas}
            dados={filtrados}
            chave={(c) => c.id}
            aoClicarLinha={(c) => setDetalhe(c)}
            ordenacaoInicial={[{ id: 'total', desc: true }]}
            porPagina={15}
            vazio={
              <EstadoVazio
                icone={Users}
                titulo="Nenhum cliente encontrado"
                descricao="Ajuste os filtros ou cadastre um novo cliente para começar a acompanhar compras."
                acao={
                  <Botao
                    onClick={() => {
                      setEditando(null);
                      setAberto(true);
                    }}
                  >
                    <Plus />
                    Cadastrar cliente
                  </Botao>
                }
                compacto
              />
            }
            colunaAcoes={(c) => <MenuAcoesCliente c={c} aoAbrirDetalhe={setDetalhe} />}
          />
        ) : (
          <FunilClientes clientes={filtrados} aoMover={moverStatus} aoAbrirDetalhe={setDetalhe} />
        )}
      </Card>

      <DialogoCliente
        aberto={aberto}
        aoFechar={() => {
          setAberto(false);
          setEditando(null);
        }}
        cliente={editando}
        aoSalvar={(dados) => {
          const payload = {
            ...dados,
            nomeFantasia: dados.nomeFantasia ?? '',
            cnpj: dados.cnpj ?? '',
            inscricaoEstadual: dados.inscricaoEstadual ?? '',
            email: dados.email ?? '',
            contatoNome: dados.contatoNome ?? '',
            observacoes: dados.observacoes ?? '',
            segmentoPrecoId: dados.segmentoPrecoId || undefined,
            telefone: dados.telefone ?? '',
            whatsapp: dados.whatsapp ?? dados.telefone ?? '',
            cidadeAtendida: dados.cidadeAtendida ?? dados.cidade,
            endereco: {
              logradouro: dados.logradouro ?? '',
              numero: dados.numero ?? '',
              bairro: dados.bairro ?? '',
              cidade: dados.cidade,
              uf: dados.uf.toUpperCase(),
              cep: dados.cep ?? '',
            },
            diasSemComprar: editando?.diasSemComprar ?? 0,
            totalComprado: editando?.totalComprado ?? 0,
            ticketMedio: editando?.ticketMedio ?? 0,
            numeroDePedidos: editando?.numeroDePedidos ?? 0,
            inadimplencia: editando?.inadimplencia ?? 0,
          };
          if (editando) {
            atualizar<Cliente>('clientes', editando.id, payload);
            toast.success('Cliente atualizado');
          } else {
            criar<Cliente>('clientes', payload);
            toast.success('Cliente cadastrado');
          }
          setAberto(false);
          setEditando(null);
        }}
      />

      <DrawerCliente
        cliente={detalhe}
        aoFechar={() => {
          setDetalhe(null);
          if (foco) trocarConsulta({ foco: undefined });
        }}
        segmentosPreco={bd.segmentosPreco}
      />
    </div>
  );
}

function tomSegmento(s: SegmentoCliente): Tom {
  return (
    ({ RESTAURANTE: 'terra', PADARIA: 'mostarda', LANCHONETE: 'terracota', MARMITERIA: 'verde', MERCEARIA: 'cinza', COZINHA_INDUSTRIAL: 'terra', OUTRO: 'cinza' } as Record<SegmentoCliente, Tom>)[s]
  );
}

function tomStatus(s: StatusCliente): Tom {
  return (
    ({
      POTENCIAL: 'cinza',
      CONTATADO: 'mostarda',
      ORCAMENTO: 'mostarda',
      NEGOCIACAO: 'terra',
      CLIENTE_ATIVO: 'verde',
      INADIMPLETE: 'terracota',
      PERDIDO: 'cinza',
    } as Record<StatusCliente, Tom>)[s]
  );
}

/* ============================== Menu ==================================== */

function MenuAcoesCliente({ c, aoAbrirDetalhe }: { c: ClienteCalculado; aoAbrirDetalhe: (c: ClienteCalculado) => void }) {
  const { arquivar, remover } = useDados();
  return (
    <Menu>
      <GatilhoMenu asChild>
        <Botao variante="fantasma" tamanho="iconeXs" aria-label={`Ações de ${c.nome}`} onClick={(e) => e.stopPropagation()}>
          <MaisVertical />
        </Botao>
      </GatilhoMenu>
      <ConteudoMenu align="end">
        <ItemMenu onSelect={() => aoAbrirDetalhe(c)}>
          <Building />
          Ver perfil
        </ItemMenu>
        <ItemMenu onSelect={() => window.dispatchEvent(new CustomEvent('tp:editar-cliente', { detail: c.id }))}>
          Editar cadastro
        </ItemMenu>
        <a href={linkWhatsapp(c.whatsapp || c.telefone, `Olá, ${c.nome}! Aqui é da Terra Prometida Express. Posso montar um orçamento esta semana?`)} target="_blank" rel="noreferrer">
          <ItemMenu onSelect={(e) => e.preventDefault()}>
            <MessageCircle />
            Mensagem pronta
          </ItemMenu>
        </a>
        <SeparadorMenu />
        <ItemMenu
          onSelect={() => {
            arquivar('clientes', c.id, !c.arquivado);
            toast.success(c.arquivado ? 'Cliente restaurado' : 'Cliente arquivado');
          }}
        >
          {c.arquivado ? 'Restaurar' : 'Arquivar'}
        </ItemMenu>
        <BotaoExcluir
          rotulo={`Excluir ${c.nome}?`}
          descricao="O histórico de pedidos permanece, mas o cliente sai da lista."
          aoConfirmar={() => {
            remover('clientes', c.id);
            toast.success('Cliente excluído');
          }}
        >
          <ItemMenu destrutivo onSelect={(e) => e.preventDefault()}>
            Excluir
          </ItemMenu>
        </BotaoExcluir>
      </ConteudoMenu>
    </Menu>
  );
}

/* ============================== Funil =================================== */

function FunilClientes({
  clientes,
  aoMover,
  aoAbrirDetalhe,
}: {
  clientes: ClienteCalculado[];
  aoMover: (c: Cliente, novo: StatusCliente) => void;
  aoAbrirDetalhe: (c: ClienteCalculado) => void;
}) {
  if (clientes.length === 0) {
    return <EstadoVazio icone={Kanban} titulo="Nenhum cliente no funil" descricao="Cadastre clientes para acompanhar a evolução da negociação." compacto />;
  }
  return (
    <div className="grid gap-3 overflow-x-auto p-3 sm:grid-cols-2 lg:grid-cols-5">
      {STATUS_FUNIL.map((coluna) => {
        const cards = clientes.filter((c) => c.status === coluna.status);
        const total = cards.reduce((s, c) => s + c.totalComprado, 0);
        return (
          <div key={coluna.status} className="rounded-xl border border-[var(--borda)] bg-[var(--superficie-2)]">
            <div className="flex items-center justify-between border-b border-[var(--borda)] px-3 py-2">
              <span className="text-[12px] font-semibold text-[var(--texto)]">{coluna.rotulo}</span>
              <Selo tom="neutro">{numero(cards.length)}</Selo>
            </div>
            <div
              className="space-y-2 p-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/cliente');
                const alvo = clientes.find((c) => c.id === id);
                if (alvo) aoMover(alvo, coluna.status);
              }}
            >
              {cards.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/cliente', c.id)}
                  onClick={() => aoAbrirDetalhe(c)}
                  className="cursor-grab rounded-lg border border-[var(--borda)] bg-[var(--superficie)] p-2.5 transition-shadow hover:shadow-[var(--shadow-card)]"
                >
                  <p className="truncate text-[12.5px] font-medium text-[var(--texto)]">{c.nome}</p>
                  <p className="mt-0.5 text-[11.5px] text-[var(--texto-tenue)]">{ROTULO_SEGMENTO_CLIENTE[c.segmento]}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="num text-[12px] font-semibold">{moeda(c.totalComprado)}</span>
                    {c.diasSemComprar > 20 && c.numeroDePedidos > 0 && (
                      <span className="num text-[11px] font-semibold text-[var(--alerta)]">{c.diasSemComprar}d sem comprar</span>
                    )}
                  </div>
                </div>
              ))}
              {cards.length === 0 && <p className="px-1 py-3 text-center text-[11.5px] text-[var(--texto-tenue)]">Arraste um cliente para cá</p>}
            </div>
            {total > 0 && (
              <p className="num border-t border-[var(--borda)] px-3 py-1.5 text-[11.5px] text-[var(--texto-suave)]">
                {moeda(total)} nesta etapa
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ============================ Formulário ================================ */

function DialogoCliente({
  aberto,
  aoFechar,
  cliente,
  aoSalvar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  cliente: Cliente | null;
  aoSalvar: (d: FormCliente) => void;
}) {
  const { bd } = useDados();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormCliente>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nome: '',
      nomeFantasia: '',
      cnpj: '',
      inscricaoEstadual: '',
      segmento: 'RESTAURANTE',
      telefone: '',
      whatsapp: '',
      email: '',
      logradouro: '',
      numero: '',
      bairro: '',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '',
      contatoNome: '',
      canalOrigem: 'WHATSAPP',
      cidadeAtendida: 'São Paulo',
      status: 'POTENCIAL',
      segmentoPrecoId: '',
      observacoes: '',
    },
  });

  useEffect(() => {
    if (!aberto) return;
    if (cliente) {
      reset({
        nome: cliente.nome,
        nomeFantasia: cliente.nomeFantasia ?? '',
        cnpj: cliente.cnpj ?? '',
        inscricaoEstadual: cliente.inscricaoEstadual ?? '',
        segmento: cliente.segmento,
        telefone: cliente.telefone,
        whatsapp: cliente.whatsapp,
        email: cliente.email ?? '',
        logradouro: cliente.endereco.logradouro,
        numero: cliente.endereco.numero,
        bairro: cliente.endereco.bairro,
        cidade: cliente.endereco.cidade,
        uf: cliente.endereco.uf,
        cep: cliente.endereco.cep,
        contatoNome: cliente.contatoNome ?? '',
        canalOrigem: cliente.canalOrigem,
        cidadeAtendida: cliente.cidadeAtendida,
        status: cliente.status,
        segmentoPrecoId: cliente.segmentoPrecoId ?? '',
        observacoes: cliente.observacoes ?? '',
      });
    } else {
      reset();
    }
  }, [aberto, cliente, reset]);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <ConteudoDialog largura="lg">
        <DialogCabecalho>
          <DialogTitulo>{cliente ? `Editar ${cliente.nome}` : 'Novo cliente'}</DialogTitulo>
          <DialogDescricao>
            Guarde o WhatsApp e a cidade: é por onde a venda acontece e como o alerta de recompra funciona.
          </DialogDescricao>
        </DialogCabecalho>
        <form onSubmit={handleSubmit(aoSalvar)}>
          <DialogCorpo className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Razão social / nome" obrigatorio erro={errors.nome?.message} className="sm:col-span-2" htmlFor="cnome">
              <CampoTexto id="cnome" {...register('nome')} placeholder="Ex.: Restaurante Chão de Brasa" />
            </Campo>
            <Campo rotulo="Nome fantasia" htmlFor="cfant">
              <CampoTexto id="cfant" {...register('nomeFantasia')} />
            </Campo>
            <Campo rotulo="CNPJ" htmlFor="ccnpj">
              <CampoTexto id="ccnpj" inputMode="numeric" {...register('cnpj')} />
            </Campo>
            <Campo rotulo="Segmento" htmlFor="cseg">
              <Selecao value={watch('segmento')} onValueChange={(v) => setValue('segmento', v as SegmentoCliente)}>
                <GatilhoSelecao>
                  <ValorSelecao />
                </GatilhoSelecao>
                <ConteudoSelecao>
                  {SEGMENTOS.map((s) => (
                    <ItemSelecao key={s} value={s}>
                      {ROTULO_SEGMENTO_CLIENTE[s]}
                    </ItemSelecao>
                  ))}
                </ConteudoSelecao>
              </Selecao>
            </Campo>
            <Campo rotulo="Situação" htmlFor="cstat">
              <Selecao value={watch('status')} onValueChange={(v) => setValue('status', v as StatusCliente)}>
                <GatilhoSelecao>
                  <ValorSelecao />
                </GatilhoSelecao>
                <ConteudoSelecao>
                  {(Object.keys(ROTULO_STATUS_CLIENTE) as StatusCliente[]).map((s) => (
                    <ItemSelecao key={s} value={s}>
                      {ROTULO_STATUS_CLIENTE[s]}
                    </ItemSelecao>
                  ))}
                </ConteudoSelecao>
              </Selecao>
            </Campo>
            <Campo rotulo="WhatsApp" htmlFor="cwa">
              <CampoTexto id="cwa" inputMode="tel" {...register('whatsapp')} placeholder="(11) 90000-0000" />
            </Campo>
            <Campo rotulo="Telefone" htmlFor="ctel">
              <CampoTexto id="ctel" inputMode="tel" {...register('telefone')} placeholder="(11) 3000-0000" />
            </Campo>
            <Campo rotulo="E-mail" erro={errors.email?.message} htmlFor="cmail">
              <CampoTexto id="cmail" type="email" {...register('email')} />
            </Campo>
            <Campo rotulo="Pessoa de contato" htmlFor="ccont">
              <CampoTexto id="ccont" {...register('contatoNome')} />
            </Campo>
            <Campo rotulo="Como conheceu" htmlFor="ccanal">
              <Selecao value={watch('canalOrigem')} onValueChange={(v) => setValue('canalOrigem', v as CanalOrigem)}>
                <GatilhoSelecao>
                  <ValorSelecao />
                </GatilhoSelecao>
                <ConteudoSelecao>
                  {(Object.keys(ROTULO_CANAL_ORIGEM) as CanalOrigem[]).map((c) => (
                    <ItemSelecao key={c} value={c}>
                      {ROTULO_CANAL_ORIGEM[c]}
                    </ItemSelecao>
                  ))}
                </ConteudoSelecao>
              </Selecao>
            </Campo>
            <Campo rotulo="Cidade atendida" htmlFor="ccid">
              <CampoTexto id="ccid" {...register('cidadeAtendida')} placeholder="Ex.: São Paulo" />
            </Campo>
            <Campo rotulo="Tabela de preço" dica="Define prazo e condição de pagamento" htmlFor="ctab">
              <Selecao value={watch('segmentoPrecoId') ?? ''} onValueChange={(v) => setValue('segmentoPrecoId', v)}>
                <GatilhoSelecao>
                  <ValorSelecao placeholder="Sem tabela" />
                </GatilhoSelecao>
                <ConteudoSelecao>
                  <ItemSelecao value="">Sem tabela</ItemSelecao>
                  {bd.segmentosPreco.map((t) => (
                    <ItemSelecao key={t.id} value={t.id}>
                      {t.nome}
                    </ItemSelecao>
                  ))}
                </ConteudoSelecao>
              </Selecao>
            </Campo>
            <Campo rotulo="Endereço" htmlFor="clog">
              <CampoTexto id="clog" {...register('logradouro')} />
            </Campo>
            <div className="grid grid-cols-3 gap-3">
              <Campo rotulo="Nº" htmlFor="cnum">
                <CampoTexto id="cnum" {...register('numero')} />
              </Campo>
              <Campo rotulo="Bairro" className="col-span-2" htmlFor="cbai">
                <CampoTexto id="cbai" {...register('bairro')} />
              </Campo>
            </div>
            <Campo rotulo="Cidade" obrigatorio erro={errors.cidade?.message} htmlFor="ccidade">
              <CampoTexto id="ccidade" {...register('cidade')} />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="UF" erro={errors.uf?.message} htmlFor="cuf">
                <CampoTexto id="cuf" maxLength={2} className="uppercase" {...register('uf')} />
              </Campo>
              <Campo rotulo="CEP" htmlFor="ccep">
                <CampoTexto id="ccep" inputMode="numeric" {...register('cep')} />
              </Campo>
            </div>
            <Campo rotulo="Observações" className="sm:col-span-2" htmlFor="cobs">
              <AreaTexto id="cobs" {...register('observacoes')} placeholder="Preferências, combinados de entrega, formas de pagamento…" />
            </Campo>
          </DialogCorpo>
          <DialogRodape>
            <Botao type="button" variante="contorno" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit">{cliente ? 'Salvar alterações' : 'Cadastrar cliente'}</Botao>
          </DialogRodape>
        </form>
      </ConteudoDialog>
    </Dialog>
  );
}

/* ============================== Perfil ================================== */

function DrawerCliente({
  cliente,
  aoFechar,
  segmentosPreco,
}: {
  cliente: ClienteCalculado | null;
  aoFechar: () => void;
  segmentosPreco: Array<{ id: string; nome: string; condicaoPagamento: string; pedidoMinimoValor: number; prazoEntregaDias: number }>;
}) {
  const { derivado, bd, registrarContato } = useDados();
  const { ir } = useRota();
  const [contato, setContato] = useState('');

  const vendas = useMemo(
    () =>
      derivado.vendas
        .filter((v) => v.clienteId === cliente?.id)
        .sort((a, b) => b.dataEmissao.localeCompare(a.dataEmissao)),
    [derivado.vendas, cliente],
  );

  const produtos = useMemo(() => {
    const mapa = new Map<string, { nome: string; qtd: number; total: number }>();
    for (const v of vendas) {
      for (const i of v.itens) {
        const atual = mapa.get(i.produtoId) ?? { nome: i.descricao, qtd: 0, total: 0 };
        atual.qtd += i.quantidade;
        atual.total += i.quantidade * i.precoUnitario;
        mapa.set(i.produtoId, atual);
      }
    }
    return [...mapa.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.total - a.total);
  }, [vendas]);

  const contatos = useMemo(
    () => bd.contatos.filter((t) => t.clienteId === cliente?.id).sort((a, b) => b.data.localeCompare(a.data)),
    [bd.contatos, cliente],
  );

  if (!cliente) return null;

  const tabela = segmentosPreco.find((t) => t.id === cliente.segmentoPrecoId);
  const mensagemCatalogo = `Olá, ${cliente.nome}! 👋\n\nSou da *Terra Prometida Express* — temperos e condimentos para cozinhas e food service.\n\n📦 *Catálogo em destaque*\n• Pimenta-do-reino moída 500g — ${moeda(11.9)}\n• Tempero completo 1kg — ${moeda(34.9)}\n• Páprica defumada 500g — ${moeda(11.9)}\n• Canela em pó 500g — ${moeda(19.9)}\n\n✅ Entrega em até 2 dias\n✅ Pedido mínimo a partir de ${moeda(tabela?.pedidoMinimoValor ?? 150)}\n\nPosso montar um orçamento para você?`;

  return (
    <Drawer open={!!cliente} onOpenChange={(v) => !v && aoFechar()}>
      <ConteudoDrawer>
        <DrawerCabecalho>
          <div className="flex flex-wrap items-center gap-2">
            <Etiqueta tom={tomStatus(cliente.status)}>{ROTULO_STATUS_CLIENTE[cliente.status]}</Etiqueta>
            <Etiqueta tom={tomSegmento(cliente.segmento)}>{ROTULO_SEGMENTO_CLIENTE[cliente.segmento]}</Etiqueta>
          </div>
          <DrawerTitulo className="mt-1.5">{cliente.nome}</DrawerTitulo>
          <DrawerDescricao>
            {cliente.cidadeAtendida} · {ROTULO_CANAL_ORIGEM[cliente.canalOrigem]}
            {cliente.contatoNome && ` · ${cliente.contatoNome}`}
          </DrawerDescricao>
        </DrawerCabecalho>
        <DrawerCorpo className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Dado rotulo="Total comprado" valor={moeda(cliente.totalComprado)} />
            <Dado rotulo="Ticket médio" valor={moeda(cliente.ticketMedio)} />
            <Dado rotulo="Pedidos" valor={numero(cliente.numeroDePedidos)} />
            <Dado
              rotulo="Dias sem comprar"
              valor={cliente.numeroDePedidos === 0 ? 'Nunca comprou' : `${numero(cliente.diasSemComprar)} dias`}
              cor={cliente.diasSemComprar > 20 ? 'var(--alerta)' : undefined}
            />
          </div>

          {cliente.inadimplencia > 0 && (
            <div className="rounded-lg bg-[var(--alerta-suave)] p-3">
              <p className="text-[12.5px] font-semibold text-[var(--alerta)]">{moeda(cliente.inadimplencia)} em atraso</p>
              <p className="mt-0.5 text-[12px] text-[var(--alerta)]/90">Regularize antes de novo pedido.</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Botao tamanho="sm" onClick={() => ir(`/vendas?cliente=${cliente.id}`)}>
              <ReceiptText />
              Registrar venda
            </Botao>
            <a href={linkWhatsapp(cliente.whatsapp || cliente.telefone, mensagemCatalogo)} target="_blank" rel="noreferrer">
              <Botao tamanho="sm" variante="contorno">
                <Send />
                Enviar catálogo
              </Botao>
            </a>
            {cliente.telefone && (
              <a href={`tel:${cliente.telefone.replace(/\D/g, '')}`}>
                <Botao tamanho="sm" variante="fantasma">
                  <Phone />
                  Ligar
                </Botao>
              </a>
            )}
          </div>

          {tabela && (
            <section>
              <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">Tabela de preço</h4>
              <div className="mt-1.5 rounded-lg border border-[var(--borda)] bg-[var(--acento)] p-3 text-[12.5px]">
                <p className="font-medium text-[var(--texto)]">{tabela.nome}</p>
                <p className="mt-0.5 text-[var(--texto-suave)]">
                  Pedido mínimo {moeda(tabela.pedidoMinimoValor)} · entrega em {tabela.prazoEntregaDias} dias · pagamento{' '}
                  {tabela.condicaoPagamento === 'ANTECIPADO' ? 'antecipado' : `${tabela.condicaoPagamento.replace('_', ' ')} dias`}
                </p>
              </div>
            </section>
          )}

          <section>
            <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">Histórico de pedidos</h4>
            {vendas.length === 0 ? (
              <p className="mt-1.5 text-[12.5px] text-[var(--texto-suave)]">Este cliente ainda não tem pedidos registrados.</p>
            ) : (
              <ul className="mt-1.5 divide-y divide-[var(--borda)]">
                {vendas.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-[var(--texto)]">{v.numero}</p>
                      <p className="text-[11.5px] text-[var(--texto-tenue)]">
                        {dataBR(v.dataEmissao)} · {numero(v.itens.length)} itens
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="num text-[12.5px] font-semibold">{moeda(v.valorTotal)}</p>
                      <p className="text-[11.5px] text-[var(--texto-tenue)]">{percentualDaVenda(v.valorTotal, cliente.totalComprado)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {produtos.length > 0 && (
            <section>
              <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">O que este cliente compra</h4>
              <ul className="mt-1.5 divide-y divide-[var(--borda)]">
                {produtos.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                    <p className="truncate text-[12.5px] text-[var(--texto)]">{p.nome}</p>
                    <p className="num shrink-0 text-[12.5px] font-medium">{numero(p.qtd)} un.</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">Linha do tempo de contatos</h4>
            <div className="mt-2 flex gap-2">
              <CampoTexto
                value={contato}
                onChange={(e) => setContato(e.target.value)}
                placeholder="Registrar um contato…"
                aria-label="Registrar contato"
              />
              <Botao
                variante="contorno"
                disabled={!contato.trim()}
                onClick={() => {
                  registrarContato({
                    clienteId: cliente.id,
                    data: new Date().toISOString().slice(0, 10),
                    tipo: 'WHATSAPP',
                    resumo: contato.trim(),
                  });
                  setContato('');
                  toast.success('Contato registrado');
                }}
              >
                <Plus />
              </Botao>
            </div>
            <ul className="mt-2 space-y-2">
              {contatos.length === 0 && <li className="text-[12.5px] text-[var(--texto-suave)]">Sem contatos registrados.</li>}
              {contatos.map((t) => (
                <li key={t.id} className="flex gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--marca)]" aria-hidden />
                  <div>
                    <p className="text-[12.5px] text-[var(--texto)]">{t.resumo}</p>
                    <p className="text-[11.5px] text-[var(--texto-tenue)]">
                      {dataBR(t.data)} · {rotuloContato(t.tipo)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </DrawerCorpo>
        <DrawerRodape className="flex gap-2">
          <Botao variante="contorno" className="flex-1" onClick={aoFechar}>
            Fechar
          </Botao>
          <Botao
            className="flex-1"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('tp:editar-cliente', { detail: cliente.id }));
              aoFechar();
            }}
          >
            Editar cadastro
          </Botao>
        </DrawerRodape>
      </ConteudoDrawer>
    </Drawer>
  );
}

function percentualDaVenda(valor: number, total: number): string {
  return total > 0 ? `${((valor / total) * 100).toFixed(0)}% do total` : '';
}

function rotuloContato(t: string): string {
  return (
    ({ WHATSAPP: 'WhatsApp', LIGACAO: 'Ligação', VISITA: 'Visita', EMAIL: 'E-mail', ORCAMENTO: 'Orçamento', PEDIDO: 'Pedido' } as Record<string, string>)[t] ?? t
  );
}

function Dado({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="rounded-lg border border-[var(--borda)] p-2.5">
      <p className="text-[11.5px] text-[var(--texto-tenue)]">{rotulo}</p>
      <p className="num text-[15px] font-semibold" style={cor ? { color: cor } : undefined}>
        {valor}
      </p>
    </div>
  );
}

