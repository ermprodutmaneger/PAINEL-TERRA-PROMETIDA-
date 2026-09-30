import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTema } from '@/lib/tema';
import { moedaCompacta, percentualNum } from '@/lib/format';
import { PALETA_GRAFICO } from '@/lib/cores';

export function usarCoresGrafico() {
  const { escuro } = useTema();
  return useMemo(
    () =>
      escuro
        ? { grade: '#333A31', eixo: '#8A9186', texto: '#EFEBE1', serie: ['#6E9B78', '#F5C65B', '#DD7A62'], paleta: PALETA_GRAFICO }
        : { grade: '#E4DCCB', eixo: '#8A857C', texto: '#22201C', serie: ['#2F5D3A', '#E3A21C', '#B5553A'], paleta: PALETA_GRAFICO },
    [escuro],
  );
}

interface DicaProps {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string; dataKey?: string | number; payload?: Record<string, unknown> }>;
  label?: string | number;
  formatador?: (v: number, chave: string) => string;
}

function DicaGrafico({ active, payload, label, formatador }: DicaProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[12px] shadow-[var(--shadow-pop)]">
      <p className="mb-1 font-semibold text-[var(--texto)]">{label}</p>
      <div className="space-y-0.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-full" style={{ background: p.color }} aria-hidden />
            <span className="text-[var(--texto-suave)]">{p.name}</span>
            <span className="num ml-auto font-semibold text-[var(--texto)]">
              {formatador && typeof p.value === 'number'
                ? formatador(p.value, String(p.dataKey ?? ''))
                : typeof p.value === 'number'
                  ? p.value.toLocaleString('pt-BR')
                  : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const eixoBase = { fontSize: 11, tickLine: false, axisLine: false } as const;

/* ===================== Faturamento × Margem × Lucro ====================== */

export interface PontoFaturamento {
  rotulo: string;
  faturamento: number;
  margem: number;
  lucro: number;
}

export function GraficoEvolucao({
  dados,
  granularidade,
  onAlternar,
}: {
  dados: PontoFaturamento[];
  granularidade: 'dia' | 'mes';
  onAlternar: (g: 'dia' | 'mes') => void;
}) {
  const c = usarCoresGrafico();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-1">
        <Alternador
          opcoes={[
            { valor: 'dia', rotulo: 'Por dia' },
            { valor: 'mes', rotulo: 'Por mês' },
          ]}
          valor={granularidade}
          onChange={(v) => onAlternar(v as 'dia' | 'mes')}
        />
      </div>
      <div className="h-[220px] w-full sm:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dados} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
            <defs>
              <linearGradient id="gradFaturamento" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.serie[0]} stopOpacity={0.28} />
                <stop offset="100%" stopColor={c.serie[0]} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={c.grade} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="rotulo" stroke={c.eixo} {...eixoBase} interval="preserveStartEnd" />
            <YAxis yAxisId="esq" stroke={c.eixo} {...eixoBase} tickFormatter={(v: number) => moedaCompacta(v)} width={62} />
            <YAxis yAxisId="dir" orientation="right" stroke={c.eixo} {...eixoBase} tickFormatter={(v: number) => `${v}%`} width={42} />
            <Tooltip
              cursor={{ stroke: c.eixo, strokeDasharray: '3 3' }}
              content={<DicaGrafico formatador={(v, k) => (k === 'margem' ? percentualNum(v) : moedaCompacta(v))} />}
            />
            <Area yAxisId="esq" type="monotone" dataKey="faturamento" name="Faturamento" stroke={c.serie[0]} strokeWidth={2} fill="url(#gradFaturamento)" />
            <Line yAxisId="dir" type="monotone" dataKey="margem" name="Margem" stroke={c.serie[1]} strokeWidth={2} dot={false} />
            <Line yAxisId="esq" type="monotone" dataKey="lucro" name="Lucro" stroke={c.serie[2]} strokeWidth={2} dot={false} strokeDasharray="4 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-[12px] text-[var(--texto-suave)]">
        <Legenda cor={c.serie[0]} rotulo="Faturamento" />
        <Legenda cor={c.serie[1]} rotulo="Margem de contribuição" />
        <Legenda cor={c.serie[2]} rotulo="Lucro estimado" />
      </div>
    </div>
  );
}

function Legenda({ cor, rotulo }: { cor: string; rotulo: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-sm" style={{ background: cor }} aria-hidden />
      {rotulo}
    </span>
  );
}

export function Alternador<T extends string>({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: Array<{ valor: T; rotulo: string }>;
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--borda)] bg-[var(--acento)] p-0.5" role="tablist">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="tab"
          aria-selected={valor === o.valor}
          onClick={() => onChange(o.valor)}
          className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 ${
            valor === o.valor
              ? 'bg-[var(--superficie)] text-[var(--texto)] shadow-sm'
              : 'text-[var(--texto-suave)] hover:text-[var(--texto)]'
          }`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

/* ===================== Entradas × Saídas por categoria =================== */

export interface BarraCategoria {
  rotulo: string;
  entrada: number;
  saida: number;
}

export function GraficoEntradasSaidas({ dados }: { dados: BarraCategoria[] }) {
  const c = usarCoresGrafico();
  return (
    <div className="h-[220px] w-full sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
          <CartesianGrid stroke={c.grade} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="rotulo" stroke={c.eixo} {...eixoBase} interval={0} />
          <YAxis stroke={c.eixo} {...eixoBase} tickFormatter={(v: number) => moedaCompacta(v)} width={62} />
          <Tooltip cursor={{ fill: c.grade, opacity: 0.35 }} content={<DicaGrafico />} />
          <Bar dataKey="entrada" name="Entradas" stackId="a" fill={c.serie[0]} radius={[0, 0, 0, 0]} maxBarSize={54} />
          <Bar dataKey="saida" name="Saídas" stackId="a" fill={c.serie[2]} radius={[4, 4, 0, 0]} maxBarSize={54} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ============================ Rosca por categoria ======================== */

export interface Fatia {
  nome: string;
  valor: number;
}

export function GraficoRosca({ dados, centroRotulo, centroValor }: { dados: Fatia[]; centroRotulo: string; centroValor: string }) {
  const c = usarCoresGrafico();
  const total = dados.reduce((s, d) => s + d.valor, 0);
  return (
    <div className="relative h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius="58%" outerRadius="86%" paddingAngle={2} strokeWidth={0}>
            {dados.map((d, i) => (
              <Cell key={d.nome} fill={c.paleta[i % c.paleta.length]} />
            ))}
          </Pie>
          <Tooltip content={<DicaGrafico formatador={(v) => `${moedaCompacta(v)} · ${total > 0 ? ((v / total) * 100).toFixed(1) : 0}%`} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-[19px] font-semibold text-[var(--texto)]">{centroValor}</span>
        <span className="text-[11.5px] text-[var(--texto-suave)]">{centroRotulo}</span>
      </div>
    </div>
  );
}

/* ============================ Barras horizontais ========================= */

export function BarrasHorizontais({ dados, aoClicar }: { dados: Fatia[]; aoClicar?: (nome: string) => void }) {
  const c = usarCoresGrafico();
  const max = Math.max(...dados.map((d) => d.valor), 1);
  return (
    <ul className="space-y-2.5">
      {dados.map((d, i) => (
        <li key={d.nome}>
          <button
            type="button"
            disabled={!aoClicar}
            onClick={() => aoClicar?.(d.nome)}
            className="group block w-full text-left disabled:cursor-default"
          >
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="truncate text-[12.5px] text-[var(--texto)]">{d.nome}</span>
              <span className="num shrink-0 text-[12.5px] font-semibold text-[var(--texto)]">{moedaCompacta(d.valor)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--acento)]">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${(d.valor / max) * 100}%`, background: c.paleta[i % c.paleta.length] }}
              />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ============================ Fluxo de caixa ============================= */

export interface PontoFluxo {
  rotulo: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

export function GraficoFluxoCaixa({ dados }: { dados: PontoFluxo[] }) {
  const c = usarCoresGrafico();
  return (
    <div className="h-[240px] w-full sm:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
          <CartesianGrid stroke={c.grade} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="rotulo" stroke={c.eixo} {...eixoBase} interval="preserveStartEnd" />
          <YAxis yAxisId="b" stroke={c.eixo} {...eixoBase} tickFormatter={(v: number) => moedaCompacta(v)} width={62} />
          <YAxis yAxisId="l" orientation="right" stroke={c.eixo} {...eixoBase} tickFormatter={(v: number) => moedaCompacta(v)} width={62} />
          <Tooltip cursor={{ fill: c.grade, opacity: 0.35 }} content={<DicaGrafico />} />
          <Bar yAxisId="b" dataKey="entradas" name="Entradas" fill={c.serie[0]} radius={[3, 3, 0, 0]} maxBarSize={40} />
          <Bar yAxisId="b" dataKey="saidas" name="Saídas" fill={c.serie[2]} radius={[3, 3, 0, 0]} maxBarSize={40} />
          <Line yAxisId="l" type="monotone" dataKey="saldo" name="Saldo acumulado" stroke={c.serie[1]} strokeWidth={2.5} dot={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ============================ Barras agrupadas ========================== */

export function GraficoBarrasComparativo({
  dados,
  series,
  formato = 'moeda',
}: {
  dados: Array<Record<string, string | number>>;
  series: Array<{ chave: string; nome: string; cor: string }>;
  formato?: 'moeda' | 'numero' | 'percentual';
}) {
  const c = usarCoresGrafico();
  const fmt = (v: number) =>
    formato === 'moeda' ? moedaCompacta(v) : formato === 'percentual' ? percentualNum(v) : v.toLocaleString('pt-BR');
  return (
    <div className="h-[240px] w-full sm:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
          <CartesianGrid stroke={c.grade} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="rotulo" stroke={c.eixo} {...eixoBase} interval="preserveStartEnd" />
          <YAxis stroke={c.eixo} {...eixoBase} tickFormatter={(v: number) => fmt(v)} width={62} />
          <Tooltip cursor={{ fill: c.grade, opacity: 0.35 }} content={<DicaGrafico formatador={(v) => fmt(v)} />} />
          {series.map((s) => (
            <Bar key={s.chave} dataKey={s.chave} name={s.nome} fill={s.cor} radius={[3, 3, 0, 0]} maxBarSize={28} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
