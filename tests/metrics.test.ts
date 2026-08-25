import { describe, expect, it } from 'vitest';
import { defaultFilters, messages, messageTimings } from '../lib/data';
import {
  aggregateMetrics, filterMessages, filtersToQuery, formatCompact, getMessageById,
  parseFilters, safeRate, topMessagesByEngagement, weightedAverage,
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

  it('uses unique opens over delivered for engagement', () => {
    const result = aggregateMetrics([messages[0]], '30');
    expect(result.engagementRate).toBeCloseTo((messages[0].opened/messages[0].delivered)*100);
  });

  it('uses opens only from CTA-bearing messages for CTA conversion', () => {
    const ctaMessage=messages.find((message)=>message.hasCTA)!;
    const noCtaMessage=messages.find((message)=>!message.hasCTA)!;
    const result=aggregateMetrics([ctaMessage,noCtaMessage],'30');
    expect(result.ctaEligibleOpened).toBe(ctaMessage.opened);
    expect(result.ctaConversionFromOpens).toBeCloseTo((ctaMessage.clicked/ctaMessage.opened)*100);
  });

  it('returns zero CTA conversion when there is no eligible denominator', () => {
    const result=aggregateMetrics(messages.filter((message)=>!message.hasCTA),'30');
    expect(result.ctaEligibleOpened).toBe(0);
    expect(result.ctaConversionFromOpens).toBe(0);
  });

  it('ranks the top five messages strictly by engagement rate', () => {
    const ranked=topMessagesByEngagement(messages);
    expect(ranked).toHaveLength(5);
    expect(ranked.map((message)=>safeRate(message.opened,message.delivered)))
      .toEqual([...ranked].map((message)=>safeRate(message.opened,message.delivered)).sort((a,b)=>b-a));
  });

  it('keeps all timing distributions aligned with their source totals', () => {
    for (const message of messages) {
      const timing=messageTimings[message.id];
      expect(timing.hourlyMessageClicks.reduce((sum,bucket)=>sum+bucket.clicks,0)).toBe(message.opened);
      expect(timing.timeToFirstOpen.reduce((sum,bucket)=>sum+bucket.value,0)).toBe(message.delivered);
      expect(timing.deliveredToClick.reduce((sum,bucket)=>sum+bucket.value,0)).toBe(message.opened);
      expect(timing.clickToConvert.reduce((sum,bucket)=>sum+bucket.value,0)).toBe(message.clicked);
    }
  });

  it('returns undefined for an unknown message id', () => {
    expect(getMessageById(messages,'missing-message')).toBeUndefined();
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
