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

import React, { useState } from 'react';
import { Canvas } from './canvas/Canvas';
import { DetailDrawer } from './drawer/DetailDrawer';
import { projectHeader } from './fixtures/projectHeader';

const headerStripBigStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

export function TopologyDemoPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        color: '#c8d1e0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", ui-sans-serif, sans-serif',
      }}
    >
      {/* Project header — page-owned only. Headlamp's chrome already provides
          the breadcrumb, cluster context, and route framing. */}
      <div
        style={{ padding: '18px 24px', borderBottom: '1px solid #1a2236', background: '#0d1320' }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, color: '#fff', fontWeight: 600, margin: 0 }}>
            {projectHeader.displayName}
          </h1>
          <span style={{ color: '#5a6478', fontSize: 13 }}>{projectHeader.name}</span>
          <span
            style={{
              padding: '3px 10px',
              background: 'rgba(74,222,128,0.12)',
              color: '#4ade80',
              border: '1px solid rgba(74,222,128,0.3)',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            ● {projectHeader.status}
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#5a6478', marginBottom: 14 }}>
          {projectHeader.description}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 22,
            fontSize: 12,
            color: '#8a93a8',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {projectHeader.bigStats.map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ width: 1, height: 24, background: '#1a2236' }} />}
              <div style={headerStripBigStyle}>
                <div>
                  <strong
                    style={{ color: '#fff', fontSize: 16, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {s.value}
                  </strong>
                  {s.unit && (
                    <span style={{ color: '#5a6478', fontSize: 11, marginLeft: 4 }}>{s.unit}</span>
                  )}
                </div>
                <div
                  style={{
                    color: '#5a6478',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                  }}
                >
                  {s.label}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
        {projectHeader.miniStats.length > 0 && (
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: '#5a6478',
              display: 'flex',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            {projectHeader.miniStats.map((s, i) => (
              <span key={i}>
                {s.icon} {s.text}
              </span>
            ))}
          </div>
        )}
      </div>

      <Canvas selectedId={selectedId} onSelect={setSelectedId} />
      <DetailDrawer openId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
