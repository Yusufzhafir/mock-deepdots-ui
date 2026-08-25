import { describe, expect, it } from 'vitest';
import { defaultFilters, messages } from '../lib/data';
import {
  aggregateMetrics, filterMessages, filtersToQuery, formatCompact, parseFilters,
  safeRate, weightedAverage,
} from '../lib/metrics';

describe('metric calculations', () => {
  it('uses the supplied denominator and safely handles zero', () => {
    expect(safeRate(25, 100)).toBe(25);
    expect(safeRate(25, 0)).toBe(0);
  });

  it('uses CTA exposure as the CTA denominator', () => {
    const result = aggregateMetrics([messages[0]], '30');
    expect(result.ctaRate).toBeCloseTo((messages[0].clicked / messages[0].ctaExposed) * 100);
    expect(result.ctaRate).not.toBeCloseTo((messages[0].clicked / messages[0].opened) * 100);
  });

  it('scales volumes by period without changing rates', () => {
    const sevenDays = aggregateMetrics(messages, '7');
    const thirtyDays = aggregateMetrics(messages, '30');
    expect(sevenDays.delivered).toBeLessThan(thirtyDays.delivered);
    expect(sevenDays.openRate).toBeCloseTo(thirtyDays.openRate, 1);
  });

  it('returns zeroed metrics for an empty slice', () => {
    const result = aggregateMetrics([], '30');
    expect(result.delivered).toBe(0);
    expect(result.openRate).toBe(0);
    expect(result.ctaRate).toBe(0);
  });

  it('calculates weighted diagnostics', () => {
    const result = weightedAverage(messages.slice(0, 2), 'medianReadSeconds');
    expect(result).toBeGreaterThan(34);
    expect(result).toBeLessThan(42);
  });

  it('formats compact values for dashboard display', () => {
    expect(formatCompact(1_200_000)).toMatch(/1\.2M/i);
  });
});

describe('filter parsing and application', () => {
  it('falls back to defaults for unknown query values', () => {
    const filters = parseFilters(new URLSearchParams('period=500&segment=other&type=none&platform=web'));
    expect(filters).toEqual(defaultFilters);
  });

  it('parses supported filters and serializes only non-default values', () => {
    const filters = parseFilters(new URLSearchParams('period=7&segment=new&type=Promotion&platform=iOS'));
    expect(filters).toEqual({ period:'7', segment:'new', messageType:'Promotion', platform:'iOS' });
    expect(filtersToQuery(filters)).toBe('period=7&segment=new&type=Promotion&platform=iOS');
  });

  it('filters campaigns across every global dimension', () => {
    const filtered = filterMessages(messages, { period:'30', segment:'new', messageType:'Promotion', platform:'iOS' });
    expect(filtered.map((record) => record.id)).toEqual(['career-fair']);
  });
});
