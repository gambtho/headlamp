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

import React, { useCallback, useRef } from 'react';
import { edges } from '../fixtures/edges';
import { nodes } from '../fixtures/nodes';
import { demo } from '../styles/theme';
import { EdgeLayer } from './EdgeLayer';
import { Legend } from './Legend';
import { Node } from './Node';

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// True responsive layout. Four lanes form a CSS grid that fills the
// available width. Each lane is a position:relative column; nodes inside
// a lane render as position:absolute children, anchored top:y and stretched
// left:0/right:0 to fill the lane's natural column width. No hard pixel
// positions; the topology breathes with the container.
//
// Lane widths are weighted: the Models lane is widest (3 GPU rows with
// face metrics), Agent is medium (single but visually dominant), Ingress
// and Memory are narrower.
const LANE_GRID = '1fr 1.4fr 1.8fr 1.2fr';
const CANVAS_MIN_WIDTH = 880;
const CANVAS_HEIGHT = 560;
const LANE_GAP = 18;
const NODE_INSET = 8;

const laneOrder: Array<{
  id: 'ingress' | 'agent' | 'models' | 'memory';
  label: string;
}> = [
  { id: 'ingress', label: 'Ingress' },
  { id: 'agent', label: 'Agent' },
  { id: 'models', label: 'Models · live' },
  { id: 'memory', label: 'Memory · Secrets' },
];

export function Canvas({ selectedId, onSelect }: Props) {
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const canvasRef = useRef<HTMLDivElement>(null);

  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) nodeRefs.current.set(id, el);
    else nodeRefs.current.delete(id);
  }, []);

  return (
    <div
      style={{
        padding: '8px 24px 24px',
        overflowX: 'auto',
        overflowY: 'visible',
        position: 'relative',
        background: demo.canvasBg,
      }}
    >
      <Legend />
      <div
        ref={canvasRef}
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: LANE_GRID,
          columnGap: LANE_GAP,
          width: '100%',
          minWidth: CANVAS_MIN_WIDTH,
          minHeight: CANVAS_HEIGHT,
        }}
      >
        {laneOrder.map(lane => (
          <div
            key={lane.id}
            style={{
              position: 'relative',
              minHeight: CANVAS_HEIGHT,
              borderRadius: 8,
              background: demo.laneBg,
              border: demo.laneBorder,
              paddingTop: 36,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 12,
                fontSize: 10,
                color: demo.laneLabel,
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                fontWeight: 700,
              }}
            >
              {lane.label}
            </div>
            {nodes
              .filter(n => n.lane === lane.id)
              .map(n => (
                <Node
                  key={n.id}
                  node={n}
                  selected={selectedId === n.id}
                  onClick={onSelect}
                  registerRef={registerRef}
                  inset={NODE_INSET}
                />
              ))}
          </div>
        ))}

        <EdgeLayer edges={edges} nodeRefs={nodeRefs} canvasRef={canvasRef} />
      </div>
    </div>
  );
}
