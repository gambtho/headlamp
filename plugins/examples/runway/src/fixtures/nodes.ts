/*
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { demo } from '../styles/theme';
import { DemoNode } from './types';

export const nodes: DemoNode[] = [
  // ---------- Ingress lane ----------
  {
    id: 'gw',
    kind: 'entry',
    lane: 'ingress',
    title: 'Gateway',
    icon: '▤',
    subtitle: 'aks-agw-prod · AGIC',
    status: 'ok',
    y: 110,
  },
  {
    id: 'hr',
    kind: 'entry',
    lane: 'ingress',
    title: 'HTTPRoute',
    icon: '⇢',
    subtitle: 'support-agent.acme.com',
    status: 'ok',
    y: 180,
  },

  // ---------- Agent lane ----------
  // The agent is the conceptual anchor of this Project's topology — every
  // outbound edge from this node tells the routing story. It's deliberately
  // sized larger than the model nodes and is the only purple element on
  // the canvas. See Node.tsx kindStyles() for the matching visual treatment.
  {
    id: 'agent',
    kind: 'agent',
    lane: 'agent',
    title: 'agent-app',
    icon: '⬢',
    status: 'ok',
    y: 90,
    chips: [
      { label: '2 pods' },
      { label: 'langgraph', variant: 'engine' },
      { label: 'reasoning agent' },
    ],
    faceMetrics: [
      {
        label: 'requests',
        value: '12.4 /s',
        sparkPoints: [8, 7, 9, 6, 5, 7, 4, 6, 3, 4, 2],
        color: demo.agentAccent,
      },
      {
        label: 'tool calls',
        value: '38.2 /s',
        sparkPoints: [7, 6, 8, 5, 7, 4, 6, 3, 5, 2, 3],
        color: demo.agentAccent,
      },
      {
        label: 'avg turns',
        value: '4.1',
        sparkPoints: [6, 7, 6, 5, 6, 5, 6, 5, 4, 5, 4],
        color: demo.agentAccent,
      },
      {
        label: 'sessions',
        value: '62 live',
        sparkPoints: [3, 4, 4, 5, 6, 5, 6, 7, 6, 7, 8],
        color: demo.agentAccent,
      },
    ],
  },

  // ---------- Models lane ----------
  {
    id: 'md-llama',
    kind: 'gpu',
    lane: 'models',
    title: 'llama-3.3-70b-instruct',
    icon: '▣',
    status: 'ok',
    y: 60,
    chips: [
      { label: 'A100 80G ×2', variant: 'gpu' },
      { label: 'vLLM 0.6', variant: 'engine' },
      { label: 'FP8' },
    ],
    faceMetrics: [
      {
        label: 'TTFT',
        value: '340 ms',
        sparkPoints: [7, 6, 7, 8, 6, 7, 5, 6, 6, 5, 5],
        delta: '−5%',
        color: demo.gpuAccent,
      },
      {
        label: 'TPOT',
        value: '38 ms',
        sparkPoints: [6, 6, 5, 6, 5, 6, 5, 6, 5, 6, 5],
        delta: '0',
        color: demo.gpuAccent,
      },
      {
        label: 'tok/s',
        value: '2,140',
        sparkPoints: [8, 7, 7, 5, 6, 4, 5, 3, 4, 3, 2],
        delta: '+4%',
        color: demo.gpuAccent,
      },
    ],
    inlineBars: [
      { label: 'GPU', pct: 78, gradient: true },
      { label: 'KV', pct: 62, gradient: true },
    ],
  },
  {
    id: 'md-phi',
    kind: 'gpu',
    lane: 'models',
    title: 'phi-3-mini-router',
    icon: '▣',
    status: 'ok',
    y: 220,
    chips: [
      { label: 'T4 ×1', variant: 'gpu' },
      { label: 'vLLM 0.6', variant: 'engine' },
      { label: 'spec-dec' },
    ],
    faceMetrics: [
      {
        label: 'TTFT',
        value: '62 ms',
        sparkPoints: [7, 7, 6, 7, 6, 7, 6, 7, 6, 7, 6],
        delta: '−1%',
        color: demo.status.ok,
      },
      {
        label: 'TPOT',
        value: '14 ms',
        sparkPoints: [6, 5, 5, 6, 5, 5, 4, 5, 4, 5, 4],
        color: demo.status.ok,
      },
      {
        label: 'tok/s',
        value: '780',
        sparkPoints: [7, 6, 5, 6, 5, 4, 5, 4, 3, 4, 3],
        delta: '+6%',
        color: demo.status.ok,
      },
    ],
    inlineBars: [
      { label: 'GPU', pct: 34, gradient: true },
      { label: 'KV', pct: 18, gradient: true },
    ],
  },
  {
    id: 'md-bge',
    kind: 'gpu',
    lane: 'models',
    title: 'bge-embeddings',
    icon: '▣',
    status: 'warn',
    y: 380,
    chips: [
      { label: 'T4 ×1', variant: 'gpu' },
      { label: 'TEI 1.2', variant: 'engine' },
      { label: 'slow', variant: 'warn' },
    ],
    faceMetrics: [
      {
        label: 'p95',
        value: '180 ms',
        sparkPoints: [8, 7, 8, 6, 5, 5, 3, 4, 2, 3, 2],
        delta: '!+22%',
        color: demo.status.warn,
      },
      {
        label: 'emb/s',
        value: '420',
        sparkPoints: [5, 5, 6, 5, 6, 6, 7, 6, 7, 7, 8],
        delta: '−4%',
        color: demo.status.warn,
      },
      {
        label: 'queue',
        value: '4',
        sparkPoints: [9, 9, 9, 8, 8, 7, 7, 5, 4, 3, 2],
        delta: '!+3',
        color: demo.status.warn,
      },
    ],
    inlineBars: [
      { label: 'GPU', pct: 91, gradient: true },
      { label: 'GMEM', pct: 74, gradient: true },
    ],
  },

  // ---------- Memory / Secrets lane ----------
  // Left-anchored at x: 864 (matches the Memory lane start). The canvas
  // is rendered at fixed CANVAS_WIDTH and centered in available space —
  // see Canvas.tsx.
  {
    id: 'vec',
    kind: 'storage',
    lane: 'memory',
    title: 'vector-db',
    icon: '◇',
    status: 'ok',
    y: 80,
    chips: [{ label: '3 pods' }],
    subtitle: 'qdrant · 1.2M vec',
  },
  {
    id: 'pvc',
    kind: 'storage',
    lane: 'memory',
    title: 'rag-index',
    icon: '▭',
    status: 'ok',
    y: 160,
    subtitle: '50Gi · managed-csi-premium',
  },
  {
    id: 'aoai',
    kind: 'secret',
    lane: 'memory',
    title: 'aoai-creds',
    icon: '🔒',
    status: 'ok',
    y: 230,
    subtitle: 'Azure OpenAI · credential helper',
  },
  {
    id: 'hf',
    kind: 'secret',
    lane: 'memory',
    title: 'hf-token',
    icon: '🔒',
    y: 295,
    subtitle: 'huggingface registry',
  },
];
