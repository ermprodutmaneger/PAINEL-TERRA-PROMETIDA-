# Painel Terra Prometida Express

Painel de gestão administrativa e comercial da **TERRA PROMETIDA EXPRESS LTDA - ME**
(epCommerce ME, Simples Nacional — Anexo I).

Aplicação web local, em português, que roda inteira no navegador: **sem servidor, sem login,
sem nuvem**. Os dados ficam gravados no próprio computador (IndexedDB) e podem ser salvos
em arquivo `.json` a qualquer momento.

---

## 0. Caminho mais curto (sem programar)

Se o objetivo é **usar no iPad**, não é preciso instalar nada no computador. A Vercel compila
o painel para você. São quatro passos, tudo pelo navegador:

**1. Baixe o pacote** `terra-prometida-PAINEL.zip` (ele vem com este README dentro).
Clique com o botão direito → **Extrair aqui** / **Extrair para…**. Vai criar uma pasta
chamada `terra-prometida`.

**2. Crie um repositório no GitHub**
- Entre em <https://github.com> e crie uma conta (é grátis).
- Clique no **+** do canto superior direito → **New repository**.
- Nome: `terra-prometida`. Marque **Private** (privado). Clique **Create repository**.
- Na tela que abrir, clique no link **uploading an existing file**.
- **Arraste a pasta `terra-prometida` inteira** para essa área do navegador.
- Espere aparecer os 64 arquivos, clique **Commit changes**.

**3. Publique na Vercel**
- Entre em <https://vercel.com/signup> e entre com a mesma conta do GitHub (**Continue with GitHub**).
- Na tela inicial, clique **Add New… → Project**.
- Escolha o repositório `terra-prometida` e clique **Import**.
- **Não mexa em nenhum campo.** A Vercel já detecta o framework, o comando de build e a pasta
  de saída. O arquivo `vercel.json` cuida do resto.
- Clique **Deploy**. Em 1 ou 2 minutos aparece o endereço do painel, algo como
  `https://terra-prometida.vercel.app`.

**4. Coloque no iPad**
- Abra esse endereço no **Safari** do iPad.
- Toque em **Compartilhar** → **Adicionar à Tela de Início**.
- Abra pelo ícone novo. O painel abre em tela cheia e os dados ficam guardados **no próprio iPad**.

> **O passo 5 é o mais importante:** os dados ficam no aparelho, não na Vercel. Para levar para
> outro lugar ou não perder tudo, use **Configurações → Dados e backup → Exportar backup**
> (baixa um arquivo `.json`) e **Importar backup** no destino.

### Se quiser testar antes no computador

Isso exige instalar o Node.js e mexer no terminal — **só é necessário se você quiser abrir o
painel no PC antes de publicar**:

1. Baixe o Node.js em <https://nodejs.org/pt-br/download>. Pegue a versão **LTS** (o número
   verde mais alto da página).
   - **Windows:** clique em **Windows Installer (.msi) x64** e execute o arquivo baixado.
   - **Mac:** abra o **.pkg** baixado e siga o instalador.
2. Abra o terminal:
   - **Windows:** tecle `Win`, digite `powershell` e abra.
   - **Mac:**Finder → Aplicativos → Utilidades → **Terminal**.
3. Digite os comandos abaixo, um por vez, e aperte Enter:

```bash
cd caminho/da/pasta/terra-prometida
npm install
npm run dev
```

4. Abra no navegador o endereço <http://localhost:5173> e o painel aparece.
   Para publicar: `npm run build` (gera a pasta `dist/`).


---

## 1. Rodando o projeto

```bash
# 1. instalar as dependências (uma única vez)
npm install

# 2. subir em modo de desenvolvimento
npm run dev            # http://localhost:5173

# 3. conferir os tipos antes de publicar
npm run typecheck     # tsc -b --noEmit

# 4. gerar a versão de produção
npm run build          # saída em dist/

# 5. testar a versão de produção
npm run preview
```

Requisito: **Node.js 20 ou superior** (testado com Node v20.20.2 / npm 10.8.2).
Não existe back-end: `dist/` pode ser servido por qualquer hospedagem estática.
Para publicar na Vercel, veja a [seção 9](#9-publicar-na-vercel-para-usar-no-ipad).

Na primeira abertura o painel já vem com **dados de demonstração** para você conhecer
todas as telas. See a seção [7. Do exemplo para os dados reais](#7-do-exemplo-para-os-dados-reais).

---

## 2. Versões das dependências

| Pacote | Versão | Para quê |
| --- | --- | --- |
| react / react-dom | 18.3.1 | interface |
| vite | 6.0.7 | servidor de desenvolvimento e build |
| typescript | 5.7.2 | tipagem estrita, sem `any` implícito |
| tailwindcss / @tailwindcss/vite | 4.0.0 | estilos (configuração via CSS, sem `tailwind.config.js`) |
| @radix-ui/react-* | 1.1.x – 2.1.x | diálogos, abas, selects, popovers, menus |
| @tanstack/react-table | 8.20.6 | tabelas com ordenação e paginação |
| recharts | 2.15.0 | gráficos |
| react-hook-form + zod + @hookform/resolvers | 7.54.2 / 3.24.1 / 3.10.0 | formulários e validação |
| idb-keyval | 6.2.1 | persistência em IndexedDB |
| date-fns | 4.1.0 | manipulação de datas |
| sonner | 1.7.1 | avisos (toasts) |
| jspdf + jspdf-autotable | 2.5.2 / 3.8.4 | orçamento em PDF |
| xlsx | 0.18.5 | leitura de planilhas |
| lucide-react | 0.469.0 | ícones |
| @fontsource-variable/inter | 5.1.1 | tipografia (offline) |

Somente o Tailwind **v4** — não há mistura de v3/v4 nem biblioteca de UI desatualizada.
Sem SSR, sem rotas de servidor.

---

## 3. Estrutura do código

```
terra-prometida/
├─ index.html
├─ vite.config.ts
├─ vercel.json                  deploy na Vercel com fallback de rota da SPA
├─ tsconfig.json                TypeScript estrito
└─ src/
   ├─ main.tsx                  ponto de entrada
   ├─ index.css                 tokens da marca, tema claro/escuro, Tailwind v4
   ├─ app/App.tsx               rotas e provedores
   ├─ types/index.ts            entidades (§6) e rótulos em pt-BR
   ├─ lib/
   │  ├─ calculos.ts            fórmulas do §7 (margem, Anexo I, DAS, MC, estoque, RBT12)
   │  ├─ indicadores.ts          resumos, DRE e painel de indicadores
   │  ├─ periodo.ts             mês / trimestre / ano / personalizado
   │  ├─ alertas.ts             regras dos alertas (§9)
   │  ├─ format.ts              moeda BRL, datas dd/mm/aaaa, máscaras, IDs
   │  ├─ validacao.ts           CNPJ, telefone, e-mail
   │  ├─ cores.ts               paleta por status
   │  ├─ arquivos.ts            JSON, CSV (; com BOM UTF-8), importação
   │  ├─ pdf.ts                 orçamento em PDF
   │  ├─ busca.ts               busca rápida (Ctrl+K)
   │  ├─ tema.tsx               claro / escuro / sistema
   │  └─ rota.tsx               navegação
   ├─ db/
   │  ├─ seed.ts                dados de demonstração (3 meses relativos a hoje)
   │  ├─ deriva.ts              entidades derivadas (margem por produto/cliente, MC da venda)
   │  ├─ persistencia.ts        IndexedDB via idb-keyval
   │  └─ store.tsx              estado único + CRUD + autosave
   ├─ hooks/usePeriodo.ts
   ├─ components/
   │  ├─ layout/                menu lateral, topo, atalhos
   │  ├─ ui/                    componentes base (botão, diálogo, select, tabela…)
   │  ├─ comuns.tsx             cabeçalho, cartão de KPI, estado vazio, barra de estoque
   │  ├─ graficos.tsx           gráficos reutilizáveis
   │  ├─ tabela-dados.tsx       tabela genérica (ordenação, paginação, responsiva)
   │  └─ SeletorPeriodo.tsx
   └─ paginas/
      ├─ VisaoGeral.tsx         dashboard
      ├─ Produtos.tsx           SKUs, custo, margem em tempo real, estoque
      ├─ Fornecedores.tsx       compras, contas a pagar, concentração
      ├─ Clientes.tsx           carteira, funil, histórico, WhatsApp
      ├─ Vendas.tsx             kanban + tabela
      ├─ VendasDialogo.tsx      novo pedido com margem em tempo real
      ├─ VendasDrawer.tsx       detalhe do pedido
      ├─ Financeiro.tsx         lançamentos, despesas fixas, DRE
      ├─ NotasFiscais.tsx       controle simplificado de notas
      ├─ Marketing.tsx          investimento, CAC e retorno
      ├─ Metas.tsx              indicadores, metas do mês e tarefas
      ├─ Configuracoes.tsx      empresa, regras, alertas, backup
      └─ dados-texto.ts         mensagens prontas de WhatsApp

public/                          ícone da marca (SVG, PNG e ícone de "Adicionar à Tela de Início")
```

---

## 4. O que o painel faz

| Página | O que resolve |
| --- | --- |
| **Visão Geral** | Faturamento, lucro, margem, ticket, caixa e alertas numa tela só. |
| **Produtos** | Cadastro de SKU, custo, preço, margem por produto **calculada em tempo real**, giro de estoque, alerta de estoque baixo e validade. |
| **Fornecedores** | Compras dos últimos 90 dias, contas a pagar, concentração de compra e risco de dependência. |
| **Clientes** | Carteira, funil, ticket, inadimplência, recompra, histórico de contato e envio de catálogo pelo WhatsApp. |
| **Vendas & Pedidos** | Kanban do orçamento à entrega (arraste o cartão), lista em tabela, simulador de preço por margem e PDF do orçamento. |
| **Financeiro** | Contas a pagar e receber, baixa de pagamento, despesas fixas, fluxo de caixa e DRE simplificada. |
| **Notas Fiscais** | Registro simplificado de emissão, vencimento e baixa. **Não emite nota real** — a contabilidade continua sendo a fonte oficial. |
| **Marketing** | Investimento por canal, clientes gerados, CAC e retorno em 30 dias. |
| **Metas & Indicadores** | Painel de 10 indicadores com atingimento, metas mês a mês e checklist de tarefas. |
| **Configurações** | Dados da empresa, regras de margem/entrega, preferências de alerta, backup `.json` e limpeza dos dados de demonstração. |

Detalhes que valem citar:

- **Margem em tempo real.** Ao digitar quantidade, custo ou preço no novo pedido, a margem de
  contribuição é recalculada na hora, já com imposto (Anexo I), custo dos produtos, entrega,
  comissão e rateio de despesa fixa.
- **Histórico preservado.** O custo e o preço de cada item ficam **congelados no momento da venda**
  (§15). Mudar o custo no cadastro do produto **não** altera pedidos já emitidos.
- **Simulador de preço.** Dado um custo, o painel diz quanto cobrar para chegar na margem alvo
  (fórmula do §7.3).
- **Tudo em pt-BR.** Valores em `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`,
  datas em `dd/mm/aaaa`.
- **Responsivo** em 375 / 768 / 1440 px, **tema claro e escuro**, skeletons nas listas, estado
  vazio em toda tabela e gráfico, toasts e confirmação em toda ação destrutiva.
- **Atalhos:** `Ctrl/Cmd + K` abre a busca rápida, `Esc` fecha diálogos.

---

## 5. Regras de negócio implementadas (§7)

- **RBT12** — faturamento bruto dos últimos 12 meses.
- **Anexo I do Simples Nacional** — faixas progressivas a partir de R$ 180.000; a alíquota
  efetiva é derivada do RBT12.
- **Margem de contribuição (MC)** =
  `valor total − impostos − custo dos produtos − custo de entrega − comissão`.
- **Lucro estimado** = `MC − (custo fixo mensal ÷ pedidos do mês)`.
- **Preço necessário** = `(custo + entrega) ÷ (1 − alíquota efetiva − margem desejada)`.
- **DAS** — percentual estimado do imposto sobre o faturamento, para conferência.
- **Estoque:** alerta de nível mínimo, valor parado há mais de 90 dias e giro.
- **Rateio de despesa fixa** por pedido, conforme a regra acima.

> **Observação sobre a discrepância do §7.** O exemplo do enunciado (“custo 10 / preço 20 →
> MC 0%”) não é compatível com a fórmula de margem de contribuição: com custo R$ 10 e preço
> R$ 20, a MC bruta é 50% e, descontando os encargos, continua positiva. Conforme a regra
> explícita de que o §7 é a autoridade para o cálculo da MC, **o painel aplica a fórmula**
> (imposto → custo → entrega → comissão → rateio) e **não** o exemplo numérico.

---

## 6. Regras que o painel segue por padrão

- Valores sempre em Real (R$), com duas casas; percentuais com uma casa.
- Datas em `dd/mm/aaaa`; o período padrão é o mês corrente e pode ser mês, trimestre, ano ou intervalo personalizado.
- O menor preço é sempre derivado do custo, nunca digitado “no olho”.
- Margem abaixo do mínimo de Configurações deixa o pedido em vermelho e mostra o valor necessário.
- Tabelas aceitam ordenação, busca e paginação; no celular viram cartões.
- Nenhuma ação destrutiva acontece sem confirmação escrita.

---

## 7. Do exemplo para os dados reais

1. Abra **Configurações → Dados e backup**.
2. **(Opcional, recomendado)** Clique em **Exportar backup** para guardar o arquivo `.json` do
   estado atual.
3. Clique em **Limpar dados de demonstração e começar do zero**. Isso apaga clientes, produtos,
   vendas, notas, lançamentos, metas, marketing e tarefas de exemplo — mas **mantém** os dados da
   empresa e as regras de negócio.
4. Comece a cadastrar:
   - **Configurações → Empresa**: razão social, CNPJ, endereço, telefone.
   - **Configurações → Regras de negócio**: margem mínima, margem alvo, prazo de entrega,
     pedido mínimo, custo de entrega, custo fixo mensal.
   - **Fornecedores** → **Produtos** (custo e preço de venda).
  - **Clientes** — cada um herda a tabela de preço do seu segmento, com pedido mínimo e condição de pagamento próprios.
   - **Vendas & Pedidos** para os pedidos. A margem aparece em tempo real no formulário.
   - **Financeiro** para as contas a pagar e a receber do mês.
5. Para levar para outro computador: **Exportar backup** lá e **Importar backup** no destino.

### Backup e recuperação

- Exportar: arquivo `.json` com o banco inteiro.
- Importar: substitui o conteúdo atual pelo do arquivo (pergunta antes).
- O navegador guarda tudo sozinho em IndexedDB; recarregar a página ou fechar o programa
  **não** perde nada. O que **não** é coberto é trocar de navegador ou limpar os dados do site —
  por isso o backup.

### CSV

Todo relatório exportado sai em CSV **separado por `;`**, com **BOM UTF-8** e decimais em
formato pt-BR — abre direto no Excel em português, sem passar por assistente de importação.

---

## 8. O que está pronto e o que ficou de fora

### Pronto

- Todas as 10 telas do §14, responsivas e com tema claro/escuro.
- Persistência automática em IndexedDB, sem servidor.
- Dados de demonstração de ~3 meses (6 fornecedores, 12 SKUs, 8 clientes, 15 vendas,
  ~25 lançamentos, notas, marketing, 8 metas e 12 tarefas) — todos com datas relativas ao dia
  de hoje, então o painel nunca aparece "velho".
- Margem de contribuição com Anexo I, alerta de margem, simulador de preço, DRE e indicadores.
- Exportação CSV, importação/exportação de backup em JSON e orçamento em PDF.
- Busca rápida, alertas com severidade e área de destino, e utilidades de WhatsApp.

### Fora do escopo (de propósito)

- **Emissão fiscal de verdade** — o painel é um controle interno. Nada é enviado para a SEFAZ,
  não há XML, chave de acesso nem DANFE. Nada substitui o contador.
- **Detalhamento de ICMS, IPI e ISS** — não foi inventado nada além do §7. Só a alíquota
  efetiva do Anexo I.
- **Login, servidor, sincronização entre dispositivos e nuvem** — não existem, por escolha.
- **Integração com Pix, gateway de pagamento ou ERP.**
- **Configurações avançadas e telas de administração/debug.**
- **Gráficos decorativos** — todo gráfico responde a uma pergunta de negócio.

---

## 9. Publicar na Vercel (para usar no iPad)

O painel é uma SPA estática: a Vercel só precisa compilar e entregar os arquivos de `dist/`.
O arquivo `vercel.json` já está no projeto e cuida de tudo:

```json
{ "framework": "vite", "buildCommand": "npm run build", "outputDirectory": "dist",
  "rewrites": [{ "source": "/((?!assets/).*)", "destination": "/index.html" }] }
```

O `rewrite` é o que faz `/vendas`, `/financeiro` etc. abrirem ao recarregar a página ou ao
compartilhar o link — sem ele a Vercel devolveria 404. Os arquivos em `/assets` têm nome com
hash, então podem ficar em cache por um ano (`Cache-Control: immutable`).

### Publicar

1. Suba o projeto para um repositório no GitHub/GitLab/Bitbucket.
2. Na Vercel: **Add New → Project → importe o repositório**. Não precisa mexer em nada —
   framework, comando de build e pasta de saída são detectados sozinhos, e o `vercel.json`
   confirma.
3. Ao terminar, você recebe um endereço tipo `https://terra-prometida-express.vercel.app`.
   Para um endereço próprio: **Settings → Domains → Add**.

### Usar no iPad

1. Abra o endereço no Safari do iPad.
2. **Compartilhar → Adicionar à Tela de Início**. O painel abre em tela cheia, com o ícone
   da marca, sem barra de navegador.
3. A partir daí funciona como um aplicativo. Na horizontal (a partir de 1024 px) o menu
   lateral aparece; em pé, a barra de baixo com as telas principais e o botão de menu para
   as demais.

### Ajustes de iPad/iPhone que já estão no código

| Ajuste | Por quê |
| --- | --- |
| Arrastar do kanban com **Pointer Events** e **segurar 0,24 s** para pegar o cartão | A API de drag-and-drop do HTML5 não funciona no Safari do iOS — no toque, o cartão não se moveria de jeito nenhum. |
| `touchmove` com `preventDefault` só enquanto o cartão está "na mão" | Sem isso o iPad rola a página no meio do arrasto. |
| Cartão segue o dedo e o quadro **rola sozinho** perto da borda | Com 7 colunas, nem sempre a destino cabe na tela. |
| **Toque no cartão** abre as situações | Alternativa ao arrasto para quem prefere não arrastar. |
| Campos com **16 px** em telas de toque | Abaixo de 16 px o Safari do iOS dá zoom ao focar e não desfaz sozinho. |
| Botões de ícone com **40 px**, botões pequenos com **40 px** de altura | Alvo confortável para o dedo (recomendação da Apple: 44 px). |
| Sem flash cinza ao tocar e sem menu de contexto no cartão | O cinza de seleção aparece em todo toque e atrapalha o arraste. |
| `env(safe-area-inset-bottom)` na barra inferior | Os iPads novos têm indicador de home; sem isso o botão fica embaixo dele. |
| Ícone da marca + "Adicionar à Tela de Início" | O painel abre como aplicativo, em tela cheia. |

### Detalhe importante sobre os dados

Os dados ficam **no navegador do iPad** (IndexedDB), não no servidor. Isso significa que:

- funciona sem internet depois da primeira abertura;
- **não** aparece automaticamente em outro aparelho ou em outro navegador;
- limpar os dados do Safari apaga tudo.

Por isso o botão **Configurações → Dados e backup → Exportar backup** é o seu porto seguro:
ele baixa um `.json` com tudo, e **Importar backup** restaura em qualquer outro iPad,
computador ou celular. Se o painel for ficar em mais de um aparelho, exporte sempre depois
de trabalhar.

---

## 10. Detalhes técnicos

- **TypeScript estrito**, sem `any` implícito; `npm run typecheck` passa limpo.
- **Tailwind v4** com tokens CSS da marca em `src/index.css`:
  terra `#2F5D3A`, mostarda `#E3A21C`, terracota `#B5553A`, areia `#F5F0E6`, grafite `#22201C`,
  verde-claro `#6E9B78`, mostarda-claro `#F5C65B`, cinza `#8A857C`. A mostarda é escurecida
  quando usada como texto no tema claro para manter o contraste AA.
- **Zero erros de console** — verificado em todas as rotas, nos temas claro e escuro.
- **Offline:** depois da primeira abertura funciona sem internet (sem chamadas externas).
- Comentários no código existem apenas onde há fórmula de negócio ou regra não óbvia.
