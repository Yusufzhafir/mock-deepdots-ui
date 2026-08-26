import { describe, expect, it } from 'vite-plus/test';
import { defaultFilters, messages, messageTimings } from '../lib/data';
import {
  aggregateMetrics,
  aggregateSendTimeOpenRates,
  aggregateTimingBuckets,
  bestSendTime,
  filterMessages,
  filtersToQuery,
  formatCompact,
  getMessageById,
  isTimingBaseSufficient,
  medianTimingBucket,
  parseFilters,
  safeRate,
  topMessagesByEngagement,
  timingBucketTotal,
  weightedAverage,
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
    expect(result.engagementRate).toBeCloseTo((messages[0].opened / messages[0].delivered) * 100);
  });

  it('uses opens only from CTA-bearing messages for CTA conversion', () => {
    const ctaMessage = messages.find((message) => message.hasCTA)!;
    const noCtaMessage = messages.find((message) => !message.hasCTA)!;
    const result = aggregateMetrics([ctaMessage, noCtaMessage], '30');
    expect(result.ctaEligibleOpened).toBe(ctaMessage.opened);
    expect(result.ctaConversionFromOpens).toBeCloseTo(
      (ctaMessage.clicked / ctaMessage.opened) * 100,
    );
  });

  it('returns zero CTA conversion when there is no eligible denominator', () => {
    const result = aggregateMetrics(
      messages.filter((message) => !message.hasCTA),
      '30',
    );
    expect(result.ctaEligibleOpened).toBe(0);
    expect(result.ctaConversionFromOpens).toBe(0);
  });

  it('ranks the top five messages strictly by engagement rate', () => {
    const ranked = topMessagesByEngagement(messages);
    expect(ranked).toHaveLength(5);
    expect(ranked.map((message) => safeRate(message.opened, message.delivered))).toEqual(
      [...ranked]
        .map((message) => safeRate(message.opened, message.delivered))
        .sort((a, b) => b - a),
    );
  });

  it('keeps all timing distributions aligned with their source totals', () => {
    for (const message of messages) {
      const timing = messageTimings[message.id];
      expect(timing.hourlyOpens.reduce((sum, bucket) => sum + bucket.opens, 0)).toBe(
        message.opened,
      );
      expect(timing.timeToFirstOpen.reduce((sum, bucket) => sum + bucket.value, 0)).toBe(
        message.delivered,
      );
      expect(timingBucketTotal(timing.openToActionClick)).toBe(message.hasCTA ? message.opened : 0);
      expect(timing.openToActionClick.at(-1)?.value).toBe(
        message.hasCTA ? message.opened - message.clicked : 0,
      );
      expect(timing.clickToConvert.reduce((sum, bucket) => sum + bucket.value, 0)).toBe(
        message.clicked,
      );
    }
  });

  it('uses the approved log-spaced timing buckets', () => {
    expect(messageTimings[messages[0].id].timeToFirstOpen.map((bucket) => bucket.label)).toEqual([
      '<1h',
      '1–6h',
      '6–24h',
      '1–7d',
      '1–4w',
      '1–6mo',
      '>6mo',
      'Never',
    ]);
    expect(messageTimings[messages[0].id].openToActionClick.map((bucket) => bucket.label)).toEqual([
      '<10s',
      '10–30s',
      '30–60s',
      '1–5m',
      '5–15m',
      '15–60m',
      '>1h',
      'Never clicked',
    ]);
  });

  it('aggregates timing buckets for the selected message slice and period', () => {
    const filtered = filterMessages(messages, {
      period: '7',
      segment: 'new',
      messageType: 'Promotion',
      platform: 'iOS',
    });
    const sevenDayBuckets = aggregateTimingBuckets(filtered, 'timeToFirstOpen', '7');
    const thirtyDayBuckets = aggregateTimingBuckets(filtered, 'timeToFirstOpen', '30');
    expect(filtered.map((record) => record.id)).toEqual(['career-fair']);
    expect(timingBucketTotal(sevenDayBuckets)).toBeLessThan(timingBucketTotal(thirtyDayBuckets));
    expect(timingBucketTotal(thirtyDayBuckets)).toBe(filtered[0].delivered);
  });

  it('returns approximate median bucket labels from successful recipients', () => {
    expect(
      medianTimingBucket(
        [
          { label: '<1h', value: 25 },
          { label: '1–6h', value: 30 },
          { label: 'Never', value: 45 },
        ],
        'Never',
      ),
    ).toBe('1–6h');
    expect(medianTimingBucket([{ label: 'Never', value: 10 }], 'Never')).toBe('—');
  });

  it('aggregates all day and hour cells with sample weighting', () => {
    const source = messages.slice(0, 2);
    const cells = aggregateSendTimeOpenRates(source);
    expect(cells).toHaveLength(7 * 24);
    const first = cells[0];
    const sourceCells = source.map((message) => messageTimings[message.id].sendTimeOpenRates[0]);
    const expected =
      sourceCells.reduce((sum, cell) => sum + cell.openRate * cell.sampleSize, 0) /
      sourceCells.reduce((sum, cell) => sum + cell.sampleSize, 0);
    expect(first.openRate).toBeCloseTo(expected, 1);
    expect(bestSendTime(cells)?.openRate).toBe(Math.max(...cells.map((cell) => cell.openRate)));
  });

  it('uses only filtered messages when aggregating the send-time heatmap', () => {
    const filtered = filterMessages(messages, {
      period: '30',
      segment: 'new',
      messageType: 'Promotion',
      platform: 'iOS',
    });
    const filteredCells = aggregateSendTimeOpenRates(filtered);
    expect(filtered).toHaveLength(1);
    expect(filteredCells[0]).toEqual(messageTimings[filtered[0].id].sendTimeOpenRates[0]);
    expect(filteredCells[0].openRate).not.toBe(aggregateSendTimeOpenRates(messages)[0].openRate);
  });

  it('keeps CTA-less records out of action timing and suppresses thin bases', () => {
    const noActionMessage = messages.find((message) => !message.hasCTA)!;
    expect(timingBucketTotal(aggregateTimingBuckets([noActionMessage], 'openToActionClick'))).toBe(
      0,
    );
    expect(isTimingBaseSufficient(49)).toBe(false);
    expect(isTimingBaseSufficient(50)).toBe(true);
  });

  it('returns undefined for an unknown message id', () => {
    expect(getMessageById(messages, 'missing-message')).toBeUndefined();
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
    const filters = parseFilters(
      new URLSearchParams('period=500&segment=other&type=none&platform=web'),
    );
    expect(filters).toEqual(defaultFilters);
  });

  it('parses supported filters and serializes only non-default values', () => {
    const filters = parseFilters(
      new URLSearchParams('period=7&segment=new&type=Promotion&platform=iOS'),
    );
    expect(filters).toEqual({
      period: '7',
      segment: 'new',
      messageType: 'Promotion',
      platform: 'iOS',
    });
    expect(filtersToQuery(filters)).toBe('period=7&segment=new&type=Promotion&platform=iOS');
  });

  it('filters campaigns across every global dimension', () => {
    const filtered = filterMessages(messages, {
      period: '30',
      segment: 'new',
      messageType: 'Promotion',
      platform: 'iOS',
    });
    expect(filtered.map((record) => record.id)).toEqual(['career-fair']);
  });
});
