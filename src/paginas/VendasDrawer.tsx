import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  FileDown,
  MessageCircle,
  Pencil,
  Printer,
  Trash2,
} from 'lucide-react';
import { useDados } from '@/db/store';
import type { VendaCalculada } from '@/db/deriva';
import { ROTULO_FORMA_PAGAMENTO, ROTULO_STATUS_VENDA, type StatusVenda, type Venda } from '@/types';
import { dataBR, linkWhatsapp, moeda, numero, percentualNum } from '@/lib/format';
import { margemContribuicao } from '@/lib/calculos';
import { Botao } from '@/components/ui/button';
import { BotaoExcluir } from '@/components/ui/dialog';
import { ConteudoDrawer, Drawer, DrawerCabecalho, DrawerCorpo, DrawerDescricao, DrawerRodape, DrawerTitulo } from '@/components/ui/sheet';
import { Selo } from '@/components/ui/badge';
import { Etiqueta } from '@/components/comuns';
import { TOM_VENDA } from '@/lib/cores';
import { mensagemOrcamento } from './dados-texto';

const PROXIMOS: Array<{ de: StatusVenda; para: StatusVenda; rotulo: string }> = [
  { de: 'ORCAMENTO', para: 'APROVADO', rotulo: 'Marcar como aprovado' },
  { de: 'APROVADO', para: 'PAGAMENTO_PENDENTE', rotulo: 'Enviar cobrança' },
  { de: 'PAGAMENTO_PENDENTE', para: 'PAGO', rotulo: 'Confirmar pagamento' },
  { de: 'PAGO', para: 'EM_SEPARACAO', rotulo: 'Iniciar separação' },
  { de: 'EM_SEPARACAO', para: 'EM_TRANSITO', rotulo: 'Saiu para entrega' },
  { de: 'EM_TRANSITO', para: 'ENTREGUE', rotulo: 'Marcar como entregue' },
];

export function DrawerVenda({
  venda,
  aoFechar,
  aoMover,
  aoEditar,
  aoGerarPdf,
  aoExcluir,
}: {
  venda: VendaCalculada | null;
  aoFechar: () => void;
  aoMover: (v: VendaCalculada, novo: StatusVenda) => void;
  aoEditar: (v: Venda) => void;
  aoGerarPdf: (v: VendaCalculada) => void;
  aoExcluir: (v: Venda) => void;
}) {
  const { derivado, configuracao, rbt12, pedidosNoMes, bd } = useDados();

  const nota = useMemo(
    () => bd.notasFiscais.find((n) => n.vendaId === venda?.id),
    [bd.notasFiscais, venda],
  );

  if (!venda) return null;

  const margem = margemContribuicao({ valorTotal: venda.valorTotal, itens: venda.itens, custoEntrega: 0 }, configuracao, {
    rbt12,
    pedidosNoMes,
  });
  const proximo = PROXIMOS.find((p) => p.de === venda.status);
  const cliente = derivado.clientes.find((c) => c.id === venda.clienteId);
  const abaixoDoMinimo = margem.mcPct * 100 < configuracao.margemMinimaAlerta;

  return (
    <Drawer open={!!venda} onOpenChange={(v) => !v && aoFechar()}>
      <ConteudoDrawer>
        <DrawerCabecalho>
          <div className="flex flex-wrap items-center gap-2">
            <Etiqueta tom={TOM_VENDA[venda.status]}>{ROTULO_STATUS_VENDA[venda.status]}</Etiqueta>
            {nota && <Selo tom="neutro">NF {nota.numero}/{nota.serie}</Selo>}
          </div>
          <DrawerTitulo className="mt-1.5">Pedido {venda.numero}</DrawerTitulo>
          <DrawerDescricao>
            {venda.nomeCliente} · emitido em {dataBR(venda.dataEmissao)} · entrega prevista{' '}
            {dataBR(venda.dataPrevistaEntrega)}
          </DrawerDescricao>
        </DrawerCabecalho>

        <DrawerCorpo className="space-y-4">
          {abaixoDoMinimo && (
            <div className="flex items-start gap-2 rounded-lg bg-[var(--alerta-suave)] p-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--alerta)]" aria-hidden />
              <div>
                <p className="text-[12.5px] font-semibold text-[var(--alerta)]">Margem abaixo do mínimo</p>
                <p className="text-[12px] text-[var(--alerta)]/90">
                  Este pedido rende {percentualNum(margem.mcPct * 100)}. O mínimo é {configuracao.margemMinimaAlerta}%.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Dado rotulo="Total do pedido" valor={moeda(venda.valorTotal)} />
            <Dado rotulo="Margem de contribuição" valor={`${moeda(margem.mc)} · ${percentualNum(margem.mcPct * 100)}`} cor={abaixoDoMinimo ? 'var(--alerta)' : 'var(--sucesso)'} />
            <Dado rotulo="Custo dos produtos" valor={moeda(venda.custoTotal)} />
            <Dado rotulo="Impostos" valor={moeda(margem.impostos)} />
            <Dado rotulo="Forma de pagamento" valor={ROTULO_FORMA_PAGAMENTO[venda.formaPagamento]} />
            <Dado rotulo="Desconto" valor={moeda(venda.valorDesconto)} />
          </div>

          {proximo && (
            <Botao className="w-full" onClick={() => aoMover(venda, proximo.para)}>
              {proximo.rotulo}
              <ArrowRight />
            </Botao>
          )}

          <section>
            <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">
              Itens ({venda.itens.length})
            </h4>
            <ul className="mt-2 divide-y divide-[var(--borda)]">
              {venda.itens.map((i, idx) => (
                <li key={`${i.produtoId}-${idx}`} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="num text-[11.5px] font-semibold text-[var(--marca)] dark:text-[var(--destaque)]">{i.sku}</p>
                    <p className="truncate text-[12.5px] text-[var(--texto)]">{i.descricao}</p>
                    <p className="num text-[11.5px] text-[var(--texto-tenue)]">
                      {numero(i.quantidade)} × {moeda(i.precoUnitario)} (custo {moeda(i.custoUnitario)})
                    </p>
                  </div>
                  <p className="num shrink-0 text-[13px] font-semibold">
                    {moeda(i.quantidade * i.precoUnitario * (1 - (i.descontoItemPct ?? 0) / 100))}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {venda.observacoes && (
            <section>
              <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">Observações</h4>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--texto-suave)]">{venda.observacoes}</p>
            </section>
          )}

          <div className="flex flex-wrap gap-2">
            <Botao tamanho="sm" variante="contorno" onClick={() => aoGerarPdf(venda)}>
              <FileDown />
              Orçamento em PDF
            </Botao>
            <Botao tamanho="sm" variante="contorno" onClick={() => window.print()}>
              <Printer />
              Imprimir
            </Botao>
            {cliente && (
              <a
                href={linkWhatsapp(
                  cliente.whatsapp || cliente.telefone,
                  mensagemOrcamento(cliente.nome, venda.numero, moeda(venda.valorTotal), dataBR(venda.dataPrevistaEntrega)),
                )}
                target="_blank"
                rel="noreferrer"
              >
                <Botao tamanho="sm" variante="contorno">
                  <MessageCircle />
                  Enviar por WhatsApp
                </Botao>
              </a>
            )}
          </div>

          <BotaoExcluir
            rotulo={`Excluir pedido ${venda.numero}?`}
            descricao="O pedido sai do painel e a margem do período muda. Não dá para desfazer."
            aoConfirmar={() => aoExcluir(venda)}
          >
            <Botao variante="perigoSuave" tamanho="sm" className="w-full">
              <Trash2 />
              Excluir pedido
            </Botao>
          </BotaoExcluir>
        </DrawerCorpo>

        <DrawerRodape>
          <Botao variante="contorno" className="flex-1" onClick={aoFechar}>
            Fechar
          </Botao>
          <Botao className="flex-1" onClick={() => aoEditar(venda)}>
            <Pencil />
            Editar pedido
          </Botao>
        </DrawerRodape>
      </ConteudoDrawer>
    </Drawer>
  );
}

function Dado({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="rounded-lg border border-[var(--borda)] p-2.5">
      <p className="text-[11.5px] text-[var(--texto-tenue)]">{rotulo}</p>
      <p className="num text-[14px] font-semibold" style={cor ? { color: cor } : undefined}>
        {valor}
      </p>
    </div>
  );
}

