#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const CONFIG = {
  "name": "mcp-opendatasoft-universal",
  "prefix": "opendatasoft_universal",
  "description": "Universal MCP server for querying any OpenDataSoft Explore v2.1 portal.",
  "sources": [
    {
      "title": "OpenDataSoft Explore API v2.1",
      "url": "https://help.opendatasoft.com/apis/ods-explore-v2/"
    },
    {
      "title": "data.regionreunion.com example portal",
      "url": "https://data.regionreunion.com/"
    },
    {
      "title": "data.education.gouv.fr example portal",
      "url": "https://data.education.gouv.fr/"
    },
    {
      "title": "ODRE example portal",
      "url": "https://odre.opendatasoft.com/"
    }
  ]
} as const;

interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

function jsonResult(data: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function errorResult(message: string): ToolResult {
  const data = { error: message };
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
    isError: true,
  };
}

function textFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json,*/*',
      'User-Agent': `${CONFIG.name}/0.1 (+https://github.com/Hug0x0/${CONFIG.name})`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,text/plain,application/xml,*/*',
      'User-Agent': `${CONFIG.name}/0.1 (+https://github.com/Hug0x0/${CONFIG.name})`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.text();
}

function dataGouvDatasetSummary(dataset: Record<string, unknown>) {
  return {
    id: dataset.id,
    slug: dataset.slug,
    title: dataset.title,
    page: dataset.page,
    organization: dataset.organization && typeof dataset.organization === 'object'
      ? (dataset.organization as Record<string, unknown>).name
      : undefined,
    resources_count: Array.isArray(dataset.resources) ? dataset.resources.length : undefined,
  };
}

async function searchDataGouv(query: string, pageSize: number) {
  const url = new URL('https://www.data.gouv.fr/api/1/datasets/');
  url.searchParams.set('q', query);
  url.searchParams.set('page_size', String(pageSize));
  const data = await fetchJson<{ data?: Array<Record<string, unknown>>; total?: number }>(url.toString());
  return {
    query,
    total: data.total,
    datasets: (data.data ?? []).map(dataGouvDatasetSummary),
  };
}

function normalizePortalUrl(portalUrl: string): string {
  return portalUrl.replace(/\/$/, '');
}

async function odsRecords(portalUrl: string, dataset: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${normalizePortalUrl(portalUrl)}/api/explore/v2.1/catalog/datasets/${encodeURIComponent(dataset)}/records`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  return fetchJson<Record<string, unknown>>(url.toString());
}

const server = new McpServer({ name: CONFIG.name, version: '0.1.0' });

server.tool(
  `${CONFIG.prefix}_get_sources`,
  'List curated sources used by this MCP.',
  {},
  async () => jsonResult({ server: CONFIG.name, description: CONFIG.description, sources: CONFIG.sources })
);

server.tool(
  `${CONFIG.prefix}_fetch_source_excerpt`,
  'Fetch a short text excerpt from a curated source by index or title keyword.',
  {
    source_key: z.string().describe('Source index, title keyword, or URL fragment.'),
    max_chars: z.number().int().min(200).max(4000).default(1200),
  },
  async ({ source_key, max_chars }) => {
    const normalized = source_key.toLowerCase();
    const source = CONFIG.sources.find((item, index) =>
      String(index + 1) === normalized ||
      item.title.toLowerCase().includes(normalized) ||
      item.url.toLowerCase().includes(normalized)
    );
    if (!source) return errorResult(`Unknown source: ${source_key}`);
    try {
      const text = await fetchText(source.url);
      return jsonResult({ source, excerpt: textFromHtml(text).slice(0, max_chars) });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to fetch source excerpt');
    }
  }
);


server.tool('opendatasoft_universal_search_catalog', 'Search any OpenDataSoft Explore v2.1 catalog.', {
  portal_url: z.string().url().describe('Portal base URL, e.g. https://data.education.gouv.fr'),
  query: z.string().describe('Search query.'),
  limit: z.number().int().min(1).max(100).default(10),
}, async ({ portal_url, query, limit }) => {
  try {
    const url = new URL(`${normalizePortalUrl(portal_url)}/api/explore/v2.1/catalog/datasets`);
    url.searchParams.set('where', `search('${query.replace(/'/g, "''")}')`);
    url.searchParams.set('limit', String(limit));
    return jsonResult({ portal_url, query, result: await fetchJson<Record<string, unknown>>(url.toString()) });
  } catch (error) { return errorResult(error instanceof Error ? error.message : 'Failed to search OpenDataSoft catalog'); }
});

server.tool('opendatasoft_universal_inspect_dataset', 'Inspect one dataset schema on any OpenDataSoft Explore v2.1 portal.', {
  portal_url: z.string().url(),
  dataset: z.string(),
}, async ({ portal_url, dataset }) => {
  try {
    const url = new URL(`${normalizePortalUrl(portal_url)}/api/explore/v2.1/catalog/datasets`);
    url.searchParams.set('where', `dataset_id = '${dataset.replace(/'/g, "''")}'`);
    url.searchParams.set('limit', '1');
    return jsonResult({ portal_url, dataset, result: await fetchJson<Record<string, unknown>>(url.toString()) });
  } catch (error) { return errorResult(error instanceof Error ? error.message : 'Failed to inspect dataset'); }
});

server.tool('opendatasoft_universal_query_records', 'Query records from any OpenDataSoft Explore v2.1 dataset.', {
  portal_url: z.string().url(),
  dataset: z.string(),
  where: z.string().optional(),
  select: z.string().optional(),
  order_by: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(10),
}, async ({ portal_url, dataset, where, select, order_by, limit }) => {
  try { return jsonResult({ portal_url, dataset, result: await odsRecords(portal_url, dataset, { where, select, order_by, limit }) }); }
  catch (error) { return errorResult(error instanceof Error ? error.message : 'Failed to query records'); }
});


async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
  console.error(`${CONFIG.name} running on stdio`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
