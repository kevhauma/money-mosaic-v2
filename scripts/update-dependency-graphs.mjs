#!/usr/bin/env node
// Regenerates reports/dependency-graph.html (simple: features collapsed to one
// node each, core/shared expanded one folder deep) and docs/dependency-graph.md
// (deep: same tiers expanded three folders further). Run by .husky/pre-commit
// whenever staged changes touch src/app or .dependency-cruiser.cjs.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEPCRUISE_BIN = path.join(
  ROOT,
  'node_modules',
  'dependency-cruiser',
  'bin',
  'dependency-cruise.mjs',
);

const SIMPLE_COLLAPSE = '^src/app/(?:core|shared)/[^/]+|^src/app/[^/]+';
const DEEP_COLLAPSE = [
  '^src/app/(?:core|shared)/[^/]+/[^/]+/[^/]+/[^/]+',
  '^src/app/(?:core|shared)/[^/]+/[^/]+/[^/]+',
  '^src/app/(?:core|shared)/[^/]+/[^/]+',
  '^src/app/(?:core|shared)/[^/]+',
  '^src/app/[^/]+/[^/]+/[^/]+/[^/]+',
  '^src/app/[^/]+/[^/]+/[^/]+',
  '^src/app/[^/]+/[^/]+',
  '^src/app/[^/]+',
].join('|');

function runDepcruise(collapse) {
  return execFileSync(
    process.execPath,
    [
      DEPCRUISE_BIN,
      'src/app',
      '--config',
      '.dependency-cruiser.cjs',
      '--collapse',
      collapse,
      '--output-type',
      'mermaid',
      '--output-to',
      '-',
    ],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
}

// -- minimal mermaid flowchart parser (subgraphs/leaves/edges only) --

function parseMermaid(source) {
  const root = { id: null, label: null, children: [] };
  const stack = [root];
  const edges = [];
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (!line || line === 'flowchart LR') continue;
    const subgraphMatch = line.match(/^subgraph (\S+)\["(.*)"\]$/);
    if (subgraphMatch) {
      const node = { id: subgraphMatch[1], label: subgraphMatch[2], children: [] };
      stack[stack.length - 1].children.push(node);
      stack.push(node);
      continue;
    }
    if (line === 'end') {
      stack.pop();
      continue;
    }
    const edgeMatch = line.match(/^(\S+)-->(\S+)$/);
    if (edgeMatch) {
      edges.push({ from: edgeMatch[1], to: edgeMatch[2] });
      continue;
    }
    const leafMatch = line.match(/^(\S+)\["(.*)"\]$/);
    if (leafMatch) {
      stack[stack.length - 1].children.push({ id: leafMatch[1], label: leafMatch[2] });
    }
  }
  return { root, edges };
}

function collectLeafIds(node, out = []) {
  if (!node.children) {
    out.push(node.id);
    return out;
  }
  for (const child of node.children) collectLeafIds(child, out);
  return out;
}

function serializeNode(node) {
  if (!node.children) return `${node.id}["${node.label}"]`;
  return [`subgraph ${node.id}["${node.label}"]`, ...node.children.map(serializeNode), 'end'].join(
    '\n',
  );
}

function findApp(root) {
  const src = root.children.find((c) => c.label === 'src');
  return src.children.find((c) => c.label === 'app');
}

// -- simple graph: group features into a synthetic subgraph + color by tier --

function buildSimpleGraph() {
  const raw = runDepcruise(SIMPLE_COLLAPSE);
  const { root, edges } = parseMermaid(raw);
  const src = root.children.find((c) => c.label === 'src');
  const app = findApp(root);

  const core = app.children.find((c) => c.label === 'core' && c.children);
  const shared = app.children.find((c) => c.label === 'shared' && c.children);
  const features = app.children.filter((c) => c !== core && c !== shared);
  const featureGroup = { id: 'FEAT', label: 'features', children: features };
  app.children = [core, featureGroup, shared];

  const coreIds = collectLeafIds(core);
  const sharedIds = collectLeafIds(shared);
  const featureIds = collectLeafIds(featureGroup);

  const mermaid = [
    'flowchart LR',
    '',
    serializeNode(src),
    ...edges.map((e) => `${e.from}-->${e.to}`),
    '',
    'classDef core fill:#E4F3F1,stroke:#2C7A73,color:#173F3B,stroke-width:1.5px;',
    'classDef shared fill:#EFEBFA,stroke:#6C5B9E,color:#332B54,stroke-width:1.5px;',
    'classDef feature fill:#FBEADC,stroke:#C2703A,color:#5C3111,stroke-width:1.5px;',
    `class ${coreIds.join(',')} core`,
    `class ${sharedIds.join(',')} shared`,
    `class ${featureIds.join(',')} feature`,
    `style ${core.id} fill:#F5FBFA,stroke:#2C7A73,stroke-width:1px`,
    `style ${shared.id} fill:#F8F6FC,stroke:#6C5B9E,stroke-width:1px`,
    'style FEAT fill:#FDF6F0,stroke:#C2703A,stroke-width:1px',
  ].join('\n');

  return {
    mermaid,
    raw: raw.trim(),
    stats: {
      nodes: coreIds.length + sharedIds.length + featureIds.length,
      edges: edges.length,
      features: featureIds.length,
      core: coreIds.length,
      shared: sharedIds.length,
    },
  };
}

// -- deep graph: raw output, just counted --

function buildDeepGraph() {
  const raw = runDepcruise(DEEP_COLLAPSE);
  const { root, edges } = parseMermaid(raw);
  const mermaid = raw.trim();
  return {
    mermaid,
    stats: {
      nodes: collectLeafIds(root).length,
      edges: edges.length,
    },
  };
}

// -- file injection --

function replaceBetween(text, startMarker, endMarker, content) {
  const pattern = new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`);
  if (!pattern.test(text)) {
    throw new Error(`markers not found: ${startMarker} ... ${endMarker}`);
  }
  return text.replace(pattern, `${startMarker}\n${content}\n${endMarker}`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updateHtml(simple) {
  const filePath = path.join(ROOT, 'reports', 'dependency-graph.html');
  let html = readFileSync(filePath, 'utf8');

  html = html.replace(
    /<pre class="mermaid">\n[\s\S]*?\n<\/pre>/,
    `<pre class="mermaid">\n${simple.mermaid}\n</pre>`,
  );

  const stats = [
    `      <div class="stat"><span class="value">${simple.stats.nodes}</span><span class="label">Nodes</span></div>`,
    `      <div class="stat"><span class="value">${simple.stats.edges}</span><span class="label">Edges</span></div>`,
    `      <div class="stat"><span class="value">${simple.stats.features}</span><span class="label">Features</span></div>`,
    `      <div class="stat"><span class="value">${simple.stats.core}</span><span class="label">Core modules</span></div>`,
    `      <div class="stat"><span class="value">${simple.stats.shared}</span><span class="label">Shared modules</span></div>`,
  ].join('\n');
  html = replaceBetween(
    html,
    '      <!-- GENERATED:STATS:START -->',
    '      <!-- GENERATED:STATS:END -->',
    stats,
  );

  writeFileSync(filePath, html);
}

function updateDocs(deep) {
  const filePath = path.join(ROOT, 'docs', 'dependency-graph.md');
  let md = readFileSync(filePath, 'utf8');

  md = md.replace(/```mermaid\n[\s\S]*?\n```/, `\`\`\`mermaid\n${deep.mermaid}\n\`\`\``);
  md = replaceBetween(
    md,
    '<!-- GENERATED:STATS:START -->',
    '<!-- GENERATED:STATS:END -->',
    `- ${deep.stats.nodes} leaf nodes, ${deep.stats.edges} edges.`,
  );

  writeFileSync(filePath, md);
}

function main() {
  const simple = buildSimpleGraph();
  updateHtml(simple);
  writeFileSync(path.join(ROOT, 'reports', 'dependency-graph.mmd'), `${simple.raw}\n`);

  const deep = buildDeepGraph();
  updateDocs(deep);
  writeFileSync(path.join(ROOT, 'reports', 'dependency-graph-deep.mmd'), `${deep.mermaid}\n`);
}

main();
