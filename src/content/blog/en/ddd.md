---
title: "Domain-Driven Design (DDD): A Reference Guide"
description: "A complete reference guide to DDD: strategic design, tactical design, supporting architecture, common mistakes, and a practical application checklist."
pubDate: "Jul 25 2026"
heroImage: "../../../assets/01-data-modeling.jpg"
lang: "en"
tags: ["Software Architecture", "DDD"]
---

> A complete, organized summary of DDD concepts, patterns and practices, meant for quick day-to-day reference.

---

## Table of Contents

1. [What DDD is and why it exists](#1-what-ddd-is-and-why-it-exists)
2. [Strategic Design](#2-strategic-design)
   - Domain and Subdomains
   - Bounded Context
   - Context Mapping
   - Ubiquitous Language
3. [Tactical Design](#3-tactical-design)
   - Entities
   - Value Objects
   - Aggregates and Aggregate Root
   - Domain Events
   - Domain Services
   - Repositories
   - Factories
   - Modules
4. [Architecture Supporting DDD](#4-architecture-supporting-ddd)
   - Layers (Layered Architecture)
   - Hexagonal Architecture (Ports & Adapters)
   - CQRS
   - Event Sourcing
5. [When to use (and NOT use) DDD](#5-when-to-use-and-not-use-ddd)
6. [Common mistakes](#6-common-mistakes)
7. [Practical application checklist](#7-practical-application-checklist)
8. [Quick glossary](#8-quick-glossary)
9. [References to go deeper](#9-references-to-go-deeper)

---

## 1. What DDD is and why it exists

**Domain-Driven Design** is a software development approach created by **Eric Evans**, formalized in the book _"Domain-Driven Design: Tackling Complexity in the Heart of Software"_ (2003). The core idea is easy to state and hard to practice:

> **Code should reflect the business domain, and the business domain should be modeled together with the people who understand it (domain experts).**

DDD is not a framework, not a library, not a specific architecture. It's a **way of thinking about and organizing software** around business complexity, not technical complexity.

### The problem DDD solves

In complex systems, the biggest risk isn't technology — it's a **poorly understood and poorly modeled domain**. Symptoms that this is happening:

- Different business terms being used for the same thing in different parts of the system (or the opposite: the same term meaning different things).
- Business logic scattered across controllers, generic services, and scripts, with no single source of truth.
- Development teams that can't talk to business experts because they speak different "languages."
- A "God Service" or "God Object" that keeps growing because no one knows anymore where one responsibility ends and another begins.

DDD tackles this through **two complementary fronts**: **Strategic Design** (how to split a large system into meaningful pieces) and **Tactical Design** (how to model the code within each piece).

---

## 2. Strategic Design

Strategic design deals with the **big picture**: how to understand, split, and organize a complex domain into manageable pieces.

### 2.1 Domain and Subdomains

- **Domain**: the area of knowledge/business that the software addresses (e.g., "logistics", "e-commerce", "healthcare").
- **Subdomain**: divisions within the domain. Every complex domain can (and should) be split into subdomains, classified into three types:

| Type                     | Description                                                                    | Example (e-commerce)                              | Where to invest effort                              |
| ------------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| **Core Domain**          | The business's competitive edge. The reason the company exists.                 | Personalized recommendation algorithm             | Maximum modeling effort and your best developers      |
| **Supporting Subdomain** | Necessary, but not the differentiator. Can be customized, but shouldn't be a priority. | Product catalog management                        | Moderate effort                                        |
| **Generic Subdomain**    | A problem already solved by the market. Not worth reinventing.                  | Authentication, invoice issuance, sending emails   | Buy or use a ready-made solution (SaaS, library)       |

**Practical rule:** don't spend the same modeling care on a generic subdomain that you would on the core domain. Authentication doesn't need elaborate Aggregates; a dynamic pricing engine does.

### 2.2 Bounded Context

This is **the most important concept in strategic DDD**.

> A **Bounded Context** is an explicit boundary (usually tied to a subsystem, service, or module) within which a specific domain model is valid and consistent.

Why this matters: the word "Customer" can mean completely different things in different contexts:

- In the **Sales** context, "Customer" has a tax ID, purchase history, delivery address.
- In the **Support** context, "Customer" has a ticket history, SLA, satisfaction level.
- In the **Billing** context, "Customer" has delinquency status, payment method, credit limit.

Trying to model a single, giant "Customer" that serves all these contexts produces a bloated, coupled class full of fields that only make sense in one place. DDD's solution: **each Bounded Context has its own "Customer" model**, and translation between them happens at the edges (via Context Mapping).

**Sign that you have a well-defined Bounded Context**: a term has a single, unambiguous meaning within it. If a team can talk without needing "so when I say Order I mean X, not Y" — the boundary is well drawn.

### 2.3 Context Mapping

Defines **how different Bounded Contexts relate and communicate**. The main patterns:

- **Partnership**: two teams cooperate closely, evolving the contexts together.
- **Shared Kernel**: part of the model is literally shared between two contexts (use with caution — creates strong coupling).
- **Customer/Supplier**: one context (supplier/upstream) provides data/services to another (customer/downstream); the downstream has influence over what the upstream builds.
- **Conformist**: the downstream context simply accepts the upstream's model with no negotiating power (common when integrating with third-party APIs).
- **Anticorruption Layer (ACL)**: a translation layer that protects your domain model from being "contaminated" by an external or legacy model. **One of the most useful patterns in practice** — whenever you integrate with a legacy system or a poorly designed external API, an ACL keeps the other system's "mess" from leaking into your domain.
- **Open Host Service**: a context exposes a well-defined protocol/API to be consumed by multiple other contexts.
- **Published Language**: a well-documented, shared data exchange format (e.g., an event schema).
- **Separate Ways**: two contexts decide not to integrate at all — each solves the problem its own way, even if that means some duplication.

### 2.4 Ubiquitous Language

> A **common, rigorous vocabulary**, built together with domain experts, used both in conversations and **literally in the code** (class, method, and variable names).

It's not "glossary documentation" — it's a living language used in:

- Meetings with stakeholders.
- User stories and requirements.
- **Class, method, and variable names in the code**.

If the business expert says "when the order is **confirmed**, the stock is **reserved**," the code should look something like:

```
order.confirm()
stock.reserve(quantity)
```

Not `order.setStatus(2)` or `stock.updateFlag(true)`. Each Bounded Context has its own Ubiquitous Language — the same term can (and should) change meaning across contexts, as seen above.

---

## 3. Tactical Design

While strategic design thinks about the boundary, **tactical design** defines **how to model the code within a Bounded Context**.

### 3.1 Entities

Objects that have a **unique identity** that persists over time, regardless of their attributes changing.

- Two entities are equal if they have the **same identifier**, even if every other attribute differs.
- They have a lifecycle: they're created, change state, and can be "removed" (soft delete, archiving).

```
class Order {
  private final OrderId id; // identity
  private OrderStatus status;
  private List<OrderItem> items;

  public void confirm() {
    if (items.isEmpty()) throw new OrderHasNoItemsException();
    this.status = OrderStatus.CONFIRMED;
  }
}
```

An `Order` with id `123` remains the "same" order even if its status changes from `PENDING` to `CONFIRMED`.

### 3.2 Value Objects

Objects defined **entirely by their attributes**, with no identity of their own. Two Value Objects are equal if all their values are equal.

Core characteristics:

- **Immutable**: once created, it doesn't change. Any "change" produces a new instance.
- **No identity**: `Money(100, "USD")` equals another `Money(100, "USD")`, regardless of "which instance" it is.
- Should **encapsulate validation and behavior**, not just be a dumb DTO.

```
final class Money {
  private final BigDecimal amount;
  private final Currency currency;

  public Money(BigDecimal amount, Currency currency) {
    if (amount.compareTo(BigDecimal.ZERO) < 0)
      throw new NegativeAmountException();
    this.amount = amount;
    this.currency = currency;
  }

  public Money add(Money other) {
    validateSameCurrency(other);
    return new Money(this.amount.add(other.amount), this.currency);
  }
}
```

**Practical rule of thumb**: if you're about to create a raw `String`, `int`, or `BigDecimal` field to represent a business concept (email, tax ID, money, date range, address), stop and ask: "does this deserve to be a Value Object?" Most of the time, the answer is yes — it eliminates duplicated validation scattered across the code and centralizes the rules in one place.

### 3.3 Aggregates and Aggregate Root

The **most misunderstood and most important** concept in tactical design.

> An **Aggregate** is a cluster of Entities and Value Objects treated as **a single unit of transactional consistency**. Every Aggregate has an **Aggregate Root** — the only Entity through which the outside world can access or modify any part of the aggregate.

Rules of an Aggregate:

1. **External references can only point to the Aggregate Root**, never to internal objects of the aggregate.
2. **Every modification goes through the root**. Internal objects are never modified directly from the outside.
3. **One Aggregate = one transaction**. If you need to change two Aggregates in the same atomic operation, they should probably be one — or you need eventual consistency between them (via Domain Events).
4. **Aggregates should be small**. The most common mistake is creating giant Aggregates (e.g., an `Order` containing a full `Customer`, full `Products`, etc.). Prefer referencing other Aggregates **only by ID**.

```
class Order { // Aggregate Root
  private OrderId id;
  private CustomerId customerId; // reference by ID, not the whole Customer object
  private List<OrderItem> items; // internal Entities/VOs, only accessible via Order

  public void addItem(ProductId productId, int quantity, Money unitPrice) {
    // every business rule for adding an item goes through here
    if (this.status != OrderStatus.DRAFT)
      throw new OrderAlreadyConfirmedException();
    this.items.add(new OrderItem(productId, quantity, unitPrice));
  }
}
```

`OrderItem` (an internal Entity or VO) should never be modified directly from the outside — always through a method on `Order`.

**How to figure out the right Aggregate size**: think about the **invariants** (rules that must always hold true). If a business rule must be guaranteed **immediately and atomically** between two objects, they belong to the same Aggregate. If the rule can tolerate a few milliseconds/seconds of lag (eventual consistency), they're separate Aggregates, communicating via events.

### 3.4 Domain Events

Represent **something relevant that happened in the domain**, in the past (hence why they're usually named in the past tense: `OrderConfirmed`, `PaymentDeclined`).

Main uses:

- Communicating changes between different Aggregates without direct coupling.
- Communicating changes between different Bounded Contexts.
- Keeping an auditable history of what happened (the basis of Event Sourcing).

```
class OrderConfirmed {
  private final OrderId orderId;
  private final Instant occurredAt;
  // relevant event data
}
```

Typical flow: `Order.confirm()` fires the `OrderConfirmed` event → a handler in the **Inventory** context listens for it and reserves the items → a handler in the **Notification** context listens for the same event and emails the customer. Neither context needs to know about the other directly.

### 3.5 Domain Services

When a business operation **doesn't naturally belong to any specific Entity or Value Object** (usually because it involves multiple Aggregates), it becomes a Domain Service.

```
class TransferService {
  public void transfer(Account from, Account to, Money amount) {
    from.debit(amount);
    to.credit(amount);
  }
}
```

**Careful**: a Domain Service is not an excuse to anemize the model. Before creating one, ask: "doesn't this logic actually belong to one of the entities involved?" Use Domain Services only when the operation genuinely spans multiple domain objects with no natural "owner."

### 3.6 Repositories

Abstract access to **Aggregate persistence**, giving the illusion of an in-memory collection.

- A Repository exists **per Aggregate Root**, never for internal objects.
- The Repository interface lives in the **domain layer**; the implementation lives in the **infrastructure layer** (Dependency Inversion).

```
interface OrderRepository {
  Optional<Order> findById(OrderId id);
  void save(Order order);
}
```

### 3.7 Factories

Encapsulate the logic for **creating complex Aggregates**, especially when creation involves several validation rules or steps.

```
class OrderFactory {
  public static Order createNewOrder(CustomerId customerId, List<ItemInput> itemsInput) {
    // complex creation rules and validations
    return new Order(...);
  }
}
```

### 3.8 Modules

Simply the organization into packages/namespaces that reflects the subdomains/Bounded Contexts — don't let the folder structure be purely technical (`controllers/`, `services/`, `models/`) with no relation to the domain. Prefer organizing by **business context**:

```
/orders
  /domain
  /application
  /infrastructure
/inventory
  /domain
  /application
  /infrastructure
```

---

## 4. Architecture Supporting DDD

Tactical DDD needs an architecture that **protects the domain from technical details**. The most common ones used alongside DDD:

### 4.1 Layered Architecture

The classic division proposed by Evans himself:

1. **Interface/Presentation** — controllers, APIs, UI.
2. **Application** — orchestrates use cases, contains no business rules.
3. **Domain** — the heart: Entities, Value Objects, Aggregates, Domain Services, Domain Events. **Depends on no other layer.**
4. **Infrastructure** — Repository implementations, external integrations, frameworks.

Golden rule: **dependencies point inward**. The domain layer knows nothing about infrastructure or frameworks.

### 4.2 Hexagonal Architecture (Ports & Adapters)

Complements DDD perfectly. The domain sits at the center (the "hexagon"), isolated by **Ports** (interfaces) that define contracts, implemented by **Adapters** (concrete implementations — database, message queue, REST API).

Practical advantage: you can swap the database, the message broker, or the web framework without touching a single line of the domain.

### 4.3 CQRS (Command Query Responsibility Segregation)

Separates **write** models (Commands, which go through business rules and Aggregates) from **read** models (Queries, which can query an optimized projection directly, bypassing domain rules).

Not mandatory in DDD, but fits well when:

- Reads and writes have very different performance/scale requirements.
- Query screens need "flattened" data from multiple Aggregates (which would be awkward to expose through the domain model).

### 4.4 Event Sourcing

Instead of storing only an Aggregate's **current state**, you store the **sequence of events** that led to that state. The current state is rebuilt by replaying the events.

Pairs very well with Domain Events (section 3.4), but it's a **separate, more expensive** architectural decision — it brings full auditability and "time travel," but requires more team maturity (event versioning, snapshots, etc.).

---

## 5. When to use (and NOT use) DDD

### Good candidates for DDD

- A **genuinely complex** business domain, with many rules, exceptions, and edge cases.
- Long-lived systems that will evolve for years and need a model that can withstand change.
- Teams that have (or can build) close access to domain experts.
- Systems where **different areas of the business have conflicting models** for the same concept (a clear sign that Bounded Contexts will help).

### Bad candidates (DDD is overkill)

- **Simple CRUDs** — systems that are, in essence, data entry forms and listings with no relevant business rules.
- Prototypes, MVPs, proofs of concept — the cost of tactical modeling (Aggregates, Value Objects, etc.) doesn't pay off in the short term.
- Generic domains already solved by the market (authentication, sending email) — as seen in section 2.1, the right move here is to buy/use something ready-made, not model it from scratch.
- Small teams with no prior experience — a poorly applied tactical DDD learning curve can create more accidental complexity than it solves (over-engineering).

> **Reference quote (paraphrased from Martin Fowler)**: applying DDD's tactical patterns without understanding the strategic design behind them usually results in more complex code, not simpler — because tactical complexity is only justified when there's real business complexity to model.

---

## 6. Common mistakes

1. **Anemic Domain Model**: Entities that are just "bags of getters/setters," with all business logic dumped into external "Services." This is the opposite of what DDD proposes — behavior should live alongside the data it manipulates.
2. **Giant Aggregates**: modeling a `Customer` that carries orders, addresses, cards, support tickets — all inside the same Aggregate. This causes concurrency contention and Aggregates that are hard to load/persist.
3. **Confusing Bounded Context with "microservice"**: Bounded Context is a **modeling** concept, not a deployment infrastructure concept. You can have multiple Bounded Contexts inside a well-modeled monolith — and a poorly designed microservice can contain several Bounded Contexts mixed together inside it.
4. **A single "Customer" for the entire system**: trying to unify the model of a concept across all contexts, producing a bloated class full of optional fields depending on the context of use.
5. **Ignoring the Ubiquitous Language in the code**: holding business meetings with a rich vocabulary, while the code stays full of `Manager`, `Helper`, `Processor`, `Data`, with no relation to business terms.
6. **Applying tactical DDD to generic or trivial domains**: creating Value Objects, Aggregates, and Domain Events for a "product category" registration screen that has no rules beyond a unique name.
7. **Thinking DDD = a `domain/` folder**: having a folder called `domain` in the project doesn't mean the domain has been modeled — the folder structure is a consequence of the model, not the model itself.

---

## 7. Practical application checklist

When modeling a new feature or reviewing an existing one, ask:

- [ ] Is this concept a **Core Domain**, **Supporting**, or **Generic Subdomain**? (defines how much modeling effort is worth it)
- [ ] What is the **Bounded Context** of this feature? Is there term ambiguity with another context?
- [ ] Do the terms used in the code match the terms used by business experts (Ubiquitous Language)?
- [ ] Does this object have its own identity (Entity), or is it defined only by its values (Value Object)?
- [ ] What are the **invariants** (rules that must always hold true)? They define the Aggregate's boundaries.
- [ ] Is the Aggregate small? Am I referencing other Aggregates only by ID?
- [ ] Does the business rule live inside the Entity/Value Object, or did it leak into an anemic Service?
- [ ] Do I need **immediate** consistency (same Aggregate) or **eventual** consistency (Domain Event between Aggregates/contexts)?
- [ ] Am I integrating with a legacy or external system? Do I need an Anticorruption Layer?
- [ ] Does the domain depend on any infrastructure detail (database, framework)? If so, invert the dependency.

---

## 8. Quick glossary

| Term                     | One-line definition                                                   |
| ------------------------ | ------------------------------------------------------------------- |
| **Domain**               | Area of knowledge/business that the software addresses               |
| **Subdomain**            | A division of the domain (Core, Supporting, Generic)                  |
| **Bounded Context**      | The boundary where a specific model is valid and consistent           |
| **Context Map**          | A map of the relationships between Bounded Contexts                   |
| **Ubiquitous Language**  | Shared vocabulary between business and code, within a context         |
| **Entity**               | An object with a unique identity that persists over time              |
| **Value Object**         | An immutable object defined by its values, with no identity           |
| **Aggregate**            | A cluster of objects treated as a unit of transactional consistency   |
| **Aggregate Root**       | The single entry point for modifying an Aggregate                     |
| **Domain Event**         | Something relevant that happened in the domain, in the past           |
| **Domain Service**       | A business operation with no natural "owner" among Entities           |
| **Repository**           | A persistence abstraction for an Aggregate                            |
| **Factory**              | Encapsulates the creation of complex Aggregates                       |
| **Anticorruption Layer** | A translation layer that protects the domain from external models     |
| **Anemic Domain Model**  | Antipattern: Entities with no behavior, just data                     |

---

## 9. References to go deeper

- Eric Evans — _Domain-Driven Design: Tackling Complexity in the Heart of Software_ (the original book, known as the "Blue Book").
- Vaughn Vernon — _Implementing Domain-Driven Design_ (the "Red Book", more practical, with code examples).
- Vaughn Vernon — _Domain-Driven Design Distilled_ (a condensed version, a great introduction).
- Martin Fowler — articles on Bounded Context, Anemic Domain Model, and CQRS at martinfowler.com.
- Alberto Brandolini — material on **Event Storming**, a practical technique for discovering Bounded Contexts and Domain Events collaboratively with business experts.

---

_Last updated: July 2026._
