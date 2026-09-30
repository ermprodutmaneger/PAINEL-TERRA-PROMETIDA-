import { useMemo, useState, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/format';
import { EstadoVazio } from './comuns';
import { Esqueleto, EsqueletoTabela } from './ui/badge';
import { Botao } from './ui/button';

export interface TabelaDadosProps<T> {
  colunas: Array<ColumnDef<T, any>>;
  dados: T[];
  chave: (linha: T) => string;
  carregando?: boolean;
  vazio?: ReactNode;
  aoClicarLinha?: (linha: T) => void;
  linhaClicavel?: boolean;
  ordenacaoInicial?: SortingState;
  filtro?: string;
  aoMudarFiltro?: (v: string) => void;
  porPagina?: number;
  barraExtra?: ReactNode;
  rodape?: ReactNode;
  alturaMax?: string;
  /** Coluna fixa à direita com as ações da linha. */
  colunaAcoes?: (linha: T) => ReactNode;
  colunasOcultas?: Record<string, boolean>;
}



type MetaColuna = { ocultarAte?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' };

const CLASSE_OCULTA: Record<NonNullable<MetaColuna['ocultarAte']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
  '2xl': 'hidden 2xl:table-cell',
};

function classeOculta<T>(id: string, colunas: Array<ColumnDef<T, any>>): string {
  const def = colunas.find((c) => (c.id ?? (c as { accessorKey?: string }).accessorKey) === id);
  const meta = def?.meta as MetaColuna | undefined;
  return meta?.ocultarAte ? CLASSE_OCULTA[meta.ocultarAte] : '';
}

/** Container responsivo: vira lista de cartões no celular. */
export function TabelaDados<T>({
  colunas,
  dados,
  chave,
  carregando,
  vazio,
  aoClicarLinha,
  linhaClicavel = true,
  ordenacaoInicial,
  filtro = '',
  aoMudarFiltro,
  porPagina = 15,
  barraExtra,
  rodape,
  alturaMax,
  colunaAcoes,
  colunasOcultas,
}: TabelaDadosProps<T>) {
  const [ordenacao, setOrdenacao] = useState<SortingState>(ordenacaoInicial ?? []);
  const [pagina, setPagina] = useState(0);

  const colunasCompletas = useMemo<Array<ColumnDef<T, any>>>(
    () =>
      colunaAcoes
        ? [
            ...colunas,
            {
              id: '__acoes',
              header: '',
              size: 52,
              enableSorting: false,
              cell: ({ row }) => <div className="flex justify-end">{colunaAcoes(row.original)}</div>,
            },
          ]
        : colunas,
    [colunas, colunaAcoes],
  );

  const tabela = useReactTable({
    data: dados,
    columns: colunasCompletas,
    state: { sorting: ordenacao, globalFilter: filtro, pagination: { pageIndex: pagina, pageSize: porPagina } },
    onSortingChange: setOrdenacao,
    onGlobalFilterChange: () => undefined,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: porPagina } },
  });

  const total = tabela.getFilteredRowModel().rows.length;
  const totalPaginas = tabela.getPageCount();
  const inicio = total === 0 ? 0 : pagina * porPagina + 1;
  const fim = Math.min((pagina + 1) * porPagina, total);

  if (carregando) return <EsqueletoTabela linhas={6} colunas={5} />;

  if (total === 0) {
    return (
      <div>
        {barraExtra}
        {vazio ?? (
          <EstadoVazio
            icone={IconeColunaVazia}
            titulo="Nenhum registro encontrado"
            descricao="Ajuste os filtros ou cadastre um novo item."
            compacto
          />
        )}
      </div>
    );
  }

  return (
    <div>
      {barraExtra && <div className="border-b border-[var(--borda)] p-3">{barraExtra}</div>}
      <div className={cn('w-full overflow-x-auto', alturaMax && 'overflow-y-auto')} style={alturaMax ? { maxHeight: alturaMax } : undefined}>
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            {tabela.getHeaderGroups().map((grupo) => (
              <tr key={grupo.id} className="bg-[var(--marca)]">
                {grupo.headers.map((cabecalho) => {
                  const id = String(cabecalho.id);
                  const oculto = id !== '__acoes' && colunasOcultas?.[id];
                  const responsiva = id === '__acoes' ? '' : classeOculta(id, colunas);
                  const ordenavel = cabecalho.column.getCanSort() && id !== '__acoes';
                  const direcao = cabecalho.column.getIsSorted();
                  return (
                    <th
                      key={cabecalho.id}
                      style={{ width: cabecalho.column.columnDef.size }}
                      className={cn(
                        'whitespace-nowrap px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-wide text-white/90',
                        id === '__acoes' && 'sticky right-0 bg-[var(--marca)] text-center',
                        oculto && 'hidden lg:table-cell',
                        responsiva,
                      )}
                      aria-sort={direcao === 'asc' ? 'ascending' : direcao === 'desc' ? 'descending' : 'none'}
                    >
                      {ordenavel ? (
                        <button
                          type="button"
                          onClick={cabecalho.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 rounded transition-opacity hover:opacity-80"
                        >
                          {flexRender(cabecalho.column.columnDef.header, cabecalho.getContext())}
                          {direcao === 'asc' ? (
                            <ArrowUp className="size-3" />
                          ) : direcao === 'desc' ? (
                            <ArrowDown className="size-3" />
                          ) : (
                            <ChevronsUpDown className="size-3 opacity-50" />
                          )}
                        </button>
                      ) : (
                        flexRender(cabecalho.column.columnDef.header, cabecalho.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="trilho-zebra">
            {tabela.getRowModel().rows.map((linha) => (
              <tr
                key={chave(linha.original)}
                onClick={linhaClicavel && aoClicarLinha ? () => aoClicarLinha(linha.original) : undefined}
                onKeyDown={
                  linhaClicavel && aoClicarLinha
                    ? (e) => {
                        if (e.key === 'Enter') aoClicarLinha(linha.original);
                      }
                    : undefined
                }
                tabIndex={linhaClicavel && aoClicarLinha ? 0 : undefined}
                role={linhaClicavel && aoClicarLinha ? 'button' : undefined}
                className={cn(
                  'border-b border-[var(--borda)] transition-colors duration-150',
                  linhaClicavel && aoClicarLinha && 'cursor-pointer hover:bg-[color-mix(in_srgb,var(--marca)_7%,transparent)]',
                )}
              >
                {linha.getVisibleCells().map((celula) => {
                  const id = String(celula.column.id);
                  const oculto = id !== '__acoes' && colunasOcultas?.[id];
                  const responsiva = id === '__acoes' ? '' : classeOculta(id, colunas);
                  return (
                    <td
                      key={celula.id}
                      className={cn(
                        'px-3 py-2.5 align-middle text-[13px]',
                        id === '__acoes' && 'sticky right-0 bg-[var(--superficie)]',
                        oculto && 'hidden lg:table-cell',
                        responsiva,
                      )}
                    >
                      {flexRender(celula.column.columnDef.cell, celula.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--borda)] px-3 py-2.5">
        <p className="num text-[12px] text-[var(--texto-suave)]">
          {inicio}–{fim} de <strong className="font-semibold text-[var(--texto)]">{total}</strong>{' '}
          {total === 1 ? 'registro' : 'registros'}
        </p>
        <div className="flex items-center gap-1">
          {aoMudarFiltro && (
            <input
              value={filtro}
              onChange={(e) => {
                aoMudarFiltro(e.target.value);
                setPagina(0);
              }}
              placeholder="Filtrar nesta lista…"
              aria-label="Filtrar registros"
              className="mr-1 h-8 w-40 rounded-lg border border-[var(--borda-forte)] bg-[var(--superficie)] px-2.5 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--anel)_25%,transparent)] sm:w-52"
            />
          )}
          <Botao
            variante="contorno"
            tamanho="iconeSm"
            aria-label="Página anterior"
            disabled={!tabela.getCanPreviousPage()}
            onClick={() => setPagina((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft />
          </Botao>
          <span className="num min-w-[4.5rem] text-center text-[12px] text-[var(--texto-suave)]">
            {Math.min(pagina + 1, Math.max(1, totalPaginas))} / {Math.max(1, totalPaginas)}
          </span>
          <Botao
            variante="contorno"
            tamanho="iconeSm"
            aria-label="Próxima página"
            disabled={!tabela.getCanNextPage()}
            onClick={() => setPagina((p) => p + 1)}
          >
            <ChevronRight />
          </Botao>
        </div>
      </div>
      {rodape}
    </div>
  );
}

function IconeColunaVazia({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 20V10" />
    </svg>
  );
}

/* -------------------------- Helpers de coluna ---------------------------- */

export function texto(valor: string | undefined | null, vazio = '—') {
  return <span className={valor ? '' : 'text-[var(--texto-tenue)]'}>{valor || vazio}</span>;
}

export function numeroCelula(valor: number, casas = 2, sufixo?: string) {
  return (
    <span className="num tabular-nums">
      {valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}
      {sufixo}
    </span>
  );
}

export { Esqueleto };
