---
title: "RAG na prática: como conectar LLMs a bases de conhecimento"
description: "Entenda como funciona Retrieval Augmented Generation e como construir sistemas que conectam LLMs a dados externos."
pubDate: "March 16 2026"
heroImage: "../../../assets/04-ilustra-dog.jpg"
lang: "pt-br"
---

Large Language Models são extremamente poderosos, mas possuem limitações importantes.

Entre elas:

- conhecimento desatualizado
- contexto limitado
- possibilidade de alucinações

Para resolver esses problemas, muitas aplicações modernas utilizam uma arquitetura chamada **Retrieval Augmented Generation (RAG)**.

---

## O que é RAG

RAG é uma técnica que combina **busca de informação** com **geração de texto por LLMs**.

Em vez de depender apenas do conhecimento interno do modelo, o sistema busca informações relevantes em uma base externa e inclui esse conteúdo no prompt enviado ao modelo.

Fluxo simplificado:

1. **Pergunta do usuário**
2. **Busca na base de conhecimento**
3. **Recuperação de documentos relevantes**
4. **Construção do prompt com contexto**
5. **Resposta gerada pelo LLM**

---

## Arquitetura de um sistema RAG

Um pipeline RAG normalmente envolve as seguintes etapas:
[![](https://mermaid.ink/img/pako:eNo9UctuwjAQ_BVrzwGFxCW1D5UggaoS3Hpq0oOJlyQqtpHj9AHiZ9pDP4QfqwkpPozsnZ3ZkfcIpZEIHLY781HWwjrynBWa-DPLn3SFrTv_GCKRSFN2CrUz7euVn-dp3em3RldDIc1T24jz7yBAtUEpPf0vyPKZVeKAWvQ-voG8Y-mMJVI4sREtDo2LfN61pSAtqvO3dk0pBmKZP6IdJpRGkdVq7ZkhLhmNHsi8x7THrMdFj0sIoLKNBL4VuxYDUOizXN5wvOgLcDUqLID76yVKAYU-edFe6BdjFHBnOy-zpqvqm0m398kxa0RlhbpVLWqJNjWddsBjGvcmwI_wCZwyNk6i8P4-ZpP4joV0GsAX8EnIxmEcRzSiScIoo8kpgEM_NxwnNKYhiyZTGsZsOokCQNn4b1tfN9cv8PQH7j6P9Q?type=png)](https://mermaid.live/edit#pako:eNo9UctuwjAQ_BVrzwGFxCW1D5UggaoS3Hpq0oOJlyQqtpHj9AHiZ9pDP4QfqwkpPozsnZ3ZkfcIpZEIHLY781HWwjrynBWa-DPLn3SFrTv_GCKRSFN2CrUz7euVn-dp3em3RldDIc1T24jz7yBAtUEpPf0vyPKZVeKAWvQ-voG8Y-mMJVI4sREtDo2LfN61pSAtqvO3dk0pBmKZP6IdJpRGkdVq7ZkhLhmNHsi8x7THrMdFj0sIoLKNBL4VuxYDUOizXN5wvOgLcDUqLID76yVKAYU-edFe6BdjFHBnOy-zpqvqm0m398kxa0RlhbpVLWqJNjWddsBjGvcmwI_wCZwyNk6i8P4-ZpP4joV0GsAX8EnIxmEcRzSiScIoo8kpgEM_NxwnNKYhiyZTGsZsOokCQNn4b1tfN9cv8PQH7j6P9Q)

---

## Ingestão de documentos

O primeiro passo é coletar os documentos que formarão a base de conhecimento.

Esses documentos podem vir de diversas fontes:

- PDFs
- páginas web
- bancos de dados
- ferramentas internas como Notion ou Confluence
- documentação técnica

---

## Chunking

Documentos geralmente são divididos em partes menores chamadas **chunks**.

Isso melhora a eficiência da busca e a relevância do contexto enviado ao modelo.

Um tamanho comum de chunk varia entre:
`200 – 800 tokens`

---

## Embeddings

Cada chunk de texto é convertido em um **embedding vetorial**.

Embeddings representam o significado semântico do texto em formato numérico.

Exemplo simplificado:

```

"Política de reembolso da empresa"
↓
[0.32, -0.44, 0.11 ...]

```

---

## Vector Databases

Os embeddings são armazenados em bancos de dados especializados chamados **vector databases**.

Esses bancos permitem buscar documentos semanticamente semelhantes a uma consulta.

Alguns exemplos populares incluem:

- Pinecone
- Weaviate
- Qdrant
- Milvus
- pgvector

---

## Retrieval (busca semântica)

Quando o usuário faz uma pergunta, o sistema primeiro transforma a pergunta em um embedding.

Depois disso, ele busca os vetores mais semelhantes na base de conhecimento.

O resultado é um conjunto de documentos relevantes para a pergunta.

---

## Construção do prompt

Os documentos recuperados são adicionados ao prompt enviado ao modelo.

Exemplo:

```

Contexto:

[trechos da documentação]

Pergunta:

Qual é a política de reembolso?

```

O modelo então gera uma resposta baseada nesse contexto.

---

## Vantagens do RAG

RAG oferece diversas vantagens para aplicações com LLMs.

### Conhecimento atualizado

É possível atualizar a base de conhecimento sem precisar treinar o modelo novamente.

### Redução de alucinações

O modelo responde com base em informações reais recuperadas.

### Escalabilidade

A arquitetura funciona bem mesmo com grandes volumes de documentos.

---

## Desafios

Apesar de poderoso, RAG apresenta alguns desafios.

- chunking inadequado pode prejudicar a recuperação
- busca semântica pode retornar documentos irrelevantes
- prompts mal estruturados podem fazer o modelo ignorar o contexto

---

## Conclusão

RAG se tornou uma das arquiteturas mais utilizadas em aplicações modernas com LLMs.

Ao combinar busca semântica com geração de texto, é possível construir sistemas que utilizam conhecimento atualizado e específico de domínio, mantendo a flexibilidade dos modelos generativos.

```

```

```

```
