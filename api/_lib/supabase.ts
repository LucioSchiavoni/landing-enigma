import { env } from './env.js';

type Query = Record<string, string>;

const call = async (path: string, init: RequestInit & { query?: Query } = {}) => {
  const { query, ...options } = init;
  const url = new URL(`${env.supabaseUrl}/rest/v1/${path}`);
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: env.serviceKey,
      authorization: `Bearer ${env.serviceKey}`,
      'content-type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

export type Row = {
  slug: string;
  name: string;
  client: string;
  contact_channel: 'whatsapp' | 'email' | 'otro';
  contact_value: string;
  pin_enc: string;
  html: string;
  views: number;
  last_viewed_at: string | null;
  pin_updated_at: string;
  created_at: string;
};

const listColumns = 'slug,name,client,contact_channel,contact_value,pin_enc,views,last_viewed_at,pin_updated_at,created_at';

export const db = {
  list: (): Promise<Omit<Row, 'html'>[]> => call('proposals', { query: { select: listColumns, order: 'created_at.desc' } }),
  find: async (slug: string): Promise<Row | null> => {
    const rows: Row[] = await call('proposals', { query: { select: '*', slug: `eq.${slug}`, limit: '1' } });
    return rows[0] ?? null;
  },
  insert: (row: Partial<Row>) => call('proposals', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify(row) }),
  update: (slug: string, patch: Partial<Row>): Promise<Row[]> =>
    call('proposals', {
      method: 'PATCH',
      query: { slug: `eq.${slug}` },
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    }),
  remove: (slug: string) => call('proposals', { method: 'DELETE', query: { slug: `eq.${slug}` } }),
  allow: (key: string, max: number, windowSeconds: number): Promise<boolean> =>
    call('rpc/hit_rate_limit', { method: 'POST', body: JSON.stringify({ p_key: key, p_max: max, p_window_seconds: windowSeconds }) }),
  view: (slug: string) => call('rpc/register_view', { method: 'POST', body: JSON.stringify({ p_slug: slug }) }),
};
