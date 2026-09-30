import { useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  Check,
  Download,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDados } from '@/db/store';
import { dentroDoPeriodo } from '@/db/deriva';
import {
  ROTULO_FORMA_PAGAMENTO,
  type DespesaFixa,
  type BaseEntidade,
  type FormaPagamento,
  type Lancamento,
  type StatusLancamento,
} from '@/types';
import { dataBR, hojeISO, moeda, numero, numeroParaInput, paraNumero, somaDias } from '@/lib/format';
import { calcularDRE, resumirFinanceiro } from '@/lib/indicadores';
import { resumoVendas } from '@/lib/calculos';
import { exportarCSV } from '@/lib/arquivos';
import { TOM_LANCAMENTO } from '@/lib/cores';
import { Card, CardCabecalho, CardConteudo, CardDescricao, CardTitulo } from '@/components/ui/card';
import { Botao } from '@/components/ui/button';
import { Aba, Abas, ListaAbas } from '@/components/ui/misc';
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
import { CabecalhoPagina, CartaoKpi, EstadoVazio, Etiqueta, formatarContagem } from '@/components/comuns';
import { TabelaDados } from '@/components/tabela-dados';
import { GraficoFluxoCaixa, GraficoRosca } from '@/components/graficos';
import { SeletorPeriodo } from '@/components/SeletorPeriodo';
import { usePeriodo } from '@/hooks/usePeriodo';

const STATUS: Record<StatusLancamento, string> = {
  PENDENTE: 'Pendente',
  PAGO: 'Pago',
  RECEBIDO: 'Recebido',
  VENCIDO: 'Vencido',
  CANCELADO: 'Cancelado',
};

const TOM_STATUS: Record<StatusLancamento, 'terra' | 'mostarda' | 'terracota' | 'verde' | 'cinza'> = {
  PENDENTE: 'mostarda',
  PAGO: 'verde',
  RECEBIDO: 'verde',
  VENCIDO: 'terracota',
  CANCELADO: 'cinza',
};

export default function Financeiro() {
  const { bd, derivado, configuracao, rbt12, criar, atualizar, remover } = useDados();
  const [periodo, definirPeriodo] = usePeriodo();
  const [aba, setAba] = useState<'tudo' | 'entradas' | 'saidas' | 'fixas'>('tudo');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | StatusLancamento>('TODOS');
  const [busca, setBusca] = useState('');
  const [limitarPeriodo, setLimitarPeriodo] = useState(true);
  const [editando, setEditando] = useState<Lancamento | null>(null);
  const [aberto, setAberto] = useState(false);
  const [fixaEditando, setFixaEditando] = useState<DespesaFixa | null>(null);
  const [fixaAberta, setFixaAberta] = useState(false);

  const resumo = useMemo(() => resumirFinanceiro(bd, periodo), [bd, periodo]);
  const dre = useMemo(
    () => calcularDRE(derivado.vendas, bd.lancamentos, periodo, configuracao, rbt12),
    [derivado.vendas, bd.lancamentos, periodo, configuracao, rbt12],
  );
  const vendasPeriodo = useMemo(
    () => derivado.vendas.filter((v) => dentroDoPeriodo(v.dataEmissao, periodo.inicio, periodo.fim)),
    [derivado.vendas, periodo],
  );
  const rv = useMemo(
    () => resumoVendas(vendasPeriodo, configuracao, rbt12, Math.max(1, vendasPeriodo.length)),
    [vendasPeriodo, configuracao, rbt12],
  );
  void rv;

  const lancamentos = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return bd.lancamentos
      .filter((l) => !l.arquivado)
      .filter((l) => (aba === 'tudo' ? true : aba === 'entradas' ? l.tipo === 'ENTRADA' : l.tipo === 'SAIDA'))
      .filter((l) => (filtroStatus === 'TODOS' ? true : l.status === filtroStatus))
      .filter((l) => (t ? `${l.descricao} ${l.categoria} ${l.subcategoria ?? ''}`.toLowerCase().includes(t) : true))
      .filter((l) => (limitarPeriodo ? dentroDoPeriodo(l.data, periodo.inicio, periodo.fim) : true))
      .sort((a, b) => (b.data + b.id).localeCompare(a.data + a.id));
  }, [bd.lancamentos, aba, filtroStatus, busca, limitarPeriodo, periodo]);

  const fluxo = useMemo(() => {
    const meses = 6;
    const pontos = [];
    const base = new Date(`${periodo.fim}T00:00:00`);
    for (let i = meses - 1; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const fimIso = `${fim.getFullYear()}-${String(fim.getMonth() + 1).padStart(2, '0')}-${String(fim.getDate()).padStart(2, '0')}`;
      const doMes = bd.lancamentos.filter(
        (l) => !l.arquivado && l.status !== 'CANCELADO' && dentroDoPeriodo(l.data, iso, fimIso),
      );
      const entradas = doMes.filter((l) => l.tipo === 'ENTRADA').reduce((s, l) => s + l.valor, 0);
      const saidas = doMes.filter((l) => l.tipo === 'SAIDA').reduce((s, l) => s + l.valor, 0);
      pontos.push({
        rotulo: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        entradas,
        saidas,
        saldo: entradas - saidas,
      });
    }
    return pontos;
  }, [bd.lancamentos, periodo]);

  const saidasPeriodo = useMemo(
    () =>
      lancamentos
        .filter((l) => l.tipo === 'SAIDA' && l.status !== 'CANCELADO')
        .filter((l) => limitarPeriodo && dentroDoPeriodo(l.data, periodo.inicio, periodo.fim)),
    [lancamentos, limitarPeriodo, periodo],
  );

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const l of saidasPeriodo) {
      mapa.set(l.subcategoria ?? l.categoria, (mapa.get(l.subcategoria ?? l.categoria) ?? 0) + l.valor);
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([nome, valor]) => ({ nome, valor }));
  }, [saidasPeriodo]);

  const totalSaidasPeriodo = saidasPeriodo.reduce((s, l) => s + l.valor, 0);

  const despesasFixas = useMemo(() => bd.despesasFixas.filter((d) => !d.arquivado), [bd.despesasFixas]);
  const totalFixas = despesasFixas.reduce((s, d) => s + d.valorMensalEstimado, 0);

  const baixar = (l: Lancamento) => {
    const pago = l.status === 'PAGO' || l.status === 'RECEBIDO';
    const novo: StatusLancamento = pago ? 'PENDENTE' : l.tipo === 'ENTRADA' ? 'RECEBIDO' : 'PAGO';
    atualizar<Lancamento>('lancamentos', l.id, {
      status: novo,
      pagoEm: novo === 'PAGO' ? hojeISO() : undefined,
      recebidoEm: novo === 'RECEBIDO' ? hojeISO() : undefined,
    });
    toast.success(pago ? `${l.descricao} voltou para pendente` : `Baixa registrada: ${l.descricao}`);
  };

  const exportar = () => {
    exportarCSV(
      `financeiro-${periodo.inicio}-a-${periodo.fim}`,
      ['Data', 'Tipo', 'Descrição', 'Categoria', 'Subcategoria', 'Valor', 'Status', 'Vencimento', 'Realização', 'Recorrente'],
      lancamentos.map((l) => [
        l.data,
        l.tipo === 'ENTRADA' ? 'Entrada' : 'Saída',
        l.descricao,
        l.categoria,
        l.subcategoria ?? '',
        l.valor,
        STATUS[l.status],
        l.dataVencimento ?? '',
        l.pagoEm ?? l.recebidoEm ?? '',
        l.recorrente ? 'Sim' : 'Não',
      ]),
    );
    toast.success('Financeiro exportado em CSV.');
  };

  return (
    <>
      <CabecalhoPagina
        titulo="Financeiro"
        descricao="Contas a pagar e receber, caixa do mês e DRE simplificada."
        acoes={
          <>
            <Botao variante="contorno" onClick={exportar}>
              <Download />
              <span className="hidden sm:inline">Exportar</span>
            </Botao>
            <Botao
              onClick={() => {
                setEditando(null);
                setAberto(true);
              }}
            >
              <Plus />
              Novo lançamento
            </Botao>
          </>
        }
      />
      <div className="-mt-1">
        <SeletorPeriodo periodo={periodo} aoMudar={definirPeriodo} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoKpi
          rotulo="Saldo realizado"
          valor={moeda(resumo.saldoRealizado)}
          apoio={`Entradas ${moeda(resumo.entradasRealizadas)} · saídas ${moeda(resumo.saidasRealizadas)}`}
          icone={Wallet}
          destaque
          cor={resumo.saldoRealizado >= 0 ? 'var(--sucesso)' : 'var(--alerta)'}
        />
        <CartaoKpi
          rotulo="A receber"
          valor={moeda(resumo.aReceberAberto + resumo.aReceberVencido)}
          apoio={resumo.aReceberVencido > 0 ? `${moeda(resumo.aReceberVencido)} vencido` : 'Tudo em dia'}
          icone={ArrowDownCircle}
          cor={resumo.aReceberVencido > 0 ? 'var(--alerta)' : undefined}
        />
        <CartaoKpi
          rotulo="A pagar"
          valor={moeda(resumo.aPagarMes + resumo.aPagarVencido)}
          apoio={resumo.aPagarVencido > 0 ? `${moeda(resumo.aPagarVencido)} vencido` : 'Tudo em dia'}
          icone={ArrowUpCircle}
          cor={resumo.aPagarVencido > 0 ? 'var(--alerta)' : undefined}
        />
        <CartaoKpi
          rotulo="Despesas fixas"
          valor={moeda(totalFixas)}
          apoio={`${despesasFixas.filter((d) => d.ativa).length} despesas ativas por mês`}
          icone={Repeat}
        />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0">
          <CardCabecalho>
            <CardTitulo>Lançamentos</CardTitulo>
            <CardDescricao>
              {formatarContagem(lancamentos.length)} lançamentos no filtro atual
            </CardDescricao>
          </CardCabecalho>
          <CardConteudo className="pt-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Abas value={aba} onValueChange={(v) => setAba(v as typeof aba)}>
                <ListaAbas>
                  <Aba value="tudo">Tudo</Aba>
                  <Aba value="entradas">Entradas</Aba>
                  <Aba value="saidas">Saídas</Aba>
                  <Aba value="fixas">Despesas fixas</Aba>
                </ListaAbas>
              </Abas>
              <div className="ml-auto flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-[var(--texto-suave)]">
                  <input
                    type="checkbox"
                    checked={limitarPeriodo}
                    onChange={(e) => setLimitarPeriodo(e.target.checked)}
                    className="size-3.5 accent-[var(--marca)]"
                  />
                  Só {periodo.tipo === 'MES' ? 'neste mês' : 'neste período'}
                </label>
                <Selecao value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as typeof filtroStatus)}>
                  <GatilhoSelecao className="h-9 w-36">
                    <ValorSelecao />
                  </GatilhoSelecao>
                  <ConteudoSelecao>
                    <ItemSelecao value="TODOS">Todos os status</ItemSelecao>
                    {(Object.keys(STATUS) as StatusLancamento[]).map((s) => (
                      <ItemSelecao key={s} value={s}>
                        {STATUS[s]}
                      </ItemSelecao>
                    ))}
                  </ConteudoSelecao>
                </Selecao>
              </div>
            </div>

            {aba === 'fixas' ? (
              <TabelaDespesasFixas
                despesas={despesasFixas}
                total={totalFixas}
                aoEditar={(d) => {
                  setFixaEditando(d);
                  setFixaAberta(true);
                }}
                aoNova={() => {
                  setFixaEditando(null);
                  setFixaAberta(true);
                }}
                aoExcluir={(d) => {
                  remover('despesasFixas', d.id);
                  toast.success(`${d.descricao} removida.`);
                }}
              />
            ) : (
              <TabelaDados
                colunas={[
                  {
                    id: 'data',
                    accessorKey: 'data',
                    header: 'Data',
                    cell: ({ row }) => <span className="num">{dataBR(row.original.data)}</span>,
                  },
                  {
                    id: 'descricao',
                    accessorKey: 'descricao',
                    header: 'Descrição',
                    cell: ({ row }) => (
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.original.descricao}</p>
                        <p className="truncate text-[12px] text-[var(--texto-tenue)]">
                          {row.original.categoria}
                          {row.original.subcategoria ? ` · ${row.original.subcategoria}` : ''}
                        </p>
                      </div>
                    ),
                  },
                  {
                    id: 'tipo',
                    accessorKey: 'tipo',
                    header: 'Tipo',
                    cell: ({ row }) => (
                      <Etiqueta tom={TOM_LANCAMENTO[row.original.tipo]}>
                        {row.original.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                      </Etiqueta>
                    ),
                  },
                  {
                    id: 'vencimento',
                    accessorKey: 'dataVencimento',
                    header: 'Vencimento',
                    meta: { ocultarAte: 'lg' },
                    cell: ({ row }) => {
                      const v = row.original.dataVencimento;
                      const atrasado =
                        v && row.original.status === 'PENDENTE' && v < hojeISO();
                      return (
                        <span className={atrasado ? 'num font-medium text-[var(--alerta)]' : 'num'}>
                          {v ? dataBR(v) : '—'}
                        </span>
                      );
                    },
                  },
                  {
                    id: 'status',
                    accessorKey: 'status',
                    header: 'Status',
                    cell: ({ row }) => <Etiqueta tom={TOM_STATUS[row.original.status]}>{STATUS[row.original.status]}</Etiqueta>,
                  },
                  {
                    id: 'valor',
                    accessorKey: 'valor',
                    header: 'Valor',
                    cell: ({ row }) => (
                      <span
                        className="num font-semibold"
                        style={{ color: row.original.tipo === 'ENTRADA' ? 'var(--sucesso)' : 'var(--texto)' }}
                      >
                        {row.original.tipo === 'ENTRADA' ? '+ ' : '− '}
                        {moeda(row.original.valor)}
                      </span>
                    ),
                  },
                ]}
                dados={lancamentos}
                chave={(l) => l.id}
                filtro={busca}
                aoMudarFiltro={setBusca}
                vazio={
                  <EstadoVazio
                    icone={Wallet}
                    titulo="Nenhum lançamento por aqui"
                    descricao="Registre contas a pagar e a receber para acompanhar o caixa do mês."
                    acao={
                      <Botao
                        onClick={() => {
                          setEditando(null);
                          setAberto(true);
                        }}
                      >
                        <Plus />
                        Novo lançamento
                      </Botao>
                    }
                  />
                }
                colunaAcoes={(l) => (
                  <div className="flex justify-end gap-0.5">
                    <Botao
                      variante="fantasma"
                      tamanho="iconeXs"
                      aria-label={l.status === 'PAGO' || l.status === 'RECEBIDO' ? 'Estornar baixa' : 'Dar baixa'}
                      onClick={() => baixar(l)}
                    >
                      {l.status === 'PAGO' || l.status === 'RECEBIDO' ? <Trash2 /> : <Check />}
                    </Botao>
                    <Botao
                      variante="fantasma"
                      tamanho="iconeXs"
                      aria-label={`Editar ${l.descricao}`}
                      onClick={() => {
                        setEditando(l);
                        setAberto(true);
                      }}
                    >
                      <Pencil />
                    </Botao>
                    <BotaoExcluir
                      rotulo={`Excluir "${l.descricao}"?`}
                      descricao="O lançamento sai do caixa e dos indicadores. Não dá para desfazer."
                      aoConfirmar={() => {
                        remover('lancamentos', l.id);
                        toast.success('Lançamento excluído.');
                      }}
                    >
                      <Botao variante="fantasma" tamanho="iconeXs" aria-label={`Excluir ${l.descricao}`}>
                        <Trash2 />
                      </Botao>
                    </BotaoExcluir>
                  </div>
                )}
              />
            )}
          </CardConteudo>
        </Card>

        <div className="min-w-0 space-y-3">
          <Card className="min-w-0">
            <CardCabecalho>
              <CardTitulo>Fluxo de caixa</CardTitulo>
              <CardDescricao>Entradas e saídas dos últimos 6 meses</CardDescricao>
            </CardCabecalho>
            <CardConteudo>
              {fluxo.every((f) => f.entradas === 0 && f.saidas === 0) ? (
                <EstadoVazio icone={CalendarClock} titulo="Sem movimento" descricao="Ainda não há lançamentos nestes meses." />
              ) : (
                <GraficoFluxoCaixa dados={fluxo} />
              )}
            </CardConteudo>
          </Card>

          <Card>
            <CardCabecalho>
              <CardTitulo>Para onde vai o dinheiro</CardTitulo>
              <CardDescricao>No filtro atual</CardDescricao>
            </CardCabecalho>
            <CardConteudo>
              {porCategoria.length === 0 ? (
                <EstadoVazio icone={ArrowUpCircle} titulo="Nada por categoria" descricao="Escreva um lançamento para ver a distribuição." />
              ) : (
                <GraficoRosca
                  dados={porCategoria}
                  centroRotulo="Saídas"
                  centroValor={moeda(totalSaidasPeriodo)}
                />
              )}
            </CardConteudo>
          </Card>

          <Card>
            <CardCabecalho>
              <CardTitulo>DRE do período</CardTitulo>
              <CardDescricao>Resultado simplificado do Anexo I</CardDescricao>
            </CardCabecalho>
            <CardConteudo className="space-y-1.5 text-[13px]">
              <LinhaDre rotulo="Receita bruta" valor={rv.faturamento} />
              <LinhaDre rotulo="(−) CMV produtos" valor={-dre.cmv} />
              <LinhaDre rotulo="= Lucro bruto" valor={dre.lucroBruto} forte />
              <LinhaDre rotulo="(−) Despesas fixas" valor={-dre.despesasFixas} />
              <LinhaDre rotulo="(−) Despesas variáveis" valor={-dre.despesasVariaveis} />
              <LinhaDre rotulo="(−) Impostos" valor={-dre.impostos} />
              <LinhaDre rotulo="= Resultado" valor={dre.lucroLiquido} forte destaque />
              <p className="pt-1 text-[12px] text-[var(--texto-tenue)]">
                Margem líquida {numero(dre.margemLiquidaPct * 100, 1)}% sobre {moeda(dre.receitaBruta)} faturados.
              </p>
            </CardConteudo>
          </Card>
        </div>
      </div>

      <DialogoLancamento
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        lancamento={editando}
        aoSalvar={(dados) => {
          if (editando) {
            atualizar<Lancamento>('lancamentos', editando.id, dados);
            toast.success('Lançamento atualizado.');
          } else {
            criar<Lancamento>('lancamentos', dados);
            toast.success('Lançamento criado.');
          }
          setAberto(false);
        }}
      />

      <DialogoDespesaFixa
        aberto={fixaAberta}
        aoFechar={() => setFixaAberta(false)}
        despesa={fixaEditando}
        aoSalvar={(dados) => {
          if (fixaEditando) {
            atualizar<DespesaFixa>('despesasFixas', fixaEditando.id, dados);
            toast.success('Despesa atualizada.');
          } else {
            criar<DespesaFixa>('despesasFixas', dados);
            toast.success('Despesa fixa cadastrada.');
          }
          setFixaAberta(false);
        }}
      />
    </>
  );
}

/* ============================ Tabela de fixas ============================ */

function TabelaDespesasFixas({
  despesas,
  total,
  aoEditar,
  aoNova,
  aoExcluir,
}: {
  despesas: DespesaFixa[];
  total: number;
  aoEditar: (d: DespesaFixa) => void;
  aoNova: () => void;
  aoExcluir: (d: DespesaFixa) => void;
}) {
  return (
    <TabelaDados
      colunas={[
        { id: 'descricao', accessorKey: 'descricao', header: 'Despesa', cell: ({ row }) => row.original.descricao },
        { id: 'categoria', accessorKey: 'categoria', header: 'Categoria', meta: { ocultarAte: 'sm' }, cell: ({ row }) => row.original.categoria },
        {
          id: 'dia',
          accessorKey: 'diaDeVencimento',
          header: 'Vence dia',
          meta: { ocultarAte: 'md' },
          cell: ({ row }) => <span className="num">{row.original.diaDeVencimento}</span>,
        },
        {
          id: 'valor',
          accessorKey: 'valorMensalEstimado',
          header: 'Valor mensal',
          cell: ({ row }) => <span className="num font-semibold">{moeda(row.original.valorMensalEstimado)}</span>,
        },
        {
          id: 'ativa',
          accessorKey: 'ativa',
          header: 'Situação',
          cell: ({ row }) => (
            <Etiqueta tom={row.original.ativa ? 'verde' : 'cinza'}>{row.original.ativa ? 'Ativa' : 'Pausada'}</Etiqueta>
          ),
        },
      ]}
      dados={despesas}
      chave={(d) => d.id}
      barraExtra={
        <Botao tamanho="sm" variante="contorno" onClick={aoNova}>
          <Plus />
          Nova despesa fixa
        </Botao>
      }
      rodape={
        <span className="num text-[13px] font-semibold">Total mensal: {moeda(total)}</span>
      }
      vazio={
        <EstadoVazio
          icone={Repeat}
          titulo="Nenhuma despesa fixa"
          descricao="Cadastre aluguel, energia, internet e outras contas que se repetem todo mês."
          acao={
            <Botao onClick={aoNova}>
              <Plus />
              Nova despesa fixa
            </Botao>
          }
        />
      }
      colunaAcoes={(d) => (
        <div className="flex justify-end gap-0.5">
          <Botao variante="fantasma" tamanho="iconeXs" aria-label={`Editar ${d.descricao}`} onClick={() => aoEditar(d)}>
            <Pencil />
          </Botao>
          <Botao variante="fantasma" tamanho="iconeXs" aria-label={`Excluir ${d.descricao}`} onClick={() => aoExcluir(d)}>
            <Trash2 />
          </Botao>
        </div>
      )}
    />
  );
}

function LinhaDre({ rotulo, valor, forte, destaque }: { rotulo: string; valor: number; forte?: boolean; destaque?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-dashed border-[var(--borda)] py-1 last:border-0">
      <span className={forte ? 'font-semibold' : 'text-[var(--texto-suave)]'}>{rotulo}</span>
      <span
        className={`num ${forte ? 'font-semibold' : ''}`}
        style={destaque ? { color: valor >= 0 ? 'var(--sucesso)' : 'var(--alerta)' } : undefined}
      >
        {moeda(valor)}
      </span>
    </div>
  );
}

/* ============================ Diálogo lançamento ======================== */

const esquema = z.object({
  tipo: z.enum(['ENTRADA', 'SAIDA']),
  descricao: z.string().min(2, 'Descreva o lançamento'),
  categoria: z.string().min(1, 'Escolha a categoria'),
  subcategoria: z.string().optional(),
  valor: z.coerce.number().gt(0, 'Informe um valor maior que zero'),
  data: z.string().min(1),
  dataVencimento: z.string().optional(),
  formaPagamento: z.enum(['PIX', 'BOLETO', 'DINHEIRO', 'CARTAO', 'TRANSFERENCIA']).optional(),
  recorrente: z.boolean(),
  fixo: z.boolean(),
  observacoes: z.string().optional(),
});

type Dados = z.infer<typeof esquema>;

function DialogoLancamento({
  aberto,
  aoFechar,
  lancamento,
  aoSalvar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  lancamento: Lancamento | null;
  aoSalvar: (dados: Omit<Lancamento, keyof BaseEntidade>) => void;
}) {
  const { configuracao } = useDados();
  const [salvarComo, setSalvarComo] = useState<{ descricao: string; valor: number; vencimento: number; categoria: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Dados>({
    resolver: zodResolver(esquema),
    defaultValues: {
      tipo: 'SAIDA',
      descricao: '',
      categoria: '',
      subcategoria: '',
      valor: 0,
      data: hojeISO(),
      dataVencimento: somaDias(hojeISO(), 15),
      formaPagamento: 'PIX',
      recorrente: false,
      fixo: false,
      observacoes: '',
    },
  });

  const tipo = watch('tipo');
  const recorrente = watch('recorrente');
  const fixo = watch('fixo');
  const valor = watch('valor');

  const categorias = useMemo(
    () => configuracao.categoriasFinanceiras.filter((c) => (tipo === 'ENTRADA' ? c.tipo === 'ENTRADA' : c.tipo === 'SAIDA')),
    [configuracao.categoriasFinanceiras, tipo],
  );

  // Ao abrir, carrega os dados do lançamento editado
  const [carregado, setCarregado] = useState<string | null>(null);
  const chave = aberto ? (lancamento?.id ?? 'novo') : null;
  if (chave !== carregado) {
    setCarregado(chave);
    if (aberto) {
      reset(
        lancamento
          ? {
              tipo: lancamento.tipo,
              descricao: lancamento.descricao,
              categoria: lancamento.categoria,
              subcategoria: lancamento.subcategoria ?? '',
              valor: lancamento.valor,
              data: lancamento.data,
              dataVencimento: lancamento.dataVencimento ?? somaDias(lancamento.data, 15),
              formaPagamento: lancamento.formaPagamento,
              recorrente: lancamento.recorrente,
              fixo: lancamento.fixo,
              observacoes: lancamento.observacoes ?? '',
            }
          : {
              tipo: 'SAIDA',
              descricao: '',
              categoria: '',
              subcategoria: '',
              valor: 0,
              data: hojeISO(),
              dataVencimento: somaDias(hojeISO(), 15),
              formaPagamento: 'PIX',
              recorrente: false,
              fixo: false,
              observacoes: '',
            },
      );
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <ConteudoDialog>
        <DialogCabecalho>
          <DialogTitulo>{lancamento ? 'Editar lançamento' : 'Novo lançamento'}</DialogTitulo>
          <DialogDescricao>Saídas committed as contas a pagar, entradas committed as contas a receber.</DialogDescricao>
        </DialogCabecalho>
        <form
          onSubmit={handleSubmit((d) =>
            aoSalvar({
              ...d,
              status: 'PENDENTE',
              subcategoria: d.subcategoria || undefined,
              dataVencimento: d.dataVencimento || undefined,
              formaPagamento: d.formaPagamento as FormaPagamento | undefined,
              observacoes: d.observacoes || undefined,
            }),
          )}
        >
          <DialogCorpo className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Tipo" obrigatorio className="sm:col-span-2" htmlFor="ltipo">
              <div className="grid grid-cols-2 gap-2">
                {(['SAIDA', 'ENTRADA'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    id={t === 'SAIDA' ? 'ltipo' : undefined}
                    onClick={() => {
                      setValue('tipo', t);
                      setValue('categoria', '');
                    }}
                    aria-pressed={tipo === t}
                    className={`flex h-10 items-center justify-center gap-2 rounded-lg border text-[13px] font-medium transition-colors ${
                      tipo === t
                        ? t === 'SAIDA'
                          ? 'border-[var(--terracota)] bg-[var(--terracota)]/10 text-[var(--terracota)]'
                          : 'border-[var(--marca)] bg-[var(--marca)]/10 text-[var(--marca)] dark:text-[var(--destaque)]'
                        : 'border-[var(--borda)] hover:bg-[var(--acento)]'
                    }`}
                  >
                    {t === 'SAIDA' ? <ArrowUpCircle className="size-4" /> : <ArrowDownCircle className="size-4" />}
                    {t === 'SAIDA' ? 'Saída (a pagar)' : 'Entrada (a receber)'}
                  </button>
                ))}
              </div>
            </Campo>

            <Campo rotulo="Descrição" obrigatorio erro={errors.descricao?.message} className="sm:col-span-2" htmlFor="ldesc">
              <CampoTexto id="ldesc" placeholder="Ex.: Aluguel do galpão" {...register('descricao')} />
            </Campo>

            <Campo rotulo="Categoria" obrigatorio erro={errors.categoria?.message} htmlFor="lcat">
              <Selecao value={watch('categoria')} onValueChange={(v) => setValue('categoria', v)}>
                <GatilhoSelecao id="lcat">
                  <ValorSelecao placeholder="Escolha…" />
                </GatilhoSelecao>
                <ConteudoSelecao>
                  {categorias.map((c) => (
                    <ItemSelecao key={c.nome} value={c.nome}>
                      {c.nome}
                    </ItemSelecao>
                  ))}
                </ConteudoSelecao>
              </Selecao>
            </Campo>

            <Campo rotulo="Subcategoria" htmlFor="lsub">
              <CampoTexto id="lsub" placeholder="Opcional" {...register('subcategoria')} />
            </Campo>

            <Campo rotulo="Valor (R$)" obrigatorio erro={errors.valor?.message} htmlFor="lvalor">
              <CampoTexto
                id="lvalor"
                type="number"
                step="0.01"
                min={0}
                value={numeroParaInput(valor)}
                onChange={(e) => setValue('valor', paraNumero(e.target.value))}
              />
            </Campo>

            <Campo rotulo="Forma de pagamento" htmlFor="lforma">
              <Selecao value={watch('formaPagamento') ?? 'PIX'} onValueChange={(v) => setValue('formaPagamento', v as FormaPagamento)}>
                <GatilhoSelecao id="lforma">
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

            <Campo rotulo="Data" obrigatorio htmlFor="ldata">
              <CampoTexto id="ldata" type="date" {...register('data')} />
            </Campo>
            <Campo rotulo="Vencimento" dica="Deixe vazio se já pagou" htmlFor="lvenc">
              <CampoTexto id="lvenc" type="date" {...register('dataVencimento')} />
            </Campo>

            <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={recorrente}
                  onChange={(e) => setValue('recorrente', e.target.checked)}
                  className="size-3.5 accent-[var(--marca)]"
                />
                <Repeat className="size-3.5 text-[var(--texto-tenue)]" aria-hidden />
                Se repete todo mês
              </label>
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={fixo}
                  onChange={(e) => setValue('fixo', e.target.checked)}
                  className="size-3.5 accent-[var(--marca)]"
                />
                Contar como despesa fixa
              </label>
            </div>

            {recorrente && (
              <div className="sm:col-span-2 rounded-lg bg-[var(--acento)] p-3">
                <p className="text-[12.5px] font-medium text-[var(--texto)]">Gerar este lançamento nos próximos meses?</p>
                <p className="mt-0.5 text-[12px] text-[var(--texto-suave)]">
                  Copia valor, categoria e dia de vencimento.
                </p>
                <div className="mt-2 flex gap-1.5">
                  {[1, 2, 3].map((n) => (
                    <Botao
                      key={n}
                      type="button"
                      tamanho="sm"
                      variante={salvarComo?.descricao === watch('descricao') ? 'principal' : 'contorno'}
                      onClick={() =>
                        setSalvarComo({
                          descricao: watch('descricao'),
                          valor: valor || 0,
                          vencimento: Number(watch('dataVencimento')?.slice(-2) ?? 10),
                          categoria: watch('categoria'),
                        })
                      }
                    >
                      {n} {n === 1 ? 'mês' : 'meses'}
                    </Botao>
                  ))}
                </div>
              </div>
            )}

            <Campo rotulo="Observações" className="sm:col-span-2" htmlFor="lobs">
              <AreaTexto id="lobs" rows={2} {...register('observacoes')} />
            </Campo>
          </DialogCorpo>
          <DialogRodape>
            <Botao type="button" variante="contorno" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit">{lancamento ? 'Salvar' : 'Criar lançamento'}</Botao>
          </DialogRodape>
        </form>
      </ConteudoDialog>
    </Dialog>
  );
}

/* ============================ Diálogo despesa fixa ====================== */

const esquemaFixa = z.object({
  descricao: z.string().min(2, 'Descreva a despesa'),
  categoria: z.string().min(1, 'Escolha a categoria'),
  valorMensalEstimado: z.coerce.number().gt(0, 'Informe um valor maior que zero'),
  diaDeVencimento: z.coerce.number().int().min(1).max(31),
  essencial: z.boolean(),
});

type DadosFixa = z.infer<typeof esquemaFixa>;

function DialogoDespesaFixa({
  aberto,
  aoFechar,
  despesa,
  aoSalvar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  despesa: DespesaFixa | null;
  aoSalvar: (dados: Omit<DespesaFixa, keyof BaseEntidade>) => void;
}) {
  const { configuracao } = useDados();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DadosFixa>({
    resolver: zodResolver(esquemaFixa),
    defaultValues: { descricao: '', categoria: '', valorMensalEstimado: 0, diaDeVencimento: 10, essencial: true },
  });

  const carregado = useMemo(() => despesa?.id ?? null, [despesa]);
  const [chave, setChave] = useState<string | null>(null);
  if (aberto && chave !== carregado) {
    setChave(carregado);
    reset(
      despesa
        ? {
            descricao: despesa.descricao,
            categoria: despesa.categoria,
            valorMensalEstimado: despesa.valorMensalEstimado,
            diaDeVencimento: despesa.diaDeVencimento,
            essencial: despesa.essencial,
          }
        : { descricao: '', categoria: '', valorMensalEstimado: 0, diaDeVencimento: 10, essencial: true },
    );
  }

  const saidas = configuracao.categoriasFinanceiras.filter((c) => c.tipo === 'SAIDA');

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <ConteudoDialog largura="sm">
        <DialogCabecalho>
          <DialogTitulo>{despesa ? 'Editar despesa fixa' : 'Nova despesa fixa'}</DialogTitulo>
          <DialogDescricao>Entram no rateio da margem de contribuição (§7).</DialogDescricao>
        </DialogCabecalho>
        <form
          onSubmit={handleSubmit((d) =>
            aoSalvar({ ...d, ativa: despesa?.ativa ?? true }),
          )}
        >
          <DialogCorpo className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Descrição" obrigatorio erro={errors.descricao?.message} className="sm:col-span-2" htmlFor="fdesc">
              <CampoTexto id="fdesc" placeholder="Ex.: Energia elétrica" {...register('descricao')} />
            </Campo>
            <Campo rotulo="Categoria" obrigatorio erro={errors.categoria?.message} htmlFor="fcat">
              <Selecao value={watch('categoria')} onValueChange={(v) => setValue('categoria', v)}>
                <GatilhoSelecao id="fcat">
                  <ValorSelecao placeholder="Escolha…" />
                </GatilhoSelecao>
                <ConteudoSelecao>
                  {saidas.map((c) => (
                    <ItemSelecao key={c.nome} value={c.nome}>
                      {c.nome}
                    </ItemSelecao>
                  ))}
                </ConteudoSelecao>
              </Selecao>
            </Campo>
            <Campo rotulo="Vence no dia" obrigatorio erro={errors.diaDeVencimento?.message} htmlFor="fdia">
              <CampoTexto id="fdia" type="number" min={1} max={31} {...register('diaDeVencimento')} />
            </Campo>
            <Campo rotulo="Valor mensal (R$)" obrigatorio erro={errors.valorMensalEstimado?.message} className="sm:col-span-2" htmlFor="fvalor">
              <CampoTexto id="fvalor" type="number" step="0.01" min={0} {...register('valorMensalEstimado')} />
            </Campo>
            <label className="flex items-center gap-2 text-[13px] sm:col-span-2">
              <input type="checkbox" className="size-3.5 accent-[var(--marca)]" {...register('essencial')} />
              Despesa essencial (não dá para cortar)
            </label>
          </DialogCorpo>
          <DialogRodape>
            <Botao type="button" variante="contorno" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit">Salvar</Botao>
          </DialogRodape>
        </form>
      </ConteudoDialog>
    </Dialog>
  );
}
