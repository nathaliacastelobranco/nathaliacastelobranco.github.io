---
title: "Tokens, Context Window e Embeddings: conceitos fundamentais para trabalhar com LLMs"
description: "Entenda como tokens, janelas de contexto e embeddings impactam custo, performance e arquitetura de aplicações com LLMs."
pubDate: "March 16 2026"
heroImage: "../../../assets/04-ilustra-dog.jpg"
lang: "pt-br"
---

Ao construir aplicações com Large Language Models (LLMs), três conceitos são fundamentais para entender como esses sistemas funcionam na prática:

- tokens
- context window
- embeddings

Esses elementos influenciam diretamente **custo, desempenho e qualidade das respostas** geradas pelos modelos.

---

## Tokens

LLMs não trabalham diretamente com palavras. Antes de processar o texto, ele precisa ser dividido em unidades chamadas **tokens**.

Um token pode representar:

- uma palavra
- parte de uma palavra
- pontuação
- símbolos

Por exemplo:

```
Machine learning is amazing
```

Pode ser dividido em tokens como:

```
["Machine", " learning", " is", " amazing"]
```

Isso ocorre porque os modelos utilizam **subword tokenization**, que permite representar melhor palavras raras ou desconhecidas.

---

## Por que tokens são importantes

APIs de LLM geralmente cobram com base na quantidade de tokens processados.

O custo normalmente considera: `tokens de entrada + tokens de saída`

Por exemplo:

- prompt: 2000 tokens
- resposta: 1000 tokens

Total: `3000 tokens processados`

Isso afeta diretamente:

- custo da aplicação
- latência das respostas
- limite de contexto disponível

---

## Context Window

A **context window** define quantos tokens o modelo consegue considerar ao mesmo tempo.

Esse limite inclui todo o contexto enviado ao modelo:

- system prompt
- histórico da conversa
- documentos externos
- pergunta do usuário
- resposta gerada

Por exemplo, um modelo com **128k tokens de contexto** pode processar uma quantidade significativa de informação antes de gerar a resposta.

---

## Exemplo em um chatbot

Um chatbot baseado em LLM geralmente envia ao modelo algo como:

`System prompt + Histórico da conversa + Documentos recuperados + Pergunta do usuário`

Tudo isso precisa caber dentro da **janela de contexto do modelo**.

Caso o limite seja ultrapassado, o sistema precisa truncar parte do conteúdo.

---

## Estratégias para lidar com limites de contexto

Algumas técnicas comuns incluem:

#### Chunking

Dividir documentos grandes em partes menores.

#### Retrieval (RAG)

Recuperar apenas os trechos mais relevantes de uma base de conhecimento.

#### Conversation summarization

Resumir o histórico da conversa para reduzir o número de tokens.

###s# Sliding window

Manter apenas as mensagens mais recentes da conversa.

---

## Embeddings

Embeddings são representações vetoriais de texto.

Eles transformam palavras, frases ou documentos em vetores numéricos que capturam seu significado semântico.

Exemplo simplificado:

```
gato → [0.23, -0.18, 0.91, ...]
cachorro → [0.21, -0.20, 0.89, ...]
carro → [-0.54, 0.77, -0.12, ...]
```

Nesse espaço vetorial:

- **gato e cachorro ficam próximos**
- **carro fica mais distante**

Isso permite medir **similaridade semântica entre textos**.

---

## Similaridade vetorial

Para medir similaridade entre embeddings são usadas métricas como:

- cosine similarity
- dot product
- euclidean distance

A mais utilizada em aplicações com LLMs é a **cosine similarity**.

---

## Embeddings em sistemas de IA

Embeddings são amplamente usados em sistemas modernos de IA, especialmente em arquiteturas baseadas em **RAG (Retrieval Augmented Generation)**.

Fluxo simplificado:

1. Documentos
2. Embeddings
3. Vector database
4. Busca semântica
5. Contexto enviado ao LLM

---

## Bancos de dados vetoriais

Os embeddings geralmente são armazenados em **vector databases**, que permitem realizar buscas por similaridade.

Alguns exemplos populares incluem:

- Pinecone
- Weaviate
- Qdrant
- Milvus
- pgvector (PostgreSQL)
- FAISS

---

## Conclusão

Tokens, context window e embeddings formam a base de praticamente todas as aplicações modernas com LLMs.

Compreender esses conceitos é essencial para projetar sistemas eficientes, controlar custos e melhorar a qualidade das respostas geradas por modelos de linguagem.
