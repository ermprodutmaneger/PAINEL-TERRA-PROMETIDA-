import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Boxes,
  CircleDollarSign,
  HandCoins,
  Package,
  Percent,
  Receipt,
  Search,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useDados } from '@/db/store';
import { useRota } from '@/lib/rota';
import { usePeriodo } from '@/hooks/usePeriodo';
import { dentroDoPeriodo, type VendaCalculada } from '@/db/deriva';
import type { Configuracao, Lancamento } from '@/types';
import type { Periodo } from '@/lib/periodo';
import { aliquotaEfetivaPct, dasMensal, faixaAnexoI, headroomLimite, variacao } from '@/lib/calculos';
import { painelIndicadores, resumirPeriodo, type LinhaIndicador } from '@/lib/indicadores';
import {
  diasEntre,
  hojeISO,
  moeda,
  moedaCompacta,
  numero,
  percentualNum,
  rotuloMes,
} from '@/lib/format';
import {
  BarrasHorizontais,
  GraficoEntradasSaidas,
  GraficoEvolucao,
  GraficoRosca,
  type PontoFaturamento,
} from '@/components/graficos';
import { CabecalhoPagina, CartaoKpi, EstadoVazio, EsqueletoKPIs } from '@/components/comuns';
import { SeletorPeriodo } from '@/components/SeletorPeriodo';
import { Card, CardCabecalho, CardConteudo, CardTitulo } from '@/components/ui/card';
import { Progresso } from '@/components/ui/misc';
import { Botao } from '@/components/ui/button';
import { gerarAlertas } from '@/lib/alertas';
import { ROTULO_CATEGORIA_PRODUTO } from '@/types';

export default function VisaoGeral() {
  const { bd, derivado, rbt12, pedidosNoMes, carregando } = useDados();
  const { ir, consulta } = useRota();
  const [periodo, definirPeriodo] = usePeriodo();
  const [granularidade, setGranularidade] = useState<'dia' | 'mes'>('dia');

  const foco = consulta.get('foco');

  const resumo = useMemo(
    () => resumirPeriodo(derivado.vendas, periodo, bd.configuracao, rbt12, pedidosNoMes),
    [derivado.vendas, periodo, bd.configuracao, rbt12, pedidosNoMes],
  );

  /* ------------------------------ Alertas ------------------------------- */
  const alertas = useMemo(
    () =>
      gerarAlertas({
        bd,
        produtos: derivado.produtos,
        clientes: derivado.clientes,
        fornecedores: derivado.fornecedores,
        rbt12,
        silenciados: bd.alertasSilenciados,
      }),
    [bd, derivado, rbt12],
  );

  /* ------------------------------ Gráficos ------------------------------ */
  const pontos = useMemo(
    () => montarSerie(derivado.vendas, periodo, granularidade, bd.configuracao, rbt12),
    [derivado.vendas, periodo, granularidade, bd.configuracao, rbt12],
  );

  const fluxoCategorias = useMemo(() => montarFluxo(bd.lancamentos, periodo), [bd.lancamentos, periodo]);

  const composicaoCategorias = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const v of resumo.vendas) {
      for (const it of v.itens) {
        const p = derivado.produtos.find((x) => x.id === it.produtoId);
        const cat = p ? ROTULO_CATEGORIA_PRODUTO[p.categoria] : 'Outros';
        mapa.set(cat, (mapa.get(cat) ?? 0) + it.quantidade * it.precoUnitario);
      }
    }
    return [...mapa.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
  }, [resumo.vendas, derivado.produtos]);

  const topProdutos = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const v of resumo.vendas) {
      for (const it of v.itens) {
        const chave = it.produtoId || it.sku;
        mapa.set(chave, (mapa.get(chave) ?? 0) + it.quantidade * it.precoUnitario);
      }
    }
    return [...mapa.entries()]
      .map(([id, valor]) => ({
        nome: derivado.produtos.find((p) => p.id === id)?.nome ?? id,
        valor,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [resumo.vendas, derivado.produtos]);

  const topClientes = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const v of resumo.vendas) mapa.set(v.clienteId, (mapa.get(v.clienteId) ?? 0) + v.valorTotal);
    return [...mapa.entries()]
      .map(([id, valor]) => ({ nome: derivado.clientes.find((c) => c.id === id)?.nome ?? 'Cliente', valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [resumo.vendas, derivado.clientes]);

  /* ------------------------------ Financeiro ---------------------------- */
  const financeiro = useMemo(() => {
    const aReceber = bd.lancamentos.filter(
      (l) => !l.arquivado && l.tipo === 'ENTRADA' && ['PENDENTE', 'VENCIDO'].includes(l.status),
    );
    const aPagar = bd.lancamentos.filter(
      (l) => !l.arquivado && l.tipo === 'SAIDA' && ['PENDENTE', 'VENCIDO'].includes(l.status),
    );
    return {
      receber: aReceber.reduce((s, l) => s + l.valor, 0),
      receberVencido: aReceber.filter((l) => l.status === 'VENCIDO').reduce((s, l) => s + l.valor, 0),
      pagar: aPagar.reduce((s, l) => s + l.valor, 0),
      pagarVencido: aPagar.filter((l) => l.status === 'VENCIDO').reduce((s, l) => s + l.valor, 0),
    };
  }, [bd.lancamentos]);

  const capitalEstoque = derivado.produtos.reduce((s, p) => s + p.valorEmEstoque, 0);
  const skusCriticos = derivado.produtos.filter((p) => ['ZERADO', 'CRITICO'].includes(p.statusEstoque)).length;
  const clientesAtivos = derivado.clientes.filter((c) => !c.arquivado && c.status === 'CLIENTE_ATIVO').length;
  const clientesAnterior = derivado.clientes.filter(
    (c) => !c.arquivado && c.status === 'CLIENTE_ATIVO' && (!c.primeiroPedidoEm || c.primeiroPedidoEm < periodo.inicio),
  ).length;

  const meta = bd.metas.find((m) => m.mes === periodo.mes && m.ano === periodo.ano);
  const indicadores = useMemo(
    () =>
      painelIndicadores({
        resumo,
        clientes: derivado.clientes,
        produtos: derivado.produtos,
        gastos: bd.gastosMarketing,
        lancamentos: bd.lancamentos,
        meta,
        config: bd.configuracao,
        periodo,
      }),
    [resumo, derivado.clientes, derivado.produtos, bd.gastosMarketing, bd.lancamentos, meta, bd.configuracao, periodo],
  );

  const sparkline = pontos.map((p) => p.faturamento);
  const limite = bd.configuracao.tributacao.limiteME;
  const pctLimite = (rbt12 / limite) * 100;
  const faixa = faixaAnexoI(rbt12);

  if (carregando) {
    return (
      <div className="space-y-4">
        <EsqueletoKPIs quantidade={8} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <CabecalhoPagina
        titulo="Visão Geral"
        descricao={`Como a empresa está indo em ${periodo.rotulo.toLowerCase()}, comparado com ${periodo.rotuloAnterior.toLowerCase()}.`}
        acoes={
          <>
            <SeletorPeriodo periodo={periodo} aoMudar={definirPeriodo} />
            <Botao variante="contorno" onClick={() => window.dispatchEvent(new CustomEvent('tp:buscar'))}>
              <Search />
              <span className="hidden sm:inline">Busca rápida</span>
            </Botao>
          </>
        }
      />

      {/* ------------------------------ Faixa 1 ------------------------- */}
      <section aria-label="Indicadores do período">
        <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          <CartaoKpi
            rotulo="Faturamento"
            valor={moeda(resumo.faturamento)}
            variacao={variacao(resumo.faturamento, resumo.faturamentoAnterior)}
            sparkline={sparkline}
            icone={TrendingUp}
            carregando={carregando}
            onClick={() => ir('/vendas')}
          />
          <CartaoKpi
            rotulo="Lucro do período"
            valor={moeda(resumo.lucro)}
            apoio="Depois de despesa fixa rateada"
            variacao={variacao(resumo.lucro, resumo.lucroAnterior)}
            icone={CircleDollarSign}
            cor="var(--positivo)"
            onClick={() => ir('/financeiro')}
          />
          <CartaoKpi
            rotulo="Margem de contribuição"
            valor={percentualNum(resumo.margemPct * 100)}
            apoio={
              resumo.margemPct * 100 >= bd.configuracao.margemAlvo
                ? `Acima da meta de ${bd.configuracao.margemAlvo}%`
                : `Meta é ${bd.configuracao.margemAlvo}%`
            }
            cor={corMargem(resumo.margemPct * 100, bd.configuracao.margemMinimaAlerta, bd.configuracao.margemAlvo)}
            icone={Percent}
          />
          <CartaoKpi
            rotulo="Ticket médio"
            valor={moeda(resumo.ticket)}
            variacao={variacao(resumo.ticket, resumo.ticketAnterior)}
            apoio={`${numero(resumo.pedidos)} ${resumo.pedidos === 1 ? 'pedido' : 'pedidos'}`}
            icone={Receipt}
            onClick={() => ir('/vendas')}
          />
          <CartaoKpi
            rotulo="Clientes ativos"
            valor={numero(clientesAtivos)}
            apoio={`+${clientesAtivos - clientesAnterior} novos no período`}
            variacao={variacao(clientesAtivos, clientesAnterior)}
            icone={Users}
            onClick={() => ir('/clientes')}
          />
          <CartaoKpi
            rotulo="A receber em aberto"
            valor={moeda(financeiro.receber)}
            apoio={financeiro.receberVencido > 0 ? `${moeda(financeiro.receberVencido)} vencido` : 'Tudo em dia'}
            cor={financeiro.receberVencido > 0 ? 'var(--alerta)' : 'var(--marca)'}
            icone={HandCoins}
            onClick={() => ir('/financeiro?aba=receber')}
          />
          <CartaoKpi
            rotulo="A pagar do mês"
            valor={moeda(financeiro.pagar)}
            apoio={financeiro.pagarVencido > 0 ? `${moeda(financeiro.pagarVencido)} vencido` : 'Tudo em dia'}
            cor={financeiro.pagarVencido > 0 ? 'var(--alerta)' : 'var(--marca)'}
            icone={Banknote}
            onClick={() => ir('/financeiro?aba=pagar')}
          />
          <CartaoKpi
            rotulo="Capital em estoque"
            valor={moeda(capitalEstoque)}
            apoio={skusCriticos > 0 ? `${skusCriticos} SKUs em nível crítico` : 'Estoque saudável'}
            cor={skusCriticos > 0 ? 'var(--atencao)' : 'var(--marca)'}
            icone={Boxes}
            onClick={() => ir('/produtos')}
          />
        </div>
      </section>

      {/* ------------------------------ Faixa 2 ------------------------- */}
      <section className="grid min-w-0 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 imprimir-bloco">
          <CardCabecalho>
            <div>
              <CardTitulo>Faturamento × Margem × Lucro</CardTitulo>
              <p className="mt-0.5 text-[12.5px] text-[var(--texto-suave)]">
                Bars = faturamento. Linhas = margem de contribuição e lucro estimado.
              </p>
            </div>
          </CardCabecalho>
          <CardConteudo>
            {pontos.length === 0 ? (
              <EstadoVazio
                compacto
                icone={TrendingUp}
                titulo="Sem movimento no período"
                descricao="Não há pedidos emitidos dentro do período selecionado."
              />
            ) : (
              <GraficoEvolucao dados={pontos} granularidade={granularidade} onAlternar={setGranularidade} />
            )}
          </CardConteudo>
        </Card>

        <Card className="imprimir-bloco">
          <CardCabecalho>
            <CardTitulo>Vendas por categoria</CardTitulo>
          </CardCabecalho>
          <CardConteudo>
            {composicaoCategorias.length === 0 ? (
              <EstadoVazio
                compacto
                icone={Package}
                titulo="Sem vendas no período"
                descricao="Assim que houver pedidos, a composição por categoria aparece aqui."
              />
            ) : (
              <>
                <GraficoRosca
                  dados={composicaoCategorias}
                  centroRotulo="no período"
                  centroValor={moedaCompacta(resumo.faturamento)}
                />
                <ul className="mt-3 space-y-1.5">
                  {composicaoCategorias.slice(0, 5).map((c, i) => (
                    <li key={c.nome} className="flex items-center gap-2 text-[12.5px]">
                      <span
                        className="size-2.5 shrink-0 rounded-sm"
                        style={{ background: `var(--chart-${(i % 6) + 1})` }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-[var(--texto-suave)]">{c.nome}</span>
                      <span className="num shrink-0 font-medium text-[var(--texto)]">
                        {resumo.faturamento > 0 ? ((c.valor / resumo.faturamento) * 100).toFixed(1) : '0,0'}%
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardConteudo>
        </Card>
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 imprimir-bloco">
          <CardCabecalho>
            <div>
              <CardTitulo>Entradas e saídas de caixa</CardTitulo>
              <p className="mt-0.5 text-[12.5px] text-[var(--texto-suave)]">
                Tudo que já entrou e saiu do caixa, por {periodo.tipo === 'MES' ? 'dia' : 'período'}.
              </p>
            </div>
            <Botao variante="contorno" tamanho="sm" onClick={() => ir('/financeiro')}>
              Abrir financeiro
              <ArrowRight />
            </Botao>
          </CardCabecalho>
          <CardConteudo>
            {fluxoCategorias.length === 0 ? (
              <EstadoVazio
                compacto
                icone={Wallet}
                titulo="Sem movimentação financeira"
                descricao="Nenhuma entrada ou saída foi registrada neste período."
              />
            ) : (
              <GraficoEntradasSaidas dados={fluxoCategorias} />
            )}
          </CardConteudo>
        </Card>

        <Card className="imprimir-bloco">
          <CardCabecalho>
            <CardTitulo>Alertas da operação</CardTitulo>
            <SeloContagem n={alertas.length} />
          </CardCabecalho>
          <CardConteudo className="pt-0 sm:pt-0">
            {alertas.length === 0 ? (
              <EstadoVazio
                compacto
                icone={AlertTriangle}
                titulo="Nenhum alerta ativo"
                descricao="Estoque, margem, vencimentos e clientes estão dentro do esperado."
              />
            ) : (
              <ul className="max-h-[300px] space-y-1 overflow-y-auto pr-1">
                {alertas.slice(0, 8).map((a) => (
                  <li key={a.chave}>
                    <button
                      type="button"
                      onClick={() => ir(a.destino, a.foco ? { foco: a.foco } : undefined)}
                      className="flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-[var(--acento)]"
                    >
                      <span
                        className="mt-1.5 size-2 shrink-0 rounded-full"
                        style={{
                          background:
                            a.severidade === 'CRITICO'
                              ? 'var(--alerta)'
                              : a.severidade === 'ATENCAO'
                                ? 'var(--atencao)'
                                : 'var(--texto-tenue)',
                        }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium text-[var(--texto)]">{a.titulo}</span>
                        <span className="block truncate text-[11.5px] text-[var(--texto-suave)]">{a.descricao}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {alertas.length > 8 && (
              <p className="mt-2 text-center text-[12px] text-[var(--texto-tenue)]">
                + {alertas.length - 8} outros alertas
              </p>
            )}
          </CardConteudo>
        </Card>
      </section>

      {/* ------------------------------ Faixa 3 ------------------------- */}
      <section className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card className="imprimir-bloco">
          <CardCabecalho>
            <div>
              <CardTitulo>Top 5 produtos</CardTitulo>
              <p className="mt-0.5 text-[12.5px] text-[var(--texto-suave)]">Por faturamento em {periodo.rotulo.toLowerCase()}</p>
            </div>
            <Botao variante="fantasma" tamanho="sm" onClick={() => ir('/produtos')}>
              Ver produtos
            </Botao>
          </CardCabecalho>
          <CardConteudo>
            {topProdutos.length === 0 ? (
              <EstadoVazio compacto icone={Package} titulo="Sem vendas" descricao="Nenhum produto vendido no período." />
            ) : (
              <BarrasHorizontais dados={topProdutos} aoClicar={() => ir('/produtos')} />
            )}
          </CardConteudo>
        </Card>

        <Card className="imprimir-bloco">
          <CardCabecalho>
            <div>
              <CardTitulo>Top 5 clientes</CardTitulo>
              <p className="mt-0.5 text-[12.5px] text-[var(--texto-suave)]">Por faturamento em {periodo.rotulo.toLowerCase()}</p>
            </div>
            <Botao variante="fantasma" tamanho="sm" onClick={() => ir('/clientes')}>
              Ver clientes
            </Botao>
          </CardCabecalho>
          <CardConteudo>
            {topClientes.length === 0 ? (
              <EstadoVazio compacto icone={Users} titulo="Sem vendas" descricao="Nenhum cliente comprou no período." />
            ) : (
              <BarrasHorizontais dados={topClientes} aoClicar={() => ir('/clientes')} />
            )}
          </CardConteudo>
        </Card>
      </section>

      {/* ------------------------- Faixa 4: indicadores ----------------- */}
      <Card className="imprimir-bloco">
        <CardCabecalho>
          <div>
            <CardTitulo>Painel de Indicadores</CardTitulo>
            <p className="mt-0.5 text-[12.5px] text-[var(--texto-suave)]">
              Meta × realizado do mês. Faixas sem meta cadastrada usam a referência do plano de negócio.
            </p>
          </div>
          <Botao variante="contorno" tamanho="sm" onClick={() => ir('/metas')}>
            Abrir metas
            <ArrowRight />
          </Botao>
        </CardCabecalho>
        <CardConteudo>
          <GradeIndicadores linhas={indicadores} />
        </CardConteudo>
      </Card>

      {/* ------------------------- Rodapé: Simples Nacional ------------- */}
      <Card className="imprimir-bloco">
        <CardCabecalho>
          <div>
            <CardTitulo>Simples Nacional — Anexo I (Comércio)</CardTitulo>
            <p className="mt-0.5 text-[12.5px] text-[var(--texto-suave)]">
              Receita bruta acumulada dos últimos 12 meses (RBT12) e espaço até o sublimite da Microempresa.
            </p>
          </div>
          <SeloFaixa faixa={faixa.faixa} />
        </CardCabecalho>
        <CardConteudo>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr]">
            <div>
              <div className="mb-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[12px] text-[var(--texto-suave)]">RBT12 acumulado</p>
                  <p className="num text-[24px] font-semibold leading-tight text-[var(--marca)] dark:text-[var(--destaque)]">
                    {moeda(rbt12)}
                  </p>
                </div>
                <p className="num text-right text-[12.5px] text-[var(--texto-suave)]">
                  {percentualNum(pctLimite, 1)} de {moeda(limite)}
                </p>
              </div>
              <Progresso
                value={Math.min(100, pctLimite)}
                cor={pctLimite > 89 ? 'var(--alerta)' : pctLimite > 70 ? 'var(--atencao)' : 'var(--sucesso)'}
                className="h-3"
              />
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[12.5px]">
                <InfoRota rotulo="Espaço restante" valor={moeda(headroomLimite(rbt12, limite))} />
                <InfoRota rotulo="Alíquota efetiva" valor={percentualNum(aliquotaEfetivaPct(rbt12), 2)} />
                <InfoRota rotulo="DAS estimado no ano" valor={moeda(dasMensal(rbt12))} />
                <InfoRota
                  rotulo="Dias até o sublimite"
                  valor={
                    rbt12 > 0 && faturamento90(derivado.vendas) > 0
                      ? `${numero(Math.max(0, Math.floor(headroomLimite(rbt12, limite) / (faturamento90(derivado.vendas) / 90))))} dias`
                      : '—'
                  }
                />
              </div>
            </div>
            <div className="rounded-lg border border-[var(--borda)] bg-[var(--acento)] p-3.5">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">O que isso significa</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--texto-suave)]">
                {pctLimite > 89
                  ? 'Atenção: você está perto do limite de R$ 360.000 da ME. Ao estourar, a alíquota sobe e muda a faixa.'
                  : pctLimite > 70
                    ? 'Você já passou de 70% do sublimite. Fique de olho no crescimento dos próximos meses.'
                    : 'Você ainda tem bastante espaço para crescer dentro do regime de Microempresa.'}
              </p>
              <Botao variante="contorno" tamanho="sm" className="mt-3 w-full" onClick={() => ir('/financeiro?aba=simulador')}>
                Abrir simulador
              </Botao>
            </div>
          </div>
        </CardConteudo>
      </Card>

      {foco && (
        <p className="text-center text-[12px] text-[var(--texto-tenue)]">
          Registro em foco: {foco.slice(0, 8)}…
        </p>
      )}
    </div>
  );
}

/* ========================== Auxiliares da tela =========================== */

function corMargem(valor: number, minimo: number, alvo: number): string {
  if (valor >= alvo) return 'var(--sucesso)';
  if (valor >= minimo) return 'var(--atencao)';
  return 'var(--alerta)';
}

function InfoRota({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="text-[11.5px] text-[var(--texto-tenue)]">{rotulo}</p>
      <p className="num font-semibold text-[var(--texto)]">{valor}</p>
    </div>
  );
}

function SeloContagem({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <span className="num rounded-md bg-[var(--alerta-suave)] px-2 py-1 text-[12px] font-semibold text-[var(--alerta)]">
      {n}
    </span>
  );
}

function SeloFaixa({ faixa }: { faixa: string }) {
  return (
    <span className="rounded-md border border-[var(--borda)] bg-[var(--acento)] px-2 py-1 text-[12px] font-medium text-[var(--texto-suave)]">
      {faixa} faixa
    </span>
  );
}

function GradeIndicadores({ linhas }: { linhas: LinhaIndicador[] }) {
  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {linhas.map((l) => (
        <IndicadorCard key={l.chave} linha={l} />
      ))}
    </div>
  );
}

function IndicadorCard({ linha }: { linha: LinhaIndicador }) {
  const cor = linha.status === 'BOM' ? 'var(--sucesso)' : linha.status === 'ATENCAO' ? 'var(--atencao)' : linha.status === 'ABAIXO' ? 'var(--alerta)' : 'var(--texto-tenue)';
  const valor = formatarValor(linha.realizado, linha.tipoValor);
  const meta = linha.meta === null ? 'sem meta' : formatarValor(linha.meta, linha.tipoValor);

  return (
    <div className="rounded-lg border border-[var(--borda)] p-3 transition-colors hover:border-[var(--borda-forte)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium uppercase tracking-wide text-[var(--texto-tenue)]" title={linha.ajuda}>
          {linha.rotulo}
        </p>
        {linha.atingimento !== null && (
          <span className="num text-[11.5px] font-semibold" style={{ color: cor }}>
            {linha.atingimento.toFixed(0)}%
          </span>
        )}
      </div>
      <p className="num mt-1 text-[20px] font-semibold leading-none text-[var(--texto)]">{valor}</p>
      <p className="num mt-1.5 text-[11.5px] text-[var(--texto-suave)]">
        Meta: {meta}
        {!linha.metaCadastrada && linha.meta !== null && (
          <span className="ml-1 text-[var(--texto-tenue)]">(referência)</span>
        )}
      </p>
      <div className="mt-2">
        <Progresso value={linha.atingimento ?? 0} cor={cor} className="h-1.5" />
      </div>
    </div>
  );
}

function formatarValor(v: number, tipo: LinhaIndicador['tipoValor']): string {
  switch (tipo) {
    case 'moeda':
      return moeda(v);
    case 'percentual':
      return percentualNum(v, 1);
    case 'dias':
      return `${numero(v)} dias`;
    default:
      return numero(v, v % 1 === 0 ? 0 : 2);
  }
}

/* ---------------------- Montagem das séries do gráfico ------------------- */

function montarSerie(
  vendas: VendaCalculada[],
  periodo: Periodo,
  granularidade: 'dia' | 'mes',
  config: Configuracao,
  rbt12: number,
): PontoFaturamento[] {
  const usarDia = granularidade === 'dia' && diasEntre(periodo.inicio, periodo.fim) <= 92;
  const chaves = usarDia ? diasDoIntervalo(periodo.inicio, periodo.fim) : mesesDoIntervalo(periodo.inicio, periodo.fim);

  // Série contínua: dias sem venda entram com zero, para o gráfico não "pular" vendas.
  const mapa = new Map<string, number>();
  for (const v of vendas) {
    if (!dentroDoPeriodo(v.dataEmissao, periodo.inicio, periodo.fim)) continue;
    const chave = usarDia ? v.dataEmissao.slice(0, 10) : v.dataEmissao.slice(0, 7);
    mapa.set(chave, (mapa.get(chave) ?? 0) + v.valorTotal);
  }

  const pedidos = new Map<string, number>();
  for (const v of vendas) {
    if (!dentroDoPeriodo(v.dataEmissao, periodo.inicio, periodo.fim)) continue;
    const chave = usarDia ? v.dataEmissao.slice(0, 10) : v.dataEmissao.slice(0, 7);
    pedidos.set(chave, (pedidos.get(chave) ?? 0) + 1);
  }

  const i = aliquotaEfetivaPct(rbt12) / 100;
  return chaves.map((chave) => {
    const faturamento = mapa.get(chave) ?? 0;
    const custo = vendas
      .filter((v) => (usarDia ? v.dataEmissao.slice(0, 10) : v.dataEmissao.slice(0, 7)) === chave)
      .reduce((s, v) => s + v.custoTotal, 0);
    const margem = faturamento * (1 - i) - custo;
    const mcPct = faturamento > 0 ? (margem / faturamento) * 100 : 0;
    const lucro = margem - (config.tributacao.custoFixoMensal / Math.max(pedidos.get(chave) ?? 1, 1)) * (pedidos.get(chave) ?? 0);
    return {
      rotulo: usarDia ? rotuloDia(chave) : rotuloMes(Number(chave.slice(5, 7)), Number(chave.slice(0, 4)), true),
      faturamento,
      margem: Number(mcPct.toFixed(1)),
      lucro,
    };
  });
}

function diasDoIntervalo(inicio: string, fim: string): string[] {
  const lista: string[] = [];
  for (let d = inicio; d <= fim; d = addDias(d, 1)) lista.push(d);
  return lista;
}

function mesesDoIntervalo(inicio: string, fim: string): string[] {
  const lista: string[] = [];
  let a = Number(inicio.slice(0, 4));
  let m = Number(inicio.slice(5, 7));
  const fimA = Number(fim.slice(0, 4));
  const fimM = Number(fim.slice(5, 7));
  while (a < fimA || (a === fimA && m <= fimM)) {
    lista.push(`${a}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      a++;
    }
  }
  return lista;
}

function rotuloDia(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function montarFluxo(lancamentos: Lancamento[], periodo: Periodo) {
  const dias = diasEntre(periodo.inicio, periodo.fim) + 1;
  const passo = dias <= 31 ? 1 : dias <= 120 ? 7 : 30;
  const buckets = new Map<string, { rotulo: string; entrada: number; saida: number }>();

  for (let i = 0; i < dias; i += passo) {
    const d = addDias(periodo.inicio, i);
    const chave = d.slice(0, passo === 1 ? 10 : 7);
    buckets.set(chave, {
      rotulo: passo === 1 ? rotuloDia(d) : rotuloMes(Number(d.slice(5, 7)), Number(d.slice(0, 4))),
      entrada: 0,
      saida: 0,
    });
  }

  for (const l of lancamentos) {
    if (l.arquivado || l.status === 'CANCELADO') continue;
    if (!dentroDoPeriodo(l.data, periodo.inicio, periodo.fim)) continue;
    if (!['PAGO', 'RECEBIDO'].includes(l.status)) continue;
    const chave = l.data.slice(0, passo === 1 ? 10 : 7);
    const b = buckets.get(chave);
    if (!b) continue;
    if (l.tipo === 'ENTRADA') b.entrada += l.valor;
    else b.saida += l.valor;
  }

  return [...buckets.values()].filter((b) => b.entrada > 0 || b.saida > 0);
}

function addDias(iso: string, n: number): string {
  const [a, m, d] = iso.split('-').map(Number);
  const data = new Date(a, m - 1, d + n);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function faturamento90(vendas: VendaCalculada[]): number {
  const limite = addDias(hojeISO(), -90);
  return vendas.filter((v) => dentroDoPeriodo(v.dataEmissao, limite, hojeISO())).reduce((s, v) => s + v.valorTotal, 0);
}

