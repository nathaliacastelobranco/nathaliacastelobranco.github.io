---
title: "Domain-Driven Design (DDD): Guia de Referência"
description: "Um guia de referência completo sobre DDD — design estratégico, design tático, arquitetura de suporte, erros comuns e checklist prático de aplicação."
pubDate: "Jul 25 2026"
heroImage: "../../../assets/01-data-modeling.jpg"
lang: "pt-br"
tags: ["Arquitetura de Software", "DDD"]
---

> Um resumo completo e organizado dos conceitos, padrões e práticas de DDD, pensado para consulta rápida no dia a dia.

---

## Índice

1. [O que é DDD e por que existe](#1-o-que-é-ddd-e-por-que-existe)
2. [Design Estratégico](#2-design-estratégico)
   - Domínio e Subdomínios
   - Bounded Context
   - Context Mapping
   - Linguagem Ubíqua
3. [Design Tático](#3-design-tático)
   - Entities
   - Value Objects
   - Aggregates e Aggregate Root
   - Domain Events
   - Domain Services
   - Repositories
   - Factories
   - Módulos
4. [Arquitetura de Suporte ao DDD](#4-arquitetura-de-suporte-ao-ddd)
   - Camadas (Layered Architecture)
   - Arquitetura Hexagonal (Ports & Adapters)
   - CQRS
   - Event Sourcing
5. [Quando usar (e quando NÃO usar) DDD](#5-quando-usar-e-quando-não-usar-ddd)
6. [Erros comuns](#6-erros-comuns)
7. [Checklist prático de aplicação](#7-checklist-prático-de-aplicação)
8. [Glossário rápido](#8-glossário-rápido)
9. [Referências para aprofundar](#9-referências-para-aprofundar)

---

## 1. O que é DDD e por que existe

**Domain-Driven Design** é uma abordagem de desenvolvimento de software criada por **Eric Evans**, formalizada no livro _"Domain-Driven Design: Tackling Complexity in the Heart of Software"_ (2003). A ideia central é simples de enunciar e difícil de praticar:

> **O código deve refletir o domínio de negócio, e o domínio de negócio deve ser modelado em conjunto com quem entende do assunto (especialistas de domínio).**

DDD não é um framework, não é uma biblioteca, não é uma arquitetura específica. É uma **forma de pensar e organizar o software** em torno da complexidade do negócio, não da complexidade técnica.

### O problema que o DDD resolve

Em sistemas complexos, o maior risco não é a tecnologia — é a **complexidade do domínio** mal compreendida e mal modelada. Sintomas de que isso está acontecendo:

- Termos de negócio diferentes sendo usados para a mesma coisa em partes diferentes do sistema (ou o oposto: o mesmo termo significando coisas diferentes).
- Lógica de negócio espalhada em controllers, services genéricos e scripts, sem um lugar único de verdade.
- Times de desenvolvimento que não conseguem conversar com especialistas de negócio porque falam "línguas" diferentes.
- Um "God Service" ou "God Object" que cresce indefinidamente porque ninguém sabe mais onde termina uma responsabilidade e começa outra.

DDD ataca isso por meio de **duas frentes complementares**: o **Design Estratégico** (como dividir um sistema grande em partes com sentido) e o **Design Tático** (como modelar o código dentro de cada parte).

---

## 2. Design Estratégico

O design estratégico lida com a **visão macro**: como entender, dividir e organizar um domínio complexo em pedaços gerenciáveis.

### 2.1 Domínio e Subdomínios

- **Domínio**: a área de conhecimento/negócio que o software resolve (ex: "logística", "e-commerce", "saúde").
- **Subdomínio**: divisões dentro do domínio. Todo domínio complexo pode (e deve) ser dividido em subdomínios, classificados em três tipos:

| Tipo                     | Descrição                                                                            | Exemplo (e-commerce)                                  | Onde investir esforço                                      |
| ------------------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------- |
| **Core Domain**          | O diferencial competitivo do negócio. É o motivo pelo qual a empresa existe.         | Algoritmo de recomendação personalizado               | Máximo esforço de modelagem e dos melhores desenvolvedores |
| **Supporting Subdomain** | Necessário, mas não é o diferencial. Pode ser customizado, mas sem virar prioridade. | Gestão de catálogo de produtos                        | Esforço moderado                                           |
| **Generic Subdomain**    | Problema já resolvido pelo mercado. Não vale a pena reinventar.                      | Autenticação, emissão de nota fiscal, envio de e-mail | Comprar ou usar solução pronta (SaaS, biblioteca)          |

**Regra prática:** não gaste o mesmo cuidado de modelagem em um subdomínio genérico que você gastaria no core domain. Autenticação não precisa de Aggregates elaborados; o motor de precificação dinâmica, sim.

### 2.2 Bounded Context

É **o conceito mais importante do DDD estratégico**.

> Um **Bounded Context** é uma fronteira explícita (geralmente ligada a um subsistema, serviço ou módulo) dentro da qual um modelo de domínio específico é válido e consistente.

Por que isso importa: a palavra "Cliente" pode significar coisas completamente diferentes em contextos diferentes:

- No contexto de **Vendas**, "Cliente" tem CPF, histórico de compras, endereço de entrega.
- No contexto de **Suporte**, "Cliente" tem histórico de tickets, SLA, nível de satisfação.
- No contexto de **Cobrança**, "Cliente" tem status de inadimplência, forma de pagamento, limite de crédito.

Tentar modelar um único "Cliente" gigante que sirva a todos esses contextos gera uma classe inchada, acoplada, e cheia de campos que só fazem sentido em um lugar. A solução do DDD é: **cada Bounded Context tem seu próprio modelo de "Cliente"**, e a tradução entre eles acontece nas bordas (via Context Mapping).

**Sinal de que você tem um Bounded Context bem definido**: um termo tem um significado único e não ambíguo dentro dele. Se um time consegue conversar sem precisar de "então quando eu digo Pedido eu quero dizer X, não Y" — a fronteira está bem traçada.

### 2.3 Context Mapping

Define **como Bounded Contexts diferentes se relacionam e se comunicam**. Os principais padrões:

- **Partnership**: dois times cooperam de forma próxima, evoluindo os contextos juntos.
- **Shared Kernel**: parte do modelo é compartilhada literalmente entre dois contextos (usar com cautela — cria acoplamento forte).
- **Customer/Supplier**: um contexto (supplier/upstream) fornece dados/serviços para outro (customer/downstream); o downstream tem influência sobre o que o upstream constrói.
- **Conformist**: o contexto downstream simplesmente aceita o modelo do upstream sem poder de negociação (comum ao integrar com APIs de terceiros).
- **Anticorruption Layer (ACL)**: uma camada de tradução que protege seu modelo de domínio da "contaminação" de um modelo externo ou legado. **É um dos padrões mais úteis na prática** — sempre que você integra com um sistema legado ou uma API externa mal desenhada, um ACL evita que o "lixo" do outro sistema vaze para dentro do seu domínio.
- **Open Host Service**: um contexto expõe um protocolo/API bem definida para ser consumida por múltiplos outros contextos.
- **Published Language**: um formato de troca de dados bem documentado e compartilhado (ex: um schema de eventos).
- **Separate Ways**: dois contextos decidem não se integrar — cada um resolve o problema à sua maneira, mesmo que haja alguma duplicação.

### 2.4 Linguagem Ubíqua (Ubiquitous Language)

> Um vocabulário **comum e rigoroso**, construído junto com especialistas de domínio, usado tanto nas conversas quanto **literalmente no código** (nomes de classes, métodos, variáveis).

Não é "documentação de glossário" — é uma linguagem viva usada em:

- Reuniões com stakeholders.
- Histórias de usuário e requisitos.
- **Nomes de classes, métodos e variáveis no código**.

Se o especialista de negócio diz "quando o pedido é **confirmado**, o estoque é **reservado**", o código deveria ter algo como:

```
pedido.confirmar()
estoque.reservar(quantidade)
```

E não `pedido.setStatus(2)` ou `estoque.updateFlag(true)`. Cada Bounded Context tem sua própria Linguagem Ubíqua — o mesmo termo pode (e deve) mudar de significado entre contextos, conforme visto acima.

---

## 3. Design Tático

Enquanto o estratégico pensa a fronteira, o **design tático** define **como modelar o código dentro de um Bounded Context**.

### 3.1 Entities (Entidades)

Objetos que possuem **identidade única** que persiste ao longo do tempo, independente dos seus atributos mudarem.

- Duas entidades são iguais se têm o **mesmo identificador**, mesmo que todos os outros atributos sejam diferentes.
- Têm ciclo de vida: são criadas, mudam de estado, podem ser "removidas" (soft delete, arquivamento).

```
class Pedido {
  private final PedidoId id; // identidade
  private StatusPedido status;
  private List<ItemPedido> itens;

  public void confirmar() {
    if (itens.isEmpty()) throw new PedidoSemItensException();
    this.status = StatusPedido.CONFIRMADO;
  }
}
```

Um `Pedido` com id `123` continua sendo o "mesmo" pedido mesmo que seu status mude de `PENDENTE` para `CONFIRMADO`.

### 3.2 Value Objects (Objetos de Valor)

Objetos definidos **inteiramente pelos seus atributos**, sem identidade própria. Dois Value Objects são iguais se todos os seus valores são iguais.

Características centrais:

- **Imutáveis**: uma vez criado, não muda. Qualquer "alteração" gera uma nova instância.
- **Sem identidade**: `Dinheiro(100, "BRL")` é igual a outro `Dinheiro(100, "BRL")`, não importa "qual instância" é.
- Devem **encapsular validação e comportamento**, não ser apenas um DTO burro.

```
final class Dinheiro {
  private final BigDecimal valor;
  private final Moeda moeda;

  public Dinheiro(BigDecimal valor, Moeda moeda) {
    if (valor.compareTo(BigDecimal.ZERO) < 0)
      throw new ValorNegativoException();
    this.valor = valor;
    this.moeda = moeda;
  }

  public Dinheiro somar(Dinheiro outro) {
    validarMesmaMoeda(outro);
    return new Dinheiro(this.valor.add(outro.valor), this.moeda);
  }
}
```

**Regra prática de bolso**: se você está prestes a criar um campo `String`, `int` ou `BigDecimal` "cru" para representar um conceito de negócio (email, CPF, dinheiro, período, endereço), pare e pergunte: "isso merece ser um Value Object?". Na maioria das vezes, a resposta é sim — isso elimina validações duplicadas espalhadas pelo código e centraliza as regras em um único lugar.

### 3.3 Aggregates e Aggregate Root

O conceito **mais mal compreendido e mais importante** do design tático.

> Um **Aggregate** é um cluster de Entities e Value Objects tratado como **uma unidade única de consistência transacional**. Todo Aggregate tem uma **Aggregate Root** — a única Entity através da qual o mundo externo pode acessar ou modificar qualquer parte do agregado.

Regras de um Aggregate:

1. **Referências externas só podem apontar para a Aggregate Root**, nunca para objetos internos do agregado.
2. **Toda modificação passa pela raiz**. Objetos internos não são modificados diretamente de fora.
3. **Um Aggregate = uma transação**. Se você precisa alterar dois Aggregates na mesma operação atômica, provavelmente eles deveriam ser um só — ou você precisa de consistência eventual entre eles (via Domain Events).
4. **Aggregates devem ser pequenos**. O erro mais comum é criar Aggregates gigantes (ex: `Pedido` contendo `Cliente` completo, `Produtos` completos, etc). Prefira referenciar outros Aggregates **apenas pelo ID**.

```
class Pedido { // Aggregate Root
  private PedidoId id;
  private ClienteId clienteId; // referência por ID, não o objeto Cliente inteiro
  private List<ItemPedido> itens; // Entities/VOs internos, só acessíveis via Pedido

  public void adicionarItem(ProdutoId produtoId, int quantidade, Dinheiro precoUnitario) {
    // toda regra de negócio de adicionar item passa por aqui
    if (this.status != StatusPedido.RASCUNHO)
      throw new PedidoJaConfirmadoException();
    this.itens.add(new ItemPedido(produtoId, quantidade, precoUnitario));
  }
}
```

`ItemPedido` (Entity ou VO interno) nunca deve ser modificado diretamente de fora — sempre por meio de um método do `Pedido`.

**Como identificar o tamanho certo de um Aggregate**: pense nos **invariantes** (regras que sempre precisam ser verdadeiras). Se uma regra de negócio precisa ser garantida de forma **imediata e atômica** entre dois objetos, eles pertencem ao mesmo Aggregate. Se a regra pode tolerar alguns milissegundos/segundos de defasagem (consistência eventual), são Aggregates separados, comunicando-se por eventos.

### 3.4 Domain Events

Representam **algo relevante que aconteceu no domínio**, no passado (por isso o nome geralmente é no passado: `PedidoConfirmado`, `PagamentoRecusado`).

Usos principais:

- Comunicar mudanças entre Aggregates diferentes sem acoplamento direto.
- Comunicar mudanças entre Bounded Contexts diferentes.
- Manter um histórico auditável do que aconteceu (base do Event Sourcing).

```
class PedidoConfirmado {
  private final PedidoId pedidoId;
  private final Instant ocorridoEm;
  // dados relevantes do evento
}
```

Fluxo típico: `Pedido.confirmar()` dispara o evento `PedidoConfirmado` → um handler no contexto de **Estoque** escuta esse evento e reserva os itens → um handler no contexto de **Notificação** escuta o mesmo evento e envia um e-mail ao cliente. Nenhum desses contextos precisa conhecer o outro diretamente.

### 3.5 Domain Services

Quando uma operação de negócio **não pertence naturalmente a nenhuma Entity ou Value Object específico** (geralmente porque envolve múltiplos Aggregates), ela vira um Domain Service.

```
class ServicoDeTransferencia {
  public void transferir(Conta origem, Conta destino, Dinheiro valor) {
    origem.debitar(valor);
    destino.creditar(valor);
  }
}
```

**Cuidado**: Domain Service não é desculpa para anemizar o modelo. Antes de criar um, pergunte: "essa lógica não pertence de fato a uma das entidades envolvidas?". Use Domain Services apenas quando a operação genuinamente atravessa múltiplos objetos de domínio sem "dono" natural.

### 3.6 Repositories

Abstraem o acesso a **persistência de Aggregates**, dando a ilusão de uma coleção em memória.

- Um Repository existe **por Aggregate Root**, nunca para objetos internos.
- A interface do Repository vive na **camada de domínio**; a implementação vive na **camada de infraestrutura** (Dependency Inversion).

```
interface PedidoRepository {
  Optional<Pedido> buscarPorId(PedidoId id);
  void salvar(Pedido pedido);
}
```

### 3.7 Factories

Encapsulam a lógica de **criação de Aggregates complexos**, especialmente quando a criação envolve várias regras de validação ou passos.

```
class PedidoFactory {
  public static Pedido criarNovoPedido(ClienteId clienteId, List<ItemInput> itensInput) {
    // validações e regras complexas de criação
    return new Pedido(...);
  }
}
```

### 3.8 Módulos

Simplesmente a organização em pacotes/namespaces que reflete os subdomínios/Bounded Contexts — não deixe a estrutura de pastas ser puramente técnica (`controllers/`, `services/`, `models/`) sem relação com o domínio. Prefira organizar por **contexto de negócio**:

```
/pedidos
  /dominio
  /aplicacao
  /infraestrutura
/estoque
  /dominio
  /aplicacao
  /infraestrutura
```

---

## 4. Arquitetura de Suporte ao DDD

DDD tático precisa de uma arquitetura que **proteja o domínio de detalhes técnicos**. As mais usadas junto com DDD:

### 4.1 Layered Architecture (Arquitetura em Camadas)

A divisão clássica proposta pelo próprio Evans:

1. **Interface/Apresentação** — controllers, APIs, UI.
2. **Aplicação** — orquestra casos de uso, não contém regra de negócio.
3. **Domínio** — o coração: Entities, Value Objects, Aggregates, Domain Services, Domain Events. **Não depende de nenhuma outra camada.**
4. **Infraestrutura** — implementações de Repository, integrações externas, frameworks.

Regra de ouro: **as dependências apontam para dentro**. A camada de domínio não conhece infraestrutura nem frameworks.

### 4.2 Arquitetura Hexagonal (Ports & Adapters)

Complementa perfeitamente o DDD. O domínio fica no centro ("hexágono"), isolado por **Ports** (interfaces) que definem contratos, implementados por **Adapters** (implementações concretas — banco de dados, fila de mensagens, API REST).

Vantagem prática: você pode trocar o banco de dados, o broker de mensagens, ou o framework web sem tocar em uma linha do domínio.

### 4.3 CQRS (Command Query Responsibility Segregation)

Separa os modelos de **escrita** (Commands, que passam pelas regras de negócio e Aggregates) dos modelos de **leitura** (Queries, que podem consultar diretamente uma projeção otimizada, sem passar pelas regras de domínio).

Não é obrigatório em DDD, mas se encaixa bem quando:

- Leituras e escritas têm requisitos de performance/escala muito diferentes.
- Telas de consulta precisam de dados "achatados" de múltiplos Aggregates (o que seria estranho de expor via o modelo de domínio).

### 4.4 Event Sourcing

Em vez de guardar apenas o **estado atual** de um Aggregate, guarda-se a **sequência de eventos** que levou a esse estado. O estado atual é reconstruído reaplicando os eventos.

Combina muito bem com Domain Events (seção 3.4), mas é uma decisão de arquitetura **separada e mais custosa** — traz auditoria total e "viagem no tempo", mas exige mais maturidade de equipe (versionamento de eventos, snapshots, etc.).

---

## 5. Quando usar (e quando NÃO usar) DDD

### Bons candidatos a DDD

- Domínio de negócio **genuinamente complexo**, com muitas regras, exceções e casos de borda.
- Sistemas de longa duração, que vão evoluir por anos e precisam de um modelo que resista a mudanças.
- Times que têm (ou podem construir) acesso próximo a especialistas de domínio.
- Sistemas em que **diferentes áreas do negócio têm modelos conflitantes** para o mesmo conceito (sinal claro de que Bounded Contexts vão ajudar).

### Maus candidatos (DDD é overkill)

- **CRUDs simples** — sistemas que são, na essência, formulários de entrada e listagem de dados sem regra de negócio relevante.
- Protótipos, MVPs, provas de conceito — o custo de modelagem tática (Aggregates, Value Objects, etc.) não se paga no curto prazo.
- Domínios genéricos já resolvidos pelo mercado (autenticação, envio de email) — como visto na seção 2.1, aqui o certo é comprar/usar pronto, não modelar do zero.
- Times pequenos sem experiência prévia — a curva de aprendizado de DDD tático mal aplicado pode gerar mais complexidade acidental do que a que resolve (over-engineering).

> **Citação de referência (parafraseada de Martin Fowler)**: aplicar os padrões táticos do DDD sem entender o design estratégico por trás costuma resultar em código mais complexo, não mais simples — porque a complexidade tática só se justifica quando existe complexidade real de negócio para modelar.

---

## 6. Erros comuns

1. **Anemic Domain Model**: Entities que são só "sacos de getters/setters", com toda a lógica de negócio jogada em "Services" externos. Isso é o oposto do que o DDD propõe — o comportamento deveria viver junto com os dados que ele manipula.
2. **Aggregates gigantes**: modelar um `Cliente` que carrega pedidos, endereços, cartões, tickets de suporte — tudo dentro do mesmo Aggregate. Isso gera contenção de concorrência e Aggregates difíceis de carregar/persistir.
3. **Confundir Bounded Context com "microsserviço"**: Bounded Context é um conceito de **modelagem**, não de infraestrutura de deploy. Você pode ter múltiplos Bounded Contexts dentro de um monólito bem modelado — e um microsserviço mal desenhado pode conter vários Bounded Contexts misturados dentro dele.
4. **Um "Cliente" único para o sistema todo**: tentar unificar o modelo de um conceito em todos os contextos, gerando uma classe inchada e cheia de campos opcionais dependendo do contexto de uso.
5. **Ignorar a Linguagem Ubíqua no código**: manter reuniões de negócio com um vocabulário rico, mas o código continua cheio de `Manager`, `Helper`, `Processor`, `Data`, sem relação com os termos de negócio.
6. **Aplicar DDD tático em domínios genéricos ou triviais**: criar Value Objects, Aggregates e Domain Events para uma tela de cadastro de "categorias de produto" que não tem regra nenhuma além de nome único.
7. **Achar que DDD = pasta `domain/`**: ter uma pasta chamada `domain` no projeto não significa que o domínio foi modelado — a estrutura de pastas é consequência do modelo, não o modelo em si.

---

## 7. Checklist prático de aplicação

Ao modelar uma nova funcionalidade ou revisar uma existente, pergunte:

- [ ] Esse conceito é um **Core Domain**, **Supporting** ou **Generic Subdomain**? (define quanto esforço de modelagem vale a pena)
- [ ] Qual é o **Bounded Context** dessa funcionalidade? Existe ambiguidade de termos com outro contexto?
- [ ] Os termos usados no código batem com os termos usados pelos especialistas de negócio (Linguagem Ubíqua)?
- [ ] Esse objeto tem identidade própria (Entity) ou é definido só pelos seus valores (Value Object)?
- [ ] Quais são os **invariantes** (regras que sempre precisam ser verdadeiras)? Eles definem os limites do Aggregate.
- [ ] O Aggregate está pequeno? Estou referenciando outros Aggregates só por ID?
- [ ] A regra de negócio está dentro da Entity/Value Object, ou vazou para um Service anêmico?
- [ ] Preciso de consistência **imediata** (mesmo Aggregate) ou **eventual** (Domain Event entre Aggregates/contextos)?
- [ ] Estou integrando com um sistema legado ou externo? Preciso de um Anticorruption Layer?
- [ ] O domínio depende de algum detalhe de infraestrutura (banco, framework)? Se sim, inverta a dependência.

---

## 8. Glossário rápido

| Termo                    | Definição em uma linha                                               |
| ------------------------ | -------------------------------------------------------------------- |
| **Domínio**              | Área de conhecimento/negócio que o software resolve                  |
| **Subdomínio**           | Divisão do domínio (Core, Supporting, Generic)                       |
| **Bounded Context**      | Fronteira onde um modelo específico é válido e consistente           |
| **Context Map**          | Mapa das relações entre Bounded Contexts                             |
| **Linguagem Ubíqua**     | Vocabulário comum entre negócio e código, dentro de um contexto      |
| **Entity**               | Objeto com identidade única que persiste no tempo                    |
| **Value Object**         | Objeto imutável definido pelos seus valores, sem identidade          |
| **Aggregate**            | Cluster de objetos tratado como unidade de consistência transacional |
| **Aggregate Root**       | Única porta de entrada para modificar um Aggregate                   |
| **Domain Event**         | Algo relevante que aconteceu no domínio, no passado                  |
| **Domain Service**       | Operação de negócio sem "dono" natural entre Entities                |
| **Repository**           | Abstração de persistência para um Aggregate                          |
| **Factory**              | Encapsula a criação de Aggregates complexos                          |
| **Anticorruption Layer** | Camada de tradução que protege o domínio de modelos externos         |
| **Anemic Domain Model**  | Antipadrão: Entities sem comportamento, só dados                     |

---

## 9. Referências para aprofundar

- Eric Evans — _Domain-Driven Design: Tackling Complexity in the Heart of Software_ (o livro original, conhecido como "Blue Book").
- Vaughn Vernon — _Implementing Domain-Driven Design_ (o "Red Book", mais prático e com exemplos de código).
- Vaughn Vernon — _Domain-Driven Design Distilled_ (versão resumida, ótima introdução).
- Martin Fowler — artigos sobre Bounded Context, Anemic Domain Model e CQRS no site martinfowler.com.
- Alberto Brandolini — material sobre **Event Storming**, técnica prática para descobrir Bounded Contexts e Domain Events colaborativamente com especialistas de negócio.

---

_Última atualização deste guia: julho de 2026._
