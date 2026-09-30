import { type ComponentType, type ReactNode, useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import { Card } from './ui/card';
import { Botao } from './ui/button';
import { Esqueleto } from './ui/badge';
import { Selo, type SeloProps } from './ui/badge';
import { cn, numero, percentualNum } from '@/lib/format';
import { COR_SOLIDA, TOM_SELO, type Tom } from '@/lib/cores';

/* ------------------------- Cabeçalho padrão de página -------------------- */

export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
  icone: Icone,
}: {
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
  icone?: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-[19px] font-semibold leading-tight tracking-tight text-[var(--texto)] sm:text-[22px]">
          {Icone && <Icone className="size-5 shrink-0 text-[var(--marca)] dark:text-[var(--destaque)]" aria-hidden />}
          {titulo}
        </h1>
        {descricao && <p className="mt-1 text-[13px] leading-snug text-[var(--texto-suave)]">{descricao}</p>}
      </div>
      {acoes && <div className="flex shrink-0 flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  );
}

/* ------------------------------ Estado vazio ----------------------------- */

export function EstadoVazio({
  icone: Icone,
  titulo,
  descricao,
  acao,
  compacto,
}: {
  icone: ComponentType<{ className?: string }>;
  titulo: string;
  descricao: string;
  acao?: ReactNode;
  compacto?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compacto ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-14',
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--acento)] text-[var(--texto-tenue)]">
        <Icone className="size-5" aria-hidden />
      </div>
      <div className="max-w-sm">
        <p className="text-[14px] font-semibold text-[var(--texto)]">{titulo}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--texto-suave)]">{descricao}</p>
      </div>
      {acao && <div className="mt-1">{acao}</div>}
    </div>
  );
}

/* --------------------------------- Selos -------------------------------- */

export function Etiqueta({ tom, children, className, ...props }: { tom: Tom; children: ReactNode } & Omit<SeloProps, 'tom' | 'children'>) {
  return (
    <Selo tom={TOM_SELO[tom]} className={className} {...props}>
      <span className="size-1.5 rounded-full" style={{ background: COR_SOLIDA[tom] }} aria-hidden />
      {children}
    </Selo>
  );
}

/* ----------------------------- Cartão de KPI ---------------------------- */

export interface CartaoKpiProps {
  rotulo: string;
  valor: string;
  apoio?: string;
  variacao?: number | null;
  invertido?: boolean;
  icone?: LucideIcon;
  cor?: string;
  destaque?: boolean;
  carregando?: boolean;
  sparkline?: number[];
  onClick?: () => void;
}

export function CartaoKpi({
  rotulo,
  valor,
  apoio,
  variacao,
  invertido = false,
  icone: Icone,
  cor = 'var(--marca)',
  destaque = false,
  carregando,
  sparkline,
  onClick,
}: CartaoKpiProps) {
  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium uppercase tracking-wide text-[var(--texto-tenue)]">{rotulo}</p>
        {Icone && (
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in srgb, ${cor} 14%, transparent)`, color: cor }}
            aria-hidden
          >
            <Icone className="size-3.5" />
          </span>
        )}
      </div>
      {carregando ? (
        <Esqueleto className="mt-2 h-8 w-28" />
      ) : (
        <p
          className={cn(
            'num mt-1.5 text-[24px] font-semibold leading-none tracking-tight sm:text-[26px]',
            destaque ? 'text-[var(--destaque)]' : 'text-[var(--texto)]',
          )}
        >
          {valor}
        </p>
      )}
      <div className="mt-2 flex min-h-[18px] items-center gap-2">
        {variacao !== undefined && variacao !== null && (
          <IndicadorVariacao variacao={variacao} invertido={invertido} />
        )}
        {sparkline && sparkline.length > 1 && <MiniGrafico dados={sparkline} cor={cor} />}
        {apoio && !sparkline && <span className="truncate text-[12px] text-[var(--texto-suave)]">{apoio}</span>}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="text-left transition-transform duration-150 active:scale-[.99]">
        <Card className="h-full p-3.5 transition-shadow duration-150 hover:shadow-[var(--shadow-pop)] sm:p-4">
          {conteudo}
        </Card>
      </button>
    );
  }

  return <Card className="h-full p-3.5 sm:p-4 imprimir-bloco">{conteudo}</Card>;
}

export function IndicadorVariacao({ variacao, invertido }: { variacao: number; invertido?: boolean }) {
  const subiu = variacao > 0.5;
  const desceu = variacao < -0.5;
  const bom = invertido ? desceu : subiu;
  const ruim = invertido ? subiu : desceu;
  const cor = bom ? 'var(--sucesso)' : ruim ? 'var(--alerta)' : 'var(--texto-tenue)';
  const Icone = desceu ? ArrowDownRight : subiu ? ArrowUpRight : Minus;
  return (
    <span
      className="num inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold"
      style={{ color: cor, background: `color-mix(in srgb, ${cor} 12%, transparent)` }}
      title="Variação em relação ao período anterior"
    >
      <Icone className="size-3" aria-hidden />
      {percentualNum(Math.abs(variacao), Math.abs(variacao) >= 100 ? 0 : 1)}
    </span>
  );
}

/* --------------------------- Mini gráfico de linha ----------------------- */

export function MiniGrafico({ dados, cor = 'var(--marca)', altura = 20 }: { dados: number[]; cor?: string; altura?: number }) {
  if (dados.length < 2) return null;
  const max = Math.max(...dados, 1);
  const min = Math.min(...dados, 0);
  const faixa = max - min || 1;
  const largura = 72;
  const pontos = dados
    .map((v, i) => {
      const x = (i / (dados.length - 1)) * largura;
      const y = altura - ((v - min) / faixa) * (altura - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} className="overflow-visible" aria-hidden>
      <polyline points={pontos} fill="none" stroke={cor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

/* ------------------------- Barra visual de estoque ---------------------- */

export function BarraEstoque({
  atual,
  minimo,
  maximo,
  ponto,
  status,
  estoqueAtual,
  estoqueMinimo,
  estoqueMaximo,
  pontoDePedido,
  statusEstoque,
}: {
  atual?: number;
  minimo?: number;
  maximo?: number;
  ponto?: number;
  status?: string;
  estoqueAtual?: number;
  estoqueMinimo?: number;
  estoqueMaximo?: number;
  pontoDePedido?: number;
  statusEstoque?: string;
}) {
  const a = estoqueAtual ?? atual ?? 0;
  const m = estoqueMinimo ?? minimo ?? 0;
  const mx = estoqueMaximo ?? maximo ?? 0;
  const pd = pontoDePedido ?? ponto ?? 0;
  const st = statusEstoque ?? status ?? 'SAUDAVEL';
  const teto = Math.max(mx, a, 1);
  const cor =
    st === 'ZERADO' || st === 'CRITICO'
      ? 'var(--alerta)'
      : st === 'BAIXO'
        ? 'var(--atencao)'
        : st === 'EXCESSO'
          ? 'var(--destaque-fundo)'
          : 'var(--sucesso)';
  return (
    <div
      className="relative h-1.5 w-full min-w-[54px] overflow-hidden rounded-full bg-[var(--acento)]"
      title={`Mínimo ${m} · Ponto de pedido ${pd} · Máximo ${mx}`}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, (a / teto) * 100)}%`, background: cor }}
      />
      <div
        className="absolute inset-y-0 w-px bg-[var(--texto-tenue)]/70"
        style={{ left: `${Math.min(100, (pd / teto) * 100)}%` }}
        title="Ponto de pedido"
      />
    </div>
  );
}

/* --------------------------- Linha de indicador -------------------------- */

export function LinhaIndicador({ rotulo, valor, forte }: { rotulo: string; valor: ReactNode; forte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-[var(--borda)] py-1.5 last:border-0">
      <span className="text-[12.5px] text-[var(--texto-suave)]">{rotulo}</span>
      <span className={cn('num text-[13px] font-medium text-[var(--texto)]', forte && 'text-[14px] font-semibold')}>{valor}</span>
    </div>
  );
}

/* ----------------------------- Copiar texto ----------------------------- */

export function BotaoCopiar({ texto, rotulo = 'Copiar' }: { texto: string; rotulo?: string }) {
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 1800);
    return () => clearTimeout(t);
  }, [copiado]);

  return (
    <Botao
      type="button"
      variante="contorno"
      tamanho="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
        } catch {
          const area = document.createElement('textarea');
          area.value = texto;
          document.body.appendChild(area);
          area.select();
          document.execCommand('copy');
          area.remove();
          setCopiado(true);
        }
      }}
    >
      {copiado ? 'Copiado!' : rotulo}
    </Botao>
  );
}

/* --------------------------- Esqueleto de página ------------------------ */

export function EsqueletoKPIs({ quantidade = 4 }: { quantidade?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: quantidade }).map((_, i) => (
        <Card key={i} className="p-3.5 sm:p-4">
          <Esqueleto className="h-3 w-20" />
          <Esqueleto className="mt-3 h-7 w-24" />
          <Esqueleto className="mt-3 h-3 w-16" />
        </Card>
      ))}
    </div>
  );
}

export function formatarContagem(n: number): string {
  return numero(n);
}
