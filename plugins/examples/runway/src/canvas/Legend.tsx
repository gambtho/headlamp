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

// Typographic key strip. No background, no border — it's a caption, not a
// card. Prior version rendered as a rounded blue-dark card that read as an
// action button bottom-left, which is exactly the role this UI does NOT
// have. Now it sits as a single muted row aligned with the page padding.
const item: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  whiteSpace: 'nowrap',
};

const swatchStyle: React.CSSProperties = { width: 18, borderRadius: 1 };

export function Legend() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        padding: '14px 24px 4px',
        fontSize: 10,
        color: '#5a6478',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        fontWeight: 600,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ color: '#3f4759', fontWeight: 700, letterSpacing: '1.5px' }}>edge kinds</span>
      <span style={item}>
        <span style={{ ...swatchStyle, height: 2, background: '#7aa2ea' }} />
        routes / selects / calls
      </span>
      <span style={item}>
        <span style={{ ...swatchStyle, height: 1, borderTop: '1px dashed #7aa2ea' }} />
        owns
      </span>
      <span style={item}>
        <span style={{ ...swatchStyle, height: 1, borderTop: '1px dashed #6ec5ba' }} />
        mounts
      </span>
      <span style={item}>
        <span style={{ ...swatchStyle, height: 1, borderTop: '1px dotted #b89bd9' }} />
        references
      </span>
    </div>
  );
}
