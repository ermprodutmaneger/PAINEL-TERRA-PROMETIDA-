import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Bell,
  ChevronLeft,
  Factory,
  FileText,
  Keyboard,
  LayoutDashboard,
  Megaphone,
  Menu as MenuIcon,
  Moon,
  Package,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Sun,
  Target,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { cn } from '@/lib/format';
import { ROTAS, useRota } from '@/lib/rota';
import { useDados } from '@/db/store';
import { gerarAlertas, ROTULO_SEVERIDADE, type Alerta } from '@/lib/alertas';
import { useTema } from '@/lib/tema';
import { Logo } from './Logo';
import { Botao } from '../ui/button';
import { Selo } from '../ui/badge';
import { Dica, ConteudoDica, GatilhoDica, ProvedorDica } from '../ui/misc';
import { Dialog, ConteudoDialog, DialogCabecalho, DialogCorpo, DialogTitulo, DialogRodape } from '../ui/dialog';
import { BotaoCopiar } from '../comuns';
import { moeda, numero } from '@/lib/format';
import { formatarBusca } from '@/lib/busca';

/* ============================== ÍCONES =================================== */

const ICONES: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard,
  Package,
  Factory,
  Users,
  ReceiptText,
  Wallet,
  FileText,
  Megaphone,
  Target,
  Settings,
};

const ICONES_MOBILE: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard,
  Package,
  ReceiptText,
  Wallet,
  Target,
};

/* =========================== Layout principal ============================ */

export function AppLayout({ children }: { children: ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(true);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [atalhosAbertos, setAtalhosAbertos] = useState(false);
  const [alertasAbertos, setAlertasAbertos] = useState(false);
  const { caminho, ir } = useRota();
  const { bd, derivado, rbt12, silenciarAlerta } = useDados();
  const { escuro, alternar } = useTema();

  const alertas = useMemo(
    () => gerarAlertas({ bd, produtos: derivado.produtos, clientes: derivado.clientes, fornecedores: derivado.fornecedores, rbt12, silenciados: bd.alertasSilenciados }),
    [bd, derivado, rbt12],
  );
  const criticos = alertas.filter((a) => a.severidade === 'CRITICO').length;

  /* ------------------------- Atalhos de teclado (§13) ------------------- */
  useEffect(() => {
    let aguardandoG = false;
    let timer: number | undefined;

    const aoTeclar = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      const digitando =
        alvo &&
        (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable || alvo.tagName === 'SELECT');

      if (e.key === 'Escape') {
        setBuscaAberta(false);
        setDrawerAberto(false);
        setAlertasAbertos(false);
        setAtalhosAbertos(false);
        window.dispatchEvent(new CustomEvent('tp:fechar'));
        return;
      }
      if (digitando) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('tp:salvar'));
        }
        return;
      }

      if (aguardandoG) {
        const destino = ROTAS.find((r) => r.atalho.toLowerCase() === e.key.toLowerCase());
        if (destino) {
          e.preventDefault();
          ir(destino.caminho);
        }
        aguardandoG = false;
        window.clearTimeout(timer);
        return;
      }

      switch (e.key) {
        case 'g':
        case 'G':
          aguardandoG = true;
          timer = window.setTimeout(() => (aguardandoG = false), 1200);
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('tp:novo'));
          break;
        case '/':
          e.preventDefault();
          setBuscaAberta(true);
          break;
        case '?':
          e.preventDefault();
          setAtalhosAbertos(true);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', aoTeclar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      window.clearTimeout(timer);
    };
  }, [ir]);

  useEffect(() => {
    setDrawerAberto(false);
  }, [caminho]);

  const itemAtivo = (c: string) => caminho === c;

  return (
    <ProvedorDica delayDuration={250}>
      <div className="min-h-dvh bg-[var(--fundo)]">
        {/* ------------------------------ Sidebar ------------------------- */}
        <aside
          className={cn(
            'nao-imprimir fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[var(--borda)] bg-[var(--superficie)] transition-transform duration-200 lg:flex',
            menuAberto ? 'w-[248px]' : 'w-[68px]',
          )}
        >
          <div className={cn('flex h-14 shrink-0 items-center border-b border-[var(--borda)]', menuAberto ? 'px-4' : 'justify-center px-2')}>
            <Logo tamanho={menuAberto ? 'md' : 'sm'} comNome={menuAberto} />
          </div>

          <nav className="flex-1 overflow-y-auto p-2" aria-label="Navegação principal">
            <ul className="space-y-0.5">
              {ROTAS.map((r) => {
                const Icone = ICONES[r.icone];
                const ativo = itemAtivo(r.caminho);
                const link = (
                  <button
                    key={r.caminho}
                    type="button"
                    onClick={() => ir(r.caminho)}
                    aria-current={ativo ? 'page' : undefined}
                    className={cn(
                      'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors duration-150',
                      ativo
                        ? 'bg-[var(--marca)] text-white shadow-sm'
                        : 'text-[var(--texto-suave)] hover:bg-[var(--acento)] hover:text-[var(--texto)]',
                    )}
                  >
                    <Icone className="size-[18px] shrink-0" aria-hidden />
                    {menuAberto ? (
                      <span className="truncate">{r.rotulo}</span>
                    ) : (
                      <Dica>
                        <GatilhoDica asChild>
                          <span className="sr-only">{r.rotulo}</span>
                        </GatilhoDica>
                        <ConteudoDica side="right">
                          {r.rotulo}
                          {r.atalho && <span className="ml-2 opacity-70">G {r.atalho}</span>}
                        </ConteudoDica>
                      </Dica>
                    )}
                    {ativo && menuAberto && (
                      <span className="ml-auto size-1.5 rounded-full" style={{ background: 'var(--destaque-fundo)' }} aria-hidden />
                    )}
                  </button>
                );
                return (
                  <li key={r.caminho}>
                    {menuAberto ? (
                      link
                    ) : (
                      <Dica>
                        <GatilhoDica asChild>{link}</GatilhoDica>
                        <ConteudoDica side="right">
                          {r.rotulo}
                          {r.atalho && <span className="ml-2 opacity-70">G {r.atalho}</span>}
                        </ConteudoDica>
                      </Dica>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="shrink-0 border-t border-[var(--borda)] p-2">
            <button
              type="button"
              onClick={() => setMenuAberto((v) => !v)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[12.5px] text-[var(--texto-suave)] transition-colors hover:bg-[var(--acento)]"
              aria-label={menuAberto ? 'Recolher menu' : 'Expandir menu'}
            >
              <ChevronLeft className={cn('size-4 transition-transform duration-200', !menuAberto && 'rotate-180')} aria-hidden />
              {menuAberto && 'Recolher'}
            </button>
            {menuAberto && (
              <div className="mt-1 rounded-lg bg-[var(--acento)] p-3">
                <p className="text-[12px] font-semibold leading-tight text-[var(--texto)]">Ezequiel Ribeiro Matos</p>
                <p className="mt-0.5 text-[11px] leading-tight text-[var(--texto-suave)]">CEO e Administrador</p>
                <button
                  type="button"
                  onClick={() => ir('/configuracoes')}
                  className="mt-2 text-[11px] font-medium text-[var(--marca)] hover:underline dark:text-[var(--destaque)]"
                >
                  Ver configurações
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ------------------------------ Topo --------------------------- */}
        <header className="app-header nao-imprimir sticky top-0 z-30 border-b border-[var(--borda)] bg-[color-mix(in_srgb,var(--superficie)_88%,transparent)] backdrop-blur-md">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
            <Botao
              variante="fantasma"
              tamanho="icone"
              className="lg:hidden"
              aria-label="Abrir menu"
              onClick={() => setDrawerAberto(true)}
            >
              <MenuIcon />
            </Botao>

            <div className="lg:hidden">
              <Logo tamanho="sm" comNome={false} />
            </div>

            <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
              <p className="truncate text-[12.5px] text-[var(--texto-suave)]">
                {bd.configuracao.empresa.razaoSocial} · CNPJ {bd.configuracao.empresa.cnpj}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <Botao
                variante="contorno"
                tamanho="sm"
                onClick={() => setBuscaAberta(true)}
                className="hidden gap-2 font-normal text-[var(--texto-tenue)] sm:inline-flex"
              >
                <Search />
                <span className="w-32 text-left">Buscar…</span>
                <kbd className="rounded border border-[var(--borda)] px-1 text-[10px]">/</kbd>
              </Botao>
              <Botao variante="fantasma" tamanho="icone" className="sm:hidden" aria-label="Buscar" onClick={() => setBuscaAberta(true)}>
                <Search />
              </Botao>

              <Dica>
                <GatilhoDica asChild>
                  <button
                    type="button"
                    onClick={() => setAlertasAbertos(true)}
                    className="relative inline-flex size-9 items-center justify-center rounded-lg text-[var(--texto-suave)] transition-colors hover:bg-[var(--acento)] hover:text-[var(--texto)]"
                    aria-label={`Alertas: ${alertas.length} em aberto`}
                  >
                    <Bell className="size-[18px]" />
                    {alertas.length > 0 && (
                      <span
                        className="num absolute -right-0.5 -top-0.5 grid min-w-[17px] place-items-center rounded-full px-1 text-[10px] font-bold text-white"
                        style={{ background: criticos > 0 ? 'var(--alerta)' : 'var(--atencao)' }}
                      >
                        {alertas.length > 99 ? '99+' : alertas.length}
                      </span>
                    )}
                  </button>
                </GatilhoDica>
                <ConteudoDica>
                  {alertas.length === 0 ? 'Nenhum alerta' : `${alertas.length} alertas · ${criticos} críticos`}
                </ConteudoDica>
              </Dica>

              <Botao variante="fantasma" tamanho="icone" onClick={alternar} aria-label={escuro ? 'Mudar para tema claro' : 'Mudar para tema escuro'}>
                {escuro ? <Sun /> : <Moon />}
              </Botao>

              <Botao
                variante="destaque"
                tamanho="sm"
                className="hidden sm:inline-flex"
                onClick={() => window.dispatchEvent(new CustomEvent('tp:novo'))}
              >
                <Plus />
                Novo
                <kbd className="ml-0.5 rounded border border-black/15 px-1 text-[10px]">N</kbd>
              </Botao>
            </div>
          </div>
        </header>

        {/* ------------------------------ Conteúdo ----------------------- */}
        <main className="mx-auto w-full max-w-[1500px] px-3 pb-24 pt-4 sm:px-5 lg:pb-10 lg:pl-6 lg:pr-6">
          <div className={cn('transition-[padding] duration-200', menuAberto ? 'lg:pl-[248px]' : 'lg:pl-[68px]')}>
            {children}
          </div>
        </main>

        {/* ------------------------- Barra inferior ---------------------- */}
        <nav
          className="barra-mobile nao-imprimir fixed inset-x-0 bottom-0 z-30 border-t border-[var(--borda)] bg-[color-mix(in_srgb,var(--superficie)_94%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
          aria-label="Navegação rápida"
        >
          <ul className="grid grid-cols-5">
            {ROTAS.filter((r) => ICONES_MOBILE[r.icone]).map((r) => {
              const Icone = ICONES_MOBILE[r.icone];
              const ativo = itemAtivo(r.caminho);
              return (
                <li key={r.caminho}>
                  <button
                    type="button"
                    onClick={() => ir(r.caminho)}
                    aria-current={ativo ? 'page' : undefined}
                    className={cn(
                      'flex w-full flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors',
                      ativo ? 'text-[var(--marca)] dark:text-[var(--destaque)]' : 'text-[var(--texto-tenue)]',
                    )}
                  >
                    <Icone className="size-[19px]" aria-hidden />
                    <span className="leading-none">{r.rotulo.split(' ')[0]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ---------------------------- Menu mobile ---------------------- */}
        {drawerAberto && (
          <div className="nao-imprimir fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-[#22201C]/55" onClick={() => setDrawerAberto(false)} />
            <div className="absolute inset-y-0 left-0 flex w-[84%] max-w-[300px] flex-col border-r border-[var(--borda)] bg-[var(--superficie)]">
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--borda)] px-4">
                <Logo tamanho="sm" />
                <Botao variante="fantasma" tamanho="iconeSm" aria-label="Fechar menu" onClick={() => setDrawerAberto(false)}>
                  <X />
                </Botao>
              </div>
              <nav className="flex-1 overflow-y-auto p-3">
                <ul className="space-y-1">
                  {ROTAS.map((r) => {
                    const Icone = ICONES[r.icone];
                    const ativo = itemAtivo(r.caminho);
                    return (
                      <li key={r.caminho}>
                        <button
                          type="button"
                          onClick={() => ir(r.caminho)}
                          aria-current={ativo ? 'page' : undefined}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-[14px] font-medium transition-colors',
                            ativo ? 'bg-[var(--marca)] text-white' : 'text-[var(--texto)] hover:bg-[var(--acento)]',
                          )}
                        >
                          <Icone className="size-[18px] shrink-0" aria-hidden />
                          {r.rotulo}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-4 rounded-xl bg-[var(--acento)] p-3">
                  <p className="text-[13px] font-semibold">Ezequiel Ribeiro Matos</p>
                  <p className="text-[12px] text-[var(--texto-suave)]">CEO e Administrador</p>
                  <p className="mt-2 text-[11px] leading-snug text-[var(--texto-tenue)]">
                    {bd.configuracao.empresa.razaoSocial} · CNPJ {bd.configuracao.empresa.cnpj}
                  </p>
                </div>
              </nav>
            </div>
          </div>
        )}

        <BuscaGlobal aberta={buscaAberta} aoFechar={() => setBuscaAberta(false)} />
        <ListaAlertas aberta={alertasAbertos} aoFechar={() => setAlertasAbertos(false)} alertas={alertas} aoSilenciar={silenciarAlerta} />
        <AtalhosDialog aberto={atalhosAbertos} aoFechar={() => setAtalhosAbertos(false)} />
      </div>
    </ProvedorDica>
  );
}

/* ============================ Busca global ============================== */

function BuscaGlobal({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const [termo, setTermo] = useState('');
  const { bd, derivado } = useDados();
  const { ir } = useRota();

  useEffect(() => {
    if (aberta) setTermo('');
  }, [aberta]);

  const resultados = useMemo(() => formatarBusca(termo, { bd, derivado }), [termo, bd, derivado]);

  function abrir(r: { destino: string; id: string }) {
    aoFechar();
    ir(r.destino, r.destino === '/produtos' || r.destino === '/clientes' || r.destino === '/vendas' || r.destino === '/fornecedores' ? { foco: r.id } : undefined);
  }

  return (
    <Dialog open={aberta} onOpenChange={(v) => !v && aoFechar()}>
      <ConteudoDialog largura="lg" className="top-[12%] translate-y-0 sm:top-[12%]">
        <div className="flex items-center gap-2 border-b border-[var(--borda)] px-4">
          <Search className="size-4 shrink-0 text-[var(--texto-tenue)]" aria-hidden />
          <input
            autoFocus
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar produto, cliente, fornecedor, pedido ou número…"
            aria-label="Busca global"
            className="h-13 w-full bg-transparent py-4 text-[15px] outline-none placeholder:text-[var(--texto-tenue)]"
          />
          <kbd className="rounded border border-[var(--borda)] px-1.5 py-0.5 text-[10px] text-[var(--texto-tenue)]">Esc</kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {termo.trim().length < 2 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-[13px] text-[var(--texto-suave)]">Digite pelo menos 2 letras para buscar.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {['Ver todos os produtos', 'Clientes sem comprar', 'Vendas em aberto'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      aoFechar();
                      if (s.includes('produtos')) ir('/produtos');
                      if (s.includes('sem comprar')) ir('/clientes?filtro=sem-recompra');
                      if (s.includes('aberto')) ir('/vendas');
                    }}
                    className="rounded-lg border border-[var(--borda)] px-2.5 py-1.5 text-[12.5px] text-[var(--texto-suave)] hover:bg-[var(--acento)]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : resultados.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-[var(--texto-suave)]">Nada encontrado para “{termo}”.</p>
          ) : (
            <ul className="space-y-0.5">
              {resultados.map((r) => {
                const Icone = r.icone;
                return (
                <li key={`${r.tipo}-${r.id}`}>
                  <button
                    type="button"
                    onClick={() => abrir(r)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--acento)]"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--acento)] text-[var(--marca)] dark:text-[var(--destaque)]">
                      <Icone className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-[var(--texto)]">{r.titulo}</span>
                      <span className="block truncate text-[12px] text-[var(--texto-suave)]">{r.subtitulo}</span>
                    </span>
                    <Selo tom="neutro">{r.rotuloTipo}</Selo>
                  </button>
                </li>
                );
              })}
            </ul>
          )}
        </div>
      </ConteudoDialog>
    </Dialog>
  );
}

/* ============================== Alertas ================================== */

function ListaAlertas({
  aberta,
  aoFechar,
  alertas,
  aoSilenciar,
}: {
  aberta: boolean;
  aoFechar: () => void;
  alertas: Alerta[];
  aoSilenciar: (chave: string) => void;
}) {
  const { ir } = useRota();
  const cor = (s: Alerta['severidade']) =>
    s === 'CRITICO' ? 'var(--alerta)' : s === 'ATENCAO' ? 'var(--atencao)' : 'var(--texto-tenue)';

  return (
    <Dialog open={aberta} onOpenChange={(v) => !v && aoFechar()}>
      <ConteudoDialog largura="md">
        <DialogCabecalho>
          <DialogTitulo className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-[var(--atencao)]" aria-hidden />
            Alertas da operação
          </DialogTitulo>
          <p className="mt-1 text-[13px] text-[var(--texto-suave)]">
            {alertas.length === 0
              ? 'Nada exigindo atenção agora.'
              : `${alertas.length} itens. Clique para ir direto ao local que resolve.`}
          </p>
        </DialogCabecalho>
        <DialogCorpo className="p-0">
          {alertas.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-[var(--sucesso-suave)] text-[var(--sucesso)]">
                <Bell className="size-5" />
              </div>
              <p className="text-[14px] font-semibold">Tudo em ordem</p>
              <p className="mt-1 text-[13px] text-[var(--texto-suave)]">
                Estoque, margem, vencimentos e clientes estão dentro do esperado.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--borda)]">
              {alertas.map((a) => (
                <li key={a.chave} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-1 size-2 shrink-0 rounded-full" style={{ background: cor(a.severidade) }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13.5px] font-medium text-[var(--texto)]">{a.titulo}</p>
                      <Selo tom={a.severidade === 'CRITICO' ? 'terracota' : a.severidade === 'ATENCAO' ? 'mostarda' : 'neutro'}>
                        {ROTULO_SEVERIDADE[a.severidade]}
                      </Selo>
                    </div>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--texto-suave)]">{a.descricao}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Botao
                        tamanho="sm"
                        variante="contorno"
                        onClick={() => {
                          aoFechar();
                          ir(a.destino, a.foco ? { foco: a.foco } : undefined);
                        }}
                      >
                        Resolver
                      </Botao>
                      {a.acao && (
                        <a href={a.acao.href} target="_blank" rel="noreferrer">
                          <Botao tamanho="sm" variante="fantasma">
                            {a.acao.rotulo}
                          </Botao>
                        </a>
                      )}
                      <Botao tamanho="sm" variante="fantasma" onClick={() => aoSilenciar(a.chave)}>
                        Ignorar
                      </Botao>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogCorpo>
      </ConteudoDialog>
    </Dialog>
  );
}

/* ============================== Atalhos ================================== */

const ATALHOS: Array<[string, string]> = [
  ['N', 'Novo registro na tela atual'],
  ['/', 'Busca global'],
  ['G  D', 'Ir para Visão Geral'],
  ['G  P', 'Ir para Produtos'],
  ['G  F', 'Ir para Fornecedores'],
  ['G  C', 'Ir para Clientes'],
  ['G  V', 'Ir para Vendas & Pedidos'],
  ['G  $', 'Ir para Financeiro'],
  ['Ctrl + S', 'Salvar o formulário aberto'],
  ['Esc', 'Fechar janela ou painel'],
  ['?', 'Mostrar esta lista de atalhos'],
];

function AtalhosDialog({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <ConteudoDialog largura="sm">
        <DialogCabecalho>
          <DialogTitulo className="flex items-center gap-2">
            <Keyboard className="size-4" aria-hidden /> Atalhos de teclado
          </DialogTitulo>
        </DialogCabecalho>
        <DialogCorpo>
          <dl className="space-y-1.5">
            {ATALHOS.map(([tecla, descricao]) => (
              <div key={tecla} className="flex items-center justify-between gap-4">
                <dt className="text-[13px] text-[var(--texto-suave)]">{descricao}</dt>
                <dd>
                  <kbd className="rounded-md border border-[var(--borda-forte)] bg-[var(--acento)] px-1.5 py-0.5 text-[11.5px] font-semibold">
                    {tecla}
                  </kbd>
                </dd>
              </div>
            ))}
          </dl>
        </DialogCorpo>
        <DialogRodape>
          <Botao variante="contorno" onClick={aoFechar}>
            Fechar
          </Botao>
        </DialogRodape>
      </ConteudoDialog>
    </Dialog>
  );
}

/* ========================== Cartões de rodapé ============================ */

export function RodapeIndicadores() {
  const { bd, derivado, rbt12 } = useDados();
  const custoTotal = derivado.produtos.reduce((s, p) => s + p.valorEmEstoque, 0);
  const criticos = derivado.produtos.filter((p) => ['ZERADO', 'CRITICO'].includes(p.statusEstoque)).length;
  return (
    <p className="text-[11.5px] text-[var(--texto-tenue)]">
      {numero(derivado.produtos.length)} SKUs · {moeda(custoTotal)} em estoque · {criticos} em nível crítico · RBT12 {moeda(rbt12)} ·{' '}
      {bd.vendas.length} pedidos registrados
    </p>
  );
}

export { BotaoCopiar, DialogRodape };
