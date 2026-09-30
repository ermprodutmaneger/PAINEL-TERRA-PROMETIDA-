import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Archive,
  Boxes,
  Copy,
  Download,
  Filter,
  Grid2x2,
  List,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Tag,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { useDados } from '@/db/store';
import { useRota } from '@/lib/rota';
import type { ProdutoCalculado } from '@/db/deriva';
import { ROTULO_CATEGORIA_PRODUTO, type CategoriaProduto, type Produto, type StatusEstoque } from '@/types';
import { moeda, numero, percentual, percentualNum, dataBR, cn } from '@/lib/format';
import { precoNecessario } from '@/lib/calculos';
import { CabecalhoPagina, CartaoKpi, EstadoVazio, BarraEstoque, Etiqueta } from '@/components/comuns';
import { TabelaDados, texto } from '@/components/tabela-dados';
import { Botao } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Campo, CampoTexto } from '@/components/ui/input';
import {
  ConteudoSelecao,
  GatilhoSelecao,
  ItemSelecao,
  Selecao,
  ValorSelecao,
} from '@/components/ui/select';
import {
  ConteudoDialog,
  Dialog,
  DialogCabecalho,
  DialogCorpo,
  DialogDescricao,
  DialogRodape,
  DialogTitulo,
  BotaoExcluir,
} from '@/components/ui/dialog';
import {
  ConteudoDrawer,
  Drawer,
  DrawerCabecalho,
  DrawerCorpo,
  DrawerDescricao,
  DrawerRodape,
  DrawerTitulo,
} from '@/components/ui/sheet';
import {
  ConteudoMenu,
  GatilhoMenu,
  ItemMenu,
  Menu,
  Progresso,
  SeparadorMenu,
} from '@/components/ui/misc';
import { Selo } from '@/components/ui/badge';
import { exportarCSV } from '@/lib/arquivos';
import { TOM_ESTOQUE } from '@/lib/cores';

const CATEGORIAS = Object.keys(ROTULO_CATEGORIA_PRODUTO) as CategoriaProduto[];

const esquema = z.object({
  sku: z.string().min(2, 'Informe um código com pelo menos 2 letras'),
  nome: z.string().min(3, 'Informe o nome do produto'),
  categoria: z.enum(CATEGORIAS as [CategoriaProduto, ...CategoriaProduto[]]),
  marcaFornecedor: z.string().optional(),
  fornecedorId: z.string().min(1, 'Escolha um fornecedor'),
  unidadeCompra: z.string().min(1, 'Descreva a unidade de compra'),
  pesoLiquidoPorUnidade: z.coerce.number().min(0, 'Peso não pode ser negativo'),
  custoUnitario: z.coerce.number().min(0, 'Custo não pode ser negativo'),
  precoVendaUnitario: z.coerce.number().min(0, 'Preço não pode ser negativo'),
  estoqueAtual: z.coerce.number().min(0, 'Estoque não pode ser negativo'),
  estoqueMinimo: z.coerce.number().min(0),
  estoqueMaximo: z.coerce.number().min(0),
  pontoDePedido: z.coerce.number().min(0),
  localizacao: z.string().optional(),
  validade: z.string().optional(),
});

type FormProduto = z.infer<typeof esquema>;

export default function Produtos() {
  const { derivado, criar, atualizar, arquivar, configuracao, rbt12 } = useDados();
  const { consulta, trocarConsulta } = useRota();

  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<string>('TODAS');
  const [fornecedor, setFornecedor] = useState<string>('TODOS');
  const [status, setStatus] = useState<string>('TODOS');
  const [margem, setMargem] = useState<string>('TODAS');
  const [arquivados, setArquivados] = useState(false);
  const [visao, setVisao] = useState<'tabela' | 'grade'>('tabela');
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [aberto, setAberto] = useState(false);
  const [detalhe, setDetalhe] = useState<ProdutoCalculado | null>(null);

  const foco = consulta.get('foco');

  useEffect(() => {
    if (!foco) return;
    const p = derivado.produtos.find((x) => x.id === foco);
    if (p) setDetalhe(p);
  }, [foco, derivado.produtos]);

  /* ------------- Escuta o atalho "N" e o evento de edição ------------ */
  useEffect(() => {
    const aoNovo = () => {
      setEditando(null);
      setAberto(true);
    };
    const aoEditar = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const alvo = derivado.produtos.find((p) => p.id === id);
      if (alvo) {
        setEditando(alvo);
        setAberto(true);
      }
    };
    window.addEventListener('tp:novo', aoNovo);
    window.addEventListener('tp:editar-produto', aoEditar);
    return () => {
      window.removeEventListener('tp:novo', aoNovo);
      window.removeEventListener('tp:editar-produto', aoEditar);
    };
  }, [derivado.produtos]);

  /* ------------------------------ Filtragem --------------------------- */
  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return derivado.produtos.filter((p) => {
      if (p.arquivado !== arquivados) return false;
      if (categoria !== 'TODAS' && p.categoria !== categoria) return false;
      if (fornecedor !== 'TODOS' && p.fornecedorId !== fornecedor) return false;
      if (status !== 'TODOS' && p.statusEstoque !== status) return false;
      if (margem === 'BAIXA' && p.margemContribuicaoPct * 100 >= configuracao.margemMinimaAlerta) return false;
      if (margem === 'META' && p.margemContribuicaoPct * 100 < configuracao.margemAlvo) return false;
      if (t && !`${p.sku} ${p.nome} ${p.marcaFornecedor} ${p.nomeFornecedor}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [derivado.produtos, busca, categoria, fornecedor, status, margem, arquivados, configuracao]);

  const resumo = useMemo(() => {
    const valor = derivado.produtos.reduce((s, p) => s + p.valorEmEstoque, 0);
    const criticos = derivado.produtos.filter((p) => ['ZERADO', 'CRITICO'].includes(p.statusEstoque));
    const margemMedia =
      derivado.produtos.length > 0
        ? derivado.produtos.reduce((s, p) => s + p.margemContribuicaoPct, 0) / derivado.produtos.length
        : 0;
    return { valor, criticos, margemMedia, giro: derivado.produtos.reduce((s, p) => s + p.giroMensal, 0) };
  }, [derivado.produtos]);

  /* ------------------------------ Ações ------------------------------- */
  const aoSalvar = (dados: FormProduto) => {
    const payload = {
      ...dados,
      marcaFornecedor: dados.marcaFornecedor ?? '',
      localizacao: dados.localizacao ?? '',
      validade: dados.validade || undefined,
    };
    if (editando) {
      atualizar<Produto>('produtos', editando.id, payload);
      toast.success(`${dados.sku} atualizado`);
    } else {
      if (derivado.produtos.some((p) => p.sku.toLowerCase() === dados.sku.toLowerCase())) {
        toast.error(`Já existe um produto com o código ${dados.sku}`);
        return;
      }
      criar<Produto>('produtos', { ...payload, ativo: true });
      toast.success(`${dados.sku} cadastrado`);
    }
    setAberto(false);
    setEditando(null);
  };

  const acoesEmLote = (acao: 'arquivar' | 'categoria' | 'fornecedor') => {
    if (selecionados.length === 0) return;
    for (const id of selecionados) {
      if (acao === 'arquivar') arquivar('produtos', id, true);
      if (acao === 'categoria') atualizar<Produto>('produtos', id, { categoria: categoria !== 'TODAS' ? (categoria as CategoriaProduto) : 'OUTROS' });
      if (acao === 'fornecedor') atualizar<Produto>('produtos', id, { fornecedorId: fornecedor !== 'TODOS' ? fornecedor : '' });
    }
    toast.success(`${selecionados.length} produto(s) atualizado(s)`);
    setSelecionados([]);
  };

  const exportar = () => {
    exportarCSV(
      'produtos',
      ['SKU', 'Nome', 'Categoria', 'Marca', 'Fornecedor', 'Unidade', 'Custo', 'Preço', 'Margem bruta %', 'MC %', 'Estoque', 'Estoque mínimo', 'Estoque máximo', 'Ponto de pedido', 'Valor em estoque', 'Validade', 'Status'],
      filtrados.map((p) => [
        p.sku,
        p.nome,
        ROTULO_CATEGORIA_PRODUTO[p.categoria],
        p.marcaFornecedor,
        p.nomeFornecedor,
        p.unidadeCompra,
        p.custoUnitario.toFixed(2),
        p.precoVendaUnitario.toFixed(2),
        (p.margemBrutaPct * 100).toFixed(2),
        (p.margemContribuicaoPct * 100).toFixed(2),
        p.estoqueAtual,
        p.estoqueMinimo,
        p.estoqueMaximo,
        p.pontoDePedido,
        p.valorEmEstoque.toFixed(2),
        p.validade ? dataBR(p.validade) : '',
        p.statusEstoque,
      ]),
    );
    toast.success('Produtos exportados em CSV');
  };

  /* ------------------------------ Colunas ----------------------------- */
  const colunas: Array<ColumnDef<ProdutoCalculado, any>> = useMemo(
    () => [
      {
        id: 'selecao',
        size: 34,
        enableSorting: false,
        header: () => (
          <input
            type="checkbox"
            aria-label="Selecionar todos"
            className="size-3.5 accent-[var(--marca)]"
            checked={selecionados.length > 0 && selecionados.length === filtrados.length}
            onChange={(e) => setSelecionados(e.target.checked ? filtrados.map((p) => p.id) : [])}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Selecionar ${row.original.sku}`}
            className="size-3.5 accent-[var(--marca)]"
            checked={selecionados.includes(row.original.id)}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) =>
              setSelecionados((s) => (e.target.checked ? [...s, row.original.id] : s.filter((x) => x !== row.original.id)))
            }
          />
        ),
      },
      { id: 'sku', accessorKey: 'sku', size: 96, header: 'SKU', cell: ({ row }) => <span className="num font-semibold text-[var(--marca)] dark:text-[var(--destaque)]">{row.original.sku}</span> },
      {
        id: 'nome',
        accessorKey: 'nome',
        header: 'Produto',
        cell: ({ row }) => (
          <div className="min-w-[180px]">
            <p className="font-medium text-[var(--texto)]">{row.original.nome}</p>
            <p className="text-[11.5px] text-[var(--texto-tenue)]">
              {row.original.marcaFornecedor} · {row.original.unidadeCompra}
            </p>
          </div>
        ),
      },
      {
        id: 'categoria',
        accessorKey: 'categoria',
        meta: { ocultarAte: 'xl' },
        header: 'Categoria',
        cell: ({ row }) => <span className="whitespace-nowrap">{ROTULO_CATEGORIA_PRODUTO[row.original.categoria]}</span>,
      },
      {
        id: 'fornecedor',
        accessorFn: (r) => r.nomeFornecedor,
        meta: { ocultarAte: 'xl' },
        header: 'Fornecedor',
        cell: ({ row }) => texto(row.original.nomeFornecedor),
      },
      { id: 'custo', accessorKey: 'custoUnitario', header: 'Custo', cell: ({ row }) => <span className="num">{moeda(row.original.custoUnitario)}</span> },
      { id: 'preco', accessorKey: 'precoVendaUnitario', header: 'Preço', cell: ({ row }) => <span className="num font-medium">{moeda(row.original.precoVendaUnitario)}</span> },
      {
        id: 'margemBruta',
        accessorFn: (r) => r.margemBrutaPct,
        meta: { ocultarAte: '2xl' },
        header: 'Margem bruta',
        cell: ({ row }) => <span className="num">{percentual(row.original.margemBrutaPct, 0)}</span>,
      },
      {
        id: 'mc',
        accessorFn: (r) => r.margemContribuicaoPct,
        header: 'MC %',
        cell: ({ row }) => {
          const v = row.original.margemContribuicaoPct * 100;
          const cor =
            v < configuracao.margemMinimaAlerta ? 'var(--alerta)' : v < configuracao.margemAlvo ? 'var(--atencao)' : 'var(--sucesso)';
          return (
            <span className="num font-semibold" style={{ color: cor }}>
              {percentualNum(v)}
            </span>
          );
        },
      },
      {
        id: 'estoque',
        accessorKey: 'estoqueAtual',
        header: 'Estoque',
        cell: ({ row }) => (
          <div className="w-24">
            <p className="num text-[12.5px] font-medium">{numero(row.original.estoqueAtual)} un.</p>
            <BarraEstoque {...row.original} />
          </div>
        ),
      },
      {
        id: 'valorEstoque',
        accessorFn: (r) => r.valorEmEstoque,
        meta: { ocultarAte: 'xl' },
        header: 'Valor em estoque',
        cell: ({ row }) => <span className="num">{moeda(row.original.valorEmEstoque)}</span>,
      },
      {
        id: 'validade',
        accessorKey: 'validade',
        meta: { ocultarAte: '2xl' },
        header: 'Validade',
        cell: ({ row }) =>
          row.original.validade ? (
            <span className="num whitespace-nowrap">{dataBR(row.original.validade)}</span>
          ) : (
            texto(null)
          ),
      },
      {
        id: 'status',
        accessorKey: 'statusEstoque',
        header: 'Status',
        cell: ({ row }) => <Etiqueta tom={TOM_ESTOQUE[row.original.statusEstoque]}>{rotuloStatus(row.original.statusEstoque)}</Etiqueta>,
      },
    ],
    [selecionados, filtrados, configuracao],
  );

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        icone={Package}
        titulo="Produtos"
        descricao="Seu estoque cirúrgico: o que gira, o que está parando e onde a margem está apertada."
        acoes={
          <>
            <Botao variante="contorno" onClick={exportar}>
              <Download />
              <span className="hidden sm:inline">Exportar CSV</span>
            </Botao>
            <div className="flex items-center gap-0.5 rounded-lg border border-[var(--borda)] p-0.5">
              <button
                type="button"
                onClick={() => setVisao('tabela')}
                aria-label="Ver em tabela"
                aria-pressed={visao === 'tabela'}
                className={cn('rounded-md p-2 transition-colors', visao === 'tabela' ? 'bg-[var(--acento)] text-[var(--texto)]' : 'text-[var(--texto-tenue)]')}
              >
                <List className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setVisao('grade')}
                aria-label="Ver em grade"
                aria-pressed={visao === 'grade'}
                className={cn('rounded-md p-2 transition-colors', visao === 'grade' ? 'bg-[var(--acento)] text-[var(--texto)]' : 'text-[var(--texto-tenue)]')}
              >
                <Grid2x2 className="size-4" />
              </button>
            </div>
            <Botao
              onClick={() => {
                setEditando(null);
                setAberto(true);
              }}
            >
              <Plus />
              Novo produto
            </Botao>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoKpi rotulo="SKUs cadastrados" valor={numero(derivado.produtos.length)} apoio={`${numero(derivado.produtos.filter((p) => p.ativo).length)} ativos`} icone={Package} />
        <CartaoKpi rotulo="Capital em estoque" valor={moeda(resumo.valor)} apoio="Custo × quantidade" icone={Boxes} />
        <CartaoKpi
          rotulo="Margem média"
          valor={percentual(resumo.margemMedia)}
          apoio={`Meta: ${configuracao.margemAlvo}%`}
          cor={resumo.margemMedia * 100 < configuracao.margemMinimaAlerta ? 'var(--alerta)' : 'var(--sucesso)'}
          icone={TrendingUp}
        />
        <CartaoKpi
          rotulo="Precisam de reposição"
          valor={numero(resumo.criticos.length)}
          apoio={resumo.criticos.length > 0 ? 'Zerados ou no mínimo' : 'Estoque saudável'}
          cor={resumo.criticos.length > 0 ? 'var(--alerta)' : 'var(--sucesso)'}
          icone={Filter}
        />
      </div>

      <Card>
        {/* ------------------------------ Filtros ---------------------- */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--borda)] p-3">
          <CampoTexto
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por SKU, nome, marca ou fornecedor…"
            aria-label="Buscar produtos"
            className="h-9 min-w-[100%] flex-1 sm:min-w-[180px] sm:max-w-xs"
          />
          <Selecao value={categoria} onValueChange={setCategoria}>
            <GatilhoSelecao tamanho="sm" className="w-full px-2.5 sm:w-[12rem]">
              <ValorSelecao placeholder="Categoria" />
            </GatilhoSelecao>
            <ConteudoSelecao>
              <ItemSelecao value="TODAS">Todas as categorias</ItemSelecao>
              {CATEGORIAS.map((c) => (
                <ItemSelecao key={c} value={c}>
                  {ROTULO_CATEGORIA_PRODUTO[c]}
                </ItemSelecao>
              ))}
            </ConteudoSelecao>
          </Selecao>

          <Selecao value={fornecedor} onValueChange={setFornecedor}>
            <GatilhoSelecao tamanho="sm" className="w-full px-2.5 sm:w-[13rem]">
              <ValorSelecao placeholder="Fornecedor" />
            </GatilhoSelecao>
            <ConteudoSelecao>
              <ItemSelecao value="TODOS">Todos os fornecedores</ItemSelecao>
              {derivado.fornecedores.map((f) => (
                <ItemSelecao key={f.id} value={f.id}>
                  {f.nome}
                </ItemSelecao>
              ))}
            </ConteudoSelecao>
          </Selecao>

          <Selecao value={status} onValueChange={setStatus}>
            <GatilhoSelecao tamanho="sm" className="w-full px-2.5 sm:w-[10.5rem]">
              <ValorSelecao placeholder="Estoque" />
            </GatilhoSelecao>
            <ConteudoSelecao>
              <ItemSelecao value="TODOS">Qualquer estoque</ItemSelecao>
              <ItemSelecao value="ZERADO">Zerado</ItemSelecao>
              <ItemSelecao value="CRITICO">Crítico</ItemSelecao>
              <ItemSelecao value="BAIXO">Baixo</ItemSelecao>
              <ItemSelecao value="SAUDAVEL">Saudável</ItemSelecao>
              <ItemSelecao value="EXCESSO">Excesso</ItemSelecao>
            </ConteudoSelecao>
          </Selecao>

          <Selecao value={margem} onValueChange={setMargem}>
            <GatilhoSelecao tamanho="sm" className="w-full px-2.5 sm:w-[11.5rem]">
              <ValorSelecao placeholder="Margem" />
            </GatilhoSelecao>
            <ConteudoSelecao>
              <ItemSelecao value="TODAS">Qualquer margem</ItemSelecao>
              <ItemSelecao value="BAIXA">Abaixo do mínimo</ItemSelecao>
              <ItemSelecao value="META">Acima da meta</ItemSelecao>
            </ConteudoSelecao>
          </Selecao>

          <label className="flex items-center gap-1.5 text-[12.5px] text-[var(--texto-suave)]">
            <input type="checkbox" checked={arquivados} onChange={(e) => setArquivados(e.target.checked)} className="size-3.5 accent-[var(--marca)]" />
            Arquivados
          </label>

        </div>

        {/* ------------------------- Ações em lote --------------------- */}
        {selecionados.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--borda)] bg-[var(--marca-suave)] px-3 py-2">
            <span className="text-[12.5px] font-medium text-[var(--texto)]">
              {selecionados.length} selecionado{selecionados.length > 1 ? 's' : ''}
            </span>
            <Botao tamanho="sm" variante="contorno" onClick={() => acoesEmLote('categoria')} disabled={categoria === 'TODAS'}>
              <Tag />
              Aplicar categoria do filtro
            </Botao>
            <Botao tamanho="sm" variante="contorno" onClick={() => acoesEmLote('fornecedor')} disabled={fornecedor === 'TODOS'}>
              <Package />
              Trocar fornecedor
            </Botao>
            <Botao tamanho="sm" variante="contorno" onClick={() => setSelecionados(filtrados.map((p) => p.id))}>
              Selecionar todos
            </Botao>
            <Botao tamanho="sm" variante="perigoSuave" onClick={() => acoesEmLote('arquivar')}>
              <Archive />
              Arquivar
            </Botao>
            <Botao tamanho="sm" variante="fantasma" onClick={() => setSelecionados([])}>
              <X />
              Limpar
            </Botao>
          </div>
        )}

        {visao === 'tabela' ? (
          <TabelaDados
            colunas={colunas}
            dados={filtrados}
            chave={(p) => p.id}
            aoClicarLinha={(p) => setDetalhe(p)}
            porPagina={15}
            ordenacaoInicial={[{ id: 'valorEstoque', desc: true }]}
            vazio={
              <EstadoVazio
                icone={Package}
                titulo={busca ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
                descricao={
                  busca
                    ? 'Tente outro termo ou limpe os filtros para ver todo o catálogo.'
                    : 'Cadastre seu primeiro SKU para começar a controlar custo, margem e estoque.'
                }
                acao={
                  <Botao
                    onClick={() => {
                      setEditando(null);
                      setAberto(true);
                    }}
                  >
                    <Plus />
                    Cadastrar produto
                  </Botao>
                }
                compacto
              />
            }
            colunaAcoes={(p) => <MenuAcoes p={p} aoAbrirDetalhe={setDetalhe} />}
          />
        ) : (
          <GradeProdutos produtos={filtrados} aoClicar={setDetalhe} />
        )}
      </Card>

      {/* ------------------------- Formulário ------------------------- */}
      <DialogoProduto
        aberto={aberto}
        aoFechar={() => {
          setAberto(false);
          setEditando(null);
        }}
        produto={editando}
        aoSalvar={aoSalvar}
        rbt12={rbt12}
      />

      {/* ------------------------- Detalhe rápido --------------------- */}
      <DrawerDetalhe produto={detalhe} aoFechar={() => {
        setDetalhe(null);
        if (foco) trocarConsulta({ foco: undefined });
      }} />
    </div>
  );
}

/* ============================ Menu de ações ============================ */

function MenuAcoes({ p, aoAbrirDetalhe }: { p: ProdutoCalculado; aoAbrirDetalhe: (p: ProdutoCalculado) => void }) {
  const { criar, arquivar, remover } = useDados();

  return (
    <Menu>
      <GatilhoMenu asChild>
        <Botao variante="fantasma" tamanho="iconeXs" aria-label={`Ações de ${p.nome}`}>
          <MoreVertical />
        </Botao>
      </GatilhoMenu>
      <ConteudoMenu align="end">
        <ItemMenu
          onSelect={() => {
            const novoSku = `${p.sku}-COPIA`;
            criar<Produto>('produtos', { ...p, sku: novoSku, nome: `${p.nome} (cópia)`, estoqueAtual: 0 });
            toast.success(`Cópia criada como ${novoSku}`);
          }}
        >
          <Copy />
          Duplicar
        </ItemMenu>
        <ItemMenu onSelect={() => window.dispatchEvent(new CustomEvent('tp:editar-produto', { detail: p.id }))}>
          <Pencil />
          Editar
        </ItemMenu>
        <ItemMenu onSelect={() => aoAbrirDetalhe(p)}>
          <TrendingUp />
          Detalhe rápido
        </ItemMenu>
        <ItemMenu onSelect={() => window.dispatchEvent(new CustomEvent('tp:tabela-preco', { detail: p.id }))}>
          <Tag />
          Gerar tabela de preço
        </ItemMenu>
        <SeparadorMenu />
        {!p.arquivado ? (
          <ItemMenu
            onSelect={() => {
              arquivar('produtos', p.id, true);
              toast.success(`${p.sku} arquivado`);
            }}
          >
            <Archive />
            Arquivar
          </ItemMenu>
        ) : (
          <ItemMenu
            onSelect={() => {
              arquivar('produtos', p.id, false);
              toast.success(`${p.sku} restaurado`);
            }}
          >
            <Archive />
            Restaurar
          </ItemMenu>
        )}
        <BotaoExcluir
          rotulo={`Excluir ${p.sku}?`}
          descricao="O produto será removido de todos os registros. Vendas antigas continuam com o histórico salvo."
          aoConfirmar={() => {
            remover('produtos', p.id);
            toast.success(`${p.sku} excluído`);
          }}
        >
          <ItemMenu destrutivo onSelect={(e) => e.preventDefault()}>
            <Trash2 />
            Excluir
          </ItemMenu>
        </BotaoExcluir>
      </ConteudoMenu>
    </Menu>
  );
}

/* ============================== Grade =================================== */

function GradeProdutos({
  produtos,
  aoClicar,
}: {
  produtos: ProdutoCalculado[];
  aoClicar: (p: ProdutoCalculado) => void;
}) {
  if (produtos.length === 0) {
    return <EstadoVazio icone={Package} titulo="Nenhum produto" descricao="Ajuste os filtros ou cadastre um novo SKU." compacto />;
  }
  return (
    <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {produtos.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => aoClicar(p)}
          className="flex flex-col gap-2 rounded-xl border border-[var(--borda)] p-3 text-left transition-colors hover:border-[var(--borda-forte)] hover:bg-[var(--superficie-2)]"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="num text-[11.5px] font-semibold text-[var(--marca)] dark:text-[var(--destaque)]">{p.sku}</p>
              <p className="truncate text-[13.5px] font-medium text-[var(--texto)]">{p.nome}</p>
            </div>
            <Etiqueta tom={TOM_ESTOQUE[p.statusEstoque]}>{rotuloStatus(p.statusEstoque)}</Etiqueta>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div>
              <p className="text-[var(--texto-tenue)]">Custo</p>
              <p className="num font-medium">{moeda(p.custoUnitario)}</p>
            </div>
            <div>
              <p className="text-[var(--texto-tenue)]">Preço</p>
              <p className="num font-medium">{moeda(p.precoVendaUnitario)}</p>
            </div>
            <div>
              <p className="text-[var(--texto-tenue)]">MC</p>
              <p className="num font-semibold" style={{ color: p.margemContribuicaoPct * 100 < 15 ? 'var(--alerta)' : 'var(--sucesso)' }}>
                {percentual(p.margemContribuicaoPct)}
              </p>
            </div>
            <div>
              <p className="text-[var(--texto-tenue)]">Em estoque</p>
              <p className="num font-medium">{moeda(p.valorEmEstoque)}</p>
            </div>
          </div>
          <BarraEstoque {...p} />
          <p className="text-[11.5px] text-[var(--texto-tenue)]">
            {numero(p.estoqueAtual)} un. · {p.nomeFornecedor}
          </p>
        </button>
      ))}
    </div>
  );
}

/* ============================ Formulário ================================ */

function DialogoProduto({
  aberto,
  aoFechar,
  produto,
  aoSalvar,
  rbt12,
}: {
  aberto: boolean;
  aoFechar: () => void;
  produto: Produto | null;
  aoSalvar: (d: FormProduto) => void;
  rbt12: number;
}) {
  const { derivado, configuracao, pedidosNoMes } = useDados();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormProduto>({
    resolver: zodResolver(esquema),
    defaultValues: {
      sku: '',
      nome: '',
      categoria: 'TEMPERO_EM_PO',
      marcaFornecedor: '',
      fornecedorId: '',
      unidadeCompra: 'Cx. c/ 12 und.',
      pesoLiquidoPorUnidade: 0.5,
      custoUnitario: 0,
      precoVendaUnitario: 0,
      estoqueAtual: 0,
      estoqueMinimo: 5,
      estoqueMaximo: 40,
      pontoDePedido: 10,
      localizacao: '',
      validade: '',
    },
  });

  useEffect(() => {
    if (!aberto) return;
    if (produto) {
      reset({
        sku: produto.sku,
        nome: produto.nome,
        categoria: produto.categoria,
        marcaFornecedor: produto.marcaFornecedor,
        fornecedorId: produto.fornecedorId,
        unidadeCompra: produto.unidadeCompra,
        pesoLiquidoPorUnidade: produto.pesoLiquidoPorUnidade,
        custoUnitario: produto.custoUnitario,
        precoVendaUnitario: produto.precoVendaUnitario,
        estoqueAtual: produto.estoqueAtual,
        estoqueMinimo: produto.estoqueMinimo,
        estoqueMaximo: produto.estoqueMaximo,
        pontoDePedido: produto.pontoDePedido,
        localizacao: produto.localizacao ?? '',
        validade: produto.validade ?? '',
      });
    } else {
      reset();
    }
  }, [aberto, produto, reset]);

  const custo = watch('custoUnitario') || 0;
  const preco = watch('precoVendaUnitario') || 0;

  // Cálculo em tempo real da margem — o mesmo do §7 aplicado ao produto (§7.2 + §7.1).
  const aliquota = aliquotaDe(rbt12);
  const entregaRateada = configuracao.custoEntregaMedioPadrao;
  const impostos = preco * (aliquota / 100);
  const comissao = preco * (configuracao.comissaoPadraoPct / 100);
  const mc = preco - impostos - custo - entregaRateada - comissao;
  const mcPct = preco > 0 ? (mc / preco) * 100 : 0;
  const margemBruta = preco > 0 ? ((preco - custo) / preco) * 100 : 0;
  const precoParaMargem = (m: number) => precoNecessario(custo + entregaRateada, m, aliquota);

  const salvar = handleSubmit((dados) => {
    aoSalvar({ ...dados, pesoLiquidoPorUnidade: Number(dados.pesoLiquidoPorUnidade) });
  });

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <ConteudoDialog largura="lg">
        <DialogCabecalho>
          <DialogTitulo>{produto ? `Editar ${produto.sku}` : 'Novo produto'}</DialogTitulo>
          <DialogDescricao>
            Os campos de estoque e ponto de pedido alimentam os alertas de reposição automaticamente.
          </DialogDescricao>
        </DialogCabecalho>
        <form onSubmit={salvar} id="form-produto">
          <DialogCorpo className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Código (SKU)" obrigatorio erro={errors.sku?.message} htmlFor="sku">
              <CampoTexto id="sku" {...register('sku')} placeholder="Ex.: PIM-500" autoComplete="off" />
            </Campo>
            <Campo rotulo="Nome do produto" obrigatorio erro={errors.nome?.message} htmlFor="nome">
              <CampoTexto id="nome" {...register('nome')} placeholder="Ex.: Pimenta-do-reino moída 500g" />
            </Campo>
            <Campo rotulo="Categoria" htmlFor="categoria">
              <Selecao value={watch('categoria')} onValueChange={(v) => setValue('categoria', v as CategoriaProduto)}>
                <GatilhoSelecao>
                  <ValorSelecao />
                </GatilhoSelecao>
                <ConteudoSelecao>
                  {CATEGORIAS.map((c) => (
                    <ItemSelecao key={c} value={c}>
                      {ROTULO_CATEGORIA_PRODUTO[c]}
                    </ItemSelecao>
                  ))}
                </ConteudoSelecao>
              </Selecao>
            </Campo>
            <Campo rotulo="Fornecedor" obrigatorio erro={errors.fornecedorId?.message}>
              <Selecao value={watch('fornecedorId')} onValueChange={(v) => setValue('fornecedorId', v)}>
                <GatilhoSelecao>
                  <ValorSelecao placeholder="Escolha…" />
                </GatilhoSelecao>
                <ConteudoSelecao>
                  {derivado.fornecedores.map((f) => (
                    <ItemSelecao key={f.id} value={f.id}>
                      {f.nome}
                    </ItemSelecao>
                  ))}
                </ConteudoSelecao>
              </Selecao>
            </Campo>
            <Campo rotulo="Marca do fornecedor" htmlFor="marca">
              <CampoTexto id="marca" {...register('marcaFornecedor')} placeholder="Ex.: Central" />
            </Campo>
            <Campo rotulo="Unidade de compra" obrigatorio erro={errors.unidadeCompra?.message} htmlFor="unidade">
              <CampoTexto id="unidade" {...register('unidadeCompra')} placeholder="Ex.: Cx. c/ 12 und." />
            </Campo>
            <Campo rotulo="Peso líquido por unidade (kg)" htmlFor="peso" dica="0,5 = 500g">
              <CampoTexto id="peso" type="number" step="0.01" {...register('pesoLiquidoPorUnidade')} />
            </Campo>
            <Campo rotulo="Localização no estoque" htmlFor="local">
              <CampoTexto id="local" {...register('localizacao')} placeholder="Ex.: Estoque A1" />
            </Campo>
            <Campo rotulo="Custo unitário (R$)" obrigatorio erro={errors.custoUnitario?.message} htmlFor="custo">
              <CampoTexto id="custo" type="number" step="0.01" inputMode="decimal" {...register('custoUnitario')} />
            </Campo>
            <Campo rotulo="Preço de venda (R$)" obrigatorio erro={errors.precoVendaUnitario?.message} htmlFor="preco">
              <CampoTexto id="preco" type="number" step="0.01" inputMode="decimal" {...register('precoVendaUnitario')} />
            </Campo>
            <Campo rotulo="Estoque atual" htmlFor="est">
              <CampoTexto id="est" type="number" {...register('estoqueAtual')} />
            </Campo>
            <Campo rotulo="Estoque mínimo" dica="Abaixo disso, vira crítico" htmlFor="estmin">
              <CampoTexto id="estmin" type="number" {...register('estoqueMinimo')} />
            </Campo>
            <Campo rotulo="Ponto de pedido" dica="Dispara o alerta de reposição" htmlFor="pp">
              <CampoTexto id="pp" type="number" {...register('pontoDePedido')} />
            </Campo>
            <Campo rotulo="Estoque máximo" htmlFor="estmax">
              <CampoTexto id="estmax" type="number" {...register('estoqueMaximo')} />
            </Campo>
            <Campo rotulo="Validade" dica="Deixe em branco se não tiver" htmlFor="val">
              <CampoTexto id="val" type="date" {...register('validade')} />
            </Campo>

            {/* -------------------- Painel de margem em tempo real ------ */}
            <div className="sm:col-span-2 rounded-xl border border-[var(--borda)] bg-[var(--acento)] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">
                    Margem em tempo real
                  </p>
                  <p className="mt-1 text-[12.5px] text-[var(--texto-suave)]">
                    Impostos {percentualNum(aliquota, 2)} (Simples Nacional) · entrega rateada{' '}
                    {moeda(entregaRateada)} · comissão {percentualNum(configuracao.comissaoPadraoPct)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className="num text-[26px] font-semibold leading-none"
                    style={{ color: mcPct < configuracao.margemMinimaAlerta ? 'var(--alerta)' : 'var(--sucesso)' }}
                  >
                    {percentualNum(mcPct)}
                  </p>
                  <p className="text-[11.5px] text-[var(--texto-suave)]">
                    {moeda(mc)} por unidade · margem bruta {percentualNum(margemBruta)}
                  </p>
                </div>
              </div>
              {mcPct < configuracao.margemMinimaAlerta && preco > 0 && (
                <p className="mt-2 rounded-md bg-[var(--alerta-suave)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--alerta)]">
                  Abaixo do mínimo de {configuracao.margemMinimaAlerta}%. Para chegar a {configuracao.margemAlvo}% de margem o
                  preço deveria ser {moeda(precoParaMargem(configuracao.margemAlvo))}.
                </p>
              )}
              <div className="mt-2.5 flex flex-wrap gap-2 text-[11.5px]">
                <span className="text-[var(--texto-tenue)]">Preço para 15%:</span>
                <button type="button" onClick={() => setValue('precoVendaUnitario', Number(precoParaMargem(15).toFixed(2)))} className="num rounded bg-[var(--superficie)] px-1.5 py-0.5 font-semibold hover:underline">
                  {moeda(precoParaMargem(15))}
                </button>
                <span className="text-[var(--texto-tenue)]">20%:</span>
                <button type="button" onClick={() => setValue('precoVendaUnitario', Number(precoParaMargem(20).toFixed(2)))} className="num rounded bg-[var(--superficie)] px-1.5 py-0.5 font-semibold hover:underline">
                  {moeda(precoParaMargem(20))}
                </button>
                <span className="text-[var(--texto-tenue)]">25%:</span>
                <button type="button" onClick={() => setValue('precoVendaUnitario', Number(precoParaMargem(25).toFixed(2)))} className="num rounded bg-[var(--superficie)] px-1.5 py-0.5 font-semibold hover:underline">
                  {moeda(precoParaMargem(25))}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-[var(--texto-tenue)]">
                Simulação §7.3: preço = custo ÷ (1 − imposto − margem). Despesa fixa rateada em{' '}
                {moeda(configuracao.tributacao.custoFixoMensal / Math.max(pedidosNoMes, 1))} por pedido.
              </p>
            </div>
          </DialogCorpo>
          <DialogRodape>
            <Botao type="button" variante="contorno" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit">
              {produto ? 'Salvar alterações' : 'Cadastrar produto'}
            </Botao>
          </DialogRodape>
        </form>
      </ConteudoDialog>
    </Dialog>
  );
}

/* ============================ Detalhe rápido ============================ */

function DrawerDetalhe({ produto, aoFechar }: { produto: ProdutoCalculado | null; aoFechar: () => void }) {
  const { derivado } = useDados();

  const historico = useMemo(() => {
    if (!produto) return [];
    return derivado.vendas
      .filter((v) => v.itens.some((i) => i.produtoId === produto.id))
      .map((v) => {
        const item = v.itens.find((i) => i.produtoId === produto.id)!;
        return { venda: v, quantidade: item.quantidade, total: item.quantidade * item.precoUnitario };
      })
      .sort((a, b) => b.venda.dataEmissao.localeCompare(a.venda.dataEmissao));
  }, [produto, derivado.vendas]);

  const curva = useMemo(() => (produto ? curvaEstoque(produto, derivado.vendas) : []), [produto, derivado.vendas]);

  if (!produto) return null;

  const totalUltimoCusto = historico[0]?.venda.itens.find((i) => i.produtoId === produto.id)?.custoUnitario;

  return (
    <Drawer open={!!produto} onOpenChange={(v) => !v && aoFechar()}>
      <ConteudoDrawer>
        <DrawerCabecalho>
          <p className="num text-[12px] font-semibold text-[var(--marca)] dark:text-[var(--destaque)]">{produto.sku}</p>
          <DrawerTitulo>{produto.nome}</DrawerTitulo>
          <DrawerDescricao>
            {ROTULO_CATEGORIA_PRODUTO[produto.categoria]} · {produto.nomeFornecedor}
          </DrawerDescricao>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Etiqueta tom={TOM_ESTOQUE[produto.statusEstoque]}>{rotuloStatus(produto.statusEstoque)}</Etiqueta>
            <Selo tom="neutro">{numero(produto.estoqueAtual)} em estoque</Selo>
            {produto.validade && <Selo tom="mostarda">Validade {dataBR(produto.validade)}</Selo>}
          </div>
        </DrawerCabecalho>
        <DrawerCorpo className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <MiniDado rotulo="Custo unitário" valor={moeda(produto.custoUnitario)} />
            <MiniDado rotulo="Preço de venda" valor={moeda(produto.precoVendaUnitario)} />
            <MiniDado rotulo="Margem bruta" valor={percentual(produto.margemBrutaPct)} />
            <MiniDado
              rotulo="Margem de contribuição"
              valor={percentual(produto.margemContribuicaoPct)}
              cor={produto.margemContribuicaoPct * 100 < 15 ? 'var(--alerta)' : 'var(--sucesso)'}
            />
            <MiniDado rotulo="Valor em estoque" valor={moeda(produto.valorEmEstoque)} />
            <MiniDado rotulo="Giro mensal" valor={`${numero(produto.giroMensal)} un.`} />
            <MiniDado
              rotulo="Dias de estoque"
              valor={produto.diasEstoque !== null ? `${numero(produto.diasEstoque)} dias` : 'Sem giro'}
            />
            <MiniDado
              rotulo="Último custo pago"
              valor={totalUltimoCusto !== undefined ? moeda(totalUltimoCusto) : '—'}
              dica="Custo congelado na última venda"
            />
          </div>

          <section>
            <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">Estoque nos últimos 3 meses</h4>
            <div className="mt-2 space-y-2">
              {curva.map((c) => (
                <div key={c.rotulo}>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[var(--texto-suave)]">{c.rotulo}</span>
                    <span className="num font-medium">{numero(c.valor)} un.</span>
                  </div>
                  <Progresso value={(c.valor / Math.max(produto.estoqueMaximo, c.valor, 1)) * 100} className="h-1.5" />
                </div>
              ))}
              {curva.length === 0 && <p className="text-[12.5px] text-[var(--texto-suave)]">Sem histórico de vendas no período.</p>}
            </div>
          </section>

          <section>
            <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">
              Histórico de vendas ({historico.length})
            </h4>
            {historico.length === 0 ? (
              <p className="mt-1.5 text-[12.5px] text-[var(--texto-suave)]">Este produto ainda não apareceu em nenhum pedido.</p>
            ) : (
              <ul className="mt-1.5 divide-y divide-[var(--borda)]">
                {historico.map((h) => (
                  <li key={h.venda.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-[var(--texto)]">
                        {h.venda.numero} · {h.venda.nomeCliente}
                      </p>
                      <p className="text-[11.5px] text-[var(--texto-tenue)]">{dataBR(h.venda.dataEmissao)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="num text-[12.5px] font-semibold">{moeda(h.total)}</p>
                      <p className="num text-[11.5px] text-[var(--texto-tenue)]">{numero(h.quantidade)} un.</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </DrawerCorpo>
        <DrawerRodape>
          <Botao variante="contorno" className="w-full" onClick={aoFechar}>
            Fechar
          </Botao>
        </DrawerRodape>
      </ConteudoDrawer>
    </Drawer>
  );
}

function MiniDado({ rotulo, valor, cor, dica }: { rotulo: string; valor: string; cor?: string; dica?: string }) {
  return (
    <div className="rounded-lg border border-[var(--borda)] p-2.5" title={dica}>
      <p className="text-[11.5px] text-[var(--texto-tenue)]">{rotulo}</p>
      <p className="num text-[15px] font-semibold" style={cor ? { color: cor } : undefined}>
        {valor}
      </p>
    </div>
  );
}

/* ============================== Auxiliares ============================== */

function rotuloStatus(s: StatusEstoque): string {
  return s === 'SAUDAVEL' ? 'Saudável' : s.charAt(0) + s.slice(1).toLowerCase();
}

/** Replica ANEXO_I do §7.1 sem duplicar a tabela de constantes. */
function aliquotaDe(rbt12: number): number {
  const faixas: Array<[number, number, number]> = [
    [180000, 4, 0],
    [360000, 7.3, 5940],
    [720000, 9.5, 13860],
    [1800000, 10.7, 22500],
    [3600000, 14.3, 87300],
    [4800000, 19, 378000],
  ];
  if (rbt12 <= 0) return 0;
  const [, aliq, ded] = faixas.find(([limite]) => rbt12 <= limite)!;
  return (rbt12 * (aliq / 100) - ded) / rbt12;
}

/**
 * Curva de estoque dos últimos 3 meses.
 * Reconstruída a partir do estoque atual menos o que foi vendido depois de cada mês.
 */
function curvaEstoque(
  produto: ProdutoCalculado,
  vendas: Array<{ dataEmissao: string; status: string; itens: Array<{ produtoId: string; quantidade: number; custoUnitario: number }> }>,
) {
  const hoje = new Date();
  const pontos: Array<{ rotulo: string; valor: number }> = [];
  for (let back = 3; back >= 1; back--) {
    const ref = new Date(hoje.getFullYear(), hoje.getMonth() - back, 0);
    const corte = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-31`;
    const vendidoDepois = vendas
      .filter((v) => !['CANCELADO', 'DEVOLVIDO'].includes(v.status) && v.dataEmissao > corte)
      .reduce((s, v) => s + v.itens.filter((i) => i.produtoId === produto.id).reduce((t, i) => t + i.quantidade, 0), 0);
    pontos.push({
      rotulo: ref.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      valor: Math.max(0, produto.estoqueAtual + vendidoDepois),
    });
  }
  pontos.push({ rotulo: 'Agora', valor: produto.estoqueAtual });
  return pontos;
}
