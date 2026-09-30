import { useMemo, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Download,
  Flag,
  ListChecks,
  Pencil,
  Plus,
  Target,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDados } from '@/db/store';
import { dentroDoPeriodo } from '@/db/deriva';
import { ROTULO_AREA_TAREFA, type BaseEntidade, type Meta, type StatusTarefa, type Tarefa } from '@/types';
import { dataBR, hojeISO, moeda, numero as num, percentualNum, MESES } from '@/lib/format';
import { painelIndicadores, resumirPeriodo } from '@/lib/indicadores';
import { exportarCSV } from '@/lib/arquivos';
import { Card, CardCabecalho, CardConteudo, CardDescricao, CardTitulo } from '@/components/ui/card';
import { Botao } from '@/components/ui/button';
import { Aba, Abas, ListaAbas, PainelAba, Progresso } from '@/components/ui/misc';
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
import { SeletorPeriodo } from '@/components/SeletorPeriodo';
import { usePeriodo } from '@/hooks/usePeriodo';

const STATUS_TAREFA: Record<StatusTarefa, string> = {
  PENDENTE: 'Pendente',
  FAZENDO: 'Fazendo',
  CONCLUIDA: 'Concluída',
  ATRASADA: 'Atrasada',
};

const TOM_TAREFA: Record<StatusTarefa, 'terra' | 'mostarda' | 'terracota' | 'verde' | 'cinza'> = {
  PENDENTE: 'cinza',
  FAZENDO: 'mostarda',
  CONCLUIDA: 'verde',
  ATRASADA: 'terracota',
};

export default function Metas() {
  const { bd, derivado, configuracao, rbt12, pedidosNoMes, criar, atualizar, remover } = useDados();
  const [periodo, definirPeriodo] = usePeriodo();
  const [aba, setAba] = useState<'indicadores' | 'metas' | 'tarefas'>('indicadores');
  const [metaAberta, setMetaAberta] = useState(false);
  const [metaEditando, setMetaEditando] = useState<Meta | null>(null);
  const [tarefaAberta, setTarefaAberta] = useState(false);
  const [tarefaEditando, setTarefaEditando] = useState<Tarefa | null>(null);

  const meta = useMemo(
    () => bd.metas.find((m) => m.mes === periodo.mes && m.ano === periodo.ano),
    [bd.metas, periodo],
  );

  const resumo = useMemo(
    () => resumirPeriodo(derivado.vendas, periodo, configuracao, rbt12, pedidosNoMes),
    [derivado.vendas, periodo, configuracao, rbt12, pedidosNoMes],
  );

  const linhas = useMemo(
    () =>
      painelIndicadores({
        resumo,
        clientes: derivado.clientes,
        produtos: derivado.produtos,
        gastos: bd.gastosMarketing,
        lancamentos: bd.lancamentos,
        meta,
        config: configuracao,
        periodo,
      }),
    [resumo, derivado.clientes, derivado.produtos, bd.gastosMarketing, bd.lancamentos, meta, configuracao, periodo],
  );

  /* ------------------------------ Metas ---------------------------------- */
  const metas = useMemo(
    () => [...bd.metas].sort((a, b) => a.ano - b.ano || a.mes - b.mes),
    [bd.metas],
  );

  const realizacao = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const l of linhas) if (l.meta !== null) mapa.set(l.chave, l.atingimento ?? 0);
    return mapa;
  }, [linhas]);

  /* ------------------------------ Tarefas -------------------------------- */
  const tarefas = useMemo(
    () => bd.tarefas.filter((t) => !t.arquivado).sort((a, b) => a.ordem - b.ordem),
    [bd.tarefas],
  );
  const tarefasPeriodo = tarefas.filter((t) => dentroDoPeriodo(t.prazo, periodo.inicio, periodo.fim));
  const concluidas = tarefasPeriodo.filter((t) => t.status === 'CONCLUIDA').length;
  const atrasadas = tarefas.filter((t) => t.status !== 'CONCLUIDA' && t.prazo < hojeISO()).length;

  const exportarIndicadores = () => {
    exportarCSV(
      `indicadores-${periodo.inicio}-a-${periodo.fim}`,
      ['Indicador', 'Realizado', 'Meta', 'Atingimento', 'Situação'],
      linhas.map((l) => [l.rotulo, l.realizado, l.meta ?? '', l.atingimento === null ? '' : `${(l.atingimento * 100).toFixed(1)}%`, l.status]),
    );
    toast.success('Indicadores exportados.');
  };

  return (
    <>
      <CabecalhoPagina
        icone={Target}
        titulo="Metas & Indicadores"
        descricao="O número que você quer alcançar e o número que você realmente fez."
        acoes={
          <>
            <Botao variante="contorno" onClick={exportarIndicadores}>
              <Download />
              <span className="hidden sm:inline">Exportar</span>
            </Botao>
            <Botao
              onClick={() => {
                setMetaEditando(null);
                setMetaAberta(true);
              }}
            >
              <Plus />
              Nova meta
            </Botao>
          </>
        }
      />
      <div className="-mt-1">
        <SeletorPeriodo periodo={periodo} aoMudar={definirPeriodo} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoKpi
          rotulo="Faturamento"
          valor={moeda(resumo.faturamento)}
          apoio={meta ? `Meta ${moeda(meta.metas.faturamento)}` : 'Sem meta cadastrada'}
          icone={Flag}
          cor={meta && resumo.faturamento >= meta.metas.faturamento ? 'var(--sucesso)' : undefined}
        />
        <CartaoKpi
          rotulo="Margem média"
          valor={percentualNum(resumo.margemPct * 100, 1)}
          apoio={meta ? `Meta ${meta.metas.margemMedia}%` : 'Mínimo aceitável ' + configuracao.margemMinimaAlerta + '%'}
          icone={Target}
          cor={resumo.margemPct * 100 < configuracao.margemMinimaAlerta ? 'var(--alerta)' : 'var(--sucesso)'}
        />
        <CartaoKpi
          rotulo="Tarefas do período"
          valor={`${concluidas}/${tarefasPeriodo.length}`}
          apoio={atrasadas === 0 ? 'Nenhuma atrasada' : `${atrasadas} ${atrasadas === 1 ? 'atrasada' : 'atrasadas'}`}
          icone={ListChecks}
          cor={atrasadas > 0 ? 'var(--alerta)' : undefined}
        />
        <CartaoKpi
          rotulo="Metas cadastradas"
          valor={formatarContagem(metas.length)}
          apoio={`${metas.filter((m) => m.ano === new Date().getFullYear()).length} neste ano`}
          icone={CalendarCheck}
        />
      </div>

      <div className="mt-3">
        <Abas value={aba} onValueChange={(v) => setAba(v as typeof aba)}>
          <ListaAbas className="mb-3">
            <Aba value="indicadores">Indicadores</Aba>
            <Aba value="metas">Metas por mês</Aba>
            <Aba value="tarefas">Tarefas</Aba>
          </ListaAbas>

          <PainelAba value="indicadores">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {linhas.map((l) => (
                <CartaoIndicador key={l.chave} linha={l} />
              ))}
            </div>
          </PainelAba>

          <PainelAba value="metas">
            <Card>
              <CardCabecalho>
                <CardTitulo>Metas mês a mês</CardTitulo>
                <CardDescricao>
                  {meta ? `Editando o plano de ${MESES[periodo.mes - 1].toLowerCase()}/${periodo.ano}.` : 'Nenhuma meta para o período selecionado.'}
                </CardDescricao>
              </CardCabecalho>
              <CardConteudo>
                {metas.length === 0 ? (
                  <EstadoVazio
                    icone={Target}
                    titulo="Nenhuma meta cadastrada"
                    descricao="Defina faturamento, ticket, margem e pedidos para ter um alvo claro."
                    acao={
                      <Botao
                        onClick={() => {
                          setMetaEditando(null);
                          setMetaAberta(true);
                        }}
                      >
                        <Plus />
                        Nova meta
                      </Botao>
                    }
                  />
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {metas.map((m) => {
                      const atual = m.mes === periodo.mes && m.ano === periodo.ano;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            const dt = new Date(m.ano, m.mes - 1, 1);
                            definirPeriodo({
                              ...periodo,
                              tipo: 'MES',
                              mes: m.mes,
                              ano: m.ano,
                              rotulo: `${MESES[m.mes - 1]} de ${m.ano}`,
                              rotuloAnterior: `${MESES[m.mes - 2] ?? 'dezembro'} de ${m.mes - 1 === 1 ? m.ano - 1 : m.ano}`,
                              inicio: `${m.ano}-${String(m.mes).padStart(2, '0')}-01`,
                              fim: new Date(m.ano, m.mes, 0).toISOString().slice(0, 10),
                            });
                            void dt;
                          }}
                          className={`rounded-xl border p-3 text-left transition-colors ${
                            atual ? 'border-[var(--marca)] bg-[var(--acento)]' : 'border-[var(--borda)] hover:bg-[var(--acento)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[13px] font-semibold capitalize">
                              {MESES[m.mes - 1]} / {m.ano}
                            </p>
                            {atual && <Etiqueta tom="terra">Período atual</Etiqueta>}
                          </div>
                          <p className="num mt-1.5 text-[17px] font-semibold">{moeda(m.metas.faturamento)}</p>
                          <p className="text-[12px] text-[var(--texto-suave)]">
                            {m.metas.pedidos} pedidos · ticket {moeda(m.metas.ticketMedio)} · {m.metas.margemMedia}%
                          </p>
                          {atual && (
                            <p className="num mt-1.5 text-[12px] text-[var(--marca)] dark:text-[var(--destaque)]">
                              Atingido {percentualNum((realizacao.get('faturamento') ?? 0) * 100, 0)} do faturamento
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardConteudo>
            </Card>
          </PainelAba>

          <PainelAba value="tarefas">
            <Card>
              <CardCabecalho>
                <CardTitulo>Rotina do negócio</CardTitulo>
                <CardDescricao>{formatarContagem(tarefas.length)} tarefas · checklist do que precisa acontecer sempre</CardDescricao>
              </CardCabecalho>
              <CardConteudo className="pt-0">
                <div className="mb-3">
                  <Botao
                    tamanho="sm"
                    onClick={() => {
                      setTarefaEditando(null);
                      setTarefaAberta(true);
                    }}
                  >
                    <Plus />
                    Nova tarefa
                  </Botao>
                </div>
                <TabelaDados
                  colunas={[
                    {
                      id: 'titulo',
                      accessorKey: 'titulo',
                      header: 'Tarefa',
                      cell: ({ row }) => (
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.original.titulo}</p>
                          <p className="truncate text-[12px] text-[var(--texto-tenue)]">{row.original.descricao}</p>
                        </div>
                      ),
                    },
                    {
                      id: 'area',
                      accessorKey: 'area',
                      header: 'Área',
                      meta: { ocultarAte: 'sm' },
                      cell: ({ row }) => <Etiqueta tom="cinza">{ROTULO_AREA_TAREFA[row.original.area]}</Etiqueta>,
                    },
                    {
                      id: 'prazo',
                      accessorKey: 'prazo',
                      header: 'Prazo',
                      cell: ({ row }) => {
                        const atrasada = row.original.status !== 'CONCLUIDA' && row.original.prazo < hojeISO();
                        return (
                          <span className={atrasada ? 'num font-medium text-[var(--alerta)]' : 'num'}>
                            {dataBR(row.original.prazo)}
                          </span>
                        );
                      },
                    },
                    {
                      id: 'status',
                      accessorKey: 'status',
                      header: 'Status',
                      cell: ({ row }) => <Etiqueta tom={TOM_TAREFA[row.original.status]}>{STATUS_TAREFA[row.original.status]}</Etiqueta>,
                    },
                  ]}
                  dados={tarefas}
                  chave={(t) => t.id}
                  vazio={
                    <EstadoVazio
                      icone={ListChecks}
                      titulo="Nenhuma tarefa"
                      descricao="Liste o que precisa acontecer todo mês para o negócio não depender de memória."
                      acao={
                        <Botao
                          onClick={() => {
                            setTarefaEditando(null);
                            setTarefaAberta(true);
                          }}
                        >
                          <Plus />
                          Nova tarefa
                        </Botao>
                      }
                    />
                  }
                  colunaAcoes={(t) => (
                    <div className="flex justify-end gap-0.5">
                      <Botao
                        variante={t.status === 'CONCLUIDA' ? 'sucesso' : 'contorno'}
                        tamanho="sm"
                        onClick={() => {
                          const nova = t.status === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA';
                          atualizar<Tarefa>('tarefas', t.id, {
                            status: nova,
                            concluidaEm: nova === 'CONCLUIDA' ? hojeISO() : undefined,
                          });
                          toast.success(nova === 'CONCLUIDA' ? 'Tarefa concluída.' : 'Tarefa reaberta.');
                        }}
                      >
                        {t.status === 'CONCLUIDA' ? 'Reabrir' : 'Concluir'}
                      </Botao>
                      <Botao
                        variante="fantasma"
                        tamanho="iconeXs"
                        aria-label={`Editar ${t.titulo}`}
                        onClick={() => {
                          setTarefaEditando(t);
                          setTarefaAberta(true);
                        }}
                      >
                        <Pencil />
                      </Botao>
                      <BotaoExcluir
                        rotulo={`Excluir "${t.titulo}"?`}
                        descricao="A tarefa sai do checklist."
                        aoConfirmar={() => {
                          remover('tarefas', t.id);
                          toast.success('Tarefa excluída.');
                        }}
                      >
                        <Botao variante="fantasma" tamanho="iconeXs" aria-label={`Excluir ${t.titulo}`}>
                          <Trash2 />
                        </Botao>
                      </BotaoExcluir>
                    </div>
                  )}
                />
              </CardConteudo>
            </Card>
          </PainelAba>
        </Abas>
      </div>

      <DialogoMeta
        aberto={metaAberta}
        aoFechar={() => setMetaAberta(false)}
        meta={metaEditando ?? meta ?? null}
        periodo={periodo}
        aoSalvar={(dados) => {
          if (metaEditando) {
            atualizar<Meta>('metas', metaEditando.id, dados);
            toast.success('Meta atualizada.');
          } else if (meta) {
            atualizar<Meta>('metas', meta.id, { ...dados, metas: dados.metas });
            toast.success('Meta do período atualizada.');
          } else {
            criar<Meta>('metas', dados);
            toast.success('Meta criada.');
          }
          setMetaAberta(false);
        }}
      />

      <DialogoTarefa
        aberto={tarefaAberta}
        aoFechar={() => setTarefaAberta(false)}
        tarefa={tarefaEditando}
        proximaOrdem={tarefas.length + 1}
        aoSalvar={(dados) => {
          if (tarefaEditando) {
            atualizar<Tarefa>('tarefas', tarefaEditando.id, dados);
            toast.success('Tarefa atualizada.');
          } else {
            criar<Tarefa>('tarefas', dados);
            toast.success('Tarefa criada.');
          }
          setTarefaAberta(false);
        }}
      />
    </>
  );
}

/* =========================== Cartão de indicador ========================= */

function CartaoIndicador({ linha }: { linha: ReturnType<typeof painelIndicadores>[number] }) {
  const pct = Math.min(100, Math.round((linha.atingimento ?? 0) * 100));
  const semReferencia = linha.meta === null || linha.meta === 0;
  const cor =
    linha.status === 'BOM' ? 'var(--sucesso)' : linha.status === 'ATENCAO' ? 'var(--atencao)' : linha.status === 'ABAIXO' ? 'var(--alerta)' : 'var(--texto-tenue)';
  const formatar = (v: number) =>
    linha.tipoValor === 'moeda'
      ? moeda(v)
      : linha.tipoValor === 'percentual'
        ? percentualNum(v, 1)
        : linha.tipoValor === 'dias'
          ? `${num(v)} dias`
          : num(v, 0);

  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[var(--texto)]">{linha.rotulo}</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--texto-tenue)]">{linha.ajuda}</p>
        </div>
        <Etiqueta
          tom={linha.status === 'BOM' ? 'verde' : linha.status === 'ATENCAO' ? 'mostarda' : linha.status === 'ABAIXO' ? 'terracota' : 'cinza'}
        >
          {linha.status === 'BOM' ? 'No alvo' : linha.status === 'ATENCAO' ? 'Atenção' : linha.status === 'ABAIXO' ? 'Abaixo' : 'Sem meta'}
        </Etiqueta>
      </div>
      <p className="num mt-2 text-[24px] font-semibold leading-none">{formatar(linha.realizado)}</p>
      {linha.meta === null ? (
        <p className="mt-1 text-[12px] text-[var(--texto-tenue)]">Sem meta cadastrada para este indicador</p>
      ) : semReferencia ? (
        <p className="mt-1 text-[12px] text-[var(--texto-tenue)]">
          Meta só de referência: {formatar(linha.meta)} — o importante é a tendência.
        </p>
      ) : (
        <>
          <p className="num mt-1 text-[12px] text-[var(--texto-suave)]">
            Meta {formatar(linha.meta)} · {linha.atingimento === null ? '—' : percentualNum(linha.atingimento * 100, 0)}
          </p>
          <Progresso value={pct} cor={cor} className="mt-2" />
        </>
      )}
    </Card>
  );
}

/* ============================== Diálogo meta ============================= */

const esquema = z.object({
  nome: z.string().min(2, 'Dê um nome para a meta'),
  mes: z.coerce.number().min(1).max(12),
  ano: z.coerce.number().min(2020).max(2100),
  faturamento: z.coerce.number().min(0),
  ticketMedio: z.coerce.number().min(0),
  margemMedia: z.coerce.number().min(0).max(100),
  novosClientes: z.coerce.number().min(0),
  pedidos: z.coerce.number().min(0),
  giroEstoque: z.coerce.number().min(0),
  descricao: z.string().optional(),
});

type Dados = z.infer<typeof esquema>;

function DialogoMeta({
  aberto,
  aoFechar,
  meta,
  periodo,
  aoSalvar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  meta: Meta | null;
  periodo: { mes: number; ano: number };
  aoSalvar: (dados: Omit<Meta, keyof BaseEntidade>) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Dados>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nome: `Meta ${MESES[periodo.mes - 1]}/${periodo.ano}`,
      mes: periodo.mes,
      ano: periodo.ano,
      faturamento: 14000,
      ticketMedio: 1100,
      margemMedia: 30,
      novosClientes: 3,
      pedidos: 12,
      giroEstoque: 1.2,
      descricao: '',
    },
  });

  const carregado = meta?.id ?? `novo-${periodo.mes}-${periodo.ano}`;
  const [chave, setChave] = useState<string | null>(null);
  if (aberto && chave !== carregado) {
    setChave(carregado);
    reset(
      meta
        ? {
            nome: meta.nome,
            mes: meta.mes,
            ano: meta.ano,
            faturamento: meta.metas.faturamento,
            ticketMedio: meta.metas.ticketMedio,
            margemMedia: meta.metas.margemMedia,
            novosClientes: meta.metas.novosClientes,
            pedidos: meta.metas.pedidos,
            giroEstoque: meta.metas.giroEstoque,
            descricao: meta.descricao ?? '',
          }
        : {
            nome: `Meta ${MESES[periodo.mes - 1]}/${periodo.ano}`,
            mes: periodo.mes,
            ano: periodo.ano,
            faturamento: 14000,
            ticketMedio: 1100,
            margemMedia: 30,
            novosClientes: 3,
            pedidos: 12,
            giroEstoque: 1.2,
            descricao: '',
          },
    );
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <ConteudoDialog largura="lg">
        <DialogCabecalho>
          <DialogTitulo>{meta ? 'Editar meta' : 'Nova meta mensal'}</DialogTitulo>
          <DialogDescricao>Os mesmos números que aparecem nos indicadores do painel.</DialogDescricao>
        </DialogCabecalho>
        <form
          onSubmit={handleSubmit((d) =>
            aoSalvar({
              nome: d.nome,
              mes: d.mes,
              ano: d.ano,
              descricao: d.descricao || undefined,
              metas: {
                faturamento: d.faturamento,
                ticketMedio: d.ticketMedio,
                margemMedia: d.margemMedia,
                novosClientes: d.novosClientes,
                pedidos: d.pedidos,
                giroEstoque: d.giroEstoque,
              },
            }),
          )}
        >
          <DialogCorpo className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Nome" obrigatorio erro={errors.nome?.message} className="sm:col-span-2" htmlFor="mnome">
              <CampoTexto id="mnome" {...register('nome')} />
            </Campo>
            <Campo rotulo="Mês" obrigatorio erro={errors.mes?.message} htmlFor="mmes">
              <CampoTexto id="mmes" type="number" min={1} max={12} {...register('mes')} />
            </Campo>
            <Campo rotulo="Ano" obrigatorio erro={errors.ano?.message} htmlFor="mano">
              <CampoTexto id="mano" type="number" {...register('ano')} />
            </Campo>

            <Campo rotulo="Faturamento (R$)" obrigatorio erro={errors.faturamento?.message} htmlFor="mfat">
              <CampoTexto id="mfat" type="number" step="0.01" min={0} {...register('faturamento')} />
            </Campo>
            <Campo rotulo="Ticket médio (R$)" obrigatorio erro={errors.ticketMedio?.message} htmlFor="mticket">
              <CampoTexto id="mticket" type="number" step="0.01" min={0} {...register('ticketMedio')} />
            </Campo>
            <Campo rotulo="Margem média (%)" obrigatorio erro={errors.margemMedia?.message} htmlFor="mmargem">
              <CampoTexto id="mmargem" type="number" step="0.1" min={0} max={100} {...register('margemMedia')} />
            </Campo>
            <Campo rotulo="Pedidos" obrigatorio erro={errors.pedidos?.message} htmlFor="mped">
              <CampoTexto id="mped" type="number" min={0} {...register('pedidos')} />
            </Campo>
            <Campo rotulo="Novos clientes" obrigatorio erro={errors.novosClientes?.message} htmlFor="mcli">
              <CampoTexto id="mcli" type="number" min={0} {...register('novosClientes')} />
            </Campo>
            <Campo rotulo="Giro de estoque (x/mês)" obrigatorio erro={errors.giroEstoque?.message} htmlFor="mgiro">
              <CampoTexto id="mgiro" type="number" step="0.1" min={0} {...register('giroEstoque')} />
            </Campo>
            <Campo rotulo="Observações" className="sm:col-span-2" htmlFor="mobs">
              <AreaTexto id="mobs" rows={2} {...register('descricao')} />
            </Campo>
          </DialogCorpo>
          <DialogRodape>
            <Botao type="button" variante="contorno" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit">Salvar meta</Botao>
          </DialogRodape>
        </form>
      </ConteudoDialog>
    </Dialog>
  );
}

/* ============================= Diálogo tarefa ============================ */

const esquemaTarefa = z.object({
  titulo: z.string().min(2, 'Descreva a tarefa'),
  descricao: z.string().optional(),
  responsavel: z.string().min(1, 'Quem responde por ela'),
  area: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']),
  status: z.enum(['PENDENTE', 'FAZENDO', 'CONCLUIDA', 'ATRASADA']),
  prazo: z.string().min(1),
});

type DadosTarefa = z.infer<typeof esquemaTarefa>;

function DialogoTarefa({
  aberto,
  aoFechar,
  tarefa,
  proximaOrdem,
  aoSalvar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  tarefa: Tarefa | null;
  proximaOrdem: number;
  aoSalvar: (dados: Omit<Tarefa, keyof BaseEntidade>) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DadosTarefa>({
    resolver: zodResolver(esquemaTarefa),
    defaultValues: {
      titulo: '',
      descricao: '',
      responsavel: 'Ezequiel',
      area: 'A',
      status: 'PENDENTE',
      prazo: hojeISO(),
    },
  });

  const carregado = tarefa?.id ?? 'nova';
  const [chave, setChave] = useState<string | null>(null);
  if (aberto && chave !== carregado) {
    setChave(carregado);
    reset(
      tarefa
        ? {
            titulo: tarefa.titulo,
            descricao: tarefa.descricao ?? '',
            responsavel: tarefa.responsavel,
            area: tarefa.area,
            status: tarefa.status,
            prazo: tarefa.prazo,
          }
        : {
            titulo: '',
            descricao: '',
            responsavel: 'Ezequiel',
            area: 'A',
            status: 'PENDENTE',
            prazo: hojeISO(),
          },
    );
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <ConteudoDialog>
        <DialogCabecalho>
          <DialogTitulo>{tarefa ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitulo>
          <DialogDescricao>Combine as áreas no fim do mês para ver o que ficou pendente.</DialogDescricao>
        </DialogCabecalho>
        <form
          onSubmit={handleSubmit((d) =>
            aoSalvar({
              ...d,
              descricao: d.descricao || undefined,
              concluidaEm: d.status === 'CONCLUIDA' ? (tarefa?.concluidaEm ?? hojeISO()) : undefined,
              ordem: tarefa?.ordem ?? proximaOrdem,
              bloco: tarefa?.bloco ?? 1,
            }),
          )}
        >
          <DialogCorpo className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Tarefa" obrigatorio erro={errors.titulo?.message} className="sm:col-span-2" htmlFor="ttitulo">
              <CampoTexto id="ttitulo" placeholder="Ex.: Conferir validade dos lotes" {...register('titulo')} />
            </Campo>
            <Campo rotulo="Responsável" obrigatorio erro={errors.responsavel?.message} htmlFor="tresp">
              <CampoTexto id="tresp" {...register('responsavel')} />
            </Campo>
            <Campo rotulo="Área" htmlFor="tarea">
              <Selecao value={watch('area')} onValueChange={(v) => setValue('area', v as DadosTarefa['area'])}>
                <GatilhoSelecao id="tarea">
                  <ValorSelecao />
                </GatilhoSelecao>
                <ConteudoSelecao>
                  {(Object.keys(ROTULO_AREA_TAREFA) as DadosTarefa['area'][]).map((a) => (
                    <ItemSelecao key={a} value={a}>
                      {ROTULO_AREA_TAREFA[a]}
                    </ItemSelecao>
                  ))}
                </ConteudoSelecao>
              </Selecao>
            </Campo>
            <Campo rotulo="Status" htmlFor="tstatus">
              <Selecao value={watch('status')} onValueChange={(v) => setValue('status', v as StatusTarefa)}>
                <GatilhoSelecao id="tstatus">
                  <ValorSelecao />
                </GatilhoSelecao>
                <ConteudoSelecao>
                  {(Object.keys(STATUS_TAREFA) as StatusTarefa[]).map((s) => (
                    <ItemSelecao key={s} value={s}>
                      {STATUS_TAREFA[s]}
                    </ItemSelecao>
                  ))}
                </ConteudoSelecao>
              </Selecao>
            </Campo>
            <Campo rotulo="Prazo" obrigatorio erro={errors.prazo?.message} htmlFor="tprazo">
              <CampoTexto id="tprazo" type="date" {...register('prazo')} />
            </Campo>
            <Campo rotulo="Detalhe" className="sm:col-span-2" htmlFor="tdesc">
              <AreaTexto id="tdesc" rows={2} {...register('descricao')} />
            </Campo>
          </DialogCorpo>
          <DialogRodape>
            <Botao type="button" variante="contorno" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit">
              <CheckCircle2 />
              Salvar
            </Botao>
          </DialogRodape>
        </form>
      </ConteudoDialog>
    </Dialog>
  );
}
