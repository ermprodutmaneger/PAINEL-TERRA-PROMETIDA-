import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Factory,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  ShieldAlert,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import { useDados } from '@/db/store';
import type { FornecedorCalculado } from '@/db/deriva';
import type { Fornecedor, Lancamento, Produto as TipoProduto } from '@/types';
import { moeda, numero, mascararCnpj, mascararTelefone, linkWhatsapp, dataBR } from '@/lib/format';
import { CabecalhoPagina, CartaoKpi, EstadoVazio, Etiqueta } from '@/components/comuns';
import { Botao } from '@/components/ui/button';
import { Card, CardCabecalho, CardConteudo, CardTitulo } from '@/components/ui/card';
import { AreaTexto, Campo, CampoTexto, Label } from '@/components/ui/input';
import { Interruptor } from '@/components/ui/misc';
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
import { ConteudoMenu, GatilhoMenu, ItemMenu, Menu, Progresso, SeparadorMenu } from '@/components/ui/misc';
import { Selo } from '@/components/ui/badge';
import { BarrasHorizontais } from '@/components/graficos';
import { validarCnpj, validarTelefone } from '@/lib/validacao';
import type { FretePorContaDe } from '@/types';
import { MaisVertical } from './icones-auxiliares';

const esquema = z.object({
  nome: z.string().min(3, 'Informe o nome do fornecedor'),
  razaoSocial: z.string().optional(),
  cnpj: z
    .string()
    .optional()
    .refine((v) => !v || validarCnpj(v), 'CNPJ inválido (14 dígitos)'),
  inscricaoEstadual: z.string().optional(),
  telefone: z
    .string()
    .min(10, 'Telefone incompleto')
    .refine((v) => validarTelefone(v), 'Telefone incompleto'),
  whatsapp: z.string().optional(),
  email: z.string().optional().refine((v) => !v || /\S+@\S+\.\S+/.test(v), 'E-mail inválido'),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().min(2, 'Informe a cidade'),
  uf: z.string().length(2, 'Use 2 letras'),
  cep: z.string().optional(),
  contatoNome: z.string().optional(),
  prazoPagamentoDias: z.coerce.number().min(0).max(120),
  pedidoMinimoValor: z.coerce.number().min(0),
  fretePorContaDe: z.enum(['FORNECEDOR', 'TERRA_PROMETIDA']),
  condicoesGerais: z.string().optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean(),
});

type FormFornecedor = z.infer<typeof esquema>;

export default function Fornecedores() {
  const { derivado, criar, atualizar, bd } = useDados();
  const [editando, setEditando] = useState<Fornecedor | null>(null);
  const [aberto, setAberto] = useState(false);
  const [detalhe, setDetalhe] = useState<FornecedorCalculado | null>(null);

  useEffect(() => {
    const aoNovo = () => {
      setEditando(null);
      setAberto(true);
    };
    window.addEventListener('tp:novo', aoNovo);
    return () => window.removeEventListener('tp:novo', aoNovo);
  }, []);

  /* --------- Indicador de dependência: categoria com um só fornecedor --- */
  const dependencias = useMemo(() => {
    const porCategoria = new Map<string, Set<string>>();
    for (const p of derivado.produtos.filter((x) => !x.arquivado && x.ativo)) {
      const set = porCategoria.get(p.categoria) ?? new Set<string>();
      if (p.fornecedorId) set.add(p.fornecedorId);
      porCategoria.set(p.categoria, set);
    }
    return [...porCategoria.entries()]
      .filter(([, set]) => set.size <= 1)
      .map(([categoria, set]) => ({
        categoria,
        fornecedorId: [...set][0] ?? '',
        produtos: derivado.produtos.filter((p) => p.categoria === categoria && !p.arquivado),
      }));
  }, [derivado.produtos]);

  const totais = useMemo(() => {
    const compras = derivado.fornecedores.reduce((s, f) => s + f.totalComprado, 0);
    const aPagar = bd.lancamentos.filter(
      (l) => !l.arquivado && l.tipo === 'SAIDA' && ['PENDENTE', 'VENCIDO'].includes(l.status) && l.fornecedorId,
    );
    return { compras, aPagar, aPagarValor: aPagar.reduce((s, l) => s + l.valor, 0) };
  }, [derivado.fornecedores, bd.lancamentos]);

  const aoSalvar = (dados: FormFornecedor) => {
    const payload = {
      ...dados,
      razaoSocial: dados.razaoSocial ?? '',
      inscricaoEstadual: dados.inscricaoEstadual ?? '',
      whatsapp: dados.whatsapp ?? dados.telefone,
      email: dados.email ?? '',
      contatoNome: dados.contatoNome ?? '',
      condicoesGerais: dados.condicoesGerais ?? '',
      observacoes: dados.observacoes ?? '',
      endereco: {
        logradouro: dados.logradouro ?? '',
        numero: dados.numero ?? '',
        bairro: dados.bairro ?? '',
        cidade: dados.cidade,
        uf: dados.uf.toUpperCase(),
        cep: dados.cep ?? '',
      },
      totalComprado: editando?.totalComprado ?? 0,
      ticketMedioCompra: editando?.ticketMedioCompra ?? 0,
      numeroDePedidos: editando?.numeroDePedidos ?? 0,
    };
    if (editando) {
      atualizar<Fornecedor>('fornecedores', editando.id, payload);
      toast.success('Fornecedor atualizado');
    } else {
      criar<Fornecedor>('fornecedores', payload);
      toast.success('Fornecedor cadastrado');
    }
    setAberto(false);
    setEditando(null);
  };

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        icone={Factory}
        titulo="Fornecedores"
        descricao="Quem abastece a operação, em que prazo e com qual pedido mínimo."
        acoes={
          <Botao
            onClick={() => {
              setEditando(null);
              setAberto(true);
            }}
          >
            <Plus />
            Novo fornecedor
          </Botao>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoKpi rotulo="Fornecedores ativos" valor={numero(derivado.fornecedores.filter((f) => !f.arquivado && f.ativo).length)} icone={Factory} />
        <CartaoKpi rotulo="Comprado (90 dias)" valor={moeda(totais.compras)} icone={ShoppingCart} />
        <CartaoKpi
          rotulo="Contas a pagar"
          valor={moeda(totais.aPagarValor)}
          apoio={`${numero(totais.aPagar.length)} títulos em aberto`}
          cor={totais.aPagar.some((l) => l.status === 'VENCIDO') ? 'var(--alerta)' : 'var(--marca)'}
          icone={Truck}
        />
        <CartaoKpi
          rotulo="Concentração de compras"
          valor={`${Math.max(0, ...derivado.fornecedores.map((f) => f.participacaoComprasPct)).toFixed(0)}%`}
          apoio="maior participação de um fornecedor"
          cor={Math.max(0, ...derivado.fornecedores.map((f) => f.participacaoComprasPct)) > 30 ? 'var(--atencao)' : 'var(--sucesso)'}
          icone={ShieldAlert}
        />
      </div>

      {/* --------------------- Alerta de dependência -------------------- */}
      {dependencias.length > 0 && (
        <Card className="border-[color-mix(in_srgb,#B5553A_35%,transparent)]">
          <CardCabecalho>
            <div>
              <CardTitulo className="flex items-center gap-2 text-[var(--alerta)]">
                <ShieldAlert className="size-4" aria-hidden />
                Risco de dependência de fornecedor
              </CardTitulo>
              <p className="mt-0.5 text-[12.5px] text-[var(--texto-suave)]">
                Estas categorias dependem de um único fornecedor. Se ele atrasar ou subir preço, a operação para.
              </p>
            </div>
          </CardCabecalho>
          <CardConteudo>
            <ul className="flex flex-wrap gap-2">
              {dependencias.map((d) => (
                <li
                  key={d.categoria}
                  className="rounded-lg border border-[var(--borda)] bg-[var(--acento)] px-3 py-2 text-[12.5px]"
                >
                  <span className="font-medium text-[var(--texto)]">
                    {derivado.produtos.find((p) => p.categoria === d.categoria)?.categoria &&
                      rotuloCategoria(d.categoria)}
                  </span>
                  <span className="text-[var(--texto-suave)]">
                    {' '}
                    — {derivado.fornecedores.find((f) => f.id === d.fornecedorId)?.nome ?? 'sem fornecedor'} (
                    {numero(d.produtos.length)} SKU{d.produtos.length > 1 ? 's' : ''})
                  </span>
                </li>
              ))}
            </ul>
          </CardConteudo>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {derivado.fornecedores.length === 0 ? (
            <Card>
              <EstadoVazio
                icone={Factory}
                titulo="Nenhum fornecedor cadastrado"
                descricao="Cadastre seus fornecedores para acompanhar prazo, pedido mínimo e histórico de compras."
                acao={
                  <Botao
                    onClick={() => {
                      setEditando(null);
                      setAberto(true);
                    }}
                  >
                    <Plus />
                    Cadastrar fornecedor
                  </Botao>
                }
              />
            </Card>
          ) : (
            derivado.fornecedores.map((f) => <CartaoFornecedor key={f.id} f={f} />)
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardCabecalho>
              <CardTitulo>Compras por fornecedor</CardTitulo>
            </CardCabecalho>
            <CardConteudo>
              {totais.compras === 0 ? (
                <EstadoVazio
                  compacto
                  icone={BarrasHorizontaisIcone}
                  titulo="Sem compras registradas"
                  descricao="Lance uma compra em Financeiro para o gráfico aparecer."
                />
              ) : (
                <BarrasHorizontais
                  dados={derivado.fornecedores
                    .filter((f) => f.totalComprado > 0)
                    .map((f) => ({ nome: f.nome, valor: f.totalComprado }))
                    .sort((a, b) => b.valor - a.valor)}
                  aoClicar={(nome) => {
                    const alvo = derivado.fornecedores.find((x) => x.nome === nome);
                    if (alvo) setDetalhe(alvo);
                  }}
                />
              )}
            </CardConteudo>
          </Card>
        </div>
      </div>

      <DialogoFornecedor
        aberto={aberto}
        aoFechar={() => {
          setAberto(false);
          setEditando(null);
        }}
        fornecedor={editando}
        aoSalvar={aoSalvar}
      />
      <DrawerDetalheFornecedor
        fornecedor={detalhe}
        aoFechar={() => setDetalhe(null)}
        aoEditar={(f) => {
          setDetalhe(null);
          setEditando(f);
          setAberto(true);
        }}
      />
    </div>
  );
}

function BarrasHorizontaisIcone() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

/* ========================== Cartão do fornecedor ========================= */

function CartaoFornecedor({ f }: { f: FornecedorCalculado }) {
  const { arquivar, remover } = useDados();
  return (
    <Card className="p-4 transition-shadow hover:shadow-[var(--shadow-pop)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold text-[var(--texto)]">{f.nome}</h3>
            {f.participacaoComprasPct > 30 && <Etiqueta tom="mostarda">{f.participacaoComprasPct.toFixed(0)}% das compras</Etiqueta>}
            {f.arquivado && <Etiqueta tom="cinza">Arquivado</Etiqueta>}
            {!f.ativo && <Etiqueta tom="terracota">Inativo</Etiqueta>}
          </div>
          <p className="mt-0.5 text-[12.5px] text-[var(--texto-suave)]">
            {f.endereco.cidade}/{f.endereco.uf}
            {f.contatoNome && ` · ${f.contatoNome}`}
            {f.cnpj && ` · CNPJ ${f.cnpj}`}
          </p>
        </div>
        <Menu>
          <GatilhoMenu asChild>
            <Botao variante="fantasma" tamanho="iconeSm" aria-label={`Ações de ${f.nome}`}>
              <MaisVertical />
            </Botao>
          </GatilhoMenu>
          <ConteudoMenu>
            <ItemMenu onSelect={() => window.dispatchEvent(new CustomEvent('tp:editar-fornecedor', { detail: f.id }))}>
              Editar cadastro
            </ItemMenu>
            <ItemMenu onSelect={() => window.open(linkWhatsapp(f.whatsapp || f.telefone, `Olá, ${f.nome}! Aqui é da Terra Prometida Express. Podemos falar sobre o próximo pedido?`), '_blank')}>
              <MessageCircle />
              Chamar no WhatsApp
            </ItemMenu>
            <SeparadorMenu />
            <ItemMenu
              onSelect={() => {
                arquivar('fornecedores', f.id, !f.arquivado);
                toast.success(f.arquivado ? 'Fornecedor restaurado' : 'Fornecedor arquivado');
              }}
            >
              {f.arquivado ? 'Restaurar' : 'Arquivar'}
            </ItemMenu>
            <BotaoExcluir
              rotulo={`Excluir ${f.nome}?`}
              descricao="Os lançamentos de compra serão mantidos, mas o fornecedor sairá da lista."
              aoConfirmar={() => {
                remover('fornecedores', f.id);
                toast.success('Fornecedor excluído');
              }}
            >
              <ItemMenu destrutivo onSelect={(e) => e.preventDefault()}>
                Excluir
              </ItemMenu>
            </BotaoExcluir>
          </ConteudoMenu>
        </Menu>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dado rotulo="Prazo de pagamento" valor={f.prazoPagamentoDias === 0 ? 'À vista' : `${f.prazoPagamentoDias} dias`} />
        <Dado rotulo="Pedido mínimo" valor={moeda(f.pedidoMinimoValor)} />
        <Dado rotulo="Total comprado" valor={moeda(f.totalComprado)} />
        <Dado rotulo="Ticket médio" valor={moeda(f.ticketMedioCompra)} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a href={`tel:${f.telefone.replace(/\D/g, '')}`}>
          <Botao variante="contorno" tamanho="sm">
            <Phone />
            {f.telefone}
          </Botao>
        </a>
        <a href={linkWhatsapp(f.whatsapp || f.telefone, `Olá, ${f.contatoNome ?? f.nome}! Aqui é da Terra Prometida Express.`)} target="_blank" rel="noreferrer">
          <Botao variante="contorno" tamanho="sm">
            <MessageCircle />
            WhatsApp
          </Botao>
        </a>
        {f.email && (
          <a href={`mailto:${f.email}`}>
            <Botao variante="fantasma" tamanho="sm">
              <Mail />
              {f.email}
            </Botao>
          </a>
        )}
        <Selo tom="neutro" className="ml-auto">
          {numero(f.numProdutos)} SKUs
        </Selo>
      </div>

      {f.condicoesGerais && <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--texto-suave)]">{f.condicoesGerais}</p>}
    </Card>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="text-[11.5px] text-[var(--texto-tenue)]">{rotulo}</p>
      <p className="num text-[14px] font-semibold text-[var(--texto)]">{valor}</p>
    </div>
  );
}

/* ============================== Formulário ============================== */

function DialogoFornecedor({
  aberto,
  aoFechar,
  fornecedor,
  aoSalvar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  fornecedor: Fornecedor | null;
  aoSalvar: (d: FormFornecedor) => void;
}) {
  const { derivado } = useDados();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormFornecedor>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nome: '',
      razaoSocial: '',
      cnpj: '',
      inscricaoEstadual: '',
      telefone: '',
      whatsapp: '',
      email: '',
      logradouro: '',
      numero: '',
      bairro: '',
      cidade: '',
      uf: 'SP',
      cep: '',
      contatoNome: '',
      prazoPagamentoDias: 14,
      pedidoMinimoValor: 300,
      fretePorContaDe: 'FORNECEDOR',
      condicoesGerais: '',
      observacoes: '',
      ativo: true,
    },
  });

  useEffect(() => {
    if (fornecedor) {
      reset({
        nome: fornecedor.nome,
        razaoSocial: fornecedor.razaoSocial ?? '',
        cnpj: fornecedor.cnpj ?? '',
        inscricaoEstadual: fornecedor.inscricaoEstadual ?? '',
        telefone: fornecedor.telefone,
        whatsapp: fornecedor.whatsapp,
        email: fornecedor.email ?? '',
        logradouro: fornecedor.endereco.logradouro,
        numero: fornecedor.endereco.numero,
        bairro: fornecedor.endereco.bairro,
        cidade: fornecedor.endereco.cidade,
        uf: fornecedor.endereco.uf,
        cep: fornecedor.endereco.cep,
        contatoNome: fornecedor.contatoNome ?? '',
        prazoPagamentoDias: fornecedor.prazoPagamentoDias,
        pedidoMinimoValor: fornecedor.pedidoMinimoValor,
        fretePorContaDe: fornecedor.fretePorContaDe,
        condicoesGerais: fornecedor.condicoesGerais ?? '',
        observacoes: fornecedor.observacoes ?? '',
        ativo: fornecedor.ativo,
      });
    } else if (aberto) {
      reset();
    }
  }, [fornecedor, aberto, reset]);

  useEffect(() => {
    const aoEditar = (e: Event) => {
      const alvo = derivado.fornecedores.find((f) => f.id === (e as CustomEvent<string>).detail);
      if (alvo) {
        setValue('nome', alvo.nome);
        reset({
          nome: alvo.nome,
          razaoSocial: alvo.razaoSocial ?? '',
          cnpj: alvo.cnpj ?? '',
          inscricaoEstadual: alvo.inscricaoEstadual ?? '',
          telefone: alvo.telefone,
          whatsapp: alvo.whatsapp,
          email: alvo.email ?? '',
          logradouro: alvo.endereco.logradouro,
          numero: alvo.endereco.numero,
          bairro: alvo.endereco.bairro,
          cidade: alvo.endereco.cidade,
          uf: alvo.endereco.uf,
          cep: alvo.endereco.cep,
          contatoNome: alvo.contatoNome ?? '',
          prazoPagamentoDias: alvo.prazoPagamentoDias,
          pedidoMinimoValor: alvo.pedidoMinimoValor,
          fretePorContaDe: alvo.fretePorContaDe,
          condicoesGerais: alvo.condicoesGerais ?? '',
          observacoes: alvo.observacoes ?? '',
          ativo: alvo.ativo,
        });
      }
    };
    window.addEventListener('tp:editar-fornecedor', aoEditar);
    return () => window.removeEventListener('tp:editar-fornecedor', aoEditar);
  }, [derivado.fornecedores, reset, setValue]);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <ConteudoDialog largura="lg">
        <DialogCabecalho>
          <DialogTitulo>{fornecedor ? `Editar ${fornecedor.nome}` : 'Novo fornecedor'}</DialogTitulo>
          <DialogDescricao>
            Prazo e pedido mínimo alimentam o cálculo de capital de giro necessário.
          </DialogDescricao>
        </DialogCabecalho>
        <form onSubmit={handleSubmit(aoSalvar)}>
          <DialogCorpo className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Nome fantasia" obrigatorio erro={errors.nome?.message} className="sm:col-span-2" htmlFor="fnome">
              <CampoTexto id="fnome" {...register('nome')} placeholder="Ex.: Distribuidora Central de Especiarias" />
            </Campo>
            <Campo rotulo="Razão social" htmlFor="frazao">
              <CampoTexto id="frazao" {...register('razaoSocial')} placeholder="Nome no CNPJ" />
            </Campo>
            <Campo rotulo="CNPJ" erro={errors.cnpj?.message} htmlFor="fcnpj">
              <CampoTexto
                id="fcnpj"
                inputMode="numeric"
                {...register('cnpj', {
                  setValueAs: (v: string) => v,
                  onChange: (e) => setValue('cnpj', mascararCnpj(e.target.value)),
                })}
                placeholder="00.000.000/0000-00"
              />
            </Campo>
            <Campo rotulo="Inscrição estadual" htmlFor="fie">
              <CampoTexto id="fie" {...register('inscricaoEstadual')} />
            </Campo>
            <Campo rotulo="Telefone" obrigatorio erro={errors.telefone?.message} htmlFor="ftel">
              <CampoTexto
                id="ftel"
                inputMode="tel"
                {...register('telefone', { onChange: (e) => setValue('telefone', mascararTelefone(e.target.value)) })}
                placeholder="(11) 3000-0000"
              />
            </Campo>
            <Campo rotulo="WhatsApp" erro={errors.whatsapp?.message} htmlFor="fwa">
              <CampoTexto
                id="fwa"
                inputMode="tel"
                {...register('whatsapp', { onChange: (e) => setValue('whatsapp', mascararTelefone(e.target.value)) })}
                placeholder="(11) 90000-0000"
              />
            </Campo>
            <Campo rotulo="E-mail" erro={errors.email?.message} htmlFor="fmail">
              <CampoTexto id="fmail" type="email" {...register('email')} placeholder="pedidos@fornecedor.com.br" />
            </Campo>
            <Campo rotulo="Pessoa de contato" htmlFor="fcont">
              <CampoTexto id="fcont" {...register('contatoNome')} placeholder="Quem responde pelo comercial" />
            </Campo>
            <Campo rotulo="Endereço" htmlFor="flog">
              <CampoTexto id="flog" {...register('logradouro')} />
            </Campo>
            <div className="grid grid-cols-3 gap-3">
              <Campo rotulo="Nº" htmlFor="fnum">
                <CampoTexto id="fnum" {...register('numero')} />
              </Campo>
              <Campo rotulo="Bairro" className="col-span-2" htmlFor="fbai">
                <CampoTexto id="fbai" {...register('bairro')} />
              </Campo>
            </div>
            <Campo rotulo="Cidade" obrigatorio erro={errors.cidade?.message} htmlFor="fcid">
              <CampoTexto id="fcid" {...register('cidade')} />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="UF" erro={errors.uf?.message} htmlFor="fuf">
                <CampoTexto id="fuf" maxLength={2} {...register('uf')} className="uppercase" />
              </Campo>
              <Campo rotulo="CEP" htmlFor="fcep">
                <CampoTexto id="fcep" inputMode="numeric" {...register('cep')} />
              </Campo>
            </div>
            <Campo rotulo="Prazo de pagamento (dias)" dica="0 = à vista" erro={errors.prazoPagamentoDias?.message} htmlFor="fprazo">
              <CampoTexto id="fprazo" type="number" min={0} {...register('prazoPagamentoDias')} />
            </Campo>
            <Campo rotulo="Pedido mínimo (R$)" erro={errors.pedidoMinimoValor?.message} htmlFor="fmin">
              <CampoTexto id="fmin" type="number" step="0.01" {...register('pedidoMinimoValor')} />
            </Campo>
            <Campo rotulo="Frete por conta de" htmlFor="ffrete">
              <Selecao value={watch('fretePorContaDe')} onValueChange={(v) => setValue('fretePorContaDe', v as FretePorContaDe)}>
                <GatilhoSelecao>
                  <ValorSelecao />
                </GatilhoSelecao>
                <ConteudoSelecao>
                  <ItemSelecao value="FORNECEDOR">Do fornecedor</ItemSelecao>
                  <ItemSelecao value="TERRA_PROMETIDA">Da Terra Prometida</ItemSelecao>
                </ConteudoSelecao>
              </Selecao>
            </Campo>
            <Campo rotulo="Ativo" htmlFor="fativo">
              <label className="flex h-9 items-center gap-2 text-[13px]">
                <Interruptor
                  id="fativo"
                  checked={watch('ativo')}
                  onCheckedChange={(v) => setValue('ativo', v)}
                />
                {watch('ativo') ? 'Fornecedor ativo' : 'Fornecedor inativo'}
              </label>
            </Campo>
            <Campo rotulo="Condições gerais" className="sm:col-span-2" htmlFor="fcond">
              <AreaTexto id="fcond" {...register('condicoesGerais')} placeholder="Prazo, embarque, tipo de embalagem…" />
            </Campo>
            <Campo rotulo="Observações" className="sm:col-span-2" htmlFor="fobs">
              <AreaTexto id="fobs" {...register('observacoes')} />
            </Campo>
          </DialogCorpo>
          <DialogRodape>
            <Botao type="button" variante="contorno" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit">{fornecedor ? 'Salvar alterações' : 'Cadastrar fornecedor'}</Botao>
          </DialogRodape>
        </form>
      </ConteudoDialog>
    </Dialog>
  );
}

/* ============================== Detalhe ================================= */

function DrawerDetalheFornecedor({
  fornecedor,
  aoFechar,
  aoEditar,
}: {
  fornecedor: FornecedorCalculado | null;
  aoFechar: () => void;
  aoEditar: (f: Fornecedor) => void;
}) {
  const { derivado, bd, criar, atualizar } = useDados();
  const [compraAberta, setCompraAberta] = useState(false);

  const compras = useMemo(
    () =>
      bd.lancamentos
        .filter((l) => l.fornecedorId === fornecedor?.id && /compra|mercadoria/i.test(l.categoria))
        .sort((a, b) => b.data.localeCompare(a.data)),
    [bd.lancamentos, fornecedor],
  );

  const produtos = derivado.produtos.filter((p) => p.fornecedorId === fornecedor?.id && !p.arquivado);

  if (!fornecedor) return null;

  return (
    <Drawer open={!!fornecedor} onOpenChange={(v) => !v && aoFechar()}>
      <ConteudoDrawer>
        <DrawerCabecalho>
          <DrawerTitulo>{fornecedor.nome}</DrawerTitulo>
          <DrawerDescricao>
            {fornecedor.razaoSocial ?? fornecedor.nome} · {fornecedor.endereco.cidade}/{fornecedor.endereco.uf}
          </DrawerDescricao>
        </DrawerCabecalho>
        <DrawerCorpo className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Dado rotulo="Prazo" valor={fornecedor.prazoPagamentoDias === 0 ? 'À vista' : `${fornecedor.prazoPagamentoDias} dias`} />
            <Dado rotulo="Pedido mínimo" valor={moeda(fornecedor.pedidoMinimoValor)} />
            <Dado rotulo="Frete" valor={fornecedor.fretePorContaDe === 'FORNECEDOR' ? 'Do fornecedor' : 'Terra Prometida'} />
            <Dado rotulo="Participação" valor={`${fornecedor.participacaoComprasPct.toFixed(1)}%`} />
          </div>

          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">Participação nas compras</p>
            <Progresso value={fornecedor.participacaoComprasPct} cor={fornecedor.participacaoComprasPct > 30 ? 'var(--atencao)' : 'var(--sucesso)'} className="mt-2" />
          </div>

          <section>
            <div className="flex items-center justify-between">
              <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">
                Produtos fornecidos ({produtos.length})
              </h4>
              <Botao tamanho="sm" variante="contorno" onClick={() => setCompraAberta(true)}>
                <ShoppingCart />
                Lançar compra
              </Botao>
            </div>
            <ul className="mt-2 divide-y divide-[var(--borda)]">
              {produtos.length === 0 && <li className="py-2 text-[12.5px] text-[var(--texto-suave)]">Nenhum produto vinculado.</li>}
              {produtos.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="num text-[12px] font-semibold text-[var(--marca)] dark:text-[var(--destaque)]">{p.sku}</p>
                    <p className="truncate text-[12.5px] text-[var(--texto)]">{p.nome}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="num text-[12.5px] font-medium">{moeda(p.custoUnitario)}</p>
                    <p className="num text-[11.5px] text-[var(--texto-tenue)]">{numero(p.estoqueAtual)} un.</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">
              Histórico de compras ({compras.length})
            </h4>
            <ul className="mt-2 divide-y divide-[var(--borda)]">
              {compras.length === 0 && <li className="py-2 text-[12.5px] text-[var(--texto-suave)]">Nenhuma compra lançada.</li>}
              {compras.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] text-[var(--texto)]">{c.descricao}</p>
                    <p className="text-[11.5px] text-[var(--texto-tenue)]">
                      {dataBR(c.data)} · {c.status === 'PAGO' ? 'Pago' : c.status === 'VENCIDO' ? 'Vencido' : 'Em aberto'}
                    </p>
                  </div>
                  <span className="num shrink-0 text-[12.5px] font-semibold">{moeda(c.valor)}</span>
                </li>
              ))}
            </ul>
          </section>
        </DrawerCorpo>
        <DrawerRodape className="flex gap-2">
          <Botao variante="contorno" className="flex-1" onClick={aoFechar}>
            Fechar
          </Botao>
          <Botao className="flex-1" onClick={() => aoEditar(fornecedor)}>
            Editar cadastro
          </Botao>
        </DrawerRodape>
      </ConteudoDrawer>
      <DialogoCompraRecebida
        aberto={compraAberta}
        aoFechar={() => setCompraAberta(false)}
        fornecedor={fornecedor}
        aoRegistrar={(linhas, total, descricao) => {
          // Atualiza o custo do produto e gera a conta a pagar (fluxo essencial do §8.3).
          // O novo custo é o custo médio pago nesta compra: total ÷ quantidade total.
          const qtdTotal = linhas.reduce((s, l) => s + l.quantidade, 0);
          const custoMedio = qtdTotal > 0 ? total / qtdTotal : 0;
          for (const l of linhas) {
            const alvo = derivado.produtos.find((x) => x.id === l.produtoId);
            if (!alvo) continue;
            atualizar<TipoProduto>('produtos', alvo.id, {
              custoUnitario: Number(custoMedio.toFixed(4)),
              estoqueAtual: alvo.estoqueAtual + l.quantidade,
            });
          }
          criar<Lancamento>('lancamentos', {
            tipo: 'SAIDA',
            categoria: 'Compras de Mercadorias',
            subcategoria: 'Reposição de estoque',
            descricao: descricao || `Compra — ${fornecedor.nome}`,
            valor: total,
            data: new Date().toISOString().slice(0, 10),
            dataVencimento: new Date(Date.now() + fornecedor.prazoPagamentoDias * 86_400_000).toISOString().slice(0, 10),
            status: 'PENDENTE',
            fornecedorId: fornecedor.id,
            formaPagamento: fornecedor.prazoPagamentoDias === 0 ? 'PIX' : 'BOLETO',
            recorrente: false,
            fixo: false,
          });
          toast.success('Compra registrada: custo atualizado e conta a pagar gerada');
          setCompraAberta(false);
        }}
      />
    </Drawer>
  );
}

/* ====================== Lançamento de compra recebida ==================== */

function DialogoCompraRecebida({
  aberto,
  aoFechar,
  fornecedor,
  aoRegistrar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  fornecedor: FornecedorCalculado;
  aoRegistrar: (linhas: Array<{ produtoId: string; quantidade: number }>, total: number, descricao: string) => void;
}) {
  const { derivado } = useDados();
  const [linhas, setLinhas] = useState<Array<{ produtoId: string; quantidade: number }>>([]);
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    if (aberto) {
      setLinhas([]);
      setDescricao(`Compra — ${fornecedor.nome}`);
    }
  }, [aberto, fornecedor]);

  const total = linhas.reduce((s, l) => {
    const p = derivado.produtos.find((x) => x.id === l.produtoId);
    return s + (p ? p.custoUnitario * l.quantidade : 0);
  }, 0);

  const abaixoDoMinimo = total > 0 && total < fornecedor.pedidoMinimoValor;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <ConteudoDialog largura="md">
        <DialogCabecalho>
          <DialogTitulo>Lançar compra recebida</DialogTitulo>
          <DialogDescricao>
            Ao confirmar, o custo dos produtos é atualizado e a conta a pagar é criada automaticamente.
          </DialogDescricao>
        </DialogCabecalho>
        <DialogCorpo className="space-y-3">
          <Campo rotulo="Descrição do pedido" htmlFor="cdesc">
            <CampoTexto id="cdesc" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </Campo>

          <div className="space-y-2">
            <Label>Itens recebidos</Label>
            {linhas.length === 0 && (
              <p className="rounded-lg border border-dashed border-[var(--borda-forte)] p-3 text-center text-[12.5px] text-[var(--texto-suave)]">
                Adicione os produtos recebidos para recalcular o custo.
              </p>
            )}
            {linhas.map((l, idx) => {
              const p = derivado.produtos.find((x) => x.id === l.produtoId);
              return (
                <div key={idx} className="flex items-end gap-2 rounded-lg border border-[var(--borda)] p-2">
                  <Campo rotulo="Produto" className="flex-1">
                    <Selecao
                      value={l.produtoId}
                      onValueChange={(v: string) =>
                        setLinhas((ls) => ls.map((x, i) => (i === idx ? { ...x, produtoId: v } : x)))
                      }
                    >
                      <GatilhoSelecao tamanho="sm">
                        <ValorSelecao placeholder="Escolha…" />
                      </GatilhoSelecao>
                      <ConteudoSelecao>
                        {derivado.produtos.map((x) => (
                          <ItemSelecao key={x.id} value={x.id}>
                            {x.sku} — {x.nome}
                          </ItemSelecao>
                        ))}
                      </ConteudoSelecao>
                    </Selecao>
                  </Campo>
                  <Campo rotulo="Qtd." className="w-20">
                    <CampoTexto
                      type="number"
                      min={1}
                      value={l.quantidade}
                      onChange={(e) =>
                        setLinhas((ls) => ls.map((x, i) => (i === idx ? { ...x, quantidade: Number(e.target.value) } : x)))
                      }
                    />
                  </Campo>
                  <p className="num h-9 pb-1.5 text-[13px] font-semibold">{moeda(p ? p.custoUnitario * l.quantidade : 0)}</p>
                  <Botao
                    variante="fantasma"
                    tamanho="iconeSm"
                    aria-label="Remover item"
                    onClick={() => setLinhas((ls) => ls.filter((_, i) => i !== idx))}
                  >
                    ×
                  </Botao>
                </div>
              );
            })}
            <Botao
              tamanho="sm"
              variante="contorno"
              onClick={() => setLinhas((ls) => [...ls, { produtoId: derivadosPrimeiro(fornecedor.id, derivado.produtos), quantidade: 1 }])}
            >
              <Plus />
              Adicionar item
            </Botao>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-[var(--acento)] px-3 py-2">
            <span className="text-[13px] text-[var(--texto-suave)]">Total da compra</span>
            <span className="num text-[16px] font-semibold">{moeda(total)}</span>
          </div>

          {abaixoDoMinimo && (
            <p className="rounded-md bg-[var(--atencao-suave)] px-2.5 py-2 text-[12.5px] text-[var(--atencao)]">
              Abaixo do pedido mínimo de {moeda(fornecedor.pedidoMinimoValor)} deste fornecedor.
            </p>
          )}
          <p className="text-[11.5px] text-[var(--texto-tenue)]">
            Prazo de pagamento: {fornecedor.prazoPagamentoDias === 0 ? 'à vista' : `${fornecedor.prazoPagamentoDias} dias`}.
          </p>
        </DialogCorpo>
        <DialogRodape>
          <Botao variante="contorno" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao
            disabled={linhas.length === 0 || total <= 0}
            onClick={() => aoRegistrar(linhas, total, descricao)}
          >
            <ShoppingCart />
            Registrar compra
          </Botao>
        </DialogRodape>
      </ConteudoDialog>
    </Dialog>
  );
}

function derivadosPrimeiro(fornecedorId: string, produtos: Array<{ id: string; fornecedorId: string }>): string {
  return produtos.find((p) => p.fornecedorId === fornecedorId)?.id ?? produtos[0]?.id ?? '';
}

function rotuloCategoria(c: string): string {
  const mapa: Record<string, string> = {
    PIMENTA_E_PIMENTAO: 'Pimenta e Pimentão',
    SAL: 'Sal',
    TEMPERO_EM_PO: 'Tempero em Pó',
    TEMPERO_LIQUIDO: 'Tempero Líquido',
    ALHO_E_CEBOLA: 'Alho e Cebola',
    ESPECIARIA: 'Especiaria',
    MISTURAS_E_TEMPEROS_COMPLETOS: 'Misturas Completas',
    OUTROS: 'Outros',
  };
  return mapa[c] ?? c;
}

