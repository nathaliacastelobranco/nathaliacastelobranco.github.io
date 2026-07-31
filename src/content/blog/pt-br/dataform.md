---
title: "Dataform (Google Cloud): Guia de Referência"
description: "Um guia de referência completo sobre o Dataform — tipos de arquivo SQLX, JavaScript API, particionamento e clustering no BigQuery, boas práticas e erros comuns."
pubDate: "Jul 25 2026"
heroImage: "../../../assets/02-hadoop.jpg"
lang: "pt-br"
tags: ["Data Engineering", "Dataform"]
---

> Um resumo completo e organizado sobre o Dataform — tipos de arquivo, JavaScript API, particionamento, boas práticas — pensado para consulta rápida no dia a dia.

---

## Índice

1. [O que é o Dataform](#1-o-que-é-o-dataform)
2. [Estrutura do Projeto](#2-estrutura-do-projeto)
3. [workflow_settings.yaml](#3-workflow_settingsyaml)
4. [Tipos de Arquivo SQLX](#4-tipos-de-arquivo-sqlx)
   - Anatomia de um arquivo SQLX
   - `declaration`
   - `table`
   - `view`
   - `incremental`
   - `operations`
   - `assertion`
5. [Config Block — Referência Completa](#5-config-block--referência-completa)
6. [JavaScript API](#6-javascript-api)
   - `ref()` e `resolve()`
   - `self()`
   - `when()`
7. [Includes e Macros (.js)](#7-includes-e-macros-js)
8. [Particionamento e Clustering no BigQuery](#8-particionamento-e-clustering-no-bigquery)
9. [Labels, KMS e Opções Avançadas](#9-labels-kms-e-opções-avançadas)
10. [Tags e Dependências](#10-tags-e-dependências)
11. [Documentação de Colunas](#11-documentação-de-colunas)
12. [Variáveis de Compilação (vars)](#12-variáveis-de-compilação-vars)
13. [Exemplo Completo — Pipeline de Vendas (end-to-end)](#13-exemplo-completo--pipeline-de-vendas-end-to-end)
14. [Boas Práticas](#14-boas-práticas)
15. [Erros comuns](#15-erros-comuns)
16. [Cheat Sheet — Referência Rápida](#16-cheat-sheet--referência-rápida)
17. [Glossário rápido](#17-glossário-rápido)
18. [Referências para aprofundar](#18-referências-para-aprofundar)

---

## 1. O que é o Dataform

O **Dataform** é uma plataforma de transformação de dados (ELT) nativa do Google Cloud, integrada ao BigQuery. Permite criar, testar e orquestrar pipelines de transformação SQL de forma declarativa, utilizando arquivos **SQLX** — SQL estendido com blocos de configuração em JavaScript.

É a alternativa do GCP para ferramentas como **dbt** (Data Build Tool), com a vantagem de ser executado diretamente no console do BigQuery, sem necessidade de infraestrutura adicional.

> **Analogia com dbt:** se você vem do dbt, o Dataform tem o mesmo papel. A diferença principal é que o Dataform é gerenciado pelo GCP, usa SQLX em vez de Jinja+SQL, e a função `ref()` funciona de forma análoga ao `{{ ref() }}` do dbt.

### Fluxo de trabalho típico

```
Sources (declaration) → Staging (view/table) → Marts (table/incremental) → Assertions (testes)
```

Esse fluxo segue tipicamente a **arquitetura medalhão** (bronze → prata → ouro): sources brutas são declaradas, staging faz a limpeza/tipagem inicial, e marts (gold) consolidam os dados para consumo analítico.

---

## 2. Estrutura do Projeto

Um projeto Dataform segue a seguinte estrutura padrão:

```
meu-projeto-dataform/
│
├── workflow_settings.yaml       # Configuração global do projeto
│
├── definitions/                 # PRINCIPAL: todos os arquivos SQLX ficam aqui
│   ├── sources/                 # Declarações de fontes externas
│   │   └── erp_sources.sqlx
│   ├── staging/                 # Camada de staging (bronze → prata)
│   │   ├── stg_pedidos.sqlx
│   │   └── stg_clientes.sqlx
│   ├── intermediate/            # Transformações intermediárias
│   │   └── int_pedidos_clientes.sqlx
│   └── marts/                   # Camada final (gold)
│       ├── fct_vendas.sqlx
│       └── dim_clientes.sqlx
│
├── includes/                    # Funções e macros JavaScript reutilizáveis
│   ├── helpers.js
│   └── constants.js
│
└── package.json                 # Dependências do projeto
```

> **Onde ficam os arquivos?** Todos os arquivos `.sqlx` devem estar dentro da pasta `definitions/`. Você pode organizar em subpastas como quiser — o Dataform lê recursivamente.

---

## 3. workflow_settings.yaml

É o ponto de configuração central do projeto. Define o projeto GCP, dataset padrão e outras opções globais.

```yaml
dataformCoreVersion: 3.0.0 # Versão do Dataform Core

defaultProject: meu-projeto-gcp # ID do projeto no GCP
defaultDataset: dataform_prod # Dataset padrão no BigQuery (schema)
defaultLocation: US # Localização do BigQuery

defaultAssertionDataset: dataform_assertions # Dataset para assertions

vars:
  env: "production" # Variáveis de compilação (acessíveis via dataform.projectConfig.vars)
  incremental_lookback_days: "7"
```

### Opções disponíveis

| Campo                     | Tipo          | Descrição                                                  |
| ------------------------- | ------------- | ---------------------------------------------------------- |
| `dataformCoreVersion`     | string        | Versão do Dataform Core a ser usada                        |
| `defaultProject`          | string        | ID do projeto GCP padrão                                   |
| `defaultDataset`          | string        | Dataset BigQuery onde as tabelas são criadas               |
| `defaultLocation`         | string        | Localização do BigQuery (`US`, `EU`, `southamerica-east1`) |
| `defaultAssertionDataset` | string        | Dataset separado para tabelas de assertions                |
| `vars`                    | map\<string\> | Variáveis de compilação globais                            |

---

## 4. Tipos de Arquivo SQLX

Todo arquivo `.sqlx` começa com um bloco `config {}` que define seu tipo e comportamento. O campo `type` é o mais importante:

| Tipo            | Descrição                                                            |
| --------------- | -------------------------------------------------------------------- |
| **declaration** | Declara tabelas externas como sources para referência no projeto     |
| **table**       | Cria uma tabela física materializada no BigQuery (full refresh)      |
| **view**        | Cria uma view SQL no BigQuery, sem materialização de dados           |
| **incremental** | Tabela que apenas insere/atualiza registros novos a cada execução    |
| **operations**  | SQL puro sem output — para scripts DDL, MERGE, chamadas de procedure |
| **assertion**   | Teste de qualidade que falha se retornar alguma linha                |

### Anatomia de um arquivo SQLX

```sqlx
// 1. BLOCO CONFIG — sempre primeiro, sempre em JavaScript
config {
  type: "table",           // Tipo do arquivo (obrigatório)
  schema: "gold",          // Dataset/schema de destino
  name: "fct_vendas",      // Nome da tabela (padrão: nome do arquivo)
  description: "Fatos de vendas consolidados",
  tags: ["vendas", "diario"],
  dependOnDependencyAssertions: true,
  columns: {
    id_venda: "Identificador único da venda",
    valor_total: "Valor bruto da venda sem descontos"
  }
}

// 2. (Opcional) pre_operations — SQL executado ANTES da criação da tabela
pre_operations {
  CREATE SCHEMA IF NOT EXISTS ${self().schema}
}

-- 3. QUERY PRINCIPAL — SQL puro, pode usar ref() para referenciar outras tabelas
SELECT
  p.id_pedido        AS id_venda,
  p.data_pedido,
  p.valor_total,
  c.nome_cliente
FROM ${ref("stg_pedidos")} p
LEFT JOIN ${ref("stg_clientes")} c
  ON p.id_cliente = c.id_cliente

// 4. (Opcional) post_operations — SQL executado APÓS a criação da tabela
post_operations {
  GRANT SELECT ON ${self()} TO "group:analistas@empresa.com"
}
```

### 4.1 `declaration` — Declaração de Sources

Usado para **declarar tabelas que já existem no BigQuery e não são criadas pelo Dataform**. Funciona como uma "fonte de dados" — você registra a tabela para poder referenciá-la com `ref()` no restante do projeto.

> ⚠️ **`declaration` não cria nem modifica dados.** Um arquivo `type: "declaration"` não tem corpo SQL — ele apenas "aponta" para uma tabela existente, criando um alias usável com `ref()`.

**Declaração simples:**

```sqlx
// definitions/sources/erp_pedidos.sqlx
config {
  type: "declaration",

  // De onde vem a tabela (projeto GCP)
  database: "meu-projeto-gcp",

  // Dataset/schema onde a tabela existe
  schema: "raw_erp",

  // Nome real da tabela no BigQuery
  name: "raw_orders",

  // Documentação (opcional, mas recomendado)
  description: "Tabela de cabeçalhos de pedidos do ERP de origem",
  columns: {
    ORDER_ID: "Número único da nota/pedido",
    ORDER_DATE:  "Data de negociação",
    ORDER_VALUE: "Valor total da nota",
    PARTNER_CODE: "Código do parceiro (cliente/fornecedor)"
  }
}
```

> ✅ **Boa prática:** crie um arquivo `.sqlx` separado para cada tabela de source. Isso facilita a documentação, versionamento e rastreabilidade do lineage.

**Parâmetros do `declaration`:**

| Campo         | Tipo   | Obrigatório | Descrição / Padrão                                               |
| ------------- | ------ | ----------- | ---------------------------------------------------------------- |
| `type`        | string | Sim         | Sempre `"declaration"` para sources                              |
| `database`    | string | Não         | ID do projeto GCP onde a tabela reside. Padrão: `defaultProject` |
| `schema`      | string | Não         | Dataset BigQuery onde a tabela existe. Padrão: `defaultDataset`  |
| `name`        | string | Não         | Nome real da tabela no BigQuery. Padrão: nome do arquivo `.sqlx` |
| `description` | string | Não         | Descrição da source. Aparece no lineage e na documentação        |
| `columns`     | object | Não         | Documentação das colunas (chave = nome, valor = descrição)       |

**Usando uma `declaration` com `ref()`:**

```sqlx
// definitions/staging/stg_pedidos.sqlx
config {
  type: "view",
  schema: "staging",
  description: "Staging de pedidos com colunas renomeadas e tipos corrigidos"
}

SELECT
  CAST(ORDER_ID AS INT64)       AS id_nota,
  CAST(PARTNER_CODE AS INT64)      AS id_parceiro,
  PARSE_DATE('%Y%m%d', CAST(ORDER_DATE AS STRING)) AS data_negociacao,
  ORDER_VALUE                     AS valor_total,
  OP_TYPE_CODE                  AS codigo_operacao,
  ORDER_STATUS                  AS status

-- Referenciando a declaration pelo nome do arquivo
FROM ${ref("raw_orders")}

WHERE ORDER_STATUS != 'C'   -- Exclui notas canceladas
```

### 4.2 `table` — Tabela Materializada

Cria uma **tabela física no BigQuery** que é completamente recriada (DROP + CREATE) a cada execução. Use para tabelas de tamanho gerenciável ou onde a idempotência é essencial.

**✅ Quando usar `table`:**

- Camada gold/marts com dados consolidados.
- Tabelas de dimensão (`dim_clientes`, `dim_produtos`).
- Dados que precisam de full refresh.
- Tabelas até ~100M registros (custo aceitável).

**❌ Evite `table` quando:**

- Dados históricos com bilhões de registros.
- O custo de scan completo é inviável.
- Precisa de atualização parcial diária (use `incremental`).

**Exemplo — Dimensão de Clientes:**

```sqlx
// definitions/marts/dim_clientes.sqlx
config {
  type: "table",
  schema: "gold",
  name: "dim_clientes",
  description: "Dimensão de clientes com dados consolidados do ERP",
  tags: ["dimensoes", "clientes"],

  // Assertions embutidas
  assertions: {
    uniqueKey: ["id_cliente"],
    nonNull: ["id_cliente", "nome_cliente"]
  },

  columns: {
    id_cliente:        { description: "Chave primária do cliente" },
    nome_cliente:      { description: "Nome ou razão social" },
    email:             { description: "E-mail principal cadastrado" },
    cidade:            { description: "Cidade do endereço principal" },
    segmento_cliente:  { description: "Segmento: PF, PJ ou Governo" },
    data_primeiro_pedido: { description: "Data do primeiro pedido realizado" },
    total_pedidos:     { description: "Contagem histórica de pedidos" }
  },

  bigquery: {
    clusterBy: ["segmento_cliente", "cidade"]
  }
}

SELECT
  CAST(p.PARTNER_CODE AS INT64)          AS id_cliente,
  TRIM(p.PARTNER_NAME)                   AS nome_cliente,
  LOWER(TRIM(p.EMAIL))               AS email,
  TRIM(e.CITY_NAME)                    AS cidade,
  TRIM(e.STATE_UF)                         AS estado,

  CASE
    WHEN p.PERSON_TYPE = 'F' THEN 'PF'
    WHEN p.PERSON_TYPE = 'J' THEN 'PJ'
    ELSE 'Outros'
  END                                AS segmento_cliente,

  MIN(c.data_negociacao)             AS data_primeiro_pedido,
  COUNT(DISTINCT c.id_nota)          AS total_pedidos,
  SUM(c.valor_total)                 AS valor_total_historico,
  CURRENT_TIMESTAMP()                AS atualizado_em

FROM ${ref("raw_partners")} p
LEFT JOIN ${ref("raw_addresses")} e
  ON p.PARTNER_CODE = e.PARTNER_CODE AND e.ADDRESS_CODE = 1
LEFT JOIN ${ref("stg_pedidos")} c
  ON p.PARTNER_CODE = c.id_parceiro

WHERE p.IS_CUSTOMER = 'S'   -- Apenas parceiros que são clientes

GROUP BY 1, 2, 3, 4, 5, 6
```

**`pre_operations` e `post_operations`:**

```sqlx
// definitions/marts/fct_vendas.sqlx
config {
  type: "table",
  schema: "gold",
  description: "Fatos de vendas"
}

pre_operations {
  -- Executado ANTES de criar a tabela
  -- Útil para criar schemas, dropar objetos dependentes, etc.
  DELETE FROM ${self()} WHERE data_pedido < DATE_SUB(CURRENT_DATE(), INTERVAL 3 YEAR)
}

SELECT
  p.id_nota,
  p.data_negociacao  AS data_pedido,
  p.id_parceiro      AS id_cliente,
  p.valor_total,
  i.id_produto,
  i.quantidade,
  i.valor_unitario
FROM ${ref("stg_pedidos")} p
INNER JOIN ${ref("stg_itens_pedido")} i
  ON p.id_nota = i.id_nota

post_operations {
  -- Executado APÓS criar a tabela
  -- Útil para conceder permissões, atualizar estatísticas, etc.
  GRANT SELECT ON TABLE `${self().database}.${self().schema}.${self().name}`
  TO "group:analistas@empresa.com.br"
}
```

### 4.3 `view` — Visão SQL

Cria uma **view no BigQuery**. Nenhum dado é armazenado — a query é executada toda vez que alguém consulta a view. Ideal para camadas de staging e transformações leves.

> 💡 **Materialized View:** adicionando `materialized: true` ao config, o Dataform cria uma **Materialized View** do BigQuery — os dados são cacheados e atualizados automaticamente.

**Exemplo — Staging de Pedidos:**

```sqlx
// definitions/staging/stg_pedidos.sqlx
config {
  type: "view",
  schema: "staging",
  description: "Staging de pedidos: limpeza de tipos e renomeação de colunas",
  tags: ["staging", "erp"],

  columns: {
    id_nota:           "Número único da nota fiscal",
    id_parceiro:       "FK para dim_clientes",
    data_negociacao:   "Data da transação (convertida para DATE)",
    valor_total:       "Valor bruto da nota",
    status:            "L=Liberado, C=Cancelado, P=Pendente"
  }
}

SELECT
  CAST(ORDER_ID     AS INT64)   AS id_nota,
  CAST(PARTNER_CODE    AS INT64)   AS id_parceiro,
  CAST(OP_TYPE_CODE AS INT64)   AS id_tipo_operacao,

  -- Conversão segura de data (ERP usa INTEGER YYYYMMDD)
  SAFE.PARSE_DATE(
    '%Y%m%d',
    CAST(CAST(ORDER_DATE AS INT64) AS STRING)
  )                            AS data_negociacao,

  CAST(ORDER_VALUE    AS NUMERIC) AS valor_total,
  CAST(DISCOUNT_VALUE AS NUMERIC) AS valor_desconto,
  ORDER_STATUS                   AS status,
  CAST(SELLER_CODE AS INT64)  AS id_vendedor,
  CURRENT_TIMESTAMP()          AS processado_em

FROM ${ref("raw_orders")}

WHERE
  ORDER_STATUS NOT IN ('C')     -- Exclui cancelados
  AND CAST(ORDER_DATE AS INT64) >= 20200101   -- A partir de 2020
```

**Materialized View:**

```sqlx
// definitions/marts/mv_vendas_diarias.sqlx
config {
  type: "view",
  materialized: true,        // 👈 Torna-se uma Materialized View no BigQuery
  schema: "gold",
  description: "Resumo diário de vendas com cache automático",
  bigquery: {
    partitionBy: "data_pedido",
    clusterBy: ["id_vendedor"]
  }
}

SELECT
  data_pedido,
  id_vendedor,
  COUNT(DISTINCT id_nota)  AS qtd_pedidos,
  SUM(valor_total)         AS total_vendas,
  AVG(valor_total)         AS ticket_medio
FROM ${ref("stg_pedidos")}
WHERE status = 'L'
GROUP BY 1, 2
```

### 4.4 `incremental` — Tabela Incremental

Usado quando você precisa **processar apenas os dados novos/modificados** a cada execução, em vez de reprocessar tudo. Essencial para tabelas de fatos com bilhões de registros.

**Como funciona:**

- **Primeira execução** (ou `--full-refresh`): executa a query completa, sem o filtro `when()`.
- **Execuções seguintes**: aplica o bloco `when(incremental(), ...)` para filtrar apenas registros novos.
- Se **`uniqueKey` definido**: faz **MERGE** (upsert) — atualiza registros existentes e insere novos.
- Se **`uniqueKey` não definido**: faz **INSERT** — apenas adiciona novas linhas.

> ⚡ **A função `when()`** é a chave dos incrementais. O primeiro argumento retorna `true` quando é uma execução incremental (não full-refresh), e o segundo argumento é a condição SQL a adicionar.

**Incremental com INSERT (append only):**

```sqlx
// definitions/marts/fct_eventos_acesso.sqlx
config {
  type: "incremental",
  schema: "gold",
  description: "Eventos de acesso — apenas append, sem atualização",
  tags: ["eventos", "incremental"],

  // SEM uniqueKey = INSERT apenas (append)
  bigquery: {
    partitionBy: "DATE(timestamp_evento)",
    requirePartitionFilter: false
  }
}

SELECT
  evento_id,
  usuario_id,
  tipo_evento,
  pagina,
  timestamp_evento,
  CURRENT_TIMESTAMP() AS processado_em

FROM ${ref("raw_eventos")}

-- when(incremental()) retorna true nas execuções incrementais
-- Só carrega eventos das últimas 24h nesse caso
WHERE ${when(incremental(), "timestamp_evento > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)")}
```

**Incremental com MERGE (upsert):**

```sqlx
// definitions/marts/fct_pedidos_incremental.sqlx
config {
  type: "incremental",
  schema: "gold",
  name: "fct_pedidos",
  description: "Fatos de pedidos com upsert por id_nota",
  tags: ["pedidos", "incremental", "diario"],

  // COM uniqueKey = MERGE (upsert)
  // Se id_nota já existe → UPDATE; se não → INSERT
  uniqueKey: ["id_nota"],

  // Limita o scan na tabela destino durante o MERGE
  // Muito importante para performance com partições
  updatePartitionFilter: "data_pedido >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)",

  bigquery: {
    partitionBy: "data_pedido",
    requirePartitionFilter: true,
    clusterBy: ["id_cliente", "status"]
  },

  assertions: {
    uniqueKey: ["id_nota"],
    nonNull: ["id_nota", "id_cliente", "data_pedido"]
  }
}

SELECT
  CAST(p.ORDER_ID    AS INT64)   AS id_nota,
  CAST(p.PARTNER_CODE   AS INT64)   AS id_cliente,
  CAST(p.SELLER_CODE   AS INT64)   AS id_vendedor,
  SAFE.PARSE_DATE('%Y%m%d', CAST(CAST(p.ORDER_DATE AS INT64) AS STRING)) AS data_pedido,
  CAST(p.ORDER_VALUE   AS NUMERIC) AS valor_bruto,
  CAST(p.DISCOUNT_VALUE AS NUMERIC) AS valor_desconto,
  CAST(p.ORDER_VALUE - p.DISCOUNT_VALUE AS NUMERIC) AS valor_liquido,
  p.ORDER_STATUS                 AS status,
  CURRENT_TIMESTAMP()          AS atualizado_em

FROM ${ref("raw_orders")} p

WHERE
  p.ORDER_STATUS != 'C'

  -- Nas execuções incrementais, filtra apenas pedidos alterados recentemente
  ${when(incremental(), `
    AND CAST(p.UPDATED_DATE AS INT64) >= CAST(
      FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY))
    AS INT64)
  `)}
```

**Full Refresh forçado (CLI):**

```bash
# Executar com full refresh — ignora o filtro when(incremental(), ...)
# e recria a tabela do zero
dataform run --full-refresh

# Full refresh de uma tabela específica
dataform run --full-refresh --actions fct_pedidos

# Full refresh de todas as tabelas com uma tag específica
dataform run --full-refresh --tags incremental
```

**Comparativo INSERT vs MERGE:**

| Aspecto                 | INSERT (sem `uniqueKey`)          | MERGE (com `uniqueKey`)            |
| ----------------------- | --------------------------------- | ---------------------------------- |
| Comportamento           | Apenas adiciona novas linhas      | Atualiza existentes + insere novos |
| Duplicatas              | Possível se rodar 2x no mesmo dia | Impossível — chave única           |
| Custo BigQuery          | Menor (apenas INSERT)             | Maior (scan na tabela destino)     |
| Caso de uso             | Logs, eventos imutáveis           | Pedidos, status que mudam          |
| `updatePartitionFilter` | Ignorado                          | Essencial para performance         |

### 4.5 `operations` — SQL Sem Output

Executa SQL que **não cria tabelas ou views diretamente**. Use para scripts de manutenção, criação de schemas, execução de stored procedures, ou qualquer SQL arbitrário.

> 💡 **Separador de statements:** use `---` (três hífens) para separar múltiplos statements SQL dentro de um arquivo `operations`.

**Exemplo — Criação de Schema e Permissões:**

```sqlx
// definitions/operations/setup_schemas.sqlx
config {
  type: "operations",
  tags: ["setup", "infra"],
  description: "Cria schemas necessários e configura permissões",
  // hasOutput: false  // padrão — não cria tabela no grafo
}

-- Statement 1: Criar schema de staging
CREATE SCHEMA IF NOT EXISTS `${dataform.projectConfig.defaultProject}.staging`
OPTIONS (location = 'US')

---

-- Statement 2: Criar schema de gold
CREATE SCHEMA IF NOT EXISTS `${dataform.projectConfig.defaultProject}.gold`
OPTIONS (location = 'US')

---

-- Statement 3: Permissões para o time de analytics
GRANT `roles/bigquery.dataViewer`
ON SCHEMA `${dataform.projectConfig.defaultProject}.gold`
TO "group:analytics@empresa.com.br"
```

**Operations com `hasOutput` (cria tabela manualmente):**

```sqlx
// definitions/operations/create_external_table.sqlx
config {
  type: "operations",
  hasOutput: true,    // 👈 Diz ao Dataform que este script cria uma tabela
  schema: "staging",
  name: "ext_gcs_vendas",
  description: "Tabela externa apontando para arquivos no GCS"
}

CREATE OR REPLACE EXTERNAL TABLE `${self()}`
OPTIONS (
  format = 'PARQUET',
  uris = ['gs://meu-bucket/vendas/*.parquet']
)
```

**Operations com dependência explícita:**

```sqlx
// definitions/operations/refresh_materialized.sqlx
config {
  type: "operations",
  // Depende explicitamente dessas tabelas
  dependencies: ["fct_vendas", "dim_clientes"],
  tags: ["pos-processamento"]
}

-- Executa após fct_vendas e dim_clientes serem criadas
CALL `meu-projeto.procedures.atualiza_cache`()

---

-- Invalida cache de relatórios
DELETE FROM `meu-projeto.cache.relatorios`
WHERE updated_at < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
```

### 4.6 `assertion` — Testes de Qualidade

Assertions são **testes de qualidade de dados**. Uma assertion é uma query SQL que **não deve retornar nenhuma linha**. Se retornar ao menos uma linha, a assertion falha e o pipeline para (dependendo da configuração).

> 🚨 **Regra de ouro das assertions:** a query deve retornar apenas os registros **problemáticos**. Se retornar 0 linhas = tudo ok. Se retornar qualquer linha = falha.

**Assertion standalone (arquivo próprio):**

```sqlx
// definitions/assertions/assert_pedidos_sem_cliente.sqlx
config {
  type: "assertion",
  description: "Garante que não existam pedidos sem cliente associado",
  tags: ["qualidade", "pedidos"],
  // A assertion depende implicitamente das tabelas referenciadas no SQL
}

-- Retorna pedidos onde id_cliente é NULL ou não existe em dim_clientes
-- Se essa query retornar qualquer linha, a assertion FALHA
SELECT
  p.id_nota,
  p.id_cliente,
  p.data_pedido,
  p.valor_total
FROM ${ref("fct_pedidos")} p
LEFT JOIN ${ref("dim_clientes")} c
  ON p.id_cliente = c.id_cliente
WHERE
  p.id_cliente IS NULL
  OR c.id_cliente IS NULL
```

**Assertions inline no `config {}`:**

```sqlx
config {
  type: "table",
  schema: "gold",
  name: "dim_produtos",

  // Assertions automáticas geradas pelo Dataform
  assertions: {
    // Verifica que a combinação dessas colunas é única
    uniqueKey: ["id_produto"],

    // Verifica que essas colunas não têm NULL
    nonNull: ["id_produto", "nome_produto", "categoria"],

    // Condições personalizadas — retorna linhas que VIOLAM a regra
    rowConditions: [
      "preco_venda > 0",                         // preço deve ser positivo
      "preco_venda >= preco_custo",              // preço de venda >= custo
      "data_cadastro <= CURRENT_DATE()"          // data não pode ser futura
    ]
  }
}

SELECT
  id_produto,
  nome_produto,
  categoria,
  preco_venda,
  preco_custo,
  data_cadastro
FROM ${ref("stg_produtos")}
```

**Assertion para regra de negócio complexa:**

```sqlx
// definitions/assertions/assert_margem_negativa.sqlx
config {
  type: "assertion",
  description: "Alerta sobre pedidos com margem negativa acima de 5% do volume diário",
  tags: ["alertas", "financeiro"]
}

-- Retorna dias onde mais de 5% dos pedidos têm margem negativa
WITH margem_por_dia AS (
  SELECT
    data_pedido,
    COUNT(*)                                      AS total_pedidos,
    COUNTIF(valor_liquido < valor_custo)          AS pedidos_margem_neg,
    SAFE_DIVIDE(
      COUNTIF(valor_liquido < valor_custo),
      COUNT(*)
    )                                             AS pct_margem_neg
  FROM ${ref("fct_pedidos")}
  WHERE data_pedido >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  GROUP BY 1
)
SELECT *
FROM margem_por_dia
WHERE pct_margem_neg > 0.05
```

**Resumo dos tipos de assertion:**

| Tipo             | Onde                | Descrição                                | Exemplo                   |
| ---------------- | ------------------- | ---------------------------------------- | ------------------------- |
| `uniqueKey`      | inline / standalone | Verifica unicidade de colunas            | `uniqueKey: ["id"]`       |
| `nonNull`        | inline / standalone | Verifica ausência de NULLs               | `nonNull: ["id", "nome"]` |
| `rowConditions`  | inline              | Condições que cada linha deve satisfazer | `"preco > 0"`             |
| `assertion` type | arquivo próprio     | Query SQL customizada totalmente livre   | qualquer `SELECT`         |

---

## 5. Config Block — Referência Completa

O bloco `config {}` aceita propriedades diferentes dependendo do `type`.

### Campos comuns (todos os tipos)

| Campo                          | Tipo     | Obrigatório | Descrição                                                                            |
| ------------------------------ | -------- | ----------- | ------------------------------------------------------------------------------------ |
| `type`                         | string   | Sim         | `"declaration"`, `"table"`, `"view"`, `"incremental"`, `"operations"`, `"assertion"` |
| `name`                         | string   | Não         | Nome da tabela/view. Padrão: nome do arquivo `.sqlx`                                 |
| `schema`                       | string   | Não         | Dataset de destino no BigQuery. Padrão: `defaultDataset`                             |
| `database`                     | string   | Não         | Projeto GCP de destino. Padrão: `defaultProject`                                     |
| `description`                  | string   | Não         | Descrição da tabela (aparece no BigQuery como comentário)                            |
| `tags`                         | string[] | Não         | Tags para agrupamento e seleção de execução                                          |
| `columns`                      | object   | Não         | Documentação e metadados das colunas                                                 |
| `disabled`                     | boolean  | Não         | Se `true`, ignora este arquivo na compilação                                         |
| `dependOnDependencyAssertions` | boolean  | Não         | Se `true`, só executa se as assertions das dependências passarem                     |

### Campos de materialização (`table`, `view`, `incremental`)

| Campo                   | Tipo     | Tipos aplicáveis       | Descrição                                                            |
| ----------------------- | -------- | ---------------------- | -------------------------------------------------------------------- |
| `materialized`          | boolean  | `view`                 | Se `true`, cria uma Materialized View no BigQuery                    |
| `uniqueKey`             | string[] | `incremental`          | Colunas que identificam unicamente um registro (para MERGE/UPDATE)   |
| `updatePartitionFilter` | string   | `incremental`          | Filtro de partição para limitar o scan nas atualizações incrementais |
| `assertions`            | object   | `table`, `incremental` | Assertions inline: `uniqueKey`, `nonNull`, `rowConditions`           |
| `hermetic`              | boolean  | `incremental`          | Se `true`, full refresh ignora o filtro incremental                  |

### Configurações BigQuery (`bigquery {}`)

```sqlx
config {
  type: "table",
  schema: "gold",
  bigquery: {
    // Particionamento
    partitionBy: "DATE(data_pedido)",         // coluna de partição
    requirePartitionFilter: true,              // obriga filtro de partição nas queries
    partitionExpirationDays: 365,              // expirar partições antigas

    // Clustering (até 4 colunas)
    clusterBy: ["id_cliente", "status"],

    // Labels para organização e billing
    labels: {
      equipe: "data-engineering",
      ambiente: "producao",
      dominio: "vendas"
    },

    // KMS para criptografia gerenciada pelo cliente
    kmsKeyName: "projects/meu-projeto/locations/us/keyRings/meu-keyring/cryptoKeys/minha-chave",

    // Opções de tabela BigQuery
    additionalOptions: {
      friendly_name: "Fatos de Vendas",
      description: "Tabela de fatos principal para análise de vendas"
    }
  }
}
```

---

## 6. JavaScript API

O Dataform usa JavaScript como linguagem de templating dentro dos arquivos SQLX. As funções mais importantes são `ref()`, `resolve()`, `self()` e `when()`.

### 6.1 `ref()` — Referência com Dependência

- **`ref("nome_tabela")`**: resolve o nome completo da tabela **e registra uma dependência**. O Dataform garante que a tabela referenciada seja criada antes desta. Use sempre que possível.
- **`ref("schema", "nome_tabela")`**: referencia uma tabela em um schema/dataset específico (útil quando há tabelas de mesmo nome em schemas diferentes).
- **`ref({ name: "tabela", schema: "dataset", database: "projeto" })`**: forma explícita com objeto — útil para referenciar tabelas em outros projetos GCP.

```sqlx
-- Referência simples (usa schema padrão)
FROM ${ref("stg_pedidos")}

-- Referência com schema explícito
FROM ${ref("staging", "stg_pedidos")}

-- Referência cross-project
FROM ${ref({ database: "outro-projeto-gcp", schema: "dataset", name: "tabela" })}

-- Múltiplas referências em JOINs
SELECT p.*, c.nome_cliente
FROM ${ref("fct_pedidos")} p
LEFT JOIN ${ref("dim_clientes")} c
  ON p.id_cliente = c.id_cliente
```

### 6.2 `resolve()` — Referência sem Dependência

```sqlx
-- ref() → resolve o nome E adiciona dependência no grafo DAG
FROM ${ref("stg_pedidos")}      -- Dataform garante que stg_pedidos existe antes

-- resolve() → apenas resolve o nome qualificado, SEM criar dependência
FROM ${resolve("stg_pedidos")}  -- Útil em subqueries de assertions circulares

-- Caso de uso típico do resolve():
-- Quando você tem uma assertion que verifica dados
-- mas não quer criar dependência circular
config { type: "assertion" }
SELECT * FROM ${resolve("fct_pedidos")}
WHERE id_cliente IS NULL
```

### 6.3 `self()` — Referência à Própria Tabela

```sqlx
config {
  type: "incremental",
  schema: "gold",
  name: "fct_pedidos"
}

pre_operations {
  -- self() retorna o nome qualificado desta própria tabela
  -- Útil em pre_operations e post_operations
  DELETE FROM ${self()}
  WHERE data_pedido < DATE_SUB(CURRENT_DATE(), INTERVAL 2 YEAR)
}

SELECT * FROM ${ref("stg_pedidos")}
${when(incremental(), "WHERE data_pedido > (SELECT MAX(data_pedido) FROM ${self()})")}

post_operations {
  -- Atualizando metadados após criação
  INSERT INTO `meu-projeto.logs.execucoes` (tabela, executado_em)
  VALUES ('${self().name}', CURRENT_TIMESTAMP())
}
```

### 6.4 `when()` — Lógica Condicional

Permite inserir SQL condicionalmente com base no contexto da execução. É fundamental para tabelas incrementais.

```javascript
// when(condição, texto_se_verdadeiro, texto_se_falso?)
${when(incremental(), "AND data >= '2024-01-01'", "")}

// incremental() retorna true quando é execução incremental (não full-refresh)
// Equivalente a: if (isIncremental) { ... }

// Casos de uso:
${when(incremental(), "WHERE id > (SELECT MAX(id) FROM ${self()})")}

// Com variáveis de compilação
${when(dataform.projectConfig.vars.env === "production", "AND status = 'ativo'")}

// Ternário completo (verdadeiro / falso)
${when(incremental(),
  "-- Modo incremental: filtrar últimos 3 dias",
  "-- Full refresh: sem filtro de data"
)}
```

**Padrões comuns com `when()`:**

```sqlx
// definitions/marts/fct_pedidos.sqlx
config {
  type: "incremental",
  uniqueKey: ["id_nota"],
  bigquery: { partitionBy: "data_pedido" }
}

SELECT
  id_nota,
  id_cliente,
  data_pedido,
  valor_total,

  -- Adicionar coluna só no modo incremental (para auditoria)
  ${when(incremental(), "CURRENT_TIMESTAMP() AS ultima_atualizacao,")}

  status
FROM ${ref("stg_pedidos")}

-- Padrão #1: Filtrar por data da última partição
WHERE TRUE
  ${when(incremental(), `
    AND data_pedido >= (
      SELECT DATE_SUB(MAX(data_pedido), INTERVAL 3 DAY)
      FROM ${self()}
    )
  `)}

-- Padrão #2: Filtrar por ID máximo
-- ${when(incremental(), "AND id_nota > (SELECT MAX(id_nota) FROM ${self()})")}

-- Padrão #3: Janela de lookback configurável via variável
-- ${when(incremental(), `
--   AND data_pedido >= DATE_SUB(CURRENT_DATE(),
--     INTERVAL CAST('${dataform.projectConfig.vars.lookback_days}' AS INT64) DAY)
-- `)}
```

---

## 7. Includes e Macros (.js)

Arquivos `.js` dentro da pasta `includes/` são **importados automaticamente** e ficam disponíveis em todos os arquivos SQLX. Perfeito para funções utilitárias e constantes.

```javascript
// includes/helpers.js
// Funções utilitárias disponíveis em todos os .sqlx

// Converte data ERP (INTEGER YYYYMMDD) para DATE BigQuery
const erpDateToDate = (coluna) =>
  `SAFE.PARSE_DATE('%Y%m%d', CAST(CAST(${coluna} AS INT64) AS STRING))`;

// Formata valor monetário
const valorMonetario = (coluna) => `ROUND(CAST(${coluna} AS NUMERIC), 2)`;

// Gera cláusula WHERE para range de datas (útil em incrementais)
const dateRangeFilter = (coluna, dias = 7) =>
  `${coluna} >= DATE_SUB(CURRENT_DATE(), INTERVAL ${dias} DAY)`;

// Limpa string: remove espaços, normaliza case
const limpaNome = (coluna) =>
  `UPPER(TRIM(REGEXP_REPLACE(${coluna}, r'\\s+', ' ')))`;

// Exporte para uso nos .sqlx
module.exports = { erpDateToDate, valorMonetario, dateRangeFilter, limpaNome };
```

**Usando os helpers em um arquivo SQLX:**

```sqlx
// definitions/staging/stg_pedidos.sqlx
config { type: "view", schema: "staging" }

-- Usando funções do includes/helpers.js
SELECT
  CAST(ORDER_ID AS INT64)                               AS id_nota,
  CAST(PARTNER_CODE AS INT64)                              AS id_parceiro,

  -- Usando a macro de conversão de data do ERP
  ${helpers.erpDateToDate("ORDER_DATE")}               AS data_negociacao,
  ${helpers.erpDateToDate("UPDATED_DATE")}             AS data_alteracao,

  -- Usando a macro de valor monetário
  ${helpers.valorMonetario("ORDER_VALUE")}                AS valor_total,
  ${helpers.valorMonetario("DISCOUNT_VALUE")}           AS valor_desconto,

  -- Usando a macro de limpeza de string
  ${helpers.limpaNome("PARTNER_NAME")}                    AS nome_parceiro

FROM ${ref("raw_orders")}
WHERE ${helpers.dateRangeFilter("ORDER_DATE_PARSED", 365)}
```

**Constantes centralizadas:**

```javascript
// includes/constants.js
const SCHEMAS = {
  RAW: "raw_erp",
  STAGING: "staging",
  GOLD: "gold",
};

const PROJETOS = {
  PRODUCAO: "meu-projeto-prod",
  DEV: "meu-projeto-dev",
};

const STATUS_PEDIDO = {
  LIBERADO: "'L'",
  CANCELADO: "'C'",
  PENDENTE: "'P'",
};

module.exports = { SCHEMAS, PROJETOS, STATUS_PEDIDO };
```

---

## 8. Particionamento e Clustering no BigQuery

### 8.1 Particionamento

O particionamento divide uma tabela BigQuery em segmentos menores, reduzindo drasticamente o custo e tempo de queries que filtram por data ou outro campo de partição.

```sqlx
config {
  type: "table",
  schema: "gold",
  bigquery: {

    // ── OPÇÃO 1: Partição por coluna DATE ────────────────────────────
    partitionBy: "data_pedido",          // Coluna do tipo DATE
    partitionBy: "DATE(timestamp_evento)", // Coluna TIMESTAMP → extrair DATE

    // ── OPÇÃO 2: Partição por RANGE (números inteiros) ───────────────
    partitionBy: "RANGE_BUCKET(id_cliente, GENERATE_ARRAY(0, 1000000, 1000))",

    // ── OPÇÃO 3: Partição por INGEST TIME (sem coluna específica) ────
    partitionBy: "_PARTITIONTIME",       // Usa o horário de ingestão

    // ── Opções adicionais ─────────────────────────────────────────────
    requirePartitionFilter: true,        // Obriga cláusula WHERE na partição
    partitionExpirationDays: 730,        // Expira partições após 2 anos
  }
}
```

### 8.2 Clustering

O clustering organiza fisicamente os dados dentro de cada partição por uma ou mais colunas, reduzindo o volume de dados lido em queries com filtros nessas colunas.

```sqlx
config {
  type: "table",
  schema: "gold",
  name: "fct_vendas",
  description: "Fatos de vendas particionado por data e clusterizado para queries de análise",

  bigquery: {
    // Partição por data — queries com WHERE data_pedido BETWEEN ... são baratas
    partitionBy: "data_pedido",
    requirePartitionFilter: false,  // Permite queries sem filtro de data (cuidado: custo!)

    // Clustering por até 4 colunas — queries com WHERE/GROUP BY nessas colunas são otimizadas
    // Ordem importa: colunas mais filtradas/agrupadas primeiro
    clusterBy: ["id_cliente", "status", "id_vendedor"],

    // Labels para controle de custo e organização
    labels: {
      domain:      "vendas",
      team:        "data-engineering",
      environment: "production",
      refresh:     "daily"
    }
  }
}
```

> 🎯 **Regra de bolso — Partição vs Clustering:** use **partição** para colunas de data/tempo (a dimensão mais comum de filtro). Use **clustering** para as 2-4 colunas categóricas mais frequentes em WHERE e GROUP BY. Juntos, reduzem o custo de queries analíticas em 80-90%.

---

## 9. Labels, KMS e Opções Avançadas

```sqlx
config {
  type: "table",
  schema: "gold",
  bigquery: {

    // ── Labels (aparecem no BigQuery e no billing) ───────────────────
    labels: {
      domain:      "financeiro",
      team:        "data-platform",
      env:         "prod",          // Valor da variável de compilação
      cost_center: "ti-0042"
    },

    // ── Criptografia com CMEK (Customer-Managed Encryption Key) ──────
    kmsKeyName: "projects/meu-projeto/locations/southamerica-east1/keyRings/dataform/cryptoKeys/bq-key",

    // ── Descrição da tabela diretamente no BigQuery ───────────────────
    additionalOptions: {
      // Descrição longa da tabela (aparece no BigQuery UI)
      description: "Tabela de fatos de vendas — atualizada diariamente às 6h",

      // TTL para linhas (em segundos) — 0 = sem expiração
      // expiration_timestamp: "2026-12-31 23:59:59 UTC"
    }
  }
}
```

---

## 10. Tags e Dependências

### 10.1 Tags

Tags são rótulos livres que permitem **selecionar subconjuntos do pipeline** para execução. Úteis para orquestrar execuções parciais (ex: rodar apenas tabelas de vendas, ou apenas incrementais).

```sqlx
// No arquivo .sqlx
config {
  type: "table",
  tags: ["vendas", "diario", "gold", "prioridade-alta"]
}
```

```bash
# Na CLI do Dataform — selecionando por tag:

# Executar apenas tabelas com tag "diario"
dataform run --tags diario

# Executar múltiplas tags (union)
dataform run --tags diario,vendas

# Executar uma tag específica (excluindo outras)
dataform run --tags gold --exclude-tags staging

# Combinar com full-refresh
dataform run --tags incremental --full-refresh
```

### 10.2 Dependências explícitas

```sqlx
config {
  type: "table",
  schema: "gold",

  // Dependências implícitas: geradas automaticamente pelo ref() no SQL
  // Dependências explícitas: quando não usa ref() mas precisa que algo rode antes

  dependencies: [
    "stg_pedidos",           // Depende desta tabela mas não usa ref() no SQL
    "setup_schemas",         // Depende desta operation de setup
    {
      name: "dim_clientes",
      schema: "gold"         // Especifica schema para evitar ambiguidade
    }
  ],

  // dependOnDependencyAssertions: true
  // Se true, só executa se TODAS as assertions das dependências passarem
  dependOnDependencyAssertions: true
}

SELECT 1 -- (query real usaria ref() gerando deps implícitas)
```

### 10.3 Desativando um arquivo temporariamente

```sqlx
config {
  type: "table",
  disabled: true,    // 👈 Este arquivo será ignorado completamente
  description: "DESATIVADO: aguardando dados de 2025"
}

SELECT * FROM ${ref("stg_pendente")}
```

---

## 11. Documentação de Colunas

O campo `columns` no config permite documentar cada coluna da tabela, com descrição, tags e referências. Esses metadados aparecem no console do Dataform e podem ser propagados ao BigQuery.

```sqlx
config {
  type: "table",
  schema: "gold",
  description: "Dimensão de clientes consolidada",

  columns: {
    // Formato simples: apenas descrição
    id_cliente: "Identificador único do cliente no ERP de origem (PARTNER_CODE)",

    // Formato completo com objeto
    nome_cliente: {
      description: "Nome ou razão social do cliente",
      // tags: ["pii"]   // Pode adicionar tags PII para identificação de dados sensíveis
    },

    email: {
      description: "E-mail principal cadastrado",
      // bigqueryPolicyTags: {
      //   names: ["projects/meu-proj/locations/us/taxonomies/1/policyTags/123"]
      // }
    },

    segmento_cliente: {
      description: "Classificação do cliente: PF (Pessoa Física), PJ (Pessoa Jurídica), GOV (Governo)"
    },

    data_primeiro_pedido: {
      description: "Data do primeiro pedido confirmado (status = L)"
    },

    total_pedidos: {
      description: "Contagem total de pedidos realizados, excluindo cancelados"
    },

    valor_ltv: {
      description: "Lifetime Value: soma acumulada de todos os pedidos confirmados do cliente"
    },

    atualizado_em: {
      description: "Timestamp da última atualização desta linha pelo pipeline Dataform"
    }
  }
}

SELECT
  CAST(PARTNER_CODE AS INT64)         AS id_cliente,
  PARTNER_NAME                        AS nome_cliente,
  EMAIL                           AS email,
  /* ... resto da query ... */
  CURRENT_TIMESTAMP()             AS atualizado_em
FROM ${ref("raw_partners")}
```

---

## 12. Variáveis de Compilação (vars)

Variáveis de compilação (`vars`) permitem que a mesma query se comporte de forma diferente em **dev** e **prod**, sem mudar o código. São definidas no `workflow_settings.yaml` ou via CLI.

```yaml
# workflow_settings.yaml — com vars de ambiente
dataformCoreVersion: 3.0.0
defaultProject: meu-projeto-gcp
defaultDataset: gold_prod
vars:
  env: "production"
  lookback_days: "7"
  dataset_suffix: ""
```

**Usando `vars` no SQLX:**

```sqlx
config {
  type: "incremental",
  schema: "gold" + dataform.projectConfig.vars.dataset_suffix,  // "gold" em prod, "gold_dev" em dev
  description: "Ambiente: " + dataform.projectConfig.vars.env
}

SELECT *
FROM ${ref("stg_pedidos")}

WHERE TRUE

  -- Em dev: só processa últimos 7 dias para ser rápido
  -- Em prod: sem filtro extra (processa tudo incremental)
  ${when(
    dataform.projectConfig.vars.env === "development",
    `AND data_pedido >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)`
  )}

  ${when(incremental(), `
    AND data_pedido >= DATE_SUB(CURRENT_DATE(),
      INTERVAL ${dataform.projectConfig.vars.lookback_days || "3"} DAY)
  `)}
```

**CLI — Passando vars na execução:**

```bash
# Executar em modo dev (override das vars)
dataform run --vars=env=development,lookback_days=3

# Executar em prod com lookback de 1 dia
dataform run --vars=env=production,lookback_days=1

# Listar o grafo sem executar (dry-run)
dataform compile --vars=env=production

# Executar apenas algumas ações com vars
dataform run --actions fct_pedidos --vars=env=production
```

---

## 13. Exemplo Completo — Pipeline de Vendas (end-to-end)

Pipeline completo para análise de vendas, seguindo a arquitetura medalhão (bronze → prata → ouro):

### 13.1 Sources (declaration)

```sqlx
// definitions/sources/src_raw_orders.sqlx
config {
  type: "declaration",
  database: "meu-projeto-gcp",
  schema: "raw_erp",
  name: "raw_orders",
  description: "Cabeçalhos de notas fiscais do ERP de origem",
  columns: {
    ORDER_ID:    "Número único da nota",
    ORDER_DATE:     "Data de negociação (INT YYYYMMDD)",
    ORDER_VALUE:   "Valor total bruto da nota",
    PARTNER_CODE:   "Código do parceiro",
    ORDER_STATUS:"L=Liberado, C=Cancelado, P=Pendente"
  }
}
```

### 13.2 Staging (view)

```sqlx
// definitions/staging/stg_notas_fiscais.sqlx
config {
  type: "view",
  schema: "staging",
  tags: ["staging", "erp", "diario"],
  description: "Staging de notas com tipos corrigidos e colunas normalizadas"
}

SELECT
  CAST(ORDER_ID     AS INT64)   AS id_nota,
  CAST(PARTNER_CODE    AS INT64)   AS id_parceiro,
  CAST(SELLER_CODE    AS INT64)   AS id_vendedor,
  CAST(OP_TYPE_CODE AS INT64)   AS id_tipo_operacao,

  SAFE.PARSE_DATE('%Y%m%d', CAST(CAST(ORDER_DATE AS INT64) AS STRING))    AS data_negociacao,
  SAFE.PARSE_DATE('%Y%m%d', CAST(CAST(UPDATED_DATE AS INT64) AS STRING))  AS data_alteracao,

  CAST(ORDER_VALUE      AS NUMERIC) AS valor_bruto,
  CAST(DISCOUNT_VALUE AS NUMERIC) AS valor_desconto,
  CAST(ORDER_VALUE - DISCOUNT_VALUE AS NUMERIC) AS valor_liquido,

  ORDER_STATUS AS status,
  CURRENT_TIMESTAMP() AS processado_em

FROM ${ref("raw_orders")}
WHERE ORDER_STATUS != 'C'  -- Exclui cancelados desde a staging
```

### 13.3 Tabela Gold Incremental (fatos)

```sqlx
// definitions/gold/fct_notas_fiscais.sqlx
config {
  type: "incremental",
  schema: "gold",
  name: "fct_notas_fiscais",
  description: "Fatos de notas fiscais com upsert diário",
  tags: ["gold", "incremental", "vendas", "diario"],

  uniqueKey: ["id_nota"],
  updatePartitionFilter: "data_negociacao >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)",

  dependOnDependencyAssertions: true,

  assertions: {
    uniqueKey: ["id_nota"],
    nonNull: ["id_nota", "id_parceiro", "data_negociacao", "valor_bruto"],
    rowConditions: [
      "valor_bruto >= 0",
      "data_negociacao <= CURRENT_DATE()"
    ]
  },

  columns: {
    id_nota:          "PK — número único da nota fiscal",
    id_parceiro:      "FK → dim_clientes.id_cliente",
    id_vendedor:      "FK → dim_vendedores.id_vendedor",
    data_negociacao:  "Data da transação",
    valor_bruto:      "Valor total sem descontos",
    valor_desconto:   "Descontos concedidos",
    valor_liquido:    "Valor efetivo (bruto - desconto)",
    status:           "Status final: L=Liberado",
    atualizado_em:    "Timestamp do último processamento"
  },

  bigquery: {
    partitionBy: "data_negociacao",
    requirePartitionFilter: false,
    clusterBy: ["id_parceiro", "status"],
    labels: {
      domain:  "vendas",
      refresh: "incremental-diario",
      team:    "data-engineering"
    }
  }
}

SELECT
  n.id_nota,
  n.id_parceiro,
  n.id_vendedor,
  n.id_tipo_operacao,
  n.data_negociacao,
  n.valor_bruto,
  n.valor_desconto,
  n.valor_liquido,
  n.status,

  -- Enriquecimento com dimensões
  c.nome_cliente,
  c.segmento_cliente,
  c.cidade,
  c.estado,

  CURRENT_TIMESTAMP() AS atualizado_em

FROM ${ref("stg_notas_fiscais")} n
LEFT JOIN ${ref("dim_clientes")} c
  ON n.id_parceiro = c.id_cliente

WHERE TRUE
  ${when(incremental(), `
    AND n.data_alteracao >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
  `)}
```

### 13.4 Assertion standalone

```sqlx
// definitions/assertions/assert_valor_notas.sqlx
config {
  type: "assertion",
  description: "Verifica anomalias de valor: notas com valor > 10x a média do cliente",
  tags: ["qualidade", "financeiro"]
}

WITH media_cliente AS (
  SELECT
    id_parceiro,
    AVG(valor_bruto) AS media_valor,
    STDDEV(valor_bruto) AS desvio_padrao
  FROM ${ref("fct_notas_fiscais")}
  WHERE data_negociacao >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
  GROUP BY 1
)
SELECT
  n.id_nota,
  n.id_parceiro,
  n.data_negociacao,
  n.valor_bruto,
  m.media_valor,
  n.valor_bruto / NULLIF(m.media_valor, 0) AS razao_vs_media
FROM ${ref("fct_notas_fiscais")} n
INNER JOIN media_cliente m ON n.id_parceiro = m.id_parceiro
WHERE
  n.data_negociacao >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  AND n.valor_bruto > m.media_valor * 10
  AND m.media_valor > 1000   -- Ignora clientes com média muito baixa
```

---

## 14. Boas Práticas

- ✅ **Nomenclatura de arquivos:** use prefixos por camada — `src_` para sources, `stg_` para staging, `int_` para intermediate, `fct_` para fatos, `dim_` para dimensões, `rpt_` para relatórios.
- ✅ **Sempre use `ref()` em vez de nome hardcoded.** Nunca escreva `` `meu-projeto.schema.tabela` `` diretamente. Use sempre `${ref("tabela")}` para que o Dataform construa o DAG de dependências corretamente.
- ✅ **`updatePartitionFilter` em incrementais com MERGE.** Sempre defina `updatePartitionFilter` em tabelas incrementais com `uniqueKey`. Sem ele, o MERGE faz full-scan na tabela destino (caro!). Tipicamente: últimos 7-30 dias.
- ✅ **Documente todas as sources com `declaration`.** Nunca use tabelas raw sem uma declaração `type: "declaration"` correspondente. Isso mantém o lineage completo e documentado no console do Dataform.
- ⚠️ **Cuidado com `post_operations` em incrementais.** É executado após CADA execução (incremental ou full-refresh). Se você usa GRANT, isso pode ser redundante mas inofensivo. Se usa INSERT em tabela de log, pode duplicar entradas.
- ⚠️ **Evite dependências circulares.** O Dataform detecta dependências circulares (A → B → A) e falha na compilação. Se precisar de referência cíclica em assertions, use `resolve()` em vez de `ref()`.
- 💡 **Separe dev de prod com `vars`.** Use `dataform.projectConfig.vars.env` para ter comportamento diferente em dev (dados de amostra, schemas separados) e prod (dados completos). Configure dois workflows separados no scheduler.

---

## 15. Erros comuns

1. **Hardcodar nomes de tabela em vez de usar `ref()`**: quebra o DAG de dependências e o lineage visual do Dataform, além de dificultar renomear/mover tabelas no futuro.
2. **Esquecer `updatePartitionFilter` em incrementais com `uniqueKey`**: o MERGE faz full-scan na tabela destino a cada execução, encarecendo drasticamente o custo do BigQuery.
3. **Usar `table` para fatos com bilhões de registros**: o full refresh (DROP + CREATE) se torna caro e lento; nesses casos, `incremental` é a escolha correta.
4. **Misturar declaration de sources sem documentação**: referenciar tabelas raw diretamente sem um arquivo `declaration` correspondente quebra o lineage e a rastreabilidade.
5. **Não definir `requirePartitionFilter: true` em tabelas grandes**: permite queries acidentais sem filtro de data, gerando full-scans caros.
6. **Esquecer que `post_operations` roda em toda execução**: em incrementais, isso pode duplicar inserts em tabelas de log ou repetir GRANTs desnecessariamente.
7. **Criar dependências circulares entre assertions e tabelas**: usar `ref()` onde deveria ser `resolve()` gera falha de compilação.
8. **Não usar `vars` para separar ambientes**: hardcodar nomes de schema/projeto torna impossível rodar o mesmo código em dev e prod sem editar arquivos manualmente.

---

## 16. Cheat Sheet — Referência Rápida

```javascript
// ═══════════════════════════════════════════════════════
// TIPOS DE ARQUIVO
// ═══════════════════════════════════════════════════════
config { type: "declaration"  }  // Fonte externa — sem corpo SQL
config { type: "table"        }  // Tabela fisica (full refresh)
config { type: "view"         }  // View SQL (sem materialização)
config { type: "incremental"  }  // Tabela incremental (append/merge)
config { type: "operations"   }  // SQL sem output (DDL, scripts)
config { type: "assertion"    }  // Teste — falha se retornar linhas


// ═══════════════════════════════════════════════════════
// CONFIGURAÇÕES COMUNS
// ═══════════════════════════════════════════════════════
config {
  type: "table",
  schema: "gold",                          // Dataset destino
  name: "minha_tabela",                    // Nome (padrão: nome arquivo)
  database: "meu-projeto",                 // Projeto GCP
  description: "Descrição da tabela",
  tags: ["tag1", "tag2"],
  disabled: false,                         // true = ignora este arquivo
  dependOnDependencyAssertions: true,      // só roda se assertions OK
  dependencies: ["outra_tabela"],          // deps explícitas
}


// ═══════════════════════════════════════════════════════
// INCREMENTAL — PADRÕES
// ═══════════════════════════════════════════════════════
config {
  type: "incremental",
  uniqueKey: ["id"],                       // MERGE (upsert)
  updatePartitionFilter: "data >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)",
}
SELECT * FROM ${ref("src")}
${when(incremental(), "WHERE data > (SELECT MAX(data) FROM ${self()})")}


// ═══════════════════════════════════════════════════════
// BIGQUERY
// ═══════════════════════════════════════════════════════
bigquery: {
  partitionBy: "data_coluna",              // Partição por DATE
  partitionBy: "DATE(timestamp_col)",      // Partição a partir de TIMESTAMP
  requirePartitionFilter: true,
  partitionExpirationDays: 365,
  clusterBy: ["col1", "col2"],            // Até 4 colunas
  labels: { key: "value" },
  kmsKeyName: "projects/.../keys/...",
}


// ═══════════════════════════════════════════════════════
// ASSERTIONS INLINE
// ═══════════════════════════════════════════════════════
assertions: {
  uniqueKey: ["id"],                       // Unicidade
  nonNull: ["id", "nome"],                 // Sem NULL
  rowConditions: ["preco > 0"],            // Condição por linha
}


// ═══════════════════════════════════════════════════════
// FUNÇÕES JAVASCRIPT
// ═══════════════════════════════════════════════════════
${ref("tabela")}                           // Referência COM dependência
${ref("schema", "tabela")}                 // Com schema explícito
${resolve("tabela")}                       // Referência SEM dependência
${self()}                                  // Esta tabela (em pre/post_ops)
${self().schema}                           // Schema desta tabela
${self().name}                             // Nome desta tabela
${when(incremental(), "SQL aqui")}         // Condicional incremental
${dataform.projectConfig.vars.minhaVar}    // Variável de compilação


// ═══════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════
dataform run                               // Executar pipeline completo
dataform run --full-refresh                // Full refresh em incrementais
dataform run --tags minha-tag              // Executar por tag
dataform run --actions fct_vendas          // Executar ação específica
dataform compile                           // Compilar (dry-run)
dataform compile --vars=env=dev            // Com variáveis
dataform test                              // Executar apenas assertions
```

### Referência rápida de tipos

| Type          | Cria algo?    | Corpo SQL?      | Quando usar                             |
| ------------- | ------------- | --------------- | --------------------------------------- |
| `declaration` | Não           | Não             | Tabelas externas/sources existentes     |
| `table`       | Tabela física | Sim (SELECT)    | Dims, marts, dados consolidados         |
| `view`        | View SQL      | Sim (SELECT)    | Staging, transformações leves           |
| `incremental` | Tabela física | Sim (SELECT)    | Fatos grandes, carga diária incremental |
| `operations`  | Opcional      | Sim (SQL livre) | DDL, MERGE manual, procedures, grants   |
| `assertion`   | Não           | Sim (SELECT)    | Testes de qualidade de dados            |

---

## 17. Glossário rápido

| Termo                      | Definição em uma linha                                                      |
| -------------------------- | --------------------------------------------------------------------------- |
| **SQLX**                   | SQL estendido com blocos de configuração em JavaScript, usado pelo Dataform |
| **declaration**            | Registro de uma tabela externa já existente, sem criar nada                 |
| **table**                  | Tabela física recriada por completo (full refresh) a cada execução          |
| **view**                   | View SQL sem materialização de dados                                        |
| **incremental**            | Tabela que processa só os dados novos/modificados a cada execução           |
| **operations**             | SQL livre sem output automático (DDL, MERGE manual, procedures)             |
| **assertion**              | Teste de qualidade que falha se a query retornar alguma linha               |
| **ref()**                  | Referencia uma tabela e registra dependência no DAG                         |
| **resolve()**              | Resolve o nome de uma tabela sem criar dependência                          |
| **self()**                 | Referencia a própria tabela (usado em pre/post_operations)                  |
| **when()**                 | Insere SQL condicionalmente com base no contexto de execução                |
| **uniqueKey**              | Define a chave usada para MERGE (upsert) em incrementais                    |
| **updatePartitionFilter**  | Filtro de partição que limita o scan no MERGE de incrementais               |
| **partitionBy**            | Coluna/expressão usada para particionar a tabela no BigQuery                |
| **clusterBy**              | Até 4 colunas usadas para clustering físico dos dados                       |
| **vars**                   | Variáveis de compilação, usadas para diferenciar dev/prod                   |
| **includes/**              | Pasta de arquivos `.js` com funções e macros reutilizáveis                  |
| **workflow_settings.yaml** | Arquivo de configuração global do projeto Dataform                          |

---

## 18. Referências para aprofundar

- Documentação oficial: [cloud.google.com/dataform/docs](https://cloud.google.com/dataform/docs)
- Dataform Core API Reference (API JavaScript completa): disponível na documentação oficial do Google Cloud.
- Comparação conceitual com **dbt** (Data Build Tool), para quem já conhece essa ferramenta e quer mapear os conceitos equivalentes.
- Documentação do BigQuery sobre **particionamento e clustering**, para aprofundar as estratégias de otimização de custo.

---

_Última atualização deste guia: julho de 2026._
