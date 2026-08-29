const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseWarningData,
  parseRadarTimes,
  fetchWeatherAlerts,
  fetchRadarTimes,
  resetWeatherCache,
  setWeatherCacheForTesting,
} = require('../src/state/weather');

describe('Weather State & Parser', () => {
  beforeEach(() => {
    resetWeatherCache();
  });

  describe('parseWarningData', () => {
    it('correctly extracts warnings and advisories for Koto-ku (1310800)', () => {
      const mockJma = {
        reportDatetime: '2026-08-29T10:00:00+09:00',
        publishingOffice: '気象庁',
        headlineText: '東京都では、急な強い雨や落雷に注意してください。',
        areaTypes: [
          {
            areas: [
              {
                code: '1310800',
                warnings: [
                  { code: '03', status: '継続' }, // 大雨警報
                  { code: '14', status: '発表' }, // 雷注意報
                  { code: '20', status: '解除' }, // 解除は除外されるべき
                ],
              },
              {
                code: '1310100', // 千代田区
                warnings: [{ code: '14', status: '継続' }],
              },
            ],
          },
        ],
      };

      const parsed = parseWarningData(mockJma);
      assert.equal(parsed.area, '江東区');
      assert.equal(parsed.areaCode, '1310800');
      assert.equal(parsed.hasWarning, true);
      assert.equal(parsed.hasAdvisory, true);
      assert.equal(parsed.hasSpecial, false);
      assert.equal(parsed.alerts.length, 2);
      assert.deepEqual(parsed.alerts[0], {
        code: '03',
        name: '大雨警報',
        level: 'warning',
        status: '継続',
      });
      assert.deepEqual(parsed.alerts[1], {
        code: '14',
        name: '雷注意報',
        level: 'advisory',
        status: '発表',
      });
    });

    it('handles special warnings correctly', () => {
      const mockJma = {
        areaTypes: [
          {
            areas: [
              {
                code: '1310800',
                warnings: [{ code: '33', status: '発表' }], // 大雨特別警報
              },
            ],
          },
        ],
      };

      const parsed = parseWarningData(mockJma);
      assert.equal(parsed.hasSpecial, true);
      assert.equal(parsed.hasWarning, false);
      assert.equal(parsed.alerts[0].level, 'special');
      assert.equal(parsed.alerts[0].name, '大雨特別警報');
    });

    it('returns empty alerts when no warnings are active or status is "発表警報・注意報はなし"', () => {
      const mockJma = {
        areaTypes: [
          {
            areas: [
              {
                code: '1310800',
                warnings: [{ status: '発表警報・注意報はなし' }],
              },
            ],
          },
        ],
      };

      const parsed = parseWarningData(mockJma);
      assert.equal(parsed.alerts.length, 0);
      assert.equal(parsed.hasWarning, false);
      assert.equal(parsed.hasSpecial, false);
      assert.equal(parsed.hasAdvisory, false);
    });

    it('handles missing or malformed JMA data gracefully', () => {
      assert.equal(parseWarningData(null).alerts.length, 0);
      assert.equal(parseWarningData({}).alerts.length, 0);
      assert.equal(parseWarningData({ areaTypes: [] }).alerts.length, 0);
    });
  });

  describe('parseRadarTimes', () => {
    it('merges N1 and N2, sorts chronologically, and sets current and offset labels', () => {
      const n1 = [
        { basetime: '20260829043000', validtime: '20260829043000' }, // 現在
        { basetime: '20260829043000', validtime: '20260829042500' }, // 5分前
        { basetime: '20260829043000', validtime: '20260829042000' }, // 10分前
      ];
      const n2 = [
        { basetime: '20260829043000', validtime: '20260829044000' }, // 10分後
        { basetime: '20260829043000', validtime: '20260829043500' }, // 5分後
      ];

      const result = parseRadarTimes(n1, n2);
      assert.equal(result.latestBasetime, '20260829043000');
      assert.equal(result.currentValidtime, '20260829043000');
      assert.equal(result.times.length, 5);

      // 昇順にソートされ、JST時刻（+9時間）に変換されていること
      assert.equal(result.times[0].validtime, '20260829042000');
      assert.equal(result.times[0].offsetMinutes, -10);
      assert.equal(result.times[0].isCurrent, false);
      assert.equal(result.times[0].isForecast, false);
      assert.equal(result.times[0].displayLabel, '13:20');

      assert.equal(result.times[2].validtime, '20260829043000');
      assert.equal(result.times[2].offsetMinutes, 0);
      assert.equal(result.times[2].isCurrent, true);
      assert.equal(result.times[2].displayLabel, '13:30');

      assert.equal(result.times[4].validtime, '20260829044000');
      assert.equal(result.times[4].offsetMinutes, 10);
      assert.equal(result.times[4].isForecast, true);
      assert.equal(result.times[4].displayLabel, '13:40');
    });

    it('handles empty inputs gracefully', () => {
      const result = parseRadarTimes([], []);
      assert.equal(result.times.length, 0);
      assert.equal(result.latestBasetime, null);
    });
  });

  describe('fetchWeatherAlerts with cache and fallback', () => {
    it('caches successful API responses within TTL', async () => {
      let callCount = 0;
      const mockFetch = async () => {
        callCount++;
        return {
          ok: true,
          json: async () => ({
            reportDatetime: '2026-08-29T10:00:00+09:00',
            areaTypes: [
              {
                areas: [{ code: '1310800', warnings: [{ code: '14', status: '発表' }] }],
              },
            ],
          }),
        };
      };

      const res1 = await fetchWeatherAlerts({ fetchFn: mockFetch });
      assert.equal(callCount, 1);
      assert.equal(res1.cached, false);
      assert.equal(res1.alerts.length, 1);

      // 2回目の呼び出しはキャッシュから返る
      const res2 = await fetchWeatherAlerts({ fetchFn: mockFetch });
      assert.equal(callCount, 1);
      assert.equal(res2.cached, true);
      assert.equal(res2.alerts.length, 1);

      // forceRefresh = true で再取得
      const res3 = await fetchWeatherAlerts({ fetchFn: mockFetch, forceRefresh: true });
      assert.equal(callCount, 2);
      assert.equal(res3.cached, false);
    });

    it('falls back to previous cache when external API fails', async () => {
      setWeatherCacheForTesting(
        {
          area: '江東区',
          areaCode: '1310800',
          alerts: [{ code: '14', name: '雷注意報', level: 'advisory' }],
          hasWarning: false,
          hasSpecial: false,
          hasAdvisory: true,
        },
        null
      );

      const failingFetch = async () => {
        throw new Error('Network timeout');
      };

      const res = await fetchWeatherAlerts({ fetchFn: failingFetch, forceRefresh: true });
      assert.equal(res.fallback, true);
      assert.equal(res.alerts.length, 1);
      assert.equal(res.alerts[0].name, '雷注意報');
    });

    it('returns empty alert fallback when API fails and no cache exists', async () => {
      resetWeatherCache();
      const failingFetch = async () => {
        throw new Error('JMA offline');
      };

      const res = await fetchWeatherAlerts({ fetchFn: failingFetch, forceRefresh: true });
      assert.equal(res.fallback, true);
      assert.equal(res.alerts.length, 0);
      assert.equal(res.area, '江東区');
    });
  });

  describe('fetchRadarTimes with cache and fallback', () => {
    it('fetches and caches radar times', async () => {
      let callCount = 0;
      const mockFetch = async (url) => {
        callCount++;
        if (url.includes('targetTimes_N1')) {
          return {
            ok: true,
            json: async () => [{ basetime: '20260829043000', validtime: '20260829043000' }],
          };
        }
        return {
          ok: true,
          json: async () => [{ basetime: '20260829043000', validtime: '20260829043500' }],
        };
      };

      const res1 = await fetchRadarTimes({ fetchFn: mockFetch });
      assert.equal(callCount, 2);
      assert.equal(res1.cached, false);
      assert.equal(res1.times.length, 2);

      // キャッシュ利用
      const res2 = await fetchRadarTimes({ fetchFn: mockFetch });
      assert.equal(callCount, 2);
      assert.equal(res2.cached, true);
    });
  });
});
