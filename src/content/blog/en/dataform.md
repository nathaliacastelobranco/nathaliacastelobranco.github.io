---
title: "Dataform (Google Cloud): A Reference Guide"
description: "A complete reference guide to Dataform: SQLX file types, the JavaScript API, partitioning and clustering in BigQuery, best practices, and common mistakes."
pubDate: "Jul 25 2026"
heroImage: "../../../assets/02-hadoop.jpg"
lang: "en"
tags: ["Data Engineering", "Dataform"]
---

> A complete, organized summary of Dataform: file types, JavaScript API, partitioning, best practices.

---

## Table of Contents

1. [What Dataform is](#1-what-dataform-is)
2. [Project Structure](#2-project-structure)
3. [workflow_settings.yaml](#3-workflow_settingsyaml)
4. [SQLX File Types](#4-sqlx-file-types)
   - Anatomy of a SQLX file
   - `declaration`
   - `table`
   - `view`
   - `incremental`
   - `operations`
   - `assertion`
5. [Config Block — Complete Reference](#5-config-block--complete-reference)
6. [JavaScript API](#6-javascript-api)
   - `ref()` and `resolve()`
   - `self()`
   - `when()`
7. [Includes and Macros (.js)](#7-includes-and-macros-js)
8. [Partitioning and Clustering in BigQuery](#8-partitioning-and-clustering-in-bigquery)
9. [Labels, KMS, and Advanced Options](#9-labels-kms-and-advanced-options)
10. [Tags and Dependencies](#10-tags-and-dependencies)
11. [Column Documentation](#11-column-documentation)
12. [Compilation Variables (vars)](#12-compilation-variables-vars)
13. [Complete Example — Sales Pipeline (end-to-end)](#13-complete-example--sales-pipeline-end-to-end)
14. [Best Practices](#14-best-practices)
15. [Common Mistakes](#15-common-mistakes)
16. [Cheat Sheet — Quick Reference](#16-cheat-sheet--quick-reference)
17. [Quick Glossary](#17-quick-glossary)
18. [References to Go Deeper](#18-references-to-go-deeper)

---

## 1. What Dataform is

**Dataform** is a data transformation (ELT) platform native to Google Cloud, integrated with BigQuery. It lets you build, test, and orchestrate SQL transformation pipelines declaratively, using **SQLX** files — SQL extended with JavaScript configuration blocks.

It's GCP's alternative to tools like **dbt** (Data Build Tool), with the advantage of running directly inside the BigQuery console, with no additional infrastructure required.

> **Analogy with dbt:** if you're coming from dbt, Dataform plays the same role. The main difference is that Dataform is managed by GCP, uses SQLX instead of Jinja+SQL, and the `ref()` function works analogously to dbt's `{{ ref() }}`.

### Typical workflow

```
Sources (declaration) → Staging (view/table) → Marts (table/incremental) → Assertions (tests)
```

This flow typically follows the **medallion architecture** (bronze → silver → gold): raw sources are declared, staging handles initial cleanup/typing, and marts (gold) consolidate the data for analytical consumption.

---

## 2. Project Structure

A Dataform project follows this standard structure:

```
my-dataform-project/
│
├── workflow_settings.yaml       # Global project configuration
│
├── definitions/                 # MAIN: all SQLX files live here
│   ├── sources/                 # External source declarations
│   │   └── erp_sources.sqlx
│   ├── staging/                 # Staging layer (bronze → silver)
│   │   ├── stg_pedidos.sqlx
│   │   └── stg_clientes.sqlx
│   ├── intermediate/            # Intermediate transformations
│   │   └── int_pedidos_clientes.sqlx
│   └── marts/                   # Final layer (gold)
│       ├── fct_vendas.sqlx
│       └── dim_clientes.sqlx
│
├── includes/                    # Reusable JavaScript functions and macros
│   ├── helpers.js
│   └── constants.js
│
└── package.json                 # Project dependencies
```

> **Where do the files live?** All `.sqlx` files must sit inside the `definitions/` folder. You can organize them into subfolders however you like — Dataform reads them recursively.

---

## 3. workflow_settings.yaml

This is the project's central configuration point. It defines the GCP project, default dataset, and other global options.

```yaml
dataformCoreVersion: 3.0.0 # Dataform Core version

defaultProject: my-gcp-project # GCP project ID
defaultDataset: dataform_prod # Default BigQuery dataset (schema)
defaultLocation: US # BigQuery location

defaultAssertionDataset: dataform_assertions # Dataset for assertions

vars:
  env: "production" # Compilation variables (accessible via dataform.projectConfig.vars)
  incremental_lookback_days: "7"
```

### Available options

| Field                     | Type          | Description                                                |
| ------------------------- | ------------- | ------------------------------------------------------------ |
| `dataformCoreVersion`     | string        | Dataform Core version to use                                |
| `defaultProject`          | string        | Default GCP project ID                                     |
| `defaultDataset`          | string        | BigQuery dataset where tables are created                  |
| `defaultLocation`         | string        | BigQuery location (`US`, `EU`, `southamerica-east1`)        |
| `defaultAssertionDataset` | string        | Separate dataset for assertion tables                      |
| `vars`                    | map\<string\> | Global compilation variables                                |

---

## 4. SQLX File Types

Every `.sqlx` file starts with a `config {}` block that defines its type and behavior. The `type` field is the most important:

| Type            | Description                                                          |
| --------------- | ---------------------------------------------------------------------- |
| **declaration** | Declares external tables as sources for reference in the project      |
| **table**       | Creates a physical materialized table in BigQuery (full refresh)      |
| **view**        | Creates a SQL view in BigQuery, with no data materialization          |
| **incremental** | Table that only inserts/updates new records on each run               |
| **operations**  | Pure SQL with no output — for DDL scripts, MERGE, procedure calls     |
| **assertion**   | Quality test that fails if it returns any row                         |

### Anatomy of a SQLX file

```sqlx
// 1. CONFIG BLOCK — always first, always JavaScript
config {
  type: "table",           // File type (required)
  schema: "gold",          // Target dataset/schema
  name: "fct_vendas",      // Table name (default: file name)
  description: "Consolidated sales facts",
  tags: ["vendas", "diario"],
  dependOnDependencyAssertions: true,
  columns: {
    id_venda: "Unique sale identifier",
    valor_total: "Gross sale value without discounts"
  }
}

// 2. (Optional) pre_operations — SQL executed BEFORE the table is created
pre_operations {
  CREATE SCHEMA IF NOT EXISTS ${self().schema}
}

-- 3. MAIN QUERY — pure SQL, can use ref() to reference other tables
SELECT
  p.id_pedido        AS id_venda,
  p.data_pedido,
  p.valor_total,
  c.nome_cliente
FROM ${ref("stg_pedidos")} p
LEFT JOIN ${ref("stg_clientes")} c
  ON p.id_cliente = c.id_cliente

// 4. (Optional) post_operations — SQL executed AFTER the table is created
post_operations {
  GRANT SELECT ON ${self()} TO "group:analistas@empresa.com"
}
```

### 4.1 `declaration` — Source Declaration

Used to **declare tables that already exist in BigQuery and are not created by Dataform**. It works as a "data source" — you register the table so you can reference it with `ref()` throughout the rest of the project.

> ⚠️ **`declaration` neither creates nor modifies data.** A `type: "declaration"` file has no SQL body — it just "points" to an existing table, creating an alias usable with `ref()`.

**Simple declaration:**

```sqlx
// definitions/sources/erp_pedidos.sqlx
config {
  type: "declaration",

  // Where the table comes from (GCP project)
  database: "my-gcp-project",

  // Dataset/schema where the table exists
  schema: "raw_erp",

  // Real table name in BigQuery
  name: "raw_orders",

  // Documentation (optional, but recommended)
  description: "Order header table from the source ERP",
  columns: {
    ORDER_ID: "Unique invoice/order number",
    ORDER_DATE:  "Transaction date",
    ORDER_VALUE: "Total invoice value",
    PARTNER_CODE: "Partner code (customer/supplier)"
  }
}
```

> ✅ **Best practice:** create a separate `.sqlx` file for each source table. This makes documentation, versioning, and lineage traceability easier.

**`declaration` parameters:**

| Field         | Type   | Required | Description / Default                                            |
| ------------- | ------ | -------- | ------------------------------------------------------------------ |
| `type`        | string | Yes      | Always `"declaration"` for sources                                 |
| `database`    | string | No       | GCP project ID where the table lives. Default: `defaultProject`   |
| `schema`      | string | No       | BigQuery dataset where the table exists. Default: `defaultDataset` |
| `name`        | string | No       | Real table name in BigQuery. Default: `.sqlx` file name           |
| `description` | string | No       | Source description. Shows up in lineage and documentation          |
| `columns`     | object | No       | Column documentation (key = name, value = description)             |

**Using a `declaration` with `ref()`:**

```sqlx
// definitions/staging/stg_pedidos.sqlx
config {
  type: "view",
  schema: "staging",
  description: "Order staging with renamed columns and corrected types"
}

SELECT
  CAST(ORDER_ID AS INT64)       AS id_nota,
  CAST(PARTNER_CODE AS INT64)      AS id_parceiro,
  PARSE_DATE('%Y%m%d', CAST(ORDER_DATE AS STRING)) AS data_negociacao,
  ORDER_VALUE                     AS valor_total,
  OP_TYPE_CODE                  AS codigo_operacao,
  ORDER_STATUS                  AS status

-- Referencing the declaration by file name
FROM ${ref("raw_orders")}

WHERE ORDER_STATUS != 'C'   -- Excludes canceled orders
```

### 4.2 `table` — Materialized Table

Creates a **physical table in BigQuery** that is fully recreated (DROP + CREATE) on every run. Use it for manageably sized tables or where idempotency is essential.

**✅ When to use `table`:**

- Gold/marts layer with consolidated data.
- Dimension tables (`dim_clientes`, `dim_produtos`).
- Data that needs a full refresh.
- Tables up to ~100M rows (acceptable cost).

**❌ Avoid `table` when:**

- Historical data with billions of rows.
- The cost of a full scan is prohibitive.
- You need a daily partial update (use `incremental`).

**Example — Customer Dimension:**

```sqlx
// definitions/marts/dim_clientes.sqlx
config {
  type: "table",
  schema: "gold",
  name: "dim_clientes",
  description: "Customer dimension with consolidated ERP data",
  tags: ["dimensoes", "clientes"],

  // Inline assertions
  assertions: {
    uniqueKey: ["id_cliente"],
    nonNull: ["id_cliente", "nome_cliente"]
  },

  columns: {
    id_cliente:        { description: "Customer primary key" },
    nome_cliente:      { description: "Name or company name" },
    email:             { description: "Primary registered email" },
    cidade:            { description: "City of the primary address" },
    segmento_cliente:  { description: "Segment: PF, PJ, or Government" },
    data_primeiro_pedido: { description: "Date of the first order placed" },
    total_pedidos:     { description: "Historical order count" }
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

WHERE p.IS_CUSTOMER = 'S'   -- Only partners that are customers

GROUP BY 1, 2, 3, 4, 5, 6
```

**`pre_operations` and `post_operations`:**

```sqlx
// definitions/marts/fct_vendas.sqlx
config {
  type: "table",
  schema: "gold",
  description: "Sales facts"
}

pre_operations {
  -- Executed BEFORE creating the table
  -- Useful for creating schemas, dropping dependent objects, etc.
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
  -- Executed AFTER creating the table
  -- Useful for granting permissions, updating statistics, etc.
  GRANT SELECT ON TABLE `${self().database}.${self().schema}.${self().name}`
  TO "group:analistas@empresa.com.br"
}
```

### 4.3 `view` — SQL View

Creates a **view in BigQuery**. No data is stored — the query runs every time someone queries the view. Ideal for staging layers and light transformations.

> 💡 **Materialized View:** adding `materialized: true` to the config makes Dataform create a BigQuery **Materialized View** — the data is cached and refreshed automatically.

**Example — Order Staging:**

```sqlx
// definitions/staging/stg_pedidos.sqlx
config {
  type: "view",
  schema: "staging",
  description: "Order staging: type cleanup and column renaming",
  tags: ["staging", "erp"],

  columns: {
    id_nota:           "Unique invoice number",
    id_parceiro:       "FK to dim_clientes",
    data_negociacao:   "Transaction date (converted to DATE)",
    valor_total:       "Gross invoice value",
    status:            "L=Released, C=Canceled, P=Pending"
  }
}

SELECT
  CAST(ORDER_ID     AS INT64)   AS id_nota,
  CAST(PARTNER_CODE    AS INT64)   AS id_parceiro,
  CAST(OP_TYPE_CODE AS INT64)   AS id_tipo_operacao,

  -- Safe date conversion (ERP uses INTEGER YYYYMMDD)
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
  ORDER_STATUS NOT IN ('C')     -- Excludes canceled
  AND CAST(ORDER_DATE AS INT64) >= 20200101   -- From 2020 onward
```

**Materialized View:**

```sqlx
// definitions/marts/mv_vendas_diarias.sqlx
config {
  type: "view",
  materialized: true,        // 👈 Becomes a Materialized View in BigQuery
  schema: "gold",
  description: "Daily sales summary with automatic caching",
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

### 4.4 `incremental` — Incremental Table

Used when you need to **process only new/modified data** on each run, instead of reprocessing everything. Essential for fact tables with billions of rows.

**How it works:**

- **First run** (or `--full-refresh`): runs the full query, without the `when()` filter.
- **Subsequent runs**: applies the `when(incremental(), ...)` block to filter only new records.
- If **`uniqueKey` is defined**: performs a **MERGE** (upsert) — updates existing records and inserts new ones.
- If **`uniqueKey` is not defined**: performs an **INSERT** — only appends new rows.

> ⚡ **The `when()` function** is the key to incrementals. The first argument returns `true` when it's an incremental run (not a full refresh), and the second argument is the SQL condition to add.

**Incremental with INSERT (append only):**

```sqlx
// definitions/marts/fct_eventos_acesso.sqlx
config {
  type: "incremental",
  schema: "gold",
  description: "Access events — append only, no updates",
  tags: ["eventos", "incremental"],

  // NO uniqueKey = INSERT only (append)
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

-- when(incremental()) returns true on incremental runs
-- Only loads events from the last 24h in that case
WHERE ${when(incremental(), "timestamp_evento > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)")}
```

**Incremental with MERGE (upsert):**

```sqlx
// definitions/marts/fct_pedidos_incremental.sqlx
config {
  type: "incremental",
  schema: "gold",
  name: "fct_pedidos",
  description: "Order facts with upsert by id_nota",
  tags: ["pedidos", "incremental", "diario"],

  // WITH uniqueKey = MERGE (upsert)
  // If id_nota already exists → UPDATE; otherwise → INSERT
  uniqueKey: ["id_nota"],

  // Limits the scan on the destination table during the MERGE
  // Very important for performance with partitions
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

  -- On incremental runs, filters only recently changed orders
  ${when(incremental(), `
    AND CAST(p.UPDATED_DATE AS INT64) >= CAST(
      FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY))
    AS INT64)
  `)}
```

**Forced Full Refresh (CLI):**

```bash
# Run with full refresh — ignores the when(incremental(), ...) filter
# and recreates the table from scratch
dataform run --full-refresh

# Full refresh of a specific table
dataform run --full-refresh --actions fct_pedidos

# Full refresh of all tables with a specific tag
dataform run --full-refresh --tags incremental
```

**INSERT vs MERGE comparison:**

| Aspect                   | INSERT (no `uniqueKey`)            | MERGE (with `uniqueKey`)            |
| ------------------------ | ----------------------------------- | ------------------------------------ |
| Behavior                 | Only appends new rows                | Updates existing + inserts new       |
| Duplicates                | Possible if run twice on the same day | Impossible — unique key             |
| BigQuery cost             | Lower (INSERT only)                  | Higher (scan on the destination table) |
| Use case                 | Logs, immutable events               | Orders, statuses that change         |
| `updatePartitionFilter`   | Ignored                              | Essential for performance            |

### 4.5 `operations` — SQL With No Output

Runs SQL that **doesn't create tables or views directly**. Use it for maintenance scripts, schema creation, stored procedure calls, or any arbitrary SQL.

> 💡 **Statement separator:** use `---` (three hyphens) to separate multiple SQL statements within an `operations` file.

**Example — Schema and Permission Creation:**

```sqlx
// definitions/operations/setup_schemas.sqlx
config {
  type: "operations",
  tags: ["setup", "infra"],
  description: "Creates required schemas and configures permissions",
  // hasOutput: false  // default — doesn't create a table in the graph
}

-- Statement 1: Create the staging schema
CREATE SCHEMA IF NOT EXISTS `${dataform.projectConfig.defaultProject}.staging`
OPTIONS (location = 'US')

---

-- Statement 2: Create the gold schema
CREATE SCHEMA IF NOT EXISTS `${dataform.projectConfig.defaultProject}.gold`
OPTIONS (location = 'US')

---

-- Statement 3: Permissions for the analytics team
GRANT `roles/bigquery.dataViewer`
ON SCHEMA `${dataform.projectConfig.defaultProject}.gold`
TO "group:analytics@empresa.com.br"
```

**Operations with `hasOutput` (manually creates a table):**

```sqlx
// definitions/operations/create_external_table.sqlx
config {
  type: "operations",
  hasOutput: true,    // 👈 Tells Dataform this script creates a table
  schema: "staging",
  name: "ext_gcs_vendas",
  description: "External table pointing to files in GCS"
}

CREATE OR REPLACE EXTERNAL TABLE `${self()}`
OPTIONS (
  format = 'PARQUET',
  uris = ['gs://my-bucket/vendas/*.parquet']
)
```

**Operations with explicit dependency:**

```sqlx
// definitions/operations/refresh_materialized.sqlx
config {
  type: "operations",
  // Explicitly depends on these tables
  dependencies: ["fct_vendas", "dim_clientes"],
  tags: ["pos-processamento"]
}

-- Runs after fct_vendas and dim_clientes are created
CALL `my-project.procedures.atualiza_cache`()

---

-- Invalidates the report cache
DELETE FROM `my-project.cache.relatorios`
WHERE updated_at < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
```

### 4.6 `assertion` — Quality Tests

Assertions are **data quality tests**. An assertion is a SQL query that **must not return any row**. If it returns at least one row, the assertion fails and the pipeline stops (depending on configuration).

> 🚨 **Golden rule of assertions:** the query should return only the **problematic** records. If it returns 0 rows = everything's fine. If it returns any row = failure.

**Standalone assertion (its own file):**

```sqlx
// definitions/assertions/assert_pedidos_sem_cliente.sqlx
config {
  type: "assertion",
  description: "Ensures there are no orders without an associated customer",
  tags: ["qualidade", "pedidos"],
  // The assertion implicitly depends on the tables referenced in the SQL
}

-- Returns orders where id_cliente is NULL or doesn't exist in dim_clientes
-- If this query returns any row, the assertion FAILS
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

**Inline assertions in `config {}`:**

```sqlx
config {
  type: "table",
  schema: "gold",
  name: "dim_produtos",

  // Automatic assertions generated by Dataform
  assertions: {
    // Checks that the combination of these columns is unique
    uniqueKey: ["id_produto"],

    // Checks that these columns have no NULLs
    nonNull: ["id_produto", "nome_produto", "categoria"],

    // Custom conditions — returns rows that VIOLATE the rule
    rowConditions: [
      "preco_venda > 0",                         // price must be positive
      "preco_venda >= preco_custo",              // sale price >= cost
      "data_cadastro <= CURRENT_DATE()"          // date can't be in the future
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

**Assertion for a complex business rule:**

```sqlx
// definitions/assertions/assert_margem_negativa.sqlx
config {
  type: "assertion",
  description: "Flags orders with negative margin above 5% of daily volume",
  tags: ["alertas", "financeiro"]
}

-- Returns days where more than 5% of orders have a negative margin
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

**Summary of assertion types:**

| Type             | Where               | Description                                | Example                    |
| ---------------- | ------------------- | ------------------------------------------- | -------------------------- |
| `uniqueKey`      | inline / standalone | Checks column uniqueness                    | `uniqueKey: ["id"]`        |
| `nonNull`        | inline / standalone | Checks for absence of NULLs                 | `nonNull: ["id", "nome"]`  |
| `rowConditions`  | inline              | Conditions each row must satisfy            | `"preco > 0"`              |
| `assertion` type | own file            | Fully free custom SQL query                 | any `SELECT`               |

---

## 5. Config Block — Complete Reference

The `config {}` block accepts different properties depending on `type`.

### Common fields (all types)

| Field                           | Type     | Required | Description                                                                            |
| ------------------------------- | -------- | -------- | ------------------------------------------------------------------------------------- |
| `type`                         | string   | Yes      | `"declaration"`, `"table"`, `"view"`, `"incremental"`, `"operations"`, `"assertion"`   |
| `name`                         | string   | No       | Table/view name. Default: `.sqlx` file name                                            |
| `schema`                       | string   | No       | Target BigQuery dataset. Default: `defaultDataset`                                      |
| `database`                     | string   | No       | Target GCP project. Default: `defaultProject`                                          |
| `description`                  | string   | No       | Table description (appears as a comment in BigQuery)                                   |
| `tags`                         | string[] | No       | Tags for grouping and run selection                                                     |
| `columns`                      | object   | No       | Column documentation and metadata                                                       |
| `disabled`                     | boolean  | No       | If `true`, ignores this file during compilation                                        |
| `dependOnDependencyAssertions` | boolean  | No       | If `true`, only runs if its dependencies' assertions pass                              |

### Materialization fields (`table`, `view`, `incremental`)

| Field                   | Type     | Applies to             | Description                                                            |
| ----------------------- | -------- | ---------------------- | ------------------------------------------------------------------------ |
| `materialized`          | boolean  | `view`                 | If `true`, creates a Materialized View in BigQuery                       |
| `uniqueKey`             | string[] | `incremental`          | Columns that uniquely identify a record (for MERGE/UPDATE)              |
| `updatePartitionFilter` | string   | `incremental`          | Partition filter to limit the scan on incremental updates                |
| `assertions`            | object   | `table`, `incremental` | Inline assertions: `uniqueKey`, `nonNull`, `rowConditions`               |
| `hermetic`              | boolean  | `incremental`          | If `true`, full refresh ignores the incremental filter                   |

### BigQuery configuration (`bigquery {}`)

```sqlx
config {
  type: "table",
  schema: "gold",
  bigquery: {
    // Partitioning
    partitionBy: "DATE(data_pedido)",         // partition column
    requirePartitionFilter: true,              // requires a partition filter in queries
    partitionExpirationDays: 365,              // expire old partitions

    // Clustering (up to 4 columns)
    clusterBy: ["id_cliente", "status"],

    // Labels for organization and billing
    labels: {
      equipe: "data-engineering",
      ambiente: "producao",
      dominio: "vendas"
    },

    // KMS for customer-managed encryption
    kmsKeyName: "projects/my-project/locations/us/keyRings/my-keyring/cryptoKeys/my-key",

    // BigQuery table options
    additionalOptions: {
      friendly_name: "Sales Facts",
      description: "Main fact table for sales analysis"
    }
  }
}
```

---

## 6. JavaScript API

Dataform uses JavaScript as the templating language inside SQLX files. The most important functions are `ref()`, `resolve()`, `self()`, and `when()`.

### 6.1 `ref()` — Reference With Dependency

- **`ref("table_name")`**: resolves the table's fully qualified name **and registers a dependency**. Dataform ensures the referenced table is created before this one. Use it whenever possible.
- **`ref("schema", "table_name")`**: references a table in a specific schema/dataset (useful when there are same-named tables in different schemas).
- **`ref({ name: "table", schema: "dataset", database: "project" })`**: explicit object form — useful for referencing tables in other GCP projects.

```sqlx
-- Simple reference (uses default schema)
FROM ${ref("stg_pedidos")}

-- Reference with an explicit schema
FROM ${ref("staging", "stg_pedidos")}

-- Cross-project reference
FROM ${ref({ database: "other-gcp-project", schema: "dataset", name: "table" })}

-- Multiple references in JOINs
SELECT p.*, c.nome_cliente
FROM ${ref("fct_pedidos")} p
LEFT JOIN ${ref("dim_clientes")} c
  ON p.id_cliente = c.id_cliente
```

### 6.2 `resolve()` — Reference Without Dependency

```sqlx
-- ref() → resolves the name AND adds a dependency to the DAG
FROM ${ref("stg_pedidos")}      -- Dataform ensures stg_pedidos exists first

-- resolve() → only resolves the qualified name, WITHOUT creating a dependency
FROM ${resolve("stg_pedidos")}  -- Useful in circular assertion subqueries

-- Typical use case for resolve():
-- When you have an assertion that checks data
-- but you don't want to create a circular dependency
config { type: "assertion" }
SELECT * FROM ${resolve("fct_pedidos")}
WHERE id_cliente IS NULL
```

### 6.3 `self()` — Reference to the Table Itself

```sqlx
config {
  type: "incremental",
  schema: "gold",
  name: "fct_pedidos"
}

pre_operations {
  -- self() returns the fully qualified name of this very table
  -- Useful in pre_operations and post_operations
  DELETE FROM ${self()}
  WHERE data_pedido < DATE_SUB(CURRENT_DATE(), INTERVAL 2 YEAR)
}

SELECT * FROM ${ref("stg_pedidos")}
${when(incremental(), "WHERE data_pedido > (SELECT MAX(data_pedido) FROM ${self()})")}

post_operations {
  -- Updating metadata after creation
  INSERT INTO `my-project.logs.execucoes` (tabela, executado_em)
  VALUES ('${self().name}', CURRENT_TIMESTAMP())
}
```

### 6.4 `when()` — Conditional Logic

Lets you insert SQL conditionally based on the execution context. It's fundamental for incremental tables.

```javascript
// when(condition, text_if_true, text_if_false?)
${when(incremental(), "AND data >= '2024-01-01'", "")}

// incremental() returns true when it's an incremental run (not a full refresh)
// Equivalent to: if (isIncremental) { ... }

// Use cases:
${when(incremental(), "WHERE id > (SELECT MAX(id) FROM ${self()})")}

// With compilation variables
${when(dataform.projectConfig.vars.env === "production", "AND status = 'ativo'")}

// Full ternary (true / false)
${when(incremental(),
  "-- Incremental mode: filter last 3 days",
  "-- Full refresh: no date filter"
)}
```

**Common patterns with `when()`:**

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

  -- Add a column only in incremental mode (for auditing)
  ${when(incremental(), "CURRENT_TIMESTAMP() AS ultima_atualizacao,")}

  status
FROM ${ref("stg_pedidos")}

-- Pattern #1: Filter by the last partition's date
WHERE TRUE
  ${when(incremental(), `
    AND data_pedido >= (
      SELECT DATE_SUB(MAX(data_pedido), INTERVAL 3 DAY)
      FROM ${self()}
    )
  `)}

-- Pattern #2: Filter by maximum ID
-- ${when(incremental(), "AND id_nota > (SELECT MAX(id_nota) FROM ${self()})")}

-- Pattern #3: Configurable lookback window via variable
-- ${when(incremental(), `
--   AND data_pedido >= DATE_SUB(CURRENT_DATE(),
--     INTERVAL CAST('${dataform.projectConfig.vars.lookback_days}' AS INT64) DAY)
-- `)}
```

---

## 7. Includes and Macros (.js)

`.js` files inside the `includes/` folder are **automatically imported** and become available in every SQLX file. Perfect for utility functions and constants.

```javascript
// includes/helpers.js
// Utility functions available in every .sqlx file

// Converts ERP date (INTEGER YYYYMMDD) to a BigQuery DATE
const erpDateToDate = (coluna) =>
  `SAFE.PARSE_DATE('%Y%m%d', CAST(CAST(${coluna} AS INT64) AS STRING))`;

// Formats a monetary value
const valorMonetario = (coluna) => `ROUND(CAST(${coluna} AS NUMERIC), 2)`;

// Generates a WHERE clause for a date range (useful in incrementals)
const dateRangeFilter = (coluna, dias = 7) =>
  `${coluna} >= DATE_SUB(CURRENT_DATE(), INTERVAL ${dias} DAY)`;

// Cleans a string: trims spaces, normalizes case
const limpaNome = (coluna) =>
  `UPPER(TRIM(REGEXP_REPLACE(${coluna}, r'\\s+', ' ')))`;

// Export for use in the .sqlx files
module.exports = { erpDateToDate, valorMonetario, dateRangeFilter, limpaNome };
```

**Using the helpers in a SQLX file:**

```sqlx
// definitions/staging/stg_pedidos.sqlx
config { type: "view", schema: "staging" }

-- Using functions from includes/helpers.js
SELECT
  CAST(ORDER_ID AS INT64)                               AS id_nota,
  CAST(PARTNER_CODE AS INT64)                              AS id_parceiro,

  -- Using the ERP date conversion macro
  ${helpers.erpDateToDate("ORDER_DATE")}               AS data_negociacao,
  ${helpers.erpDateToDate("UPDATED_DATE")}             AS data_alteracao,

  -- Using the monetary value macro
  ${helpers.valorMonetario("ORDER_VALUE")}                AS valor_total,
  ${helpers.valorMonetario("DISCOUNT_VALUE")}           AS valor_desconto,

  -- Using the string cleanup macro
  ${helpers.limpaNome("PARTNER_NAME")}                    AS nome_parceiro

FROM ${ref("raw_orders")}
WHERE ${helpers.dateRangeFilter("ORDER_DATE_PARSED", 365)}
```

**Centralized constants:**

```javascript
// includes/constants.js
const SCHEMAS = {
  RAW: "raw_erp",
  STAGING: "staging",
  GOLD: "gold",
};

const PROJETOS = {
  PRODUCAO: "my-project-prod",
  DEV: "my-project-dev",
};

const STATUS_PEDIDO = {
  LIBERADO: "'L'",
  CANCELADO: "'C'",
  PENDENTE: "'P'",
};

module.exports = { SCHEMAS, PROJETOS, STATUS_PEDIDO };
```

---

## 8. Partitioning and Clustering in BigQuery

### 8.1 Partitioning

Partitioning splits a BigQuery table into smaller segments, drastically reducing the cost and time of queries that filter by date or another partition field.

```sqlx
config {
  type: "table",
  schema: "gold",
  bigquery: {

    // ── OPTION 1: Partition by a DATE column ────────────────────────────
    partitionBy: "data_pedido",          // DATE-type column
    partitionBy: "DATE(timestamp_evento)", // TIMESTAMP column → extract DATE

    // ── OPTION 2: Partition by RANGE (integers) ───────────────
    partitionBy: "RANGE_BUCKET(id_cliente, GENERATE_ARRAY(0, 1000000, 1000))",

    // ── OPTION 3: Partition by INGEST TIME (no specific column) ────
    partitionBy: "_PARTITIONTIME",       // Uses ingestion time

    // ── Additional options ─────────────────────────────────────────────
    requirePartitionFilter: true,        // Requires a WHERE clause on the partition
    partitionExpirationDays: 730,        // Expires partitions after 2 years
  }
}
```

### 8.2 Clustering

Clustering physically organizes data within each partition by one or more columns, reducing the amount of data read for queries that filter on those columns.

```sqlx
config {
  type: "table",
  schema: "gold",
  name: "fct_vendas",
  description: "Sales facts partitioned by date and clustered for analytical queries",

  bigquery: {
    // Partition by date — queries with WHERE data_pedido BETWEEN ... are cheap
    partitionBy: "data_pedido",
    requirePartitionFilter: false,  // Allows queries without a date filter (careful: cost!)

    // Clustering by up to 4 columns — queries with WHERE/GROUP BY on these columns are optimized
    // Order matters: most frequently filtered/grouped columns first
    clusterBy: ["id_cliente", "status", "id_vendedor"],

    // Labels for cost control and organization
    labels: {
      domain:      "vendas",
      team:        "data-engineering",
      environment: "production",
      refresh:     "daily"
    }
  }
}
```

> 🎯 **Rule of thumb — Partitioning vs Clustering:** use **partitioning** for date/time columns (the most common filter dimension). Use **clustering** for the 2-4 most frequent categorical columns in WHERE and GROUP BY. Together, they cut analytical query costs by 80-90%.

---

## 9. Labels, KMS, and Advanced Options

```sqlx
config {
  type: "table",
  schema: "gold",
  bigquery: {

    // ── Labels (show up in BigQuery and billing) ───────────────────
    labels: {
      domain:      "financeiro",
      team:        "data-platform",
      env:         "prod",          // Value of the compilation variable
      cost_center: "ti-0042"
    },

    // ── Encryption with CMEK (Customer-Managed Encryption Key) ──────
    kmsKeyName: "projects/my-project/locations/southamerica-east1/keyRings/dataform/cryptoKeys/bq-key",

    // ── Table description directly in BigQuery ───────────────────
    additionalOptions: {
      // Long table description (shows up in the BigQuery UI)
      description: "Sales fact table — refreshed daily at 6am",

      // TTL for rows (in seconds) — 0 = no expiration
      // expiration_timestamp: "2026-12-31 23:59:59 UTC"
    }
  }
}
```

---

## 10. Tags and Dependencies

### 10.1 Tags

Tags are free-form labels that let you **select subsets of the pipeline** to run. Useful for orchestrating partial runs (e.g., run only sales tables, or only incrementals).

```sqlx
// In the .sqlx file
config {
  type: "table",
  tags: ["vendas", "diario", "gold", "prioridade-alta"]
}
```

```bash
# In the Dataform CLI — selecting by tag:

# Run only tables tagged "diario"
dataform run --tags diario

# Run multiple tags (union)
dataform run --tags diario,vendas

# Run a specific tag (excluding others)
dataform run --tags gold --exclude-tags staging

# Combine with full-refresh
dataform run --tags incremental --full-refresh
```

### 10.2 Explicit dependencies

```sqlx
config {
  type: "table",
  schema: "gold",

  // Implicit dependencies: generated automatically by ref() in the SQL
  // Explicit dependencies: when you don't use ref() but still need something to run first

  dependencies: [
    "stg_pedidos",           // Depends on this table but doesn't use ref() in the SQL
    "setup_schemas",         // Depends on this setup operation
    {
      name: "dim_clientes",
      schema: "gold"         // Specifies the schema to avoid ambiguity
    }
  ],

  // dependOnDependencyAssertions: true
  // If true, only runs if ALL of the dependencies' assertions pass
  dependOnDependencyAssertions: true
}

SELECT 1 -- (a real query would use ref() to generate implicit deps)
```

### 10.3 Temporarily disabling a file

```sqlx
config {
  type: "table",
  disabled: true,    // 👈 This file will be completely ignored
  description: "DISABLED: waiting for 2025 data"
}

SELECT * FROM ${ref("stg_pendente")}
```

---

## 11. Column Documentation

The `columns` field in the config lets you document each column of the table, with description, tags, and references. This metadata shows up in the Dataform console and can be propagated to BigQuery.

```sqlx
config {
  type: "table",
  schema: "gold",
  description: "Consolidated customer dimension",

  columns: {
    // Simple format: description only
    id_cliente: "Unique customer identifier in the source ERP (PARTNER_CODE)",

    // Full format with an object
    nome_cliente: {
      description: "Name or company name of the customer",
      // tags: ["pii"]   // You can add PII tags to flag sensitive data
    },

    email: {
      description: "Primary registered email",
      // bigqueryPolicyTags: {
      //   names: ["projects/my-proj/locations/us/taxonomies/1/policyTags/123"]
      // }
    },

    segmento_cliente: {
      description: "Customer classification: PF (Individual), PJ (Company), GOV (Government)"
    },

    data_primeiro_pedido: {
      description: "Date of the first confirmed order (status = L)"
    },

    total_pedidos: {
      description: "Total count of orders placed, excluding canceled ones"
    },

    valor_ltv: {
      description: "Lifetime Value: cumulative sum of all confirmed customer orders"
    },

    atualizado_em: {
      description: "Timestamp of this row's last update by the Dataform pipeline"
    }
  }
}

SELECT
  CAST(PARTNER_CODE AS INT64)         AS id_cliente,
  PARTNER_NAME                        AS nome_cliente,
  EMAIL                           AS email,
  /* ... rest of the query ... */
  CURRENT_TIMESTAMP()             AS atualizado_em
FROM ${ref("raw_partners")}
```

---

## 12. Compilation Variables (vars)

Compilation variables (`vars`) let the same query behave differently in **dev** and **prod**, without changing the code. They're defined in `workflow_settings.yaml` or via the CLI.

```yaml
# workflow_settings.yaml — with environment vars
dataformCoreVersion: 3.0.0
defaultProject: my-gcp-project
defaultDataset: gold_prod
vars:
  env: "production"
  lookback_days: "7"
  dataset_suffix: ""
```

**Using `vars` in SQLX:**

```sqlx
config {
  type: "incremental",
  schema: "gold" + dataform.projectConfig.vars.dataset_suffix,  // "gold" in prod, "gold_dev" in dev
  description: "Environment: " + dataform.projectConfig.vars.env
}

SELECT *
FROM ${ref("stg_pedidos")}

WHERE TRUE

  -- In dev: only process the last 7 days to stay fast
  -- In prod: no extra filter (processes everything incrementally)
  ${when(
    dataform.projectConfig.vars.env === "development",
    `AND data_pedido >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)`
  )}

  ${when(incremental(), `
    AND data_pedido >= DATE_SUB(CURRENT_DATE(),
      INTERVAL ${dataform.projectConfig.vars.lookback_days || "3"} DAY)
  `)}
```

**CLI — Passing vars on run:**

```bash
# Run in dev mode (override vars)
dataform run --vars=env=development,lookback_days=3

# Run in prod with a 1-day lookback
dataform run --vars=env=production,lookback_days=1

# List the graph without running (dry-run)
dataform compile --vars=env=production

# Run only some actions with vars
dataform run --actions fct_pedidos --vars=env=production
```

---

## 13. Complete Example — Sales Pipeline (end-to-end)

A complete pipeline for sales analysis, following the medallion architecture (bronze → silver → gold):

### 13.1 Sources (declaration)

```sqlx
// definitions/sources/src_raw_orders.sqlx
config {
  type: "declaration",
  database: "my-gcp-project",
  schema: "raw_erp",
  name: "raw_orders",
  description: "Invoice headers from the source ERP",
  columns: {
    ORDER_ID:    "Unique invoice number",
    ORDER_DATE:     "Transaction date (INT YYYYMMDD)",
    ORDER_VALUE:   "Total gross invoice value",
    PARTNER_CODE:   "Partner code",
    ORDER_STATUS:"L=Released, C=Canceled, P=Pending"
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
  description: "Invoice staging with corrected types and normalized columns"
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
WHERE ORDER_STATUS != 'C'  -- Excludes canceled orders already at staging
```

### 13.3 Gold Incremental Table (facts)

```sqlx
// definitions/gold/fct_notas_fiscais.sqlx
config {
  type: "incremental",
  schema: "gold",
  name: "fct_notas_fiscais",
  description: "Invoice facts with daily upsert",
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
    id_nota:          "PK — unique invoice number",
    id_parceiro:      "FK → dim_clientes.id_cliente",
    id_vendedor:      "FK → dim_vendedores.id_vendedor",
    data_negociacao:  "Transaction date",
    valor_bruto:      "Total value without discounts",
    valor_desconto:   "Discounts granted",
    valor_liquido:    "Effective value (gross - discount)",
    status:           "Final status: L=Released",
    atualizado_em:    "Timestamp of the last processing run"
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

  -- Enrichment with dimensions
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

### 13.4 Standalone assertion

```sqlx
// definitions/assertions/assert_valor_notas.sqlx
config {
  type: "assertion",
  description: "Checks for value anomalies: invoices worth > 10x the customer's average",
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
  AND m.media_valor > 1000   -- Ignores customers with a very low average
```

---

## 14. Best Practices

- ✅ **File naming:** use layer prefixes — `src_` for sources, `stg_` for staging, `int_` for intermediate, `fct_` for facts, `dim_` for dimensions, `rpt_` for reports.
- ✅ **Always use `ref()` instead of a hardcoded name.** Never write `` `my-project.schema.table` `` directly. Always use `${ref("table")}` so Dataform can build the dependency DAG correctly.
- ✅ **`updatePartitionFilter` on MERGE incrementals.** Always set `updatePartitionFilter` on incremental tables that have a `uniqueKey`. Without it, the MERGE does a full scan of the destination table (expensive!). Typically: last 7-30 days.
- ✅ **Document all sources with `declaration`.** Never use raw tables without a corresponding `type: "declaration"` file. This keeps lineage complete and documented in the Dataform console.
- ⚠️ **Watch out for `post_operations` on incrementals.** It runs after EVERY execution (incremental or full-refresh). If you use GRANT, that may be redundant but harmless. If you INSERT into a log table, it can duplicate entries.
- ⚠️ **Avoid circular dependencies.** Dataform detects circular dependencies (A → B → A) and fails compilation. If you need a cyclical reference in assertions, use `resolve()` instead of `ref()`.
- 💡 **Separate dev from prod with `vars`.** Use `dataform.projectConfig.vars.env` to have different behavior in dev (sample data, separate schemas) and prod (full data). Configure two separate workflows in the scheduler.

---

## 15. Common Mistakes

1. **Hardcoding table names instead of using `ref()`**: breaks the dependency DAG and Dataform's visual lineage, and makes it harder to rename/move tables later.
2. **Forgetting `updatePartitionFilter` on incrementals with `uniqueKey`**: the MERGE does a full scan of the destination table on every run, drastically increasing BigQuery cost.
3. **Using `table` for facts with billions of rows**: full refresh (DROP + CREATE) becomes expensive and slow; in these cases, `incremental` is the right choice.
4. **Mixing in source declarations without documentation**: referencing raw tables directly without a corresponding `declaration` file breaks lineage and traceability.
5. **Not setting `requirePartitionFilter: true` on large tables**: allows accidental queries with no date filter, generating expensive full scans.
6. **Forgetting that `post_operations` runs on every execution**: on incrementals, this can duplicate inserts into log tables or repeat unnecessary GRANTs.
7. **Creating circular dependencies between assertions and tables**: using `ref()` where `resolve()` should be used causes a compilation failure.
8. **Not using `vars` to separate environments**: hardcoding schema/project names makes it impossible to run the same code in dev and prod without manually editing files.

---

## 16. Cheat Sheet — Quick Reference

```javascript
// ═══════════════════════════════════════════════════════
// FILE TYPES
// ═══════════════════════════════════════════════════════
config { type: "declaration"  }  // External source — no SQL body
config { type: "table"        }  // Physical table (full refresh)
config { type: "view"         }  // SQL view (no materialization)
config { type: "incremental"  }  // Incremental table (append/merge)
config { type: "operations"   }  // SQL with no output (DDL, scripts)
config { type: "assertion"    }  // Test — fails if it returns rows


// ═══════════════════════════════════════════════════════
// COMMON CONFIGURATIONS
// ═══════════════════════════════════════════════════════
config {
  type: "table",
  schema: "gold",                          // Target dataset
  name: "minha_tabela",                    // Name (default: file name)
  database: "my-project",                  // GCP project
  description: "Table description",
  tags: ["tag1", "tag2"],
  disabled: false,                         // true = ignores this file
  dependOnDependencyAssertions: true,      // only runs if assertions pass
  dependencies: ["outra_tabela"],          // explicit deps
}


// ═══════════════════════════════════════════════════════
// INCREMENTAL — PATTERNS
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
  partitionBy: "data_coluna",              // Partition by DATE
  partitionBy: "DATE(timestamp_col)",      // Partition derived from TIMESTAMP
  requirePartitionFilter: true,
  partitionExpirationDays: 365,
  clusterBy: ["col1", "col2"],            // Up to 4 columns
  labels: { key: "value" },
  kmsKeyName: "projects/.../keys/...",
}


// ═══════════════════════════════════════════════════════
// INLINE ASSERTIONS
// ═══════════════════════════════════════════════════════
assertions: {
  uniqueKey: ["id"],                       // Uniqueness
  nonNull: ["id", "nome"],                 // No NULLs
  rowConditions: ["preco > 0"],            // Per-row condition
}


// ═══════════════════════════════════════════════════════
// JAVASCRIPT FUNCTIONS
// ═══════════════════════════════════════════════════════
${ref("tabela")}                           // Reference WITH dependency
${ref("schema", "tabela")}                 // With explicit schema
${resolve("tabela")}                       // Reference WITHOUT dependency
${self()}                                  // This table (in pre/post_ops)
${self().schema}                           // This table's schema
${self().name}                             // This table's name
${when(incremental(), "SQL here")}         // Incremental conditional
${dataform.projectConfig.vars.minhaVar}    // Compilation variable


// ═══════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════
dataform run                               // Run the full pipeline
dataform run --full-refresh                // Full refresh on incrementals
dataform run --tags minha-tag              // Run by tag
dataform run --actions fct_vendas          // Run a specific action
dataform compile                           // Compile (dry-run)
dataform compile --vars=env=dev            // With variables
dataform test                              // Run only assertions
```

### Quick type reference

| Type          | Creates something? | SQL body?       | When to use                              |
| ------------- | ------------------ | ---------------- | ----------------------------------------- |
| `declaration` | No                  | No                | Existing external tables/sources          |
| `table`       | Physical table      | Yes (SELECT)      | Dims, marts, consolidated data            |
| `view`        | SQL view            | Yes (SELECT)      | Staging, light transformations            |
| `incremental` | Physical table      | Yes (SELECT)      | Large facts, daily incremental loads      |
| `operations`  | Optional            | Yes (free SQL)    | DDL, manual MERGE, procedures, grants     |
| `assertion`   | No                  | Yes (SELECT)      | Data quality tests                        |

---

## 17. Quick Glossary

| Term                       | One-line definition                                                          |
| --------------------------- | ------------------------------------------------------------------------------ |
| **SQLX**                   | SQL extended with JavaScript configuration blocks, used by Dataform            |
| **declaration**            | Registration of an existing external table, without creating anything          |
| **table**                  | Physical table completely recreated (full refresh) on every run                |
| **view**                   | SQL view with no data materialization                                          |
| **incremental**            | Table that processes only new/modified data on each run                        |
| **operations**             | Free SQL with no automatic output (DDL, manual MERGE, procedures)               |
| **assertion**              | Quality test that fails if the query returns any row                           |
| **ref()**                  | References a table and registers a dependency in the DAG                       |
| **resolve()**              | Resolves a table's name without creating a dependency                          |
| **self()**                 | References the table itself (used in pre/post_operations)                      |
| **when()**                 | Conditionally inserts SQL based on the execution context                       |
| **uniqueKey**              | Defines the key used for MERGE (upsert) in incrementals                        |
| **updatePartitionFilter**  | Partition filter that limits the scan in incremental MERGEs                    |
| **partitionBy**            | Column/expression used to partition the table in BigQuery                      |
| **clusterBy**              | Up to 4 columns used for physical data clustering                              |
| **vars**                   | Compilation variables, used to differentiate dev/prod                          |
| **includes/**              | Folder of `.js` files with reusable functions and macros                       |
| **workflow_settings.yaml** | Dataform project's global configuration file                                   |

---

## 18. References to Go Deeper

- Official documentation: [cloud.google.com/dataform/docs](https://cloud.google.com/dataform/docs)
- Dataform Core API Reference (full JavaScript API): available in the official Google Cloud documentation.
- Conceptual comparison with **dbt** (Data Build Tool), for those already familiar with that tool who want to map equivalent concepts.
- BigQuery documentation on **partitioning and clustering**, to go deeper into cost optimization strategies.

---

_Last updated: July 2026._
