import { useMemo, useState } from 'react';
import { Download, Megaphone, Pencil, Plus, Target, Trash2, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDados } from '@/db/store';
import { dentroDoPeriodo, vendasValidas } from '@/db/deriva';
import { ROTULO_CANAL_MARKETING, type BaseEntidade, type CanalMarketing, type GastoMarketing } from '@/types';
import { dataBR, hojeISO, moeda, numeroParaInput, paraNumero } from '@/lib/format';
import { exportarCSV } from '@/lib/arquivos';
import { Card, CardCabecalho, CardConteudo, CardDescricao, CardTitulo } from '@/components/ui/card';
import { Botao } from '@/components/ui/button';
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
import { BarrasHorizontais, GraficoBarrasComparativo } from '@/components/graficos';
import { CabecalhoPagina, CartaoKpi, EstadoVazio, Etiqueta, formatarContagem } from '@/components/comuns';
import { TabelaDados } from '@/components/tabela-dados';
import { SeletorPeriodo } from '@/components/SeletorPeriodo';
import { usePeriodo } from '@/hooks/usePeriodo';

export default function Marketing() {
  const { bd, derivado, criar, atualizar, remover } = useDados();
  const [periodo, definirPeriodo] = usePeriodo();
  const [busca, setBusca] = useState('');
  const [filtroCanal, setFiltroCanal] = useState<'TODOS' | CanalMarketing>('TODOS');
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<GastoMarketing | null>(null);

  // Orçamento monthly sugerido: 5% do faturamento dos últimos 3 meses
  const orcamentoMensal = useMemo(() => {
    const vendas = vendasValidas(derivado.vendas);
    if (vendas.length === 0) return 0;
    const receita = vendas.reduce((s, v) => s + v.valorTotal, 0);
    return Math.round((receita / Math.max(1, new Set(vendas.map((v) => v.dataEmissao.slice(0, 7))).size)) * 0.05);
  }, [derivado.vendas]);

  const gastos = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return bd.gastosMarketing
      .filter((g) => !g.arquivado)
      .filter((g) => (filtroCanal === 'TODOS' ? true : g.canal === filtroCanal))
      .filter((g) => (t ? `${g.descricao} ${ROTULO_CANAL_MARKETING[g.canal]} ${g.resultado ?? ''}`.toLowerCase().includes(t) : true))
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [bd.gastosMarketing, busca, filtroCanal]);

  const noPeriodo = useMemo(
    () => gastos.filter((g) => dentroDoPeriodo(g.data, periodo.inicio, periodo.fim)),
    [gastos, periodo],
  );

  const total = noPeriodo.reduce((s, g) => s + g.valor, 0);
  const clientesGerados = noPeriodo.reduce((s, g) => s + g.clientesGerados, 0);
  const CAC = total > 0 && clientesGerados > 0 ? total / clientesGerados : 0;

  /* ------- Retorno: faturamento dos 30 dias após cada investimento ------- */
  const retorno = useMemo(() => {
    const vendas = vendasValidas(derivado.vendas);
    return noPeriodo.map((g) => {
      const limite = new Date(g.data);
      limite.setDate(limite.getDate() + 30);
      const fim = limite.toISOString().slice(0, 10);
      // Atribuição pela origem do cliente: quem veio de Instagram conta para
      // anúncios de Instagram; eventos e impressos valem para todos.
      const origem =
        g.canal === 'INSTAGRAM_ADS' || g.canal === 'FACEBOOK_ADS' || g.canal === 'INFLUENCER'
          ? 'INSTAGRAM'
          : g.canal === 'WHATSAPP_API'
            ? 'WHATSAPP'
            : g.canal === 'GOOGLE_ADS'
              ? 'INDICACAO'
              : null;
      const ids = new Set(
        origem ? derivado.clientes.filter((c) => c.canalOrigem === origem).map((c) => c.id) : [],
      );
      const atribuidas = vendas.filter((v) => {
        if (v.dataEmissao < g.data || v.dataEmissao > fim) return false;
        return origem ? ids.has(v.clienteId) : true;
      });
      const faturamento = atribuidas.reduce((s, v) => s + v.valorTotal, 0);
      const roI = g.valor > 0 ? faturamento / g.valor : 0;
      return { gasto: g, faturamento, roI, clientes: atribuidas.length };
    });
  }, [noPeriodo, derivado.vendas, derivado.clientes]);

  const comRetorno = retorno.filter((r) => r.faturamento > 0);
  const roiMedio = comRetorno.length > 0 ? comRetorno.reduce((s, r) => s + r.roI, 0) / comRetorno.length : 0;

  const porCanal = useMemo(() => {
    const mapa = new Map<CanalMarketing, number>();
    for (const g of noPeriodo) mapa.set(g.canal, (mapa.get(g.canal) ?? 0) + g.valor);
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]).map(([canal, valor]) => ({ nome: ROTULO_CANAL_MARKETING[canal], valor }));
  }, [noPeriodo]);

  const evolucao = useMemo(() => {
    const pontos: Array<{ rotulo: string; investimento: number; retorno: number }> = [];
    const base = new Date(`${periodo.fim}T00:00:00`);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const ini = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const fim = `${ultimo.getFullYear()}-${String(ultimo.getMonth() + 1).padStart(2, '0')}-${String(ultimo.getDate()).padStart(2, '0')}`;
      const doMes = bd.gastosMarketing.filter((g) => !g.arquivado && dentroDoPeriodo(g.data, ini, fim));
      const invest = doMes.reduce((s, g) => s + g.valor, 0);
      const limite = new Date(ultimo);
      limite.setDate(limite.getDate() + 30);
      const ret = vendasValidas(derivado.vendas)
        .filter((v) => v.dataEmissao >= ini && v.dataEmissao <= fim)
        .reduce((s, v) => s + v.valorTotal, 0);
      pontos.push({ rotulo: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), investimento: invest, retorno: ret });
    }
    return pontos;
  }, [bd.gastosMarketing, derivado.vendas, periodo]);

  const exportar = () => {
    exportarCSV(
      `marketing-${periodo.inicio}-a-${periodo.fim}`,
      ['Data', 'Descrição', 'Canal', 'Valor', 'Pago', 'Clientes gerados', 'Resultado'],
      noPeriodo.map((g) => [g.data, g.descricao, ROTULO_CANAL_MARKETING[g.canal], g.valor, g.pago ? 'Sim' : 'Não', g.clientesGerados, g.resultado ?? '']),
    );
    toast.success('Investimentos em marketing exportados.');
  };

  return (
    <>
      <CabecalhoPagina
        icone={Megaphone}
        titulo="Marketing"
        descricao="Quanto investiu, quantos clientes trouxe e quanto voltou."
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
              Novo investimento
            </Botao>
          </>
        }
      />
      <div className="-mt-1">
        <SeletorPeriodo periodo={periodo} aoMudar={definirPeriodo} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoKpi rotulo="Investido" valor={moeda(total)} apoio={periodo.rotulo} icone={Megaphone} />
        <CartaoKpi
          rotulo="Clientes gerados"
          valor={formatarContagem(clientesGerados)}
          apoio={total > 0 ? `${formatarContagem(noPeriodo.length)} campanhas` : 'Registre os resultados'}
          icone={Users}
        />
        <CartaoKpi
          rotulo="Custo por cliente"
          valor={CAC > 0 ? moeda(CAC) : '—'}
          apoio={CAC > 0 ? 'CAC do período' : 'Sem clientes gerados'}
          icone={Target}
          cor={CAC > 0 && CAC > 120 ? 'var(--alerta)' : undefined}
        />
        <CartaoKpi
          rotulo="Retorno médio"
          valor={roiMedio > 0 ? `${roiMedio.toFixed(1).replace('.', ',')}×` : '—'}
          apoio="Faturamento 30 dias após ÷ investimento"
          icone={TrendingUp}
          cor={roiMedio >= 3 ? 'var(--sucesso)' : roiMedio > 0 ? 'var(--atencao)' : undefined}
        />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0">
          <CardCabecalho>
            <CardTitulo>Investimentos</CardTitulo>
            <CardDescricao>{formatarContagem(noPeriodo.length)} lançamentos no período</CardDescricao>
          </CardCabecalho>
          <CardConteudo className="pt-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <CampoTexto
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar investimento…"
                aria-label="Buscar investimento de marketing"
                className="h-9 w-full sm:w-56"
              />
              <Selecao value={filtroCanal} onValueChange={(v) => setFiltroCanal(v as typeof filtroCanal)}>
                <GatilhoSelecao className="h-9 w-44">
                  <ValorSelecao />
                </GatilhoSelecao>
                <ConteudoSelecao>
                  <ItemSelecao value="TODOS">Todos os canais</ItemSelecao>
                  {(Object.keys(ROTULO_CANAL_MARKETING) as CanalMarketing[]).map((c) => (
                    <ItemSelecao key={c} value={c}>
                      {ROTULO_CANAL_MARKETING[c]}
                    </ItemSelecao>
                  ))}
                </ConteudoSelecao>
              </Selecao>
            </div>

            <TabelaDados
              colunas={[
                {
                  id: 'descricao',
                  accessorKey: 'descricao',
                  header: 'Investimento',
                  cell: ({ row }) => (
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.original.descricao}</p>
                      <p className="num text-[12px] text-[var(--texto-tenue)]">{dataBR(row.original.data)}</p>
                    </div>
                  ),
                },
                {
                  id: 'canal',
                  accessorKey: 'canal',
                  header: 'Canal',
                  cell: ({ row }) => <Etiqueta tom="terra">{ROTULO_CANAL_MARKETING[row.original.canal]}</Etiqueta>,
                  filterFn: 'equals',
                },
                {
                  id: 'pago',
                  accessorKey: 'pago',
                  header: 'Pago',
                  meta: { ocultarAte: '2xl' },
                  cell: ({ row }) => <Etiqueta tom={row.original.pago ? 'verde' : 'mostarda'}>{row.original.pago ? 'Pago' : 'A pagar'}</Etiqueta>,
                },
                {
                  id: 'clientes',
                  accessorKey: 'clientesGerados',
                  header: 'Clientes',
                  cell: ({ row }) => <span className="num">{row.original.clientesGerados}</span>,
                },
                {
                  id: 'resultado',
                  accessorKey: 'resultado',
                  header: 'Resultado',
                  meta: { ocultarAte: '2xl' },
                  cell: ({ row }) => <span className="text-[12.5px] text-[var(--texto-suave)]">{row.original.resultado ?? '—'}</span>,
                },
                {
                  id: 'valor',
                  accessorKey: 'valor',
                  header: 'Valor',
                  cell: ({ row }) => <span className="num font-semibold">{moeda(row.original.valor)}</span>,
                },
              ]}
              dados={noPeriodo}
              chave={(g) => g.id}
              vazio={
                <EstadoVazio
                  icone={Megaphone}
                  titulo="Nenhum investimento no período"
                  descricao="Anúncios, fotos do produto, evento na feira — tudo que traz cliente novo entra aqui."
                  acao={
                    <Botao
                      onClick={() => {
                        setEditando(null);
                        setAberto(true);
                      }}
                    >
                      <Plus />
                      Novo investimento
                    </Botao>
                  }
                />
              }
              colunaAcoes={(g) => (
                <div className="flex justify-end gap-0.5">
                  <Botao
                    variante="fantasma"
                    tamanho="iconeXs"
                    aria-label={g.pago ? `Marcar ${g.descricao} como pendente` : `Marcar ${g.descricao} como pago`}
                    onClick={() => {
                      atualizar<GastoMarketing>('gastosMarketing', g.id, { pago: !g.pago });
                      toast.success(g.pago ? 'Marcado como pendente.' : 'Marcado como pago.');
                    }}
                  >
                    {g.pago ? <Trash2 /> : <Target />}
                  </Botao>
                  <Botao
                    variante="fantasma"
                    tamanho="iconeXs"
                    aria-label={`Editar ${g.descricao}`}
                    onClick={() => {
                      setEditando(g);
                      setAberto(true);
                    }}
                  >
                    <Pencil />
                  </Botao>
                  <BotaoExcluir
                    rotulo={`Excluir "${g.descricao}"?`}
                    descricao="O investimento sai do cálculo de ROI do período."
                    aoConfirmar={() => {
                      remover('gastosMarketing', g.id);
                      toast.success('Investimento excluído.');
                    }}
                  >
                    <Botao variante="fantasma" tamanho="iconeXs" aria-label={`Excluir ${g.descricao}`}>
                      <Trash2 />
                    </Botao>
                  </BotaoExcluir>
                </div>
              )}
            />
          </CardConteudo>
        </Card>

        <div className="min-w-0 space-y-3">
          <Card className="min-w-0">
            <CardCabecalho>
              <CardTitulo>Investimento × retorno</CardTitulo>
              <CardDescricao>Últimos 6 meses</CardDescricao>
            </CardCabecalho>
            <CardConteudo>
              {evolucao.every((e) => e.investimento === 0) ? (
                <EstadoVazio icone={TrendingUp} titulo="Sem histórico" descricao="Registre os investimentos para comparar com o faturamento." />
              ) : (
                <GraficoBarrasComparativo
                  dados={evolucao}
                  series={[
                    { chave: 'investimento', nome: 'Investido', cor: 'var(--terracota)' },
                    { chave: 'retorno', nome: 'Faturamento', cor: 'var(--marca)' },
                  ]}
                />
              )}
            </CardConteudo>
          </Card>

          <Card>
            <CardCabecalho>
              <CardTitulo>Por canal</CardTitulo>
              <CardDescricao>Onde o dinheiro foi</CardDescricao>
            </CardCabecalho>
            <CardConteudo>
              {porCanal.length === 0 ? (
                <EstadoVazio icone={Megaphone} titulo="Nada por canal" descricao="Cadastre um investimento para ver a divisão." />
              ) : (
                <BarrasHorizontais dados={porCanal} />
              )}
            </CardConteudo>
          </Card>
        </div>
      </div>

      <Card className="mt-3">
        <CardCabecalho>
          <CardTitulo>Retorno por investimento</CardTitulo>
          <CardDescricao>
            Faturamento dos 30 dias seguintes ÷ valor investido. Vendas com origem igual ao canal; eventos e impressos contam todas.
          </CardDescricao>
        </CardCabecalho>
        <CardConteudo>
          {retorno.length === 0 ? (
            <EstadoVazio icone={Target} titulo="Sem dados de retorno" descricao="Cadastre investimentos com clientes gerados para ver o retorno." />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {retorno.map((r) => {
                const bom = r.roI >= 3;
                const medio = r.roI >= 1;
                return (
                  <div key={r.gasto.id} className="rounded-lg border border-[var(--borda)] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-[13px] font-medium">{r.gasto.descricao}</p>
                      <Etiqueta tom={bom ? 'verde' : medio ? 'mostarda' : 'terracota'}>
                        {r.faturamento > 0 ? `${r.roI.toFixed(1).replace('.', ',')}×` : 'sem retorno'}
                      </Etiqueta>
                    </div>
                    <p className="mt-1 text-[12px] text-[var(--texto-tenue)]">
                      {ROTULO_CANAL_MARKETING[r.gasto.canal]} · {dataBR(r.gasto.data)}
                    </p>
                    <div className="mt-2 flex items-baseline justify-between text-[12.5px]">
                      <span className="text-[var(--texto-suave)]">
                        {moeda(r.gasto.valor)} → {moeda(r.faturamento)}
                      </span>
                      <span className="num text-[var(--texto-tenue)]">
                        {r.clientes} {r.clientes === 1 ? 'pedido' : 'pedidos'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardConteudo>
      </Card>

      <DialogoGasto
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        gasto={editando}
        limiteOrcamento={orcamentoMensal}
        aoSalvar={(dados) => {
          if (editando) {
            atualizar<GastoMarketing>('gastosMarketing', editando.id, dados);
            toast.success('Investimento atualizado.');
          } else {
            criar<GastoMarketing>('gastosMarketing', dados);
            toast.success('Investimento registrado.');
          }
          setAberto(false);
        }}
      />
    </>
  );
}

/* ============================== Diálogo ================================== */

const esquema = z.object({
  descricao: z.string().min(2, 'Descreva o investimento'),
  canal: z.enum([
    'INSTAGRAM_ADS',
    'FACEBOOK_ADS',
    'GOOGLE_ADS',
    'DESIGN',
    'FOTOGRAFIA',
    'IMPRESSOS',
    'EVENTO',
    'INFLUENCER',
    'WHATSAPP_API',
    'OUTROS',
  ]),
  valor: z.coerce.number().gt(0, 'Informe um valor maior que zero'),
  data: z.string().min(1),
  pago: z.boolean(),
  clientesGerados: z.coerce.number().min(0),
  resultado: z.string().optional(),
  observacoes: z.string().optional(),
});

type Dados = z.infer<typeof esquema>;

function DialogoGasto({
  aberto,
  aoFechar,
  gasto,
  limiteOrcamento,
  aoSalvar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  gasto: GastoMarketing | null;
  limiteOrcamento: number;
  aoSalvar: (dados: Omit<GastoMarketing, keyof BaseEntidade | 'fornecedorId'>) => void;
}) {
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
      descricao: '',
      canal: 'INSTAGRAM_ADS',
      valor: 0,
      data: hojeISO(),
      pago: true,
      clientesGerados: 0,
      resultado: '',
      observacoes: '',
    },
  });

  const valor = watch('valor');
  const carregado = useMemo(() => gasto?.id ?? null, [gasto]);
  const [chave, setChave] = useState<string | null>(null);
  if (aberto && chave !== carregado) {
    setChave(carregado);
    reset(
      gasto
        ? {
            descricao: gasto.descricao,
            canal: gasto.canal,
            valor: gasto.valor,
            data: gasto.data,
            pago: gasto.pago,
            clientesGerados: gasto.clientesGerados,
            resultado: gasto.resultado ?? '',
            observacoes: gasto.observacoes ?? '',
          }
        : {
            descricao: '',
            canal: 'INSTAGRAM_ADS',
            valor: 0,
            data: hojeISO(),
            pago: true,
            clientesGerados: 0,
            resultado: '',
            observacoes: '',
          },
    );
  }

  const acimaDoOrcamento = valor > limiteOrcamento && limiteOrcamento > 0;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <ConteudoDialog>
        <DialogCabecalho>
          <DialogTitulo>{gasto ? 'Editar investimento' : 'Novo investimento'}</DialogTitulo>
          <DialogDescricao>Registre o que foi gasto e o que veio de volta.</DialogDescricao>
        </DialogCabecalho>
        <form
          onSubmit={handleSubmit((d) =>
            aoSalvar({
              ...d,
              resultado: d.resultado || undefined,
              observacoes: d.observacoes || undefined,
            }),
          )}
        >
          <DialogCorpo className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Descrição" obrigatorio erro={errors.descricao?.message} className="sm:col-span-2" htmlFor="gdesc">
              <CampoTexto id="gdesc" placeholder="Ex.: Anúncio Instagram — coleção Halloween" {...register('descricao')} />
            </Campo>
            <Campo rotulo="Canal" obrigatorio htmlFor="gcanal">
              <Selecao value={watch('canal')} onValueChange={(v) => setValue('canal', v as CanalMarketing)}>
                <GatilhoSelecao id="gcanal">
                  <ValorSelecao />
                </GatilhoSelecao>
                <ConteudoSelecao>
                  {(Object.keys(ROTULO_CANAL_MARKETING) as CanalMarketing[]).map((c) => (
                    <ItemSelecao key={c} value={c}>
                      {ROTULO_CANAL_MARKETING[c]}
                    </ItemSelecao>
                  ))}
                </ConteudoSelecao>
              </Selecao>
            </Campo>
            <Campo rotulo="Data" obrigatorio htmlFor="gdata">
              <CampoTexto id="gdata" type="date" {...register('data')} />
            </Campo>
            <Campo rotulo="Valor (R$)" obrigatorio erro={errors.valor?.message} htmlFor="gvalor">
              <CampoTexto
                id="gvalor"
                type="number"
                step="0.01"
                min={0}
                value={numeroParaInput(valor)}
                onChange={(e) => setValue('valor', paraNumero(e.target.value))}
              />
            </Campo>
            {acimaDoOrcamento && (
              <p className="sm:col-span-2 rounded-md bg-[var(--atencao-suave)] px-2.5 py-2 text-[12px] text-[var(--atencao)]">
                Acima do orçamento mensal de {moeda(limiteOrcamento)}.
              </p>
            )}
            <Campo rotulo="Clientes gerados" dica="Quantos clientes novos vieram" htmlFor="gcli">
              <CampoTexto id="gcli" type="number" min={0} {...register('clientesGerados')} />
            </Campo>
            <label className="flex items-end gap-2 pb-2 text-[13px]">
              <input type="checkbox" className="size-3.5 accent-[var(--marca)]" {...register('pago')} />
              Já foi pago
            </label>
            <Campo rotulo="Resultado" dica="O que aconteceu" className="sm:col-span-2" htmlFor="gres">
              <AreaTexto id="gres" rows={2} placeholder="Ex.: 3 pedidos novos de padarias" {...register('resultado')} />
            </Campo>
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
