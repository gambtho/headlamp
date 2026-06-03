# Topology demo — walkthrough

A reference for what every element on the demo page means and why it
matters. Companion piece to `plugins/examples/runway/README.md` (which
covers install + the metric-source / "what's real" tier table) and
the source spec `projects-and-aks-overlay.md` (which defines the
shipping plan).

Two halves:

1. **[Page walkthrough](#page-walkthrough)** — every element top-to-bottom.
2. **[Speaker script](#speaker-script)** — a 5–7 minute spoken
   walkthrough for live demos.

---

# Page walkthrough

## Project header strip

The strip across the top of the page (from `fixtures/projectHeader.ts`).

| Element                         | Value in demo                                       | What it means                                                                                                                     | Why it matters                                                                                                                                                                                        |
| ------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Project name + display name** | `customer-support-agent` / "Customer Support Agent" | The Project CR's `metadata.name` and `spec.displayName` (spec §5). Identity for the whole app.                                    | Without a Project CR, this is just a pile of Deployments — operators can't answer "what is this app."                                                                                                 |
| **Cluster + namespace chips**   | `aks-prod-eastus2` · `support`                      | Headlamp's active cluster context + the Project's namespace.                                                                      | Per-cluster context is a hard prerequisite (UX P0-0, spec §0) — viewers need to know _which_ cluster they're looking at.                                                                              |
| **Ready chip**                  | green ● Ready                                       | §6 aggregation: every member Pod ready + every MD `status.ready` + every PVC bound + every Service has endpoints.                 | Deliberately deterministic, _not_ an alert (non-goal §1). It answers "is the app up" with no thresholds, no time windows.                                                                             |
| **Project throughput**          | `3,240 tok/s`                                       | Sum across member ModelDeployments of `tokensPerSec` from the engine adapter (vLLM/Ray/TEI).                                      | The single number that answers "how much work is this app doing right now." Headlamp can't compute this because it doesn't know what an MD is.                                                        |
| **Avg TTFT**                    | `184 ms`                                            | Member-weighted average of `time_to_first_token` p95 from each MD's engine adapter.                                               | TTFT is the user-felt latency for streaming LLMs — first character on screen. A "fast" app at the project level means low avg TTFT.                                                                   |
| **Active sessions**             | `62`                                                | Concurrent in-flight conversations (agent-runtime metric — v1.1, see spec §14.7).                                                 | Capacity signal. "62 people are using this right now" is a different question from tokens/s — high tokens + low sessions = a few heavy users; the inverse = lots of light ones.                       |
| **Cache hit**                   | `47%`                                               | Semantic cache hit at the agent layer (v1.1, agent-runtime metric).                                                               | A cache hit means _the LLM never ran_ — saves cost and latency. 47% means roughly half the traffic is essentially free. Distinct from per-model KV-cache and prefix cache (which live in the drawer). |
| **Cost / 1M tok (24h)**         | `$0.84`                                             | Total tokens served × per-engine cost rate, summed across MDs, over a 24h window. Needs a billing exporter (spec §14.4(d), v2.0). | The number a manager asks first. Without it, "is this app profitable" is unanswerable.                                                                                                                |
| **GPU pods mini-stat**          | `▣ 4`                                               | Count of Pods on the Project whose containers request `nvidia.com/gpu > 0`.                                                       | GPU pods cost money. Knowing the count instantly tells you the rough infrastructure footprint.                                                                                                        |
| **Engine mini-stat**            | `⬢ vLLM ×2, TEI ×1`                                 | Detection-registry roll-up (§7) — which engines power this Project.                                                               | "What runs here." The mix tells the platform team whether this Project is one engine-cluster or a polyglot one (vLLM for chat, TEI for embeddings is the canonical RAG pattern).                      |

---

## Topology canvas — the four lanes

From `canvas/Canvas.tsx`. Lanes are fixed left-to-right and oriented around request entry (spec §6a).

| Lane                 | What lives there                                           | Why it's its own lane                                                                                                                                                                                                                                                 |
| -------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ingress**          | Gateway, HTTPRoute                                         | The "front door" — where external traffic enters. Pinning this on the left makes the request-flow narrative read like English (left to right).                                                                                                                        |
| **Agent**            | The orchestration Pod (langgraph / LlamaIndex / homegrown) | Forward-looking lane (v1.1, agents-as-first-class). An agent decides _which model to call for this request_, so it sits between ingress and the models it routes to. Without this lane, the agent would be a generic Deployment box and the routing story disappears. |
| **Models · live**    | One node per ModelDeployment                               | The bulk of the work — each MD is a GPU-backed serving Pod. Calling out "live" distinguishes from training / batch (v2.0).                                                                                                                                            |
| **Memory · Secrets** | Vector DB, PVC, credential Secrets, pull secrets           | "Stateful + sensitive" — what the models depend on but didn't create. Right edge by convention because storage is the request's last hop.                                                                                                                             |

The fixed L→R discipline is what kills the "graphs look chaotic" failure mode (spec §6a). It also makes accessibility tractable: Tab walks nodes in left-to-right reading order.

---

## Nodes on the canvas

From `fixtures/nodes.ts`. Each node shows: icon, title, status dot, chips, optional face metrics, optional inline bars.

### Ingress lane

**Gateway** (`aks-agw-prod` · AGIC) — Azure Application Gateway via the AGIC controller. The cluster's entry point for HTTPS. Matters because: without it, no external traffic reaches anything; its health affects every request. Detected via the `aks.gateway-api` probe (spec §9).

**HTTPRoute** (`support-agent.acme.com`) — Gateway API resource binding the hostname to the agent Service. Matters because: the spec-derivable edge `routes-to → agent` is real K8s state (spec §6a edge table) — proves the topology view isn't fictional.

### Agent lane

**agent-app** — purple-glow box, langgraph runtime. Three face metrics:

- **req/s 12.4** — incoming requests to the agent itself, before any model is called. Pace of work.
- **tool/s 38.2** — tool calls per second the agent fires (RAG retrieval, API calls, function calls). Roughly 3× req/s, which is healthy for a tool-using agent.
- **turns 4.1 avg** — average dialog turns per conversation. Higher = stickier conversations, also higher cost per session.

Why it matters: this is the lane every realistic 2026 AI app puts in front of its models. Without agent-runtime detection (v1.1, §14.7), Headlamp shows it as a generic 2-pod Deployment with no AI-aware metrics — losing the "what is this app doing" story.

### Models lane

Three ModelDeployments, each carrying the same shape so they're visually comparable.

**llama-3-70b-instruct** — orange glow (GPU node), the reasoning model:

- Chips: `A100 80G ×2` (the GPUs), `vLLM 0.6` (the serving engine), `FP8` (the quantization).
- **TTFT 340 ms** — Time To First Token, p95. The latency from request submission to the first character streamed back. The classic "feel responsive" metric for chat. ▼5% trend = getting faster.
- **TPOT 38 ms** — Time Per Output Token after the first. Determines streaming speed; 38ms means ~26 tok/s appear on the screen — comfortable reading pace.
- **tok/s 2,140** — decode tokens per second across the deployment. Throughput.
- **GPU bar 78%** — average GPU utilization across the 2 A100s. Below ~85% means there's headroom for traffic spikes.
- **KV bar 62%** — KV-cache utilization. Each in-flight request occupies KV-cache for its context length; 62% means there's room for a few more concurrent generations before the engine has to preempt.

**phi-3-mini-router** — orange glow, the fast routing model:

- Chips: `T4 ×1`, `vLLM 0.6`, `spec-dec` (speculative decoding).
- **TTFT 62 ms / TPOT 14 ms** — much faster than llama because it's a 4B-parameter model on a smaller GPU; ideal for the agent's "decide which model to send this to" routing decision.
- **GPU 34% / KV 18%** — barely loaded. The router does cheap work.

Why two models in different size classes matters: real production AI apps use a **router-and-reasoner pattern** — a cheap small model decides which questions need the expensive big one. The demo shows both costs explicitly so a viewer can see the savings.

**bge-embeddings** — yellow status dot, the saturated one:

- Chips: `T4 ×1`, `TEI 1.2` (HuggingFace Text Embeddings Inference), and a yellow `slow` chip.
- **p95 180 ms** ▲22% — p95 latency for embedding requests. Climbing fast.
- **emb/s 420** ▼4% — embeddings/sec. Going _down_ while latency climbs = saturation.
- **queue 4** ▲3 — pending requests. Queue growth is the canonical "we're falling behind" signal.
- **GPU 91%** — pegged. T4 has no headroom.
- **GMEM 74%** — GPU memory utilization. Different from compute; embeddings batch big.

This node is the demo's narrative driver — it's the realistic failure mode (the cheap GPU saturating first because embeddings traffic is bursty), and it's what makes "operator opens the page and sees the problem" land. The yellow chip + warn-status dot + climbing-latency arrow combination tells the story in three glances.

### Memory · Secrets lane

**vector-db** (qdrant, 3 pods, 1.2M vec) — the RAG retrieval store. Matters because: any RAG app needs to fetch documents before the LLM sees them; vector DB latency is the floor on agent latency. 1.2M vectors is "real production scale" — not a demo dataset.

**rag-index** (50 GiB PVC, managed-csi-premium) — the on-disk index the vector DB serves from. Premium CSI = SSD-backed; matters because RAG index reads are random-access and HDD-backed would tank search latency.

**aoai-creds** — Azure OpenAI credential helper (Secret + ConfigMap, spec §9.6). The demo shows it because the realistic pattern is "self-host the cheap path, fall back to AOAI for hard questions or when overloaded." The plugin only ships the credentials; routing/fallback is v1.1+ (§14.4(a)).

**hf-token** — HuggingFace pull secret. Boring but load-bearing: model images live on the HF registry, and DNS/auth failures here are the #1 reason "my model won't start" — IG's `trace_dns` gadget is in the curated set explicitly for this.

---

## Edges

From `fixtures/edges.ts`. Two visual styles:

- **Gradient solid (blue → fading):** routes-to, selects, calls-runtime. The request-flow.
- **Dashed:** owns, mounts, refs. Structural relationships.

| Edge                                                 | Why it earns a line                                                                                                                                                                           |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTPRoute → Gateway (`references`)                   | Real K8s state. Proves the graph reflects what's actually in the cluster.                                                                                                                     |
| HTTPRoute → agent (`routes-to`)                      | The request's first hop in-cluster.                                                                                                                                                           |
| agent → md-llama / md-phi / md-bge (`calls-runtime`) | **Forward-looking** (spec §14.8, v1.1). Today no K8s-derivable signal says "agent calls these models" — the demo draws them anyway because without them the topology is disconnected islands. |
| agent → vec (`calls-runtime`)                        | The RAG read path.                                                                                                                                                                            |
| agent → aoai (`refs`)                                | `envFrom: secretRef` — declarative dependency. The fallback isn't _implemented_ but the credential dependency is real.                                                                        |
| md-bge → pvc (`mounts`)                              | Spec.volumes — embeddings load weights from PVC.                                                                                                                                              |
| md-llama / md-phi → hf (`refs`)                      | `imagePullSecrets` — both pull from HuggingFace registry.                                                                                                                                     |

---

## The drawer (opens when you click a node)

Auto-opens on `md-llama` on first paint because it's the richest content. From `fixtures/drawerDetails.ts` + `drawer/*`.

Drawer layout: header (kind, name, namespace, k8s metadata) → ordered sections → bottom action buttons. Sections are typed (kv / cards / gpu / histogram / banner) so adding new content is data-only.

### `agent-app` drawer (the agent-shape view)

**Agent runtime · live** — 6-card grid:

- **Requests/s 12.4** — same as the node face; in the drawer to anchor the rest.
- **p95 latency 1.84s** — agent-side, end-to-end. _Includes_ model time + tool time + retrieval time. Order-of-magnitude longer than any single model's TTFT because the agent does several model calls per request.
- **Tool calls/s 38.2** — see node-face explanation.
- **Active sessions 62** — concurrent conversations.
- **Avg turns / convo 4.1** — average dialog depth.
- **Tool error rate 0.6%** ▲ — yellow because climbing. Tool errors = the agent tried to call a function/API that failed.

**Routing decisions · last 15m** — the killer panel for an agent-shaped Project:

- `→ phi-3-mini (fast path)` 71% — most queries go to the cheap model.
- `→ llama-3-70b (complex)` 24% — minority go to the big one.
- `→ AOAI fallback` 5% (warn-toned) — fallback to a paid API. Higher = more money, more risk.
- `Routing model latency (p95)` 62 ms — the cost of the routing decision itself. Matters because: routing latency _adds_ to every request; if routing is slow the architecture is bad.

Why this matters: this is _the_ metric that justifies a router-and-reasoner architecture. A reader sees "71% goes to a cheap model" and immediately understands cost savings.

**RAG retrieval**:

- `Vector queries/s 9.8` — search rate. Lower than req/s (some agent requests don't need RAG).
- `Avg chunks retrieved 6.4` — how many doc snippets the LLM sees per request. Higher = more context, more tokens, more cost.
- `Reranker hits 3.2 / query` — after retrieval, a reranker picks the best chunks; 3.2 ≈ half the retrieved chunks survive.
- `Cache hit (semantic) 47%` — see header explanation.

### `llama-3-70b-instruct` drawer (the model-shape view)

The most data-dense drawer. Four metric sections + GPU block + histogram + cost.

**Inference latency · 15m**:

- **TTFT p50 220 / p95 340 / p99 480 ms** — the latency tail. p50 says "typical user gets 220ms"; p99 480ms says "1-in-100 users wait nearly half a second" — that 1% includes long-prompt or cold-cache requests. Bimodality lives here.
- **TPOT 38 ms** — token streaming pace, as on the node face.
- **Inter-token jitter 4.2 ms** — variation between consecutive tokens. Low jitter = smooth streaming; high jitter = stuttery generation (caused by other requests preempting or batch reorganization).
- **E2E p95 3.4s** — end-to-end for the _typical full response_ (TTFT + TPOT × token count). The number a user actually waits.

**Throughput & batching**:

- **Decode tok/s 2,140** — overall generation rate.
- **Prefill tok/s 18,400** — prefill is much faster than decode because it processes prompt tokens in parallel. The order-of-magnitude gap (~9×) is normal and reassuring.
- **Running batch 24/64** — vLLM is processing 24 of a 64-request batch slot capacity. Headroom.
- **Pending requests 3** — queued, waiting for batch. Low = healthy.
- **Spec-decode accept 78%** — speculative decoding draft acceptance rate. 78% means ~78% of speculative tokens are accepted (the small draft model guessed right); higher = bigger speed-up.
- **Preemptions/min 0.4** — how often vLLM kicked a request out of the running batch to make room. >0 happens; high values mean KV-cache pressure.

**KV-cache & prefix cache**:

- **KV-cache util 62%** — node-face metric, expanded.
- **Prefix cache hit 51%** — vLLM caches prompt-prefix KV states across requests. Half of incoming requests reuse a prefix = roughly half the prefill cost.
- **Cache evictions/min 2.1** — entries being kicked from prefix cache. Low = the cache is sized right.
- **Context length p95 3,840 tok** — typical prompt size at p95. Climbing context length is what drives KV-cache pressure.

Why these matter together: **TTFT × throughput × KV-cache forms a triangle**. You can't optimize one without affecting the others. The cards together let an operator diagnose which corner is constrained.

**GPU telemetry** (`A100 80G ×2`, source: DCGM exporter):

- **GPU util 78%** — fraction of time the GPU is doing math. <100% is normal; >95% sustained = compute-bound.
- **SM occupancy 71%** — fraction of GPU's streaming multiprocessors that have warps to run. Lower than util means the kernels aren't using the GPU's full width — common with small batches.
- **Mem bandwidth 64%** — how saturated the HBM bandwidth is. LLM decode is _memory-bandwidth-bound_ (each token reads all the weights), so this is often the real bottleneck.
- **Power 612 W** — total power draw across both A100s. Real money: power × hours × $/kWh.
- **Temp 74°C** — A100s thermal-throttle around 80°C. 74 is healthy.
- **NCCL b/w 184 GB/s** — inter-GPU bandwidth for tensor-parallel ops. NVLink can hit ~600 GB/s; 184 means the model isn't tensor-parallelism-bottlenecked.

Why DCGM specifically: spec §15 notes IG can't get hardware-counter metrics (util%, occupancy, temp, power) — those are NVIDIA-counter-domain. DCGM is the standard exporter; the demo shows it because real GPU pages need it (spec §9 GPU telemetry panel, v1.0 when DCGM + Prom both detected).

**TTFT distribution · 15m** — the histogram. Bars from 0ms to 800ms+. Why a histogram instead of a quantile bar:

- p50/p95/p99 collapse the distribution to 3 numbers; the histogram shows _shape_.
- Bimodal distribution (two humps) = "cached" vs "uncached" requests behaving differently.
- Long fat tail = some requests are catastrophically slow for one reason.
- Hot bars on the right (orange in the demo) = above an alert threshold an operator cares about.

**Cost · last 24h**:

- **Tokens served 184.2M** — what the model produced.
- **GPU-hours 48** — 2 A100s × 24 hours.
- **$/1M tokens (compute) $1.94** — total cost / total tokens, in OpenAI-comparable units.
- **vs AOAI equivalent −68%** — what running the same workload on AOAI would have cost. The headline number that justifies self-hosting.

### `phi-3-mini-router` drawer

Same shape as llama's, scaled down. The point of having both is the **comparison**: phi runs 8% of the cost per token, with 10× faster TTFT, but does only 5% of the actual reasoning work. The architecture is "use phi when you can, llama when you must."

### `bge-embeddings` drawer

Opens with a yellow **warn banner** (spec §3.5 "MissingDependency"-style, but for saturation):

> _"GPU util 91% · queue depth 4 (growing) · p95 latency +22% over 15m. Saturation signal — observational, no automatic action taken."_

The wording is **observational only** by design — no "consider X" or "scale Y" verbs. This is the §1 non-goal ("no alerting") shaped into UX: surface the signal, don't pretend to be on-call.

Metric sections show the saturation from three angles:

- **Latency** climbing (p95 +22%, p99 +34%).
- **Saturation** explicit (queue 4↑3, pending 2↑1, time-in-queue p95 38ms↑24, reject rate 0.4%↑).
- **GPU** pegged (91% util, 88% SM occupancy — the GPU is genuinely the bottleneck).

The story the page tells: "Embeddings GPU is too small for current load." The operator's next move is outside the plugin (resize the T4 pool, or move embeddings to spot capacity) — but the diagnostic is right here.

### `vector-db` drawer

The qdrant-specific view:

- **Vectors 1.24M / Dimensions 1024** — index size; matches `bge-large-en-v1.5`'s output dim (1024) and a real production corpus size.
- **Disk on PVC 38.2 / 50 GiB** — 76% used; capacity planning signal.
- **Search QPS 9.8 / Search p95 12 ms** — search latency. 12ms is fast; means vector search isn't on the critical path.
- **Recall@10 0.94** — quality metric. Of the true top-10 nearest neighbors, the index returns 94%. >0.9 is considered production-quality.

Why these matter: RAG quality lives or dies on recall. A page that shows recall@10 directly tells the team "search is good"; if recall drops the agent quality drops invisibly upstream.

### `rag-index` (PVC) drawer

Standard PVC view + storage perf:

- **IOPS (P30) 5,000** — Azure managed-disk tier P30 ceiling.
- **Read throughput 42 MB/s** — current average. Below IOPS-equivalent ceiling = not saturating storage.

Matters because: if vector search slowed down, the PVC perf rows tell you whether storage is the cause.

### `aoai-creds` drawer

Two sections.

**Credentials** — what's in the Secret (`api-key, endpoint, deployment-name`), where it points (`aoai-prod-eastus2.openai.azure.com`, deployment `gpt-4o`), and who consumes it (`agent-app via envFrom`). The point: prove the Secret is wired, without leaking the value.

**Fallback traffic · last 15m** — what's actually being sent to AOAI:

- **208 requests / 384k tokens / $2.30 cost / p95 740ms**
- Trends all marked warn-tone (▲18%, ▲22%) because rising fallback = either local capacity is failing, or some prompts can't be served locally.

Why it matters: AOAI fallback is the cost-leak vector. A page that shows it inline means a $-cost regression is visible immediately, not at the end-of-month bill.

### `hf-token` drawer

Minimal: registry + which pods use it. Two-line view because there isn't more to say about a pull secret — but it earns a node because a _broken_ one breaks model startup, and operators need a one-click path to inspect it.

---

## Action buttons (drawer footer)

Two per node, primary + secondary. Pattern:

- **Open in Headlamp** — the §3.5 "Don't re-implement Headlamp" principle in UX form. Every drawer can hand off to the existing per-resource detail page.
- Context-specific second action — Run IG: profile_cuda (for GPU nodes), Run IG: trace_dns (for image-pull edges), Open Azure Portal (for AOAI), View traces (for the agent), Edit YAML (for routing).

Why the consistency matters: a viewer learns the pattern once and applies it to every node. The drawer becomes a _launcher_ into deeper Headlamp views, not a replacement for them.

---

## What the page as a whole demonstrates

Three claims, told by the layout:

1. **A Project is a real object, not a label query.** The header strip's aggregates (project throughput, avg TTFT, cost) only exist because something — the Project CR + the controller — pulls them together.
2. **AI workloads have AI-shaped diagnostics that generic K8s tooling misses.** TTFT, KV-cache, prefix-cache hit, spec-decode acceptance — none of these are in `kubectl describe pod`. The drawer makes them first-class.
3. **The topology view tells a story `kubectl get` cannot.** "Agent fans out to three models, falls back to AOAI, reads RAG from a PVC" is a sentence the canvas renders directly. A list view of the same resources is correct but mute.

The deliberate `bge-embeddings` saturation is the demo's narrative engine — it gives a viewer something to _find_ in the page, which is what makes the diagnostic value stick.

---

# Speaker script

A 5–7 minute spoken walkthrough. Italicized stage directions in
brackets. Pause beats marked `…`. Adjust pacing to audience — drop the
"why it matters" lines for technical audiences who already know the
terms; lean into them for stakeholders who don't.

---

**[Open the page. Drawer is already open on `llama-3-70b-instruct`. Don't engage with it yet — close it.]**

> "This is a demo of what the AI Runway plugin's **Project view**
> could look like in Headlamp. Everything you see is hardcoded —
> there's no cluster behind it. The point is to make a design
> conversation concrete: what should an operator see when they open
> an AI application?"

## Beat 1 — The header strip (≈45 s)

**[Point at the top strip.]**

> "Start at the top. This is one _Project_ — a Customer Support
> Agent app. The plugin defines Project as a real Kubernetes
> object — a CRD — that groups every resource belonging to one ML
> application. Today, Headlamp shows those resources scattered
> across kinds; you can't ask 'is the Customer Support app
> healthy.' Project is the answer to that question.
>
> The strip carries five aggregates Headlamp can't compute on its
> own because it doesn't know what a ModelDeployment is. **3,240
> tokens per second** of throughput across the project. **184 ms
> average TTFT** — Time To First Token, the latency from a user
> hitting send to the first character streaming back. **62 active
> sessions** right now. **47% semantic cache hit** — almost half
> the traffic is served without the LLM running at all. And
> **$0.84 per million tokens** over the last day — the number a
> manager asks first.
>
> Right side: GPU pod count, the engines we detected. We know this
> Project runs vLLM and TEI because the plugin probes for them."

## Beat 2 — The topology (≈60 s)

**[Sweep left to right across the canvas.]**

> "Below the strip, the topology view. Four lanes, oriented
> left-to-right around the request flow.
>
> **Ingress** on the left — the Azure Application Gateway and the
> HTTPRoute that binds the public hostname. **Agent** in the next
> lane — an orchestration Pod, langgraph in this case, that
> decides which model handles each request. **Models live** —
> three ModelDeployments. And **Memory and Secrets** on the right —
> the vector DB, the RAG index PVC, AOAI credentials, the
> HuggingFace pull secret.
>
> The lane discipline matters: real-world Kubernetes graphs get
> chaotic fast. Fixing the request-flow direction kills that
> failure mode."

**[Hover an edge — say, agent → llama. Let the tooltip show.]**

> "Edges have meaning. Solid blue ones are the request path. Dashed
> are structural — 'this Pod mounts that PVC.' Hover any edge and
> it explains the relationship."

## Beat 3 — The model nodes (≈75 s)

**[Point at the three model nodes.]**

> "The Models lane is doing the most work. Notice the architecture
> first — _two GPUs, two roles_. **llama-3-70b** is the big
> reasoning model on two A100s. **phi-3-mini** is a tiny router
> model on a single T4 that decides which questions need the big
> one. This pattern — router-and-reasoner — is how production AI
> apps actually save money."

**[Point at the metrics on llama's face.]**

> "Every model node carries the three numbers an operator checks
> first. **TTFT** for latency, **TPOT** — Time Per Output Token —
> for streaming speed, and **tok/s** for throughput. Plus inline
> bars for **GPU utilization** and **KV-cache** — the cache vLLM
> uses to avoid recomputing attention. A model with KV at 95%
> can't accept new requests until something finishes; KV at 62%
> means we have headroom."

**[Point at bge-embeddings — the yellow one.]**

> "Now look at the third model. Yellow status dot, yellow chip,
> latency climbing 22%, queue depth growing, GPU at 91%. The
> embeddings model is **saturated**. This is the story the page
> tells without anyone narrating: a viewer sees this in three
> glances and knows what's wrong.
>
> Important framing: the plugin **doesn't alert**. It surfaces the
> signal. The 'next action' — resize the T4 pool, move embeddings
> to spot capacity — is outside the plugin. But the diagnostic is
> right here."

## Beat 4 — The drawer (≈90 s)

**[Click on llama-3-70b. Drawer opens.]**

> "Click any node and a drawer opens. This is where the AI-shaped
> diagnostics live — none of this is in `kubectl describe pod`."

**[Scroll the drawer briefly to show the sections, but settle on
the latency cards.]**

> "Latency at three percentiles: **p50 220 ms** for the typical
> user, **p99 480 ms** for the slowest 1% — usually long prompts
> or cold caches. Below that, **TPOT 38 ms** with very low
> jitter — streaming feels smooth.
>
> Throughput section: vLLM is running 24 of a 64-slot batch with
> 3 pending — healthy. Spec-decode is accepting 78% of draft
> tokens, which is a real speed-up. Preemptions near zero.
>
> KV-cache and prefix cache: half of incoming requests are reusing
> a cached prompt prefix, which means we skip half the prefill
> cost. That's not magic — it's vLLM doing its job, but you can
> only see it if the panel exposes it."

**[Scroll to the GPU block.]**

> "**GPU telemetry from the DCGM exporter** — util, SM occupancy,
> memory bandwidth, power, temp, NCCL bandwidth. LLM decode is
> memory-bandwidth-bound — each generated token reads all the
> weights — so the 64% bandwidth number is the _real_ utilization
> story, not the 78% GPU util above it. This is the kind of nuance
> that separates 'we have a dashboard' from 'we understand the
> workload.'"

**[Scroll to the histogram.]**

> "TTFT distribution as a histogram, not just quantiles.
> Quantiles are 3 numbers; the shape tells you whether you have a
> bimodal cache-hit-versus-cache-miss problem or a single fat
> tail."

**[Scroll to cost.]**

> "And cost. 184 million tokens served in 24 hours, 48 GPU-hours,
> $1.94 per million — **68% cheaper than running the same workload
> on AOAI**. That ratio is the number that justifies the entire
> self-hosting decision."

## Beat 5 — The agent drawer (≈45 s)

**[Close drawer, click `agent-app`.]**

> "One more drawer worth seeing — the agent. The killer panel here
> is **Routing decisions**: 71% of requests went to the cheap
> router, 24% to the big reasoning model, 5% fell back to Azure
> OpenAI. That breakdown is what makes the router-and-reasoner
> architecture _visible_. Without it, a manager asking 'why are we
> spending $200 a day on AOAI when we have GPUs?' has no answer."

## Beat 6 — What's real, what's not (≈45 s)

**[Close drawer. Gesture at the whole page.]**

> "Honesty pass before we close. Some of what's on this page is
> already scoped for v1.0 of the plugin: the engine adapters
> (vLLM, Ray, TEI), the GPU telemetry from DCGM when Prometheus
> is present, the project aggregates.
>
> Other parts are deliberately forward-looking. The Agent lane,
> the routing-decisions panel, the agent → model edges — those
> need an 'agent runtime' concept the source spec doesn't have
> yet. AOAI as a routing fallback needs a CRD field that doesn't
> exist yet. Billing exporters don't exist at all.
>
> The full breakdown is in the README's source table — every
> metric is marked **v1.0**, **v1.0 when detected**, **v1.1**, or
> **v2.0**, with a pointer to where it's tracked in the source
> spec."

## Closing (≈15 s)

> "The bet of the page: **a Project is a real object, AI
> workloads have AI-shaped diagnostics, and a topology view tells
> a story `kubectl get` cannot.** Everything else is detail."

---

**Cheat sheet — terms to know before walking someone else through:**

| Term                | One-line definition                                                              |
| ------------------- | -------------------------------------------------------------------------------- |
| TTFT                | Time To First Token — request → first character streamed                         |
| TPOT                | Time Per Output Token — streaming pace after the first                           |
| KV-cache            | vLLM's per-request attention cache; full cache = can't admit new requests        |
| Prefix cache        | vLLM caches common prompt prefixes across requests                               |
| Spec-decode         | Speculative decoding — small draft model guesses next tokens, big model verifies |
| DCGM                | NVIDIA's GPU metrics exporter — util, mem, power, temp                           |
| AOAI                | Azure OpenAI — paid hosted model endpoint                                        |
| TEI                 | HuggingFace Text Embeddings Inference — the embeddings serving engine            |
| Router-and-reasoner | Cheap fast model decides; expensive smart model only runs when needed            |
| RAG                 | Retrieval-Augmented Generation — fetch docs, feed them to the LLM as context     |
