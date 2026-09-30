import { useEffect, useState } from 'react';
import { Download, Percent, RotateCcw, Settings2, ShieldCheck, Trash2, TriangleAlert, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDados } from '@/db/store';
import type { BancoDados, Configuracao } from '@/types';
import { escolherArquivo, exportarJSON } from '@/lib/arquivos';
import { moeda } from '@/lib/format';
import { aliquotaEfetivaPct } from '@/lib/calculos';
import { Card, CardCabecalho, CardConteudo, CardDescricao, CardTitulo } from '@/components/ui/card';
import { Botao } from '@/components/ui/button';
import { Aba, Abas, Interruptor, ListaAbas, PainelAba } from '@/components/ui/misc';
import { Campo, CampoTexto } from '@/components/ui/input';
import {
  BotaoExcluir,
  ConteudoConfirmacao,
  Confirmacao,
  ConfirmacaoAcao,
  ConfirmacaoAcoes,
  ConfirmacaoCancelar,
  ConfirmacaoDescricao,
  ConfirmacaoGatilho,
  ConfirmacaoTitulo,
} from '@/components/ui/dialog';
import { CabecalhoPagina, Etiqueta, formatarContagem } from '@/components/comuns';
import { mascaraDinamica } from '@/lib/validacao';

export default function Configuracoes() {
  const { bd, configuracao, atualizarConfig, substituir, limparDemonstracao, reiniciarComSeed, apagarTudo, rbt12 } =
    useDados();
  const [importando, setImportando] = useState(false);

  return (
    <>
      <CabecalhoPagina
        icone={Settings2}
        titulo="Configurações"
        descricao="Dados da empresa, regras de margem e entrega, alertas e backup."
      />

      <div className="mt-3">
        <Abas defaultValue="empresa">
          <ListaAbas className="mb-3">
            <Aba value="empresa">Empresa</Aba>
            <Aba value="regras">Regras de negócio</Aba>
            <Aba value="alertas">Alertas</Aba>
            <Aba value="dados">Dados e backup</Aba>
          </ListaAbas>

          {/* ----------------------------- Empresa ------------------------ */}
          <PainelAba value="empresa">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
              <Card className="min-w-0">
                <CardCabecalho>
                  <CardTitulo>Dados da empresa</CardTitulo>
                  <CardDescricao>Aparecem nos orçamentos em PDF e nas notas.</CardDescricao>
                </CardCabecalho>
                <CardConteudo>
                  <FormEmpresa
                    config={configuracao}
                    aoSalvar={(empresa) => {
                      atualizarConfig({ empresa });
                      toast.success('Dados da empresa atualizados.');
                    }}
                  />
                </CardConteudo>
              </Card>

              <div className="min-w-0 space-y-3">
                <Card className="min-w-0">
                  <CardCabecalho>
                    <CardTitulo>Tributação</CardTitulo>
                    <CardDescricao>Simples Nacional — Anexo I (comércio)</CardDescricao>
                  </CardCabecalho>
                  <CardConteudo className="space-y-2 text-[13px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--texto-suave)]">Regime</span>
                      <Etiqueta tom="terra">Simples Nacional</Etiqueta>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--texto-suave)]">Anexo</span>
                      <span className="font-medium">I — Comércio</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--texto-suave)]">Faturamento 12 meses</span>
                      <span className="num font-medium">{moeda(rbt12)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--texto-suave)]">Alíquota efetiva</span>
                      <span className="num font-medium">
                        {(aliquotaEfetivaPct(rbt12) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--texto-suave)]">Limite da ME</span>
                      <span className="num font-medium">{moeda(configuracao.tributacao.limiteME)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--texto-suave)]">Classificação</span>
                      <Etiqueta tom={configuracao.tributacao.me ? 'verde' : 'terracota'}>
                        {configuracao.tributacao.me ? 'Dentro do limite ME' : 'Acima do limite ME'}
                      </Etiqueta>
                    </div>
                    <p className="pt-1 text-[11.5px] leading-snug text-[var(--texto-tenue)]">
                      Tabelas do Anexo I progressivas (faixas de R$ 180 mil). Sem detalhamento de ICMS, IPI ou ISS — o
                      painel usa só a alíquota efetiva, como definido no §7.
                    </p>
                  </CardConteudo>
                </Card>

                <Card>
                  <CardCabecalho>
                    <CardTitulo>Conta demo</CardTitulo>
                    <CardDescricao>Este painel não tem senha</CardDescricao>
                  </CardCabecalho>
                  <CardConteudo>
                    <p className="text-[13px] text-[var(--texto-suave)]">
                      Tudo fica gravado só neste navegador (IndexedDB). Para usar em outro computador, exporte um backup e
                      importe lá.
                    </p>
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--acento)] p-2.5">
                      <ShieldCheck className="size-4 shrink-0 text-[var(--marca)] dark:text-[var(--destaque)]" aria-hidden />
                      <p className="text-[12.5px]">
                        Nenhum dado sai do seu computador. Sem servidor, sem nuvem, sem login.
                      </p>
                    </div>
                  </CardConteudo>
                </Card>
              </div>
            </div>
          </PainelAba>

          {/* ------------------------------ Regras ------------------------ */}
          <PainelAba value="regras">
            <Card>
              <CardCabecalho>
                <CardTitulo>Regras de negócio</CardTitulo>
                <CardDescricao>
                  These numbers drive margin warnings, delivery date on new orders and the simulator.
                </CardDescricao>
              </CardCabecalho>
              <CardConteudo>
                <FormRegras
                  config={configuracao}
                  aoSalvar={(patch) => {
                    atualizarConfig(patch);
                    toast.success('Regras atualizadas.');
                  }}
                />
              </CardConteudo>
            </Card>
          </PainelAba>

          {/* ------------------------------ Alertas ----------------------- */}
          <PainelAba value="alertas">
            <Card>
              <CardCabecalho>
                <CardTitulo>Quando avisar</CardTitulo>
                <CardDescricao>
                  Escolha o que merece interromper o seu dia. O sino do topo só mostra o que estiver ligado.
                </CardDescricao>
              </CardCabecalho>
              <CardConteudo>
                <FormAlertas
                  config={configuracao}
                  aoSalvar={(alertas) => {
                    atualizarConfig({ alertas });
                    toast.success('Preferências de alerta salvas.');
                  }}
                />
              </CardConteudo>
            </Card>
          </PainelAba>

          {/* ------------------------------- Dados ------------------------ */}
          <PainelAba value="dados">
            <div className="grid gap-3 xl:grid-cols-2">
              <Card>
                <CardCabecalho>
                  <CardTitulo>Backup</CardTitulo>
                  <CardDescricao>Um arquivo .json com tudo que está no painel.</CardDescricao>
                </CardCabecalho>
                <CardConteudo className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-3">
                    <Contagem rotulo="Produtos" valor={bd.produtos.length} />
                    <Contagem rotulo="Clientes" valor={bd.clientes.length} />
                    <Contagem rotulo="Vendas" valor={bd.vendas.length} />
                    <Contagem rotulo="Notas fiscais" valor={bd.notasFiscais.length} />
                    <Contagem rotulo="Lançamentos" valor={bd.lancamentos.length} />
                    <Contagem rotulo="Contatos" valor={bd.contatos.length} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Botao
                      onClick={() => {
                        exportarJSON(bd);
                        toast.success('Backup exportado.');
                      }}
                    >
                      <Download />
                      Exportar backup
                    </Botao>
                    <Botao
                      variante="contorno"
                      disabled={importando}
                      onClick={async () => {
                        setImportando(true);
                        try {
                          const arquivo = await escolherArquivo('.json,application/json');
                          if (!arquivo) return;
                          const texto = await arquivo.text();
                          const dados = JSON.parse(texto) as BancoDados;
                          if (typeof dados !== 'object' || dados === null || !('versao' in dados)) {
                            throw new Error('formato inválido');
                          }
                          substituir(dados);
                          toast.success('Backup restaurado.');
                        } catch {
                          toast.error('Não consegui ler esse arquivo. Ele precisa ser um backup exportado pelo painel.');
                        } finally {
                          setImportando(false);
                        }
                      }}
                    >
                      <Upload />
                      Importar backup
                    </Botao>
                  </div>
                  <p className="text-[12px] text-[var(--texto-tenue)]">
                    O arquivo é lido direto no seu navegador. Nada é enviado para lugar nenhum.
                  </p>
                </CardConteudo>
              </Card>

              <Card>
                <CardCabecalho>
                  <CardTitulo>Dados de demonstração</CardTitulo>
                  <CardDescricao>
                    {configuracao.dadosDemonstracao
                      ? 'O painel está com os dados de exemplo que vieram no primeiro acesso.'
                      : 'Você já está usando os seus dados reais.'}
                  </CardDescricao>
                </CardCabecalho>
                <CardConteudo className="space-y-3">
                  {configuracao.dadosDemonstracao ? (
                    <div className="flex items-start gap-2 rounded-lg bg-[var(--atencao-suave)] p-3">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--atencao)]" aria-hidden />
                      <p className="text-[12.5px] text-[var(--atencao)]">
                        Estes números são fictícios e servem só para você conhecer o painel. Quando começar a usar os dados
                        verdadeiros da empresa, limpe tudo e comece do zero.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 rounded-lg bg-[var(--sucesso-suave)] p-3">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--sucesso)]" aria-hidden />
                      <p className="text-[12.5px] text-[var(--sucesso)]">
                        Modo real ativo. Pode cadastrar clientes, produtos e pedidos de verdade.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <BotaoExcluir
                      rotulo="Limpar dados de demonstração e começar do zero?"
                      descricao="Apaga clientes, produtos, vendas, notas e lançamentos de exemplo. As configurações da empresa e as regras de negócio continuam. Não dá para desfazer — exporte um backup antes se tiver dúvida."
                      aoConfirmar={() => {
                        limparDemonstracao();
                        toast.success('Tudo limpo. O painel está pronto para os seus dados.');
                      }}
                    >
                      <Botao variante="perigo" className="w-full">
                        <Trash2 />
                        Limpar dados de demonstração e começar do zero
                      </Botao>
                    </BotaoExcluir>

                    <Confirmacao>
                      <ConfirmacaoGatilho asChild>
                        <Botao variante="contorno" className="w-full">
                          <RotateCcw />
                          Recarregar os dados de exemplo
                        </Botao>
                      </ConfirmacaoGatilho>
                      <ConteudoConfirmacao>
                        <ConfirmacaoTitulo>Recarregar os dados de exemplo?</ConfirmacaoTitulo>
                        <ConfirmacaoDescricao>
                          Substitui tudo o que está no painel pelos dados fictícios de demonstração.
                        </ConfirmacaoDescricao>
                        <ConfirmacaoAcoes>
                          <ConfirmacaoCancelar>Cancelar</ConfirmacaoCancelar>
                          <ConfirmacaoAcao
                            onClick={() => {
                              reiniciarComSeed();
                              toast.success('Dados de exemplo recarregados.');
                            }}
                          >
                            Recarregar exemplo
                          </ConfirmacaoAcao>
                        </ConfirmacaoAcoes>
                      </ConteudoConfirmacao>
                    </Confirmacao>

                    <Confirmacao>
                      <ConfirmacaoGatilho asChild>
                        <Botao variante="fantasma" className="w-full">
                          <Trash2 />
                          Apagar tudo
                        </Botao>
                      </ConfirmacaoGatilho>
                      <ConteudoConfirmacao>
                        <ConfirmacaoTitulo>Apagar absolutely tudo?</ConfirmacaoTitulo>
                        <ConfirmacaoDescricao>
                          Some com clientes, produtos, vendas, notas, lançamentos, metas, marketing e também com os dados da
                          empresa. O painel volta vazio. Exporte um backup antes.
                        </ConfirmacaoDescricao>
                        <ConfirmacaoAcoes>
                          <ConfirmacaoCancelar>Cancelar</ConfirmacaoCancelar>
                          <ConfirmacaoAcao
                            onClick={() => {
                              apagarTudo();
                              toast.success('Painel zerado.');
                            }}
                          >
                            Apagar tudo
                          </ConfirmacaoAcao>
                        </ConfirmacaoAcoes>
                      </ConteudoConfirmacao>
                    </Confirmacao>
                  </div>
                </CardConteudo>
              </Card>

              <Card className="xl:col-span-2">
                <CardCabecalho>
                  <CardTitulo>Sobre este painel</CardTitulo>
                  <CardDescricao>Terra Prometida Express — controle interno</CardDescricao>
                </CardCabecalho>
                <CardConteudo className="grid gap-3 text-[13px] sm:grid-cols-2">
                  <p className="text-[var(--texto-suave)]">
                    Painel local para o dono do negócio acompanhar margem, estoque, caixa e metas sem depender de
                    sistema pago. Os dados ficam gravados no navegador deste computador.
                  </p>
                  <ul className="space-y-1 text-[12.5px] text-[var(--texto-tenue)]">
                    <li>· Margem de contribuição pelo Anexo I do Simples Nacional (§7)</li>
                    <li>· Custo e preço congelados no momento da venda (§15)</li>
                    <li>· Sem login, sem servidor, sem mensalidade</li>
                    <li>· Funciona offline depois da primeira abertura</li>
                  </ul>
                </CardConteudo>
              </Card>
            </div>
          </PainelAba>
        </Abas>
      </div>
    </>
  );
}

function Contagem({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded-lg border border-[var(--borda)] p-2.5">
      <p className="text-[11.5px] text-[var(--texto-tenue)]">{rotulo}</p>
      <p className="num text-[16px] font-semibold">{formatarContagem(valor)}</p>
    </div>
  );
}

/* ============================ Formulário empresa ========================== */

const esquemaEmpresa = z.object({
  razaoSocial: z.string().min(2, 'Informe a razão social'),
  nomeFantasia: z.string().min(1, 'Informe o nome fantasia'),
  cnpj: z.string().min(14, 'CNPJ incompleto'),
  inscricaoEstadual: z.string().optional(),
  logradouro: z.string().min(2, 'Informe o endereço'),
  numero: z.string().min(1, 'Informe o número'),
  bairro: z.string().min(1, 'Informe o bairro'),
  cidade: z.string().min(2, 'Informe a cidade'),
  uf: z.string().min(2, 'Informe a UF'),
  cep: z.string().min(8, 'CEP incompleto'),
  telefone: z.string().min(8, 'Telefone incompleto'),
  email: z.string().email('E-mail inválido'),
  site: z.string().optional(),
});

type DadosEmpresa = z.infer<typeof esquemaEmpresa>;

function FormEmpresa({ config, aoSalvar }: { config: Configuracao; aoSalvar: (empresa: Configuracao['empresa']) => void }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<DadosEmpresa>({
    resolver: zodResolver(esquemaEmpresa),
    defaultValues: {
      razaoSocial: config.empresa.razaoSocial,
      nomeFantasia: config.empresa.nomeFantasia,
      cnpj: config.empresa.cnpj,
      inscricaoEstadual: config.empresa.inscricaoEstadual,
      logradouro: config.empresa.endereco.logradouro,
      numero: config.empresa.endereco.numero,
      bairro: config.empresa.endereco.bairro,
      cidade: config.empresa.endereco.cidade,
      uf: config.empresa.endereco.uf,
      cep: config.empresa.endereco.cep,
      telefone: config.empresa.telefone,
      email: config.empresa.email,
      site: config.empresa.site,
    },
  });

  useEffect(() => {
    reset({
      razaoSocial: config.empresa.razaoSocial,
      nomeFantasia: config.empresa.nomeFantasia,
      cnpj: config.empresa.cnpj,
      inscricaoEstadual: config.empresa.inscricaoEstadual,
      logradouro: config.empresa.endereco.logradouro,
      numero: config.empresa.endereco.numero,
      bairro: config.empresa.endereco.bairro,
      cidade: config.empresa.endereco.cidade,
      uf: config.empresa.endereco.uf,
      cep: config.empresa.endereco.cep,
      telefone: config.empresa.telefone,
      email: config.empresa.email,
      site: config.empresa.site,
    });
  }, [config, reset]);

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={handleSubmit((d) =>
        aoSalvar({
          razaoSocial: d.razaoSocial,
          nomeFantasia: d.nomeFantasia,
          cnpj: d.cnpj,
          inscricaoEstadual: d.inscricaoEstadual ?? '',
          endereco: {
            logradouro: d.logradouro,
            numero: d.numero,
            bairro: d.bairro,
            cidade: d.cidade,
            uf: d.uf.toUpperCase(),
            cep: d.cep,
          },
          telefone: d.telefone,
          email: d.email,
          site: d.site ?? '',
        }),
      )}
    >
      <Campo rotulo="Razão social" obrigatorio erro={errors.razaoSocial?.message} className="sm:col-span-2" htmlFor="razao">
        <CampoTexto id="razao" {...register('razaoSocial')} />
      </Campo>
      <Campo rotulo="Nome fantasia" obrigatorio erro={errors.nomeFantasia?.message} className="sm:col-span-2" htmlFor="fantasia">
        <CampoTexto id="fantasia" {...register('nomeFantasia')} />
      </Campo>
      <Campo rotulo="CNPJ" obrigatorio erro={errors.cnpj?.message} htmlFor="cnpj">
        <CampoTexto
          id="cnpj"
          inputMode="numeric"
          {...register('cnpj', {
            onChange: (e) => {
              e.target.value = mascaraDinamica(e.target.value, 'cnpj');
            },
          })}
        />
      </Campo>
      <Campo rotulo="Inscrição estadual" htmlFor="ie">
        <CampoTexto id="ie" {...register('inscricaoEstadual')} />
      </Campo>
      <Campo rotulo="Endereço" obrigatorio erro={errors.logradouro?.message} className="sm:col-span-2" htmlFor="logradouro">
        <CampoTexto id="logradouro" {...register('logradouro')} />
      </Campo>
      <Campo rotulo="Número" obrigatorio erro={errors.numero?.message} htmlFor="numero">
        <CampoTexto id="numero" {...register('numero')} />
      </Campo>
      <Campo rotulo="Bairro" obrigatorio erro={errors.bairro?.message} htmlFor="bairro">
        <CampoTexto id="bairro" {...register('bairro')} />
      </Campo>
      <Campo rotulo="Cidade" obrigatorio erro={errors.cidade?.message} htmlFor="cidade">
        <CampoTexto id="cidade" {...register('cidade')} />
      </Campo>
      <Campo rotulo="UF" obrigatorio erro={errors.uf?.message} htmlFor="uf">
        <CampoTexto id="uf" maxLength={2} {...register('uf')} />
      </Campo>
      <Campo rotulo="CEP" obrigatorio erro={errors.cep?.message} htmlFor="cep">
        <CampoTexto
          id="cep"
          inputMode="numeric"
          {...register('cep', {
            onChange: (e) => {
              e.target.value = mascaraDinamica(e.target.value, 'cep');
            },
          })}
        />
      </Campo>
      <Campo rotulo="Telefone" obrigatorio erro={errors.telefone?.message} htmlFor="telefone">
        <CampoTexto
          id="telefone"
          inputMode="numeric"
          {...register('telefone', {
            onChange: (e) => {
              e.target.value = mascaraDinamica(e.target.value, 'telefone');
            },
          })}
        />
      </Campo>
      <Campo rotulo="E-mail" obrigatorio erro={errors.email?.message} htmlFor="email">
        <CampoTexto id="email" inputMode="email" {...register('email')} />
      </Campo>
      <Campo rotulo="Site" className="sm:col-span-2" htmlFor="site">
        <CampoTexto id="site" placeholder="www.exemplo.com.br" {...register('site')} />
      </Campo>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Botao type="button" variante="fantasma" onClick={() => reset()}>
          Descartar
        </Botao>
        <Botao type="submit" disabled={!isDirty}>
          Salvar empresa
        </Botao>
      </div>
    </form>
  );
}

/* ============================ Formulário regras ========================== */

const esquemaRegras = z.object({
  margemMinimaAlerta: z.coerce.number().min(0).max(100),
  margemMinimaAceita: z.coerce.number().min(0).max(100),
  margemAlvo: z.coerce.number().min(0).max(100),
  prazoEntregaPadraoDias: z.coerce.number().min(0).max(90),
  pedidoMinimoPadrao: z.coerce.number().min(0),
  custoEntregaMedioPadrao: z.coerce.number().min(0),
  comissaoPadraoPct: z.coerce.number().min(0).max(100),
  custoFixoMensal: z.coerce.number().min(0),
  validadePropostaDias: z.coerce.number().min(1).max(365),
});

type DadosRegras = z.infer<typeof esquemaRegras>;

function FormRegras({ config, aoSalvar }: { config: Configuracao; aoSalvar: (p: Partial<Configuracao>) => void }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { isDirty },
  } = useForm<DadosRegras>({
    resolver: zodResolver(esquemaRegras),
    defaultValues: {
      margemMinimaAlerta: config.margemMinimaAlerta,
      margemMinimaAceita: config.margemMinimaAceita,
      margemAlvo: config.margemAlvo,
      prazoEntregaPadraoDias: config.prazoEntregaPadraoDias,
      pedidoMinimoPadrao: config.pedidoMinimoPadrao,
      custoEntregaMedioPadrao: config.custoEntregaMedioPadrao,
      comissaoPadraoPct: config.comissaoPadraoPct,
      custoFixoMensal: config.tributacao.custoFixoMensal,
      validadePropostaDias: config.validadePropostaDias,
    },
  });

  const alerta = watch('margemMinimaAlerta');
  const aceita = watch('margemMinimaAceita');
  const alvo = watch('margemAlvo');
  const custoFixo = watch('custoFixoMensal');

  return (
    <form
      className="grid gap-4 lg:grid-cols-2"
      onSubmit={handleSubmit((d) =>
        aoSalvar({
          margemMinimaAlerta: d.margemMinimaAlerta,
          margemMinimaAceita: d.margemMinimaAceita,
          margemAlvo: d.margemAlvo,
          prazoEntregaPadraoDias: d.prazoEntregaPadraoDias,
          pedidoMinimoPadrao: d.pedidoMinimoPadrao,
          custoEntregaMedioPadrao: d.custoEntregaMedioPadrao,
          comissaoPadraoPct: d.comissaoPadraoPct,
          validadePropostaDias: d.validadePropostaDias,
          tributacao: { ...config.tributacao, custoFixoMensal: d.custoFixoMensal },
        }),
      )}
    >
      <fieldset className="space-y-3">
        <legend className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">
          Margem de contribuição
        </legend>
        <Campo rotulo="Alerta de margem baixa (%)" dica="Abaixo disso o pedido fica vermelho" htmlFor="mAlerta">
          <CampoTexto id="mAlerta" type="number" step="0.5" min={0} max={100} {...register('margemMinimaAlerta')} />
        </Campo>
        <Campo rotulo="Mínimo aceitável (%)" dica="Você ainda aceita, mas precisa saber" htmlFor="mAceita">
          <CampoTexto id="mAceita" type="number" step="0.5" min={0} max={100} {...register('margemMinimaAceita')} />
        </Campo>
        <Campo rotulo="Margem alvo (%)" dica="Usada no simulador de preço" htmlFor="mAlvo">
          <CampoTexto id="mAlvo" type="number" step="0.5" min={0} max={100} {...register('margemAlvo')} />
        </Campo>
        {(aceita < alerta || alvo < aceita) && (
          <p className="rounded-md bg-[var(--atencao-suave)] px-2.5 py-2 text-[12px] text-[var(--atencao)]">
            A ordem faz sentido assim: alerta ≤ mínimo aceitável ≤ meta.
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">
          Pedidos e entrega
        </legend>
        <Campo rotulo="Prazo de entrega padrão (dias)" htmlFor="prazo">
          <CampoTexto id="prazo" type="number" min={0} max={90} {...register('prazoEntregaPadraoDias')} />
        </Campo>
        <Campo rotulo="Pedido mínimo padrão (R$)" htmlFor="pedidoMin">
          <CampoTexto id="pedidoMin" type="number" step="0.01" min={0} {...register('pedidoMinimoPadrao')} />
        </Campo>
        <Campo rotulo="Custo médio de entrega (R$)" dica="Usado no novo pedido" htmlFor="custoEntrega">
          <CampoTexto id="custoEntrega" type="number" step="0.01" min={0} {...register('custoEntregaMedioPadrao')} />
        </Campo>
        <Campo rotulo="Comissão padrão (%)" dica="0 se não houver vendedor" htmlFor="comissao">
          <CampoTexto id="comissao" type="number" step="0.1" min={0} max={100} {...register('comissaoPadraoPct')} />
        </Campo>
        <Campo rotulo="Validade da proposta (dias)" htmlFor="validade">
          <CampoTexto id="validade" type="number" min={1} max={365} {...register('validadePropostaDias')} />
        </Campo>
      </fieldset>

      <fieldset className="space-y-3 lg:col-span-2">
        <legend className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">
          Rateio das despesas fixas
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo
            rotulo="Custo fixo mensal (R$)"
            dica="Soma das despesas fixas do ano"
            htmlFor="custoFixo"
          >
            <CampoTexto id="custoFixo" type="number" step="0.01" min={0} {...register('custoFixoMensal')} />
          </Campo>
          <div className="rounded-lg bg-[var(--acento)] p-3 text-[12.5px] leading-snug text-[var(--texto-suave)]">
            Este valor ({moeda(custoFixo)}) é dividido pelos pedidos do mês e descontado da margem de cada pedido (§7).
            Quanto maior o número de pedidos, menor o rateio por pedido.
          </div>
        </div>
      </fieldset>

      <div className="flex justify-end gap-2 lg:col-span-2">
        <Botao type="submit" disabled={!isDirty}>
          <Percent />
          Salvar regras
        </Botao>
      </div>
    </form>
  );
}

/* ============================ Formulário alertas ========================= */

const ROTULO_ALERTA: Record<keyof Configuracao['alertas'], [string, string]> = {
  estoqueBaixo: ['Estoque baixo', 'Avisa quando algum SKU chega no estoque mínimo.'],
  validadeProxima: ['Validade próxima', 'Avisa quando um lote vence nos próximos 30 dias.'],
  clienteSemRecompra: ['Cliente sem recompra', 'Avisa sobre clientes ativos que estão há mais de 30 dias sem comprar.'],
  margemBaixa: ['Margem baixa', 'Avisa quando um pedido fica abaixo do mínimo aceitável.'],
  boletoVencendo: ['Boleto vencendo', 'Avisa 3 dias antes do vencimento de contas a receber.'],
  limiteME: ['Limite da ME', 'Avisa quando o faturamento de 12 meses se aproxima de R$ 360 mil.'],
};

function FormAlertas({
  config,
  aoSalvar,
}: {
  config: Configuracao;
  aoSalvar: (alertas: Configuracao['alertas']) => void;
}) {
  const [valores, setValores] = useState(config.alertas);
  useEffect(() => setValores(config.alertas), [config.alertas]);

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(Object.keys(ROTULO_ALERTA) as Array<keyof Configuracao['alertas']>).map((chave) => {
        const [titulo, descricao] = ROTULO_ALERTA[chave];
        return (
          <label
            key={chave}
            className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-[var(--borda)] p-3 transition-colors hover:bg-[var(--acento)]"
          >
            <span className="min-w-0">
              <span className="block text-[13.5px] font-medium text-[var(--texto)]">{titulo}</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-[var(--texto-suave)]">{descricao}</span>
            </span>
            <Interruptor
              checked={valores[chave]}
              onCheckedChange={(v) => setValores((s) => ({ ...s, [chave]: v }))}
              aria-label={titulo}
              className="mt-0.5"
            />
          </label>
        );
      })}
      <div className="flex justify-end sm:col-span-2">
        <Botao
          onClick={() => {
            aoSalvar(valores);
            toast.success('Preferências de alerta salvas.');
          }}
        >
          Salvar preferências
        </Botao>
      </div>
    </div>
  );
}
