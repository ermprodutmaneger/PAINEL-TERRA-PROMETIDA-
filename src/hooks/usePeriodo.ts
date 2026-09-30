import { useCallback, useMemo } from 'react';
import { useRota } from '@/lib/rota';
import { resolverPeriodo, type Periodo, type TipoPeriodo } from '@/lib/periodo';

/** Período compartilhado pela URL — Visão Geral, Financeiro e Metas usam o mesmo. */
export function usePeriodo(): [Periodo, (p: Periodo) => void] {
  const { consulta, trocarConsulta } = useRota();

  const periodo = useMemo<Periodo>(() => {
    const tipo = (consulta.get('p') as TipoPeriodo | null) ?? 'MES';
    const ano = Number(consulta.get('a')) || new Date().getFullYear();
    const mes = Number(consulta.get('m')) || new Date().getMonth() + 1;
    const ref = new Date(ano, mes - 1, 1);

    if (tipo === 'PERSONALIZADO') {
      const de = consulta.get('de');
      const ate = consulta.get('ate');
      if (de && ate) return resolverPeriodo('PERSONALIZADO', ref, { inicio: de, fim: ate });
    }
    return resolverPeriodo(tipo, ref);
  }, [consulta]);

  const definir = useCallback(
    (p: Periodo) => {
      trocarConsulta({
        p: p.tipo,
        a: String(p.ano),
        m: String(p.mes),
        de: p.tipo === 'PERSONALIZADO' ? p.inicio : undefined,
        ate: p.tipo === 'PERSONALIZADO' ? p.fim : undefined,
      });
    },
    [trocarConsulta],
  );

  return [periodo, definir];
}
