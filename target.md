# Backend Engineering & System Design: The 10-Step Master Roadmap
**From Raw Silicon & Kernel Sockets to Distributed Systems & Kubernetes Orchestration**

---

## Pedagogical Philosophy & Core Methodology

Every milestone in this roadmap is engineered around four mandatory layers:

1. **Concept & Systems Mental Model**: OS/kernel mechanics under the hood (system calls, `epoll`/`kqueue`, socket buffers, CPU contexts, page frames, memory allocators).
2. **Comparison Table**: Naive/Tutorial Approach vs. Production/Enterprise Approach vs. Balanced Hands-On Implementation.
3. **Developer Assumptions vs. Reality (The Failure Matrix)**:
   > *"If a developer does X, they expect Y, but an attacker or race condition causes Z."*
4. **Step-by-Step Hands-On Code**: Clean TypeScript implementations, tested live using `curl`, `nc`, database debuggers, stress-testing tools, and exploit scripts.

---

## The 10 Master Steps

```
[ Step 1: Raw TCP & Event Loop ]
              │
              ▼
[ Step 2: Framework Internals & Middleware ]
              │
              ▼
[ Step 3: Database Wire Protocol & Storage Engine ]
              │
              ▼
[ Step 4: ACID Transactions & Concurrency Bugs ]
              │
              ▼
[ Step 5: Data Modeling & Multi-Tenancy ]
              │
              ▼
[ Step 6: Identity, Sessions & Token State Machines ]
              │
              ▼
[ Step 7: Authorization (RBAC/ABAC) & IDOR Prevention ]
              │
              ▼
[ Step 8: In-Memory Caching & Distributed Sync (Redis) ]
              │
              ▼
[ Step 9: Asynchronous Queues, Workers & Real-Time Events ]
              │
              ▼
[ Step 10: System Design, Docker & Kubernetes Orchestration ]
```

---

### Step 1: Raw TCP Sockets, HTTP/1.1 Protocol Mechanics & The Node.js Event Loop
* **Under the Hood**: 
  - Linux `epoll` / Darwin `kqueue` edge-triggered non-blocking I/O.
  - libuv single-threaded event loop phases (Timers, Pending I/O, Poll, Check, Close) vs. the `UV_THREADPOOL_SIZE` worker pool.
  - Kernel socket buffers (`so_rcvbuf`, `so_sndbuf`) and TCP stream fragmentation.
* **Architecture & Build**:
  - Raw `net.Socket` TCP stream server without `node:http`.
  - Incremental streaming parser state machine (`REQUEST_LINE` -> `HEADERS` -> `BODY` -> `COMPLETE`).
  - Handling TCP backpressure via `socket.write()` return values and the `drain` event.
* **Failure Matrix & Security**:
  - **Packet Splitting Bugs**: Assuming 1 `data` chunk = 1 HTTP request.
  - **Slowloris DoS**: Holding file descriptors open with 1-byte trickle rates.
  - **Header Bomb OOM**: Infinite header streams without CRLF blowing up V8 heap.
  - **HTTP Request Smuggling**: Desync between frontend proxies and backends on `Content-Length` vs `Transfer-Encoding: chunked`.
* **Verification**: `nc`, `curl`, raw hex-dump wire inspection, and packet-fragmenting bash pipes.

---

### Step 2: Web Framework Internals & Middleware Architecture
* **Under the Hood**:
  - Building an Express/Koa-style engine from scratch over Node's native `http` module.
  - Radix Tree / Trie-based URL routers vs. O(N) regex evaluation.
  - Async context propagation across the call stack (`AsyncLocalStorage`).
* **Architecture & Build**:
  - The **Onion Model** (nested middleware execution: pre-handler -> downstream -> post-handler).
  - Global error boundaries, unhandled promise rejection traps, and structured request lifecycles.
  - Streaming responses vs. in-memory response buffering.
* **Failure Matrix & Security**:
  - **Broken Next Chains**: Calling `next()` multiple times causing "Cannot set headers after they are sent" runtime panics.
  - **Unhandled Async Rejections**: Uncaught exceptions terminating the single-threaded Node process.
  - **ReDoS (Regular Expression Denial of Service)**: Path regex backtracking locking the V8 event loop at 100% CPU.

---

### Step 3: Database Internals: Postgres Wire Protocol, Pooling & Storage Mechanics
* **Under the Hood**:
  - Postgres frontend/backend wire protocol (Startup, Authentication, Query, RowDescription, DataRow, ReadyForQuery).
  - Storage engine layout: 8KB disk pages, Tuples, B-Tree index traversal, Write-Ahead Logging (WAL), MVCC (Multi-Version Concurrency Control), and `VACUUM`.
  - Process-per-connection architecture in Postgres vs. connection pooling.
* **Architecture & Build**:
  - Building a raw TCP client communicating directly with Postgres wire protocol.
  - Designing a custom connection pool: pool sizing algorithms, idle timeouts, queue backpressure, and connection health probes.
* **Failure Matrix & Security**:
  - **Connection Starvation**: Exhausting `max_connections` due to unreleased client checkouts.
  - **Full Table Scans in Production**: Missing indexes causing disk I/O thrashing and buffer cache evictions.
  - **SQL Injection**: String interpolation vs. parameterized queries at the protocol level.
* **Verification**: `EXPLAIN (ANALYZE, BUFFERS)` execution plans, `pg_stat_activity` inspections.

---

### Step 4: ACID Transactions, Concurrency Anomalies & Race Conditions
* **Under the Hood**:
  - Transaction lifecycles (`BEGIN`, `COMMIT`, `ROLLBACK`) and savepoints.
  - ANSI SQL Isolation Levels vs. PostgreSQL Reality: Read Committed, Repeatable Read, Serializable.
  - Lock managers: Shared (S) locks, Exclusive (X) locks, Row-level locks, Deadlock detection graphs.
* **Architecture & Build**:
  - Implementing robust transaction wrappers with automatic retry on serialization failures (`40001`).
  - Pessimistic locking (`SELECT ... FOR UPDATE`, `SKIP LOCKED`) vs. Optimistic locking (version columns).
* **Failure Matrix & Security**:
  - **Dirty Reads, Non-Repeatable Reads & Phantom Reads**: Leaking intermediate uncommitted state.
  - **Write Skew**: Race conditions that slip past snapshot isolation.
  - **TOCTOU (Time-of-Check to Time-of-Use)**: Double-spend vulnerabilities in wallet/inventory operations.
  - **Deadlock Cascades**: Inconsistent resource acquisition order freezing database worker threads.
* **Verification**: Concurrent execution scripts firing 50 simultaneous parallel requests to trigger double-spends.

---

### Step 5: Data Modeling, Composite Constraints & Multi-Tenancy Architecture
* **Under the Hood**:
  - Normalization (1NF to 3NF) vs. deliberate denormalization.
  - Foreign key cascading constraints, foreign key indexing penalties.
  - Multi-tenant data segregation models:
    1. Shared Database, Shared Schema (Row-Level Security / Discriminator Column).
    2. Shared Database, Separate Schema (Schema-per-tenant).
    3. Separate Database per tenant.
* **Architecture & Build**:
  - Automated migration runner with schema version tracking.
  - Multi-tenant tenant-context injection via PostgreSQL Row Level Security (RLS).
  - Soft deletes (`deleted_at`) vs. Hard deletes: handling unique index collisions on soft-deleted rows.
* **Failure Matrix & Security**:
  - **Cross-Tenant Data Leaks**: Omitting `tenant_id` in `WHERE` clauses exposing competitor data.
  - **Index Invalidation**: Nullable columns in composite indexes preventing index-only scans.
  - **Orphan Records**: Missing foreign key constraints leaving dangling references during background deletes.

---

### Step 6: Identity, Session Architecture & Token State Machines
* **Under the Hood**:
  - Cryptographic hashing: Argon2id, bcrypt, PBKDF2 (work factor, salt, memory cost).
  - Stateful session engines (Redis session stores) vs. Stateless tokens (JWT).
  - HTTP cookie security attributes (`HttpOnly`, `Secure`, `SameSite=Strict/Lax`, `__Host-` prefix).
* **Architecture & Build**:
  - Dual-token authentication system: Short-lived Access Tokens (memory) + Long-lived Refresh Tokens (database/Redis).
  - Refresh token rotation state machine with automatic family revocation on reuse detection.
* **Failure Matrix & Security**:
  - **Token Theft & Replay**: Storing tokens in `localStorage` vulnerable to XSS.
  - **JWT Signature Stripping / Algorithm Confusion**: `alg: none` attacks, RSA public key treated as HMAC secret.
  - **Revocation Impossibility**: Stateless JWTs remaining valid after user logout, password reset, or account compromise.

---

### Step 7: Authorization Systems (RBAC / ABAC) & IDOR Prevention by Design
* **Under the Hood**:
  - Authentication (*Who are you?*) vs. Authorization (*What can you do?*).
  - Access control paradigms: Discretionary (DAC), Role-Based (RBAC), Attribute-Based (ABAC).
  - Contextual access evaluation: User, Resource, Action, Environment.
* **Architecture & Build**:
  - Declarative, type-safe authorization middleware engine.
  - Bitmask permissions for high-performance in-memory capability checks.
  - Repository-level scoping to eliminate IDOR (Insecure Direct Object Reference) structurally.
* **Failure Matrix & Security**:
  - **IDOR / BOLA (Broken Object Level Authorization)**: Querying `/api/documents/:id` without validating tenant/owner boundaries.
  - **Privilege Escalation**: Modifying role fields in mass-assignment payload updates (`isAdmin: true`).
  - **Confused Deputy Problems**: Calling internal APIs on behalf of unverified callers.

---

### Step 8: In-Memory Caching, Distributed Synchronization & Redis Internals
* **Under the Hood**:
  - Redis architecture: In-memory single-threaded event loop, RESP protocol, memory eviction policies (`volatile-lru`, `allkeys-lru`).
  - Cache topologies: Cache-Aside (Lazy Loading), Write-Through, Write-Back (Write-Behind).
  - Cache invalidation strategies: TTL, event-driven invalidation, tag-based purging.
* **Architecture & Build**:
  - Production-ready Cache-Aside abstraction layer with serializable key hashing.
  - Mutex locks for cache stampede (Thundering Herd) mitigation.
  - Distributed locks using Redis (`SET NX PX` with Lua atomic release verification).
* **Failure Matrix & Security**:
  - **Cache Stampede / Thundering Herd**: Cache key expiring under heavy traffic causing thousands of simultaneous database queries.
  - **Cache Penetration**: Querying non-existent IDs causing every request to hit the database (mitigated by caching nulls / Bloom filters).
  - **Split-Brain / Stale Read Anomalies**: Cache and database falling out of sync on failed writes.

---

### Step 9: Asynchronous Queues, Background Workers & Real-Time Event Streaming
* **Under the Hood**:
  - Synchronous request-response bottlenecks vs. asynchronous decoupled processing.
  - Message broker topologies: Point-to-Point queues (BullMQ/Redis, RabbitMQ) vs. Log-based pub/sub (Kafka).
  - Full-duplex persistent connections: WebSockets (RFC 6455 framing, masking keys) vs. Server-Sent Events (SSE).
* **Architecture & Build**:
  - Producer-Consumer job processing pipeline with BullMQ.
  - Worker concurrency tuning, exponential backoff retries, and Dead Letter Queues (DLQ).
  - Idempotent consumer design using idempotency keys.
  - Real-time event gateway broadcasting updates to connected clients over WebSockets.
* **Failure Matrix & Security**:
  - **Poison Pill Messages**: Malformed jobs crashing workers repeatedly without reaching a DLQ.
  - **Duplicate Processing**: Network partitions during ACK triggering duplicate job executions (e.g., double billing).
  - **Connection Leaks & Zombie Sockets**: Unclosed WebSocket connections exhausting OS file descriptors.

---

### Step 10: System Design, Production Reliability, Docker & Kubernetes
* **Under the Hood**:
  - Linux Kernel Isolation Primitives: Namespaces (`pid`, `net`, `mnt`, `ipc`, `uts`, `user`), Control Groups (`cgroups v2` memory/CPU throttling), and `chroot`/`pivot_root`.
  - Container runtimes: OCI spec, containerd, runc.
  - Kubernetes cluster architecture: Control Plane (API Server, etcd, Scheduler, Controller Manager) vs. Worker Nodes (kubelet, kube-proxy, Container Runtime).
* **Architecture & Build**:
  - Multi-stage, minimal, unprivileged Dockerfile (`node:alpine`, non-root user `node`, dumb-init process reaper).
  - Distributed Rate Limiting engine: Token Bucket & Sliding Window Log using Redis Lua scripts.
  - High-Availability Patterns: Health check probes (`livenessProbe`, `readinessProbe`), Graceful shutdown (`SIGTERM` handling, draining in-flight requests).
  - Kubernetes manifests: `Deployment`, `Service` (ClusterIP/NodePort), `ConfigMap`, `Secret`, `Ingress`, and `HorizontalPodAutoscaler` (HPA).
* **Failure Matrix & Security**:
  - **PID 1 Zombie Reaping Problem**: Node.js running as PID 1 failing to forward signals or reap orphan zombie processes.
  - **Container Escape / Root Exploits**: Running containers as root allowing kernel-level privilege escalation.
  - **Cascading Failures**: Lack of circuit breakers causing downstream service failures to take down the entire system.
  - **Downtime on Deployments**: Pods terminated before the load balancer stops routing traffic to them.

---

## Roadmap Progress Tracker

| Step | Topic | Focus Area | Status |
| :---: | :--- | :--- | :---: |
| **01** | **Raw TCP & Event Loop** | Sockets, libuv, HTTP/1.1 streaming parser, backpressure | **COMPLETED** |
| **02** | **Framework Internals & Middleware** | Onion model, routing tries, async context, errors | **IN PROGRESS** |
| **03** | **Database Wire Protocol & Storage** | Postgres wire protocol, pooling, B-Tree, WAL | PENDING |
| **04** | **ACID & Concurrency Bugs** | Isolation levels, locks, race conditions, TOCTOU | PENDING |
| **05** | **Data Modeling & Multi-Tenancy** | Composite keys, migrations, RLS, soft deletes | PENDING |
| **06** | **Identity & Token State Machines** | Argon2id, Redis sessions, JWT rotation, cookie flags | PENDING |
| **07** | **Authorization & IDOR Defense** | RBAC, ABAC, bitmasks, secure repository scoping | PENDING |
| **08** | **Caching & Distributed State** | Redis internals, cache stampede, distributed locks | PENDING |
| **09** | **Async Queues & Real-Time** | BullMQ, DLQ, idempotent consumers, WebSockets | PENDING |
| **10** | **System Design, Docker & K8s** | Cgroups/namespaces, multi-stage builds, HPA, K8s | PENDING |
