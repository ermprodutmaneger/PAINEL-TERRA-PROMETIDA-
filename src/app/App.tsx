import { lazy, Suspense, useEffect } from 'react';
import { Toaster } from 'sonner';
import { DataProvider, useDados } from '@/db/store';
import { ProvedorRota, useRota } from '@/lib/rota';
import { ProvedorTema, useTema } from '@/lib/tema';
import { AppLayout } from '@/components/layout/AppLayout';
import { Esqueleto } from '@/components/ui/badge';
import { Carregando } from '@/components/Carregando';

const VisaoGeral = lazy(() => import('@/paginas/VisaoGeral'));
const Produtos = lazy(() => import('@/paginas/Produtos'));
const Fornecedores = lazy(() => import('@/paginas/Fornecedores'));
const Clientes = lazy(() => import('@/paginas/Clientes'));
const Vendas = lazy(() => import('@/paginas/Vendas'));
const Financeiro = lazy(() => import('@/paginas/Financeiro'));
const NotasFiscais = lazy(() => import('@/paginas/NotasFiscais'));
const Marketing = lazy(() => import('@/paginas/Marketing'));
const Metas = lazy(() => import('@/paginas/Metas'));
const Configuracoes = lazy(() => import('@/paginas/Configuracoes'));

export function App() {
  return (
    <ProvedorTema>
      <DataProvider>
        <ProvedorRota>
          <Conteudo />
        </ProvedorRota>
      </DataProvider>
    </ProvedorTema>
  );
}

function Conteudo() {
  const { escuro } = useTema();
  return (
    <>
      <AppLayout>
        <Rotas />
      </AppLayout>
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: 'rounded-xl border shadow-lg',
          },
        }}
        theme={escuro ? 'dark' : 'light'}
      />
    </>
  );
}

function Rotas() {
  const { caminho } = useRota();
  const { carregando } = useDados();

  useEffect(() => {
    document.title = `${TITULOS[caminho] ?? 'Painel'} · Terra Prometida Express`;
  }, [caminho]);

  if (carregando) return <Carregando />;

  const Pagina = PAGINAS[caminho] ?? VisaoGeral;

  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Esqueleto className="h-8 w-64" />
          <Esqueleto className="h-4 w-96 max-w-full" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Esqueleto key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      <Pagina />
    </Suspense>
  );
}

const PAGINAS: Record<string, React.LazyExoticComponent<() => React.JSX.Element>> = {
  '/': VisaoGeral,
  '/produtos': Produtos,
  '/fornecedores': Fornecedores,
  '/clientes': Clientes,
  '/vendas': Vendas,
  '/financeiro': Financeiro,
  '/notas-fiscais': NotasFiscais,
  '/marketing': Marketing,
  '/metas': Metas,
  '/configuracoes': Configuracoes,
};

const TITULOS: Record<string, string> = {
  '/': 'Visão Geral',
  '/produtos': 'Produtos',
  '/fornecedores': 'Fornecedores',
  '/clientes': 'Clientes',
  '/vendas': 'Vendas & Pedidos',
  '/financeiro': 'Financeiro',
  '/notas-fiscais': 'Notas Fiscais',
  '/marketing': 'Marketing',
  '/metas': 'Metas & Indicadores',
  '/configuracoes': 'Configurações',
};
