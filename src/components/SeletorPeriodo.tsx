import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { Botao } from './ui/button';
import { CampoTexto, Label } from './ui/input';
import {
  ConteudoPopover,
  GatilhoPopover,
  Popover,
  Aba,
  ListaAbas,
  PainelAba,
} from './ui/misc';
import { ROTULO_TIPO, resolverPeriodo, type Periodo, type TipoPeriodo } from '@/lib/periodo';
import { MESES, rotuloMes } from '@/lib/format';
import { cn } from '@/lib/format';

export function SeletorPeriodo({
  periodo,
  aoMudar,
  className,
}: {
  periodo: Periodo;
  aoMudar: (p: Periodo) => void;
  className?: string;
}) {
  const navegar = (delta: number) => {
    if (periodo.tipo === 'ANO') {
      aoMudar(resolverPeriodo('ANO', new Date(periodo.ano + delta, periodo.mes - 1, 1)));
      return;
    }
    if (periodo.tipo === 'TRIMESTRE') {
      const d = new Date(periodo.ano, periodo.mes - 1 + delta * 3, 1);
      aoMudar(resolverPeriodo('TRIMESTRE', d));
      return;
    }
    const d = new Date(periodo.ano, periodo.mes - 1 + delta, 1);
    aoMudar(resolverPeriodo(periodo.tipo === 'PERSONALIZADO' ? 'MES' : periodo.tipo, d));
  };

  const mudarTipo = (tipo: TipoPeriodo) => {
    const ref = new Date(periodo.ano, periodo.mes - 1, 1);
    if (tipo === 'PERSONALIZADO') {
      aoMudar({
        ...periodo,
        tipo,
        rotulo: 'Personalizado',
        inicio: periodo.inicio,
        fim: periodo.fim,
      });
      return;
    }
    aoMudar(resolverPeriodo(tipo, ref));
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <div className="flex items-center rounded-lg border border-[var(--borda)] bg-[var(--superficie)]">
        <Botao
          variante="fantasma"
          tamanho="iconeSm"
          aria-label="Período anterior"
          onClick={() => navegar(-1)}
          className="rounded-r-none"
        >
          <ChevronLeft />
        </Botao>
        <Popover>
          <GatilhoPopover asChild>
            <button
              type="button"
              className="flex h-8 items-center gap-2 border-x border-[var(--borda)] px-3 text-[12.5px] font-medium text-[var(--texto)] transition-colors hover:bg-[var(--acento)]"
            >
              <CalendarRange className="size-3.5 text-[var(--texto-tenue)]" aria-hidden />
              {periodo.rotulo}
              <span className="hidden text-[11px] font-normal text-[var(--texto-tenue)] sm:inline">
                {ROTULO_TIPO[periodo.tipo]}
              </span>
            </button>
          </GatilhoPopover>
          <ConteudoPopover className="w-72">
            <ListaAbas value={periodo.tipo === 'PERSONALIZADO' ? 'PERSONALIZADO' : periodo.tipo} onValueChange={(v) => mudarTipo(v as TipoPeriodo)}>
              {(Object.keys(ROTULO_TIPO) as TipoPeriodo[]).map((t) => (
                <Aba key={t} value={t} className="px-2 text-[12px]">
                  {ROTULO_TIPO[t]}
                </Aba>
              ))}
            </ListaAbas>

            <PainelAba value="MES" className="mt-3">
              <GradeMeses
                ano={periodo.ano}
                selecionado={periodo.mes}
                aoEscolher={(m) => aoMudar(resolverPeriodo('MES', new Date(periodo.ano, m - 1, 1)))}
              />
            </PainelAba>
            <PainelAba value="TRIMESTRE" className="mt-3">
              <GradeMeses
                ano={periodo.ano}
                selecionado={periodo.mes}
                destaqueTrimestre
                aoEscolher={(m) => aoMudar(resolverPeriodo('TRIMESTRE', new Date(periodo.ano, m - 1, 1)))}
              />
            </PainelAba>
            <PainelAba value="ANO" className="mt-3">
              <div className="grid grid-cols-2 gap-2">
                {[-2, -1, 0, 1].map((d) => {
                  const a = periodo.ano + d;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => aoMudar(resolverPeriodo('ANO', new Date(a, 0, 1)))}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors',
                        a === periodo.ano
                          ? 'border-[var(--marca)] bg-[var(--marca)] text-white'
                          : 'border-[var(--borda)] hover:bg-[var(--acento)]',
                      )}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </PainelAba>
            <PainelAba value="PERSONALIZADO" className="mt-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="periodo-inicio" className="text-[11px]">De</Label>
                  <CampoTexto
                    id="periodo-inicio"
                    type="date"
                    value={periodo.inicio}
                    onChange={(e) =>
                      aoMudar({ ...periodo, tipo: 'PERSONALIZADO', rotulo: 'Personalizado', inicio: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="periodo-fim" className="text-[11px]">Até</Label>
                  <CampoTexto
                    id="periodo-fim"
                    type="date"
                    value={periodo.fim}
                    onChange={(e) =>
                      aoMudar({ ...periodo, tipo: 'PERSONALIZADO', rotulo: 'Personalizado', fim: e.target.value })
                    }
                  />
                </div>
              </div>
            </PainelAba>
          </ConteudoPopover>
        </Popover>
        <Botao
          variante="fantasma"
          tamanho="iconeSm"
          aria-label="Próximo período"
          onClick={() => navegar(1)}
          className="rounded-l-none"
        >
          <ChevronRight />
        </Botao>
      </div>
    </div>
  );
}

function GradeMeses({
  ano,
  selecionado,
  aoEscolher,
  destaqueTrimestre,
}: {
  ano: number;
  selecionado: number;
  aoEscolher: (mes: number) => void;
  destaqueTrimestre?: boolean;
}) {
  return (
    <>
      <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">{ano}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {MESES.map((m, i) => {
          const n = i + 1;
          const mesmoTrimestre = Math.floor((n - 1) / 3) === Math.floor((selecionado - 1) / 3);
          const ativo = n === selecionado;
          return (
            <button
              key={m}
              type="button"
              onClick={() => aoEscolher(n)}
              className={cn(
                'rounded-lg border px-2 py-1.5 text-[12px] font-medium transition-colors',
                ativo
                  ? 'border-[var(--marca)] bg-[var(--marca)] text-white'
                  : destaqueTrimestre && mesmoTrimestre
                    ? 'border-[color-mix(in_srgb,var(--marca)_35%,transparent)] bg-[var(--marca-suave)] text-[var(--marca)]'
                    : 'border-[var(--borda)] text-[var(--texto-suave)] hover:bg-[var(--acento)]',
              )}
            >
              {m.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** Rótulo curto do período, para PRINT e títulos. */
export function rotuloPeriodo(p: Periodo): string {
  if (p.tipo === 'MES') return rotuloMes(p.mes, p.ano);
  return p.rotulo;
}
