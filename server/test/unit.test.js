import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFilters, toMatch, cacheKey, autoGranularity } from '../src/filters.js';
import { Cache } from '../src/cache.js';
import { buildInsights } from '../src/analytics.js';

test('parseFilters ignores malformed dates and splits multi-values', () => {
  const f = parseFilters({ from: 'nope', to: '2025-12-31', outlets: 'HSR Layout|MG Road', groups: '' });
  assert.equal(f.from, null);
  assert.equal(f.to, '2025-12-31');
  assert.deepEqual(f.outlets, ['HSR Layout', 'MG Road']);
  assert.deepEqual(f.groups, []);
});

test('toMatch makes the end date inclusive', () => {
  const m = toMatch(parseFilters({ from: '2025-07-01', to: '2025-07-31', orderTypes: 'Delivery' }));
  assert.equal(m.ts.$gte.toISOString(), '2025-07-01T00:00:00.000Z');
  assert.equal(m.ts.$lt.toISOString(), '2025-08-01T00:00:00.000Z');
  assert.deepEqual(m.orderType, { $in: ['Delivery'] });
});

test('toMatch is empty with no filters (user input never becomes raw operators)', () => {
  assert.deepEqual(toMatch(parseFilters({})), {});
  assert.deepEqual(toMatch(parseFilters({ outlets: '{"$ne":null}' })).outlet, { $in: ['{"$ne":null}'] });
});

test('cacheKey is order independent', () => {
  const a = cacheKey('d', parseFilters({ outlets: 'A|B' }), 'day');
  const b = cacheKey('d', parseFilters({ outlets: 'B|A' }), 'day');
  assert.equal(a, b);
});

test('autoGranularity scales with range', () => {
  const min = Date.parse('2025-01-01');
  const max = Date.parse('2026-01-01');
  assert.equal(autoGranularity(parseFilters({ from: '2025-12-01' }), min, max), 'day');
  assert.equal(autoGranularity(parseFilters({ from: '2025-08-01' }), min, max), 'week');
  assert.equal(autoGranularity(parseFilters({}), min, max), 'month');
});

test('Cache de-duplicates concurrent loads and serves hits', async () => {
  const c = new Cache();
  let calls = 0;
  const load = async () => { calls++; return 42; };
  const [a, b] = await Promise.all([c.wrap('k', load), c.wrap('k', load)]);
  assert.equal(a.value + b.value, 84);
  assert.equal(calls, 1);
  assert.equal((await c.wrap('k', load)).cached, true);
});

test('buildInsights returns nothing for empty results', () => {
  assert.deepEqual(buildInsights({ kpis: { orders: 0, revenue: 0 } }), []);
});
