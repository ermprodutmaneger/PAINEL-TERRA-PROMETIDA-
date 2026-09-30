import { useMemo, useState } from 'react';
import { Copy, Download, FileText, KeyRound, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDados } from '@/db/store';
import { dentroDoPeriodo } from '@/db/deriva';
import {
  type BaseEntidade,
  ROTULO_FORMA_PAGAMENTO,
  ROTULO_STATUS_NOTA,
  type FormaPagamento,
  type NotaFiscal,
  type StatusNota,
} from '@/types';
import { dataBR, hojeISO, linkWhatsapp, moeda, numeroParaInput, paraNumero, somaDias } from '@/lib/format';
import { exportarCSV } from '@/lib/arquivos';
import { aliquotaEfetivaPct } from '@/lib/calculos';
import { TOM_NOTA } from '@/lib/cores';
import { Card, CardCabecalho, CardConteudo, CardDescricao, CardTitulo } from '@/components/ui/card';
import { Botao } from '@/components/ui/button';
import { Campo, CampoTexto } from '@/components/ui/input';
import { ConteudoSelecao, GatilhoSelecao, ItemSelecao, Selecao, ValorSelecao } from '@/components/ui/select';
import {
  BotaoExcluir,
  ConteudoDialog,
  Dialog,
  DialogCabecalho,
  DialogCorpo,
  DialogDescricao,
  DialogRodape,
  DialogTitulo,
} from '@/components/ui/dialog';
import { BotaoCopiar, CabecalhoPagina, CartaoKpi, EstadoVazio, Etiqueta, formatarContagem } from '@/components/comuns';
import { TabelaDados } from '@/components/tabela-dados';
import { SeletorPeriodo } from '@/components/SeletorPeriodo';
import { usePeriodo } from '@/hooks/usePeriodo';

const STATUS: StatusNota[] = ['PENDENTE', 'EMITIDA', 'ENVIADA', 'PAGA', 'VENCIDA', 'CANCELADA'];

export default function NotasFiscais() {
  const { bd, derivado, rbt12, criar, atualizar, remover } = useDados();
  const [periodo, definirPeriodo] = usePeriodo();
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | StatusNota>('TODOS');
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<NotaFiscal | null>(null);

  const notas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return bd.notasFiscais
      .filter((n) => !n.arquivado)
      .filter((n) => (filtroStatus === 'TODOS' ? true : n.status === filtroStatus))
      .filter((n) => (t ? `${n.numero} ${n.serie} ${derivado.clientes.find((c) => c.id === n.clienteId)?.nome ?? ''}`.toLowerCase().includes(t) : true))
      .sort((a, b) => b.dataEmissao.localeCompare(a.dataEmissao));
  }, [bd.notasFiscais, busca, filtroStatus, derivado.clientes]);

  const noPeriodo = useMemo(
    () => notas.filter((n) => dentroDoPeriodo(n.dataEmissao, periodo.inicio, periodo.fim)),
    [notas, periodo],
  );

  const resumo = useMemo(() => {
    const emitidas = noPeriodo.filter((n) => n.status !== 'CANCELADA');
    const pagas = noPeriodo.filter((n) => n.status === 'PAGA');
    const emAberto = emitidas.filter((n) => n.status === 'EMITIDA');
    return {
      total: emitidas.reduce((s, n) => s + n.valorTotal, 0),
      impostos: emitidas.reduce((s, n) => s + n.valorImpostos, 0),
      aReceber: emAberto.reduce((s, n) => s + n.valorTotal, 0),
      pagas: pagas.reduce((s, n) => s + n.valorTotal, 0),
      quantidade: emitidas.length,
    };
  }, [noPeriodo]);

  const pagar = (n: NotaFiscal) => {
    if (n.status === 'PAGA') {
      atualizar<NotaFiscal>('notasFiscais', n.id, { status: 'EMITIDA', valorPago: undefined, dataPagamento: undefined });
      toast.success(`NF ${n.numero} voltou para emitida.`);
      return;
    }
    atualizar<NotaFiscal>('notasFiscais', n.id, { status: 'PAGA', valorPago: n.valorTotal, dataPagamento: hojeISO() });
    toast.success(`NF ${n.numero} marcada como paga.`);
  };

  const exportar = () => {
    exportarCSV(
      `notas-fiscais-${periodo.inicio}-a-${periodo.fim}`,
      ['Número', 'Série', 'Modelo', 'Cliente', 'Emissão', 'Vencimento', 'Valor total', 'Impostos', 'Status', 'Valor pago', 'Pagamento'],
      noPeriodo.map((n) => [
        n.numero,
        n.serie,
        n.modelo,
        derivado.clientes.find((c) => c.id === n.clienteId)?.nome ?? '',
        n.dataEmissao,
        n.dataVencimento,
        n.valorTotal,
        n.valorImpostos,
        ROTULO_STATUS_NOTA[n.status],
        n.valorPago ?? '',
        n.dataPagamento ?? '',
      ]),
    );
    toast.success('Notas fiscais exportadas em CSV.');
  };

  return (
    <>
      <CabecalhoPagina
        icone={Receipt}
        titulo="Notas Fiscais"
        descricao="Emissão simplificada para controle. A contabilidade do Simples Nacional continua sendo a fonte oficial."
        acoes={
          <>
            <Botao variante="contorno" onClick={exportar}>
              <Download />
              <span className="hidden sm:inline">Exportar</span>
            </Botao>
            <Botao
              onClick={() => {
                setEditando(null);
                setAberto(true);
              }}
            >
              <Plus />
              Nova nota
            </Botao>
          </>
        }
      />
      <div className="-mt-1">
        <SeletorPeriodo periodo={periodo} aoMudar={definirPeriodo} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoKpi rotulo="Notas emitidas" valor={formatarContagem(resumo.quantidade)} apoio={periodo.rotulo} icone={FileText} />
        <CartaoKpi rotulo="Valor total" valor={moeda(resumo.total)} icone={Receipt} />
        <CartaoKpi rotulo="Impostos" valor={moeda(resumo.impostos)} apoio="Simples Nacional, Anexo I" />
        <CartaoKpi
          rotulo="Em aberto"
          valor={moeda(resumo.aReceber)}
          apoio={`${moeda(resumo.pagas)} já pagos`}
          cor={resumo.aReceber > 0 ? 'var(--atencao)' : undefined}
        />
      </div>

      <Card className="mt-3">
        <CardCabecalho>
          <CardTitulo>Notas do período</CardTitulo>
          <CardDescricao>
            {formatarContagem(noPeriodo.length)} de {formatarContagem(notas.length)} notas ·{' '}
            <span className="num">{noPeriodo.length !== notas.length ? 'use a busca para ver as demais' : 'todas neste período'}</span>
          </CardDescricao>
        </CardCabecalho>
        <CardConteudo className="pt-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <CampoTexto
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por número ou cliente…"
              aria-label="Buscar nota fiscal"
              className="h-9 w-full sm:w-64"
            />
            <Selecao value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as typeof filtroStatus)}>
              <GatilhoSelecao className="h-9 w-40">
                <ValorSelecao />
              </GatilhoSelecao>
              <ConteudoSelecao>
                <ItemSelecao value="TODOS">Todos os status</ItemSelecao>
                {STATUS.map((s) => (
                  <ItemSelecao key={s} value={s}>
                    {ROTULO_STATUS_NOTA[s]}
                  </ItemSelecao>
                ))}
              </ConteudoSelecao>
            </Selecao>
          </div>

          <TabelaDados
            colunas={[
              {
                id: 'numero',
                accessorKey: 'numero',
                header: 'Nota',
                cell: ({ row }) => (
                  <div>
                    <p className="num font-semibold">
                      {row.original.numero}/{row.original.serie}
                    </p>
                    <p className="num text-[11.5px] text-[var(--texto-tenue)]">Modelo {row.original.modelo}</p>
                  </div>
                ),
              },
              {
                id: 'cliente',
                accessorKey: 'clienteId',
                header: 'Cliente',
                cell: ({ row }) => derivado.clientes.find((c) => c.id === row.original.clienteId)?.nome ?? '—',
              },
              {
                id: 'emissao',
                accessorKey: 'dataEmissao',
                header: 'Emissão',
                meta: { ocultarAte: 'sm' },
                cell: ({ row }) => <span className="num">{dataBR(row.original.dataEmissao)}</span>,
              },
              {
                id: 'vencimento',
                accessorKey: 'dataVencimento',
                header: 'Vencimento',
                meta: { ocultarAte: 'lg' },
                cell: ({ row }) => {
                  const atrasada = row.original.status === 'EMITIDA' && row.original.dataVencimento < hojeISO();
                  return (
                    <span className={atrasada ? 'num font-medium text-[var(--alerta)]' : 'num'}>
                      {dataBR(row.original.dataVencimento)}
                    </span>
                  );
                },
              },
              {
                id: 'impostos',
                accessorKey: 'valorImpostos',
                header: 'Impostos',
                meta: { ocultarAte: 'xl' },
                cell: ({ row }) => <span className="num text-[var(--texto-suave)]">{moeda(row.original.valorImpostos)}</span>,
              },
              {
                id: 'status',
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => <Etiqueta tom={TOM_NOTA[row.original.status]}>{ROTULO_STATUS_NOTA[row.original.status]}</Etiqueta>,
              },
              {
                id: 'valor',
                accessorKey: 'valorTotal',
                header: 'Valor',
                cell: ({ row }) => <span className="num font-semibold">{moeda(row.original.valorTotal)}</span>,
              },
            ]}
            dados={noPeriodo}
            chave={(n) => n.id}
            vazio={
              <EstadoVazio
                icone={Receipt}
                titulo="Nenhuma nota neste período"
                descricao="As notas saem junto com a venda, ou você pode lançar uma manualmente."
                acao={
                  <Botao
                    onClick={() => {
                      setEditando(null);
                      setAberto(true);
                    }}
                  >
                    <Plus />
                    Nova nota
                  </Botao>
                }
              />
            }
            colunaAcoes={(n) => (
              <div className="flex justify-end gap-0.5">
                <BotaoCopiar
                  rotulo="Copiar"
                  texto={`${n.numero}/${n.serie} — ${moeda(n.valorTotal)} — ${derivado.clientes.find((c) => c.id === n.clienteId)?.nome ?? ''}`}
                />
                {n.chaveAcesso && (
                  <Botao
                    variante="fantasma"
                    tamanho="iconeXs"
                    aria-label={`Copiar chave de acesso da NF ${n.numero}`}
                    onClick={() => {
                      void navigator.clipboard.writeText(n.chaveAcesso ?? '');
                      toast.success('Chave de acesso copiada.');
                    }}
                  >
                    <KeyRound />
                  </Botao>
                )}
                <Botao variante="contorno" tamanho="sm" onClick={() => pagar(n)}>
                  {n.status === 'PAGA' ? 'Estornar' : 'Dar baixa'}
                </Botao>
                <Botao
                  variante="fantasma"
                  tamanho="iconeXs"
                  aria-label={`Editar NF ${n.numero}`}
                  onClick={() => {
                    setEditando(n);
                    setAberto(true);
                  }}
                >
                  <Pencil />
                </Botao>
                <BotaoExcluir
                  rotulo={`Excluir a NF ${n.numero}/${n.serie}?`}
                  descricao="A nota sai do painel. A venda vinculada continua no histórico."
                  aoConfirmar={() => {
                    remover('notasFiscais', n.id);
                    toast.success('Nota excluída.');
                  }}
                >
                  <Botao variante="fantasma" tamanho="iconeXs" aria-label={`Excluir NF ${n.numero}`}>
                    <Trash2 />
                  </Botao>
                </BotaoExcluir>
              </div>
            )}
          />
        </CardConteudo>
      </Card>

      <DialogoNota
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        nota={editando}
        aoSalvar={(dados) => {
          if (editando) {
            atualizar<NotaFiscal>('notasFiscais', editando.id, dados);
            toast.success('Nota atualizada.');
          } else {
            criar<NotaFiscal>('notasFiscais', {
              ...dados,
              serie: '1',
              modelo: 'NF-E',
              // Anexo I: alíquota efetiva do RBT12. Sem detalhamento de ICMS/IPI (§7).
              valorImpostos: Math.round(dados.valorTotal * aliquotaEfetivaPct(rbt12) * 100) / 100,
            });
            toast.success('Nota emitida.');
          }
          setAberto(false);
        }}
      />
    </>
  );
}

/* ============================== Diálogo ================================== */

const esquema = z.object({
  numero: z.string().min(1, 'Informe o número'),
  clienteId: z.string().min(1, 'Escolha o cliente'),
  vendaId: z.string().optional(),
  dataEmissao: z.string().min(1),
  dataVencimento: z.string().min(1),
  valorTotal: z.coerce.number().gt(0, 'Informe um valor maior que zero'),
  valorPago: z.coerce.number().min(0),
  status: z.enum(STATUS as [StatusNota, ...StatusNota[]]),
  formaPagamento: z.enum(['PIX', 'BOLETO', 'DINHEIRO', 'CARTAO', 'TRANSFERENCIA']).optional(),
});

type Dados = z.infer<typeof esquema>;

function DialogoNota({
  aberto,
  aoFechar,
  nota,
  aoSalvar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  nota: NotaFiscal | null;
  aoSalvar: (dados: Omit<NotaFiscal, keyof BaseEntidade | 'serie' | 'modelo' | 'valorImpostos'>) => void;
}) {
  const { derivado, bd } = useDados();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Dados>({
    resolver: zodResolver(esquema),
    defaultValues: {
      numero: '',
      clienteId: '',
      vendaId: undefined,
      dataEmissao: hojeISO(),
      dataVencimento: somaDias(hojeISO(), 15),
      valorTotal: 0,
      valorPago: 0,
      status: 'EMITIDA',
      formaPagamento: 'PIX',
    },
  });

  const clienteId = watch('clienteId');
  const vendaId = watch('vendaId');
  const proximoNumero = String(1000 + bd.notasFiscais.length + 1);
  const [carregado, setCarregado] = useState<string | null>(null);
  const chave = aberto ? (nota?.id ?? 'nova') : null;
  if (chave !== carregado) {
    setCarregado(chave);
    if (aberto) {
      reset(
        nota
          ? {
              numero: nota.numero,
              clienteId: nota.clienteId,
              vendaId: nota.vendaId,
              dataEmissao: nota.dataEmissao,
              dataVencimento: nota.dataVencimento,
              valorTotal: nota.valorTotal,
              valorPago: nota.valorPago ?? 0,
              status: nota.status,
              formaPagamento: 'PIX',
            }
          : {
              numero: proximoNumero,
              clienteId: '',
              vendaId: undefined,
              dataEmissao: hojeISO(),
              dataVencimento: somaDias(hojeISO(), 15),
              valorTotal: 0,
              valorPago: 0,
              status: 'EMITIDA',
              formaPagamento: 'PIX',
            },
      );
    }
  }

  const vendasDoCliente = derivado.vendas.filter((v) => !v.clienteId || v.clienteId === clienteId);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <ConteudoDialog>
        <DialogCabecalho>
          <DialogTitulo>{nota ? `Editar NF ${nota.numero}` : 'Emitir nota fiscal'}</DialogTitulo>
          <DialogDescricao>
            Registro simplificado para controle interno. Nada é transmitido para a SEFAZ.
          </DialogDescricao>
        </DialogCabecalho>
        <form
          onSubmit={handleSubmit((d) =>
            aoSalvar({
              numero: d.numero,
              clienteId: d.clienteId,
              vendaId: d.vendaId,
              dataEmissao: d.dataEmissao,
              dataVencimento: d.dataVencimento,
              valorTotal: d.valorTotal,
              valorPago: d.valorPago || undefined,
              dataPagamento: d.status === 'PAGA' ? hojeISO() : undefined,
              status: d.status,
            }),
          )}
        >
          <DialogCorpo className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Número" obrigatorio erro={errors.numero?.message} htmlFor="nnum">
              <CampoTexto id="nnum" {...register('numero')} />
            </Campo>
            <Campo rotulo="Série" htmlFor="nserie">
              <CampoTexto id="nserie" value="1" disabled />
            </Campo>

            <Campo rotulo="Cliente" obrigatorio erro={errors.clienteId?.message} className="sm:col-span-2" htmlFor="ncli">
              <Selecao value={clienteId} onValueChange={(v) => setValue('clienteId', v)}>
                <GatilhoSelecao id="ncli">
                  <ValorSelecao placeholder="Escolha o cliente…" />
                </GatilhoSelecao>
                <ConteudoSelecao>
                  {derivado.clientes
                    .filter((c) => !c.arquivado)
                    .map((c) => (
                      <ItemSelecao key={c.id} value={c.id}>
                        {c.nome} — {c.cidadeAtendida}
                      </ItemSelecao>
                    ))}
                </ConteudoSelecao>
              </Selecao>
            </Campo>

            <Campo rotulo="Venda vinculada" dica="Opcional" className="sm:col-span-2" htmlFor="nvenda">
              <Selecao
                value={vendaId ?? 'nenhuma'}
                onValueChange={(v) => {
                  if (v === 'nenhuma') {
                    setValue('vendaId', undefined);
                    return;
                  }
                  setValue('vendaId', v);
                  const venda = derivado.vendas.find((x) => x.id === v);
                  if (venda) {
                    setValue('valorTotal', venda.valorTotal);
                    setValue('clienteId', venda.clienteId);
                    setValue('numero', venda.numero);
                    setValue('dataEmissao', venda.dataEmissao);
                  }
                }}
              >
                <GatilhoSelecao id="nvenda">
                  <ValorSelecao placeholder="Nenhuma" />
                </GatilhoSelecao>
                <ConteudoSelecao>
                  <ItemSelecao value="nenhuma">Nenhuma</ItemSelecao>
                  {vendasDoCliente.map((v) => (
                    <ItemSelecao key={v.id} value={v.id}>
                      {v.numero} — {moeda(v.valorTotal)}
                    </ItemSelecao>
                  ))}
                </ConteudoSelecao>
              </Selecao>
            </Campo>

            <Campo rotulo="Valor total (R$)" obrigatorio erro={errors.valorTotal?.message} htmlFor="nvalor">
              <CampoTexto
                id="nvalor"
                type="number"
                step="0.01"
                min={0}
                value={numeroParaInput(watch('valorTotal'))}
                onChange={(e) => setValue('valorTotal', paraNumero(e.target.value))}
              />
            </Campo>
            <Campo rotulo="Valor pago (R$)" dica="0 enquanto estiver em aberto" htmlFor="npago">
              <CampoTexto
                id="npago"
                type="number"
                step="0.01"
                min={0}
                value={numeroParaInput(watch('valorPago'))}
                onChange={(e) => setValue('valorPago', paraNumero(e.target.value))}
              />
            </Campo>

            <Campo rotulo="Emissão" obrigatorio htmlFor="nemissao">
              <CampoTexto id="nemissao" type="date" {...register('dataEmissao')} />
            </Campo>
            <Campo rotulo="Vencimento" obrigatorio htmlFor="nvenc">
              <CampoTexto id="nvenc" type="date" {...register('dataVencimento')} />
            </Campo>

            <Campo rotulo="Status" htmlFor="nstatus">
              <Selecao value={watch('status')} onValueChange={(v) => setValue('status', v as StatusNota)}>
                <GatilhoSelecao id="nstatus">
                  <ValorSelecao />
                </GatilhoSelecao>
                <ConteudoSelecao>
                  {STATUS.map((s) => (
                    <ItemSelecao key={s} value={s}>
                      {ROTULO_STATUS_NOTA[s]}
                    </ItemSelecao>
                  ))}
                </ConteudoSelecao>
              </Selecao>
            </Campo>
            <Campo rotulo="Forma de pagamento" htmlFor="nforma">
              <Selecao
                value={watch('formaPagamento') ?? 'PIX'}
                onValueChange={(v) => setValue('formaPagamento', v as FormaPagamento)}
              >
                <GatilhoSelecao id="nforma">
                  <ValorSelecao />
                </GatilhoSelecao>
                <ConteudoSelecao>
                  {(Object.keys(ROTULO_FORMA_PAGAMENTO) as FormaPagamento[]).map((f) => (
                    <ItemSelecao key={f} value={f}>
                      {ROTULO_FORMA_PAGAMENTO[f]}
                    </ItemSelecao>
                  ))}
                </ConteudoSelecao>
              </Selecao>
            </Campo>

            {clienteId && (
              <div className="sm:col-span-2">
                <a
                  href={linkWhatsapp(
                    derivado.clientes.find((c) => c.id === clienteId)?.telefone ?? '',
                    `Olá! Passando para lembrar da nota fiscal ${watch('numero')} de ${moeda(watch('valorTotal'))}, com vencimento em ${dataBR(watch('dataVencimento'))}.`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--marca)] hover:underline dark:text-[var(--destaque)]"
                >
                  <Copy className="size-3.5" aria-hidden />
                  Enviar cobrança por WhatsApp
                </a>
              </div>
            )}
          </DialogCorpo>
          <DialogRodape>
            <Botao type="button" variante="contorno" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit">{nota ? 'Salvar nota' : 'Emitir nota'}</Botao>
          </DialogRodape>
        </form>
      </ConteudoDialog>
    </Dialog>
  );
}
