# Collaborative Editing — Library & Architecture Options

> **Status:** this research led to the stack actually implemented — Liveblocks + Yjs + TipTap.
> See `docs/architecture.md` for how it's wired up.

A comparison of abstract libraries, managed services, and self-hosted backends for building a structured, real-time collaborative webapp. Written as a companion to the Excalidraw research notes — the goal is to identify what to adopt rather than reimplementing Excalidraw's hand-rolled approach.

---

## Why not do what Excalidraw did?

Excalidraw's `reconcileElements` is essentially a bespoke, simplified CRDT — single-element last-write-wins with `(version, versionNonce)` tiebreaking, plus custom fractional indexing for ordering, periodic full-scene rebroadcasts for self-healing, and Firebase transactions for persistence. It works, but it's domain-specific and manually maintained.

General-purpose CRDT libraries generalise this to arbitrary data structures with **formal convergence guarantees**, meaning you don't need to write your own validation logic, periodic repair, or conflict-resolution rules. The ecosystem has matured to the point where this is the standard approach for new collaborative apps.

---

## Layer 1: CRDT Libraries (conflict resolution)

The core primitive. This is what handles merging concurrent edits deterministically across all clients.

### Yjs

- **Model:** A document composed of shared types — `Y.Text`, `Y.Map`, `Y.Array`, `Y.XmlFragment`.
- **Strengths:** Most mature and battle-tested. Largest ecosystem. Rich editor bindings: ProseMirror, TipTap, CodeMirror, Monaco, Quill, Lexical. Proven at scale in production apps. Performance is strong (Rust core in progress).
- **Weaknesses:** The document model takes getting used to; the API can be unintuitive for structured state vs. text. Some operations (e.g. moving items between containers) require workarounds.
- **Best for:** Text-heavy editors, structured documents where you want maximum ecosystem support and proven reliability.

### Automerge

- **Model:** JSON-like document (`Automerge.Doc<T>`). You define a TypeScript interface and mutate it through a proxy-like API.
- **Strengths:** Familiar JSON mental model — great for structured app state, not just text. Strong local-first story (offline editing, sync). Automerge 2.x has a Rust core that significantly improved performance.
- **Weaknesses:** Historically slower than Yjs on large documents; the gap has narrowed but benchmarks still favour Yjs/Loro in most scenarios. Smaller editor-binding ecosystem.
- **Best for:** Apps where state is more JSON-document-like than text-like, and where offline-first is a priority.

### Loro

- **Model:** CRDT with structured containers — `List`, `Map`, `Tree`, `MovableList`, `Text`. First-class tree support.
- **Strengths:** Newest of the three; fastest in benchmarks across nearly all categories. Native tree/block support makes it ideal for block-based or hierarchical editors. Built-in time travel and exportable history.
- **Weaknesses:** Youngest ecosystem; fewer editor bindings and community resources. Less proven in large-scale production compared to Yjs.
- **Best for:** Block-based editors, structured/hierarchical data, performance-critical apps with complex document shapes.

### Comparison

| Criterion | Yjs | Automerge | Loro |
|---|---|---|---|
| Maturity | ★★★★★ | ★★★★ | ★★★ |
| Performance | ★★★★ | ★★★ | ★★★★★ |
| Structured data | ★★★★ | ★★★★★ | ★★★★★ |
| Editor bindings | ★★★★★ | ★★★ | ★★ |
| Offline support | ★★★ | ★★★★★ | ★★★★ |
| Tree/block model | ★★★ | ★★★ | ★★★★★ |
| Community size | ★★★★★ | ★★★★ | ★★ |

---

## Layer 2: Sync Backends (relay + persistence)

A CRDT library resolves conflicts in the client, but you still need:
1. A **WebSocket relay** to broadcast updates between users (Excalidraw's `excalidraw-room`).
2. **Persistence** so late joiners and returning users get the current state (Excalidraw's Firebase layer).

### Option A — Managed service

| Service | What it provides | When to choose |
|---|---|---|
| **Liveblocks** | Fully managed. Own data structures (LiveObject, LiveList, LiveMap) plus first-class Yjs integration. Rooms, presence, comments, notifications, auth, AI copilot features. Free tier available. | You want to focus on your app, not infra. You want presence, comments, and room management handled. The most batteries-included option. |
| **Y-Sweet** (Jamsocket) | Managed Yjs sync + persistence server. Open source — can self-host later. Lighter than Liveblocks; just the Yjs backend with no opinion on your data model. | You want the Yjs backend managed but don't need Liveblocks' full feature set. Good middle ground between managed and self-hosted. |
| **Supabase Realtime** | Postgres + Realtime channels. Presence, broadcast, and Postgres CDC. Not a CRDT — pair with Yjs or use for presence/broadcast only. | You're already on Supabase and want presence/broadcast without a separate service. |

### Option B — Self-hosted Yjs backend

| Server | Description | When to choose |
|---|---|---|
| **Hocuspocus** | Purpose-built Yjs WebSocket server. Persistence (Redis, Postgres, SQLite, S3), auth hooks, webhooks, multi-doc, scaling. The most popular self-hosted option. | You want control over hosting, auth, and database. You've outgrown managed pricing. You need on-prem or custom compliance. |
| **y-websocket** | Minimal Yjs WebSocket server. Good for prototyping. | Early prototyping only — you'll need to add persistence and auth yourself. |
| **PartyKit** (Cloudflare) | Deploy collaboration logic as Cloudflare Workers. Global edge WebSockets + Durable Objects for state. Not Yjs-specific but commonly paired with it. | You want edge-deployed, globally distributed WebSockets and are comfortable on the Cloudflare platform. |

### Option C — Build from scratch (the Excalidraw approach)

Roll your own Socket.IO relay + your own persistence layer. Only makes sense if you need fine-grained control over the encryption model (Excalidraw's end-to-end encryption with URL-fragment keys is unusual) or have constraints that rule out all existing options.

---

## Layer 3: Editor frameworks (if text editing is involved)

If your structured app includes rich text editing, these frameworks have first-class Yjs bindings:

| Editor | Yjs binding | Notes |
|---|---|---|
| **TipTap** | `y-prosemirror` (via ProseMirror) | Most popular for React. Headless, extensible. |
| **ProseMirror** | `y-prosemirror` | Direct; TipTap is built on top. |
| **CodeMirror 6** | `y-codemirror.next` | For collaborative code editing. |
| **Monaco** | `y-monaco` | For VS Code-style collaborative editing. |
| **Lexical** | `@lexical/yjs` | Meta's editor framework; growing adoption. |
| **Quill** | `y-quill` | Legacy option; fewer updates. |

For block-based / structured editing (Notion-style), **TipTap** with custom node types is the most common starting point, and pairs naturally with Yjs.

---

## Recommendation for a structured collaborative webapp

### Core stack

1. **CRDT: Yjs.** Most proven, richest ecosystem, model structured data with nested `Y.Map` / `Y.Array`. If your data is heavily tree-shaped and you're comfortable with a newer library, consider **Loro** as an alternative.

2. **Backend: start managed, move to self-hosted if needed.**
   - **Liveblocks** if you want presence, comments, auth, and rooms all handled — the fastest path to a working multiplayer app.
   - **Y-Sweet** if you want just the sync/persistence layer with more control and a clear self-host path.
   - **Hocuspocus** (self-hosted) when you outgrow managed pricing or need custom control — Yjs documents are portable binary blobs, so switching backends later is feasible.

3. **Editor (if needed): TipTap** with `y-prosemirror`. Headless and extensible for structured/block-based editing.

### What you get for free vs. what Excalidraw built by hand

| Concern | Excalidraw (hand-rolled) | With Yjs + a backend |
|---|---|---|
| Conflict resolution | Custom `(version, versionNonce)` LWW per element | CRDT handles automatically, with stronger formal guarantees |
| Ordering | Custom fractional indexing + repair logic | `Y.Array` / `Y.Map` handle ordering natively |
| Late-joiner sync | Firebase snapshot + peer INIT broadcast | Backend serves stored doc update; CRDT merges automatically |
| Periodic consistency check | 20s full-scene rebroadcast + 60s index validation | Not needed — CRDT convergence is algorithmically guaranteed |
| Presence / cursors | Custom volatile broadcast | Liveblocks / Hocuspocus have presence APIs built in |
| Persistence | Firebase transactions with manual reconciliation | Backend persists CRDT update binary; no manual reconciliation |
| Offline support | Not supported | Yjs / Automerge support local-first editing natively |

### Key takeaway

Excalidraw's `reconcileElements` is a simplified, single-element CRDT. General-purpose CRDT libraries generalise this to any data structure with formal convergence guarantees — so the conflict resolution, ordering, consistency checking, and late-joiner sync that Excalidraw hand-built are all handled by the library. Your job becomes modelling your domain data as CRDT types and wiring up a backend, not designing a merge algorithm.

---

## Sources

- [Velt: CRDT Implementation Guide](https://velt.dev/blog/crdt-implementation-guide-conflict-free-apps) — Yjs vs Automerge comparison, CRDT vs OT
- [PkgPulse: Yjs vs Automerge vs Loro (2026)](https://www.pkgpulse.com/guides/yjs-vs-automerge-vs-loro-crdt-libraries-2026) — benchmark comparison
- [PkgPulse: Liveblocks vs PartyKit vs Hocuspocus (2026)](https://www.pkgpulse.com/guides/liveblocks-vs-partykit-vs-hocuspocus-realtime-2026) — backend comparison
- [Liveblocks](https://liveblocks.io/) — managed collaboration platform
- [Yjs Community: Yjs vs Loro](https://discuss.yjs.dev/t/yjs-vs-loro-new-crdt-lib/2567) — feature comparison
- [Smashing Magazine: Architecture of Local-First Web Development](https://www.smashingmagazine.com/2026/05/architecture-local-first-web-development/) — Automerge and local-first patterns
- [awesome-local-first (GitHub)](https://github.com/alexanderop/awesome-local-first) — Y-Sweet, Hocuspocus, and other tools
