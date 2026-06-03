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

import React from 'react';
import { DemoNode, NodeChip } from '../fixtures/types';
import { demo } from '../styles/theme';
import { GpuBar } from './GpuBar';
import { Sparkline } from './Sparkline';

interface Props {
  node: DemoNode;
  selected: boolean;
  onClick: (id: string) => void;
  // Refs registered with the parent so EdgeLayer can compute edge endpoints.
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  // Inset from the lane's left/right edges. Node fills the lane horizontally
  // with this much padding on each side.
  inset?: number;
}

// Visual variant -> border/glow color.
//
// Visual hierarchy decisions, deliberate:
//
// - The agent node is the story of this Project; the topology is meant to
//   read 'agent fans out to N models'. So the agent gets full glow + larger
//   size and is the only purple element on the canvas.
//
// - GPU nodes carry orange glow ONLY when they are saturated (status
//   'warn' or 'err'). A healthy GPU node renders with the standard
//   border, no glow. This makes the bge-embeddings amber the one
//   color event on the canvas — eye goes straight to it without
//   needing decorative glow on healthy nodes to compete.
function kindStyles(node: DemoNode, selected: boolean) {
  const isSaturatedGpu = node.kind === 'gpu' && (node.status === 'warn' || node.status === 'err');

  if (isSaturatedGpu) {
    const accent = node.status === 'err' ? demo.status.err : demo.status.warn;
    return {
      borderColor: selected ? accent : `${accent}88`,
      boxShadow: selected
        ? `0 0 0 2px ${accent}55, 0 0 22px ${accent}55`
        : `0 0 18px ${accent}30, 0 2px 8px rgba(0,0,0,0.3)`,
    };
  }
  if (node.kind === 'agent') {
    return {
      borderColor: selected ? '#c4b5fd' : demo.agentBorder,
      boxShadow: selected
        ? `0 0 0 2px rgba(196,181,253,0.4), ${demo.agentGlow}`
        : `${demo.agentGlow}, 0 2px 8px rgba(0,0,0,0.3)`,
    };
  }
  // Everything else, including healthy GPU nodes: clean border, no glow.
  return {
    borderColor: selected ? '#7aa2ea' : demo.nodeBorder,
    boxShadow: selected
      ? '0 0 0 2px rgba(122,162,234,0.35), 0 4px 16px rgba(122,162,234,0.4)'
      : '0 2px 8px rgba(0,0,0,0.3)',
  };
}

function iconColor(kind: DemoNode['kind']) {
  switch (kind) {
    case 'gpu':
      return demo.gpuAccent;
    case 'agent':
      return demo.agentAccent;
    case 'secret':
      return demo.secretAccent;
    case 'storage':
      return demo.storageAccent;
    default:
      return '#7aa2ea';
  }
}

function Chip({ chip }: { chip: NodeChip }) {
  const palette =
    chip.variant === 'gpu'
      ? { bg: 'rgba(234,162,122,0.15)', fg: '#f5a06b', bd: 'rgba(234,162,122,0.25)' }
      : chip.variant === 'engine'
      ? { bg: 'rgba(94,168,160,0.15)', fg: '#6ec5ba', bd: 'rgba(94,168,160,0.25)' }
      : chip.variant === 'warn'
      ? { bg: 'transparent', fg: '#fbbf24', bd: '#fbbf24' }
      : { bg: 'rgba(74,127,193,0.15)', fg: '#9ab6e0', bd: 'rgba(74,127,193,0.2)' };
  return (
    <span
      style={{
        padding: '1px 5px',
        borderRadius: 3,
        fontSize: 9,
        fontWeight: 600,
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.bd}`,
      }}
    >
      {chip.label}
    </span>
  );
}

function StatusDot({ status }: { status?: 'ok' | 'warn' | 'err' }) {
  if (!status) return null;
  const c = demo.status[status];
  return (
    <span
      aria-label={`status ${status}`}
      style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        display: 'inline-block',
        marginLeft: 'auto',
        background: c,
        boxShadow: `0 0 6px ${c}`,
      }}
    />
  );
}

export function Node({ node, selected, onClick, registerRef, inset = 8 }: Props) {
  const kindStyle = kindStyles(node, selected);
  return (
    <div
      ref={el => registerRef(node.id, el)}
      data-node={node.id}
      onClick={() => onClick(node.id)}
      role="button"
      tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick(node.id)}
      style={{
        position: 'absolute',
        left: inset,
        right: inset,
        top: node.y,
        background: demo.nodeBg,
        backdropFilter: 'blur(8px)',
        border: `1px solid ${kindStyle.borderColor}`,
        borderRadius: 6,
        padding: node.kind === 'agent' ? '12px 14px' : '9px 11px',
        boxShadow: kindStyle.boxShadow,
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
        zIndex: selected ? 5 : 2,
      }}
    >
      {node.kind === 'agent' && (
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: demo.agentAccent,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          Agent
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: node.kind === 'agent' ? 14 : 12,
          color: demo.nodeText,
          fontWeight: 600,
        }}
      >
        <span style={{ color: iconColor(node.kind), fontSize: 11 }}>{node.icon}</span>
        <span>{node.title}</span>
        <StatusDot status={node.status} />
      </div>

      {(node.subtitle || node.chips) && (
        <div
          style={{
            marginTop: 5,
            fontSize: 10,
            color: demo.nodeSubText,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexWrap: 'wrap',
          }}
        >
          {node.chips?.map((c, i) => (
            <Chip key={i} chip={c} />
          ))}
          {node.subtitle && <span>{node.subtitle}</span>}
        </div>
      )}

      {node.faceMetrics && (
        <div style={{ marginTop: 8, paddingTop: 7, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {node.faceMetrics.map((m, i) => {
            const deltaWarn = m.delta?.startsWith('!');
            const deltaDown = m.delta?.startsWith('−') || m.delta?.startsWith('-');
            const deltaText = m.delta?.replace(/^!/, '');
            const deltaColor = deltaWarn ? '#fbbf24' : deltaDown ? '#ef4444' : '#4ade80';
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 10,
                  color: demo.nodeSubText,
                  marginBottom: 3,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <span style={{ minWidth: 48 }}>{m.label}</span>
                <span
                  style={{
                    color: demo.nodeText,
                    fontWeight: 600,
                    minWidth: 56,
                    textAlign: 'right',
                  }}
                >
                  {m.value}
                </span>
                <Sparkline points={m.sparkPoints} color={m.color} />
                {m.delta && <span style={{ fontSize: 9, color: deltaColor }}>{deltaText}</span>}
              </div>
            );
          })}
        </div>
      )}

      {node.inlineBars?.map((b, i) => (
        <GpuBar key={i} label={b.label} pct={b.pct} gradient={b.gradient} />
      ))}
    </div>
  );
}
