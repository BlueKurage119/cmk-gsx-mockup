const WARNING_CODE_MAP = {
  '02': { name: '暴風雪警報', level: 'warning' },
  '03': { name: '大雨警報', level: 'warning' },
  '04': { name: '洪水警報', level: 'warning' },
  '05': { name: '暴風警報', level: 'warning' },
  '06': { name: '大雪警報', level: 'warning' },
  '07': { name: '波浪警報', level: 'warning' },
  '08': { name: '高潮警報', level: 'warning' },
  '10': { name: '大雨注意報', level: 'advisory' },
  '12': { name: '大雪注意報', level: 'advisory' },
  '13': { name: '風雪注意報', level: 'advisory' },
  '14': { name: '雷注意報', level: 'advisory' },
  '15': { name: '強風注意報', level: 'advisory' },
  '16': { name: '波浪注意報', level: 'advisory' },
  '17': { name: '融雪注意報', level: 'advisory' },
  '18': { name: '洪水注意報', level: 'advisory' },
  '19': { name: '高潮注意報', level: 'advisory' },
  '20': { name: '濃霧注意報', level: 'advisory' },
  '21': { name: '乾燥注意報', level: 'advisory' },
  '22': { name: 'なだれ注意報', level: 'advisory' },
  '23': { name: '低温注意報', level: 'advisory' },
  '24': { name: '霜注意報', level: 'advisory' },
  '25': { name: '着氷注意報', level: 'advisory' },
  '26': { name: '着雪注意報', level: 'advisory' },
  '32': { name: '暴風雪特別警報', level: 'special' },
  '33': { name: '大雨特別警報', level: 'special' },
  '35': { name: '暴風特別警報', level: 'special' },
  '36': { name: '大雪特別警報', level: 'special' },
  '37': { name: '波浪特別警報', level: 'special' },
  '38': { name: '高潮特別警報', level: 'special' },
};

const KOTO_KU_CODE = '1310800';
const CACHE_TTL_MS = 60 * 1000; // 60秒

let alertsCache = null;
let alertsCacheTime = 0;

let radarTimesCache = null;
let radarTimesCacheTime = 0;

function parseTimeString(timeStr) {
  if (!timeStr || timeStr.length !== 14) return null;
  const year = parseInt(timeStr.slice(0, 4), 10);
  const month = parseInt(timeStr.slice(4, 6), 10) - 1;
  const day = parseInt(timeStr.slice(6, 8), 10);
  const hour = parseInt(timeStr.slice(8, 10), 10);
  const min = parseInt(timeStr.slice(10, 12), 10);
  const sec = parseInt(timeStr.slice(12, 14), 10);
  // JST時刻としてパース（UTCオフセット +9時間）
  return new Date(Date.UTC(year, month, day, hour - 9, min, sec));
}

function formatJstDisplayTime(timeStr) {
  if (!timeStr || timeStr.length !== 14) return timeStr;
  const hour = timeStr.slice(8, 10);
  const min = timeStr.slice(10, 12);
  return `${hour}:${min}`;
}

function parseWarningData(jmaData) {
  const result = {
    area: '江東区',
    areaCode: KOTO_KU_CODE,
    reportDatetime: (jmaData && jmaData.reportDatetime) || null,
    publishingOffice: (jmaData && jmaData.publishingOffice) || '気象庁',
    headline: (jmaData && jmaData.headlineText) || '',
    alerts: [],
    hasWarning: false,
    hasSpecial: false,
    hasAdvisory: false,
  };

  if (!jmaData || !jmaData.areaTypes || !Array.isArray(jmaData.areaTypes)) {
    return result;
  }

  let kotoArea = null;
  for (const areaType of jmaData.areaTypes) {
    if (areaType.areas && Array.isArray(areaType.areas)) {
      const found = areaType.areas.find((a) => a.code === KOTO_KU_CODE);
      if (found) {
        kotoArea = found;
        break;
      }
    }
  }

  if (!kotoArea || !kotoArea.warnings || !Array.isArray(kotoArea.warnings)) {
    return result;
  }

  for (const w of kotoArea.warnings) {
    if (!w.code || w.status === '発表警報・注意報はなし' || w.status === '解除') {
      continue;
    }

    const codeInfo = WARNING_CODE_MAP[w.code] || {
      name: w.name || `気象情報(${w.code})`,
      level: w.code.startsWith('3') ? 'special' : (parseInt(w.code, 10) < 10 ? 'warning' : 'advisory'),
    };

    const alertItem = {
      code: w.code,
      name: codeInfo.name,
      level: codeInfo.level,
      status: w.status || '発表',
    };

    result.alerts.push(alertItem);

    if (codeInfo.level === 'special') {
      result.hasSpecial = true;
    } else if (codeInfo.level === 'warning') {
      result.hasWarning = true;
    } else if (codeInfo.level === 'advisory') {
      result.hasAdvisory = true;
    }
  }

  return result;
}

function parseRadarTimes(n1Data, n2Data) {
  // N1: 過去〜現在 (N1[0]が最新の現在観測データ)
  // N2: 未来予測 (validtimeでソート)
  if (!Array.isArray(n1Data) || n1Data.length === 0) {
    return {
      latestBasetime: null,
      currentValidtime: null,
      times: [],
    };
  }

  const latestCurrent = n1Data[0];
  const latestBasetime = latestCurrent.basetime;
  const currentValidTime = latestCurrent.validtime;
  const currentDate = parseTimeString(currentValidTime);

  const timeMap = new Map();

  // N1から過去60分〜現在（直近13件: 5分刻み）を抽出
  const pastItems = n1Data.slice(0, 13);
  for (const item of pastItems) {
    if (item.validtime) {
      timeMap.set(item.validtime, {
        basetime: item.basetime,
        validtime: item.validtime,
        isForecast: false,
      });
    }
  }

  // N2から未来予測（12件: 5分〜60分後）を抽出
  if (Array.isArray(n2Data)) {
    for (const item of n2Data) {
      if (item.validtime && !timeMap.has(item.validtime)) {
        timeMap.set(item.validtime, {
          basetime: item.basetime,
          validtime: item.validtime,
          isForecast: true,
        });
      }
    }
  }

  // 時系列昇順でソート (validtime 辞書順 = 時系列順)
  const sorted = Array.from(timeMap.values()).sort((a, b) => a.validtime.localeCompare(b.validtime));

  const times = sorted.map((item) => {
    const itemDate = parseTimeString(item.validtime);
    let offsetMinutes = 0;
    if (currentDate && itemDate) {
      offsetMinutes = Math.round((itemDate.getTime() - currentDate.getTime()) / (60 * 1000));
    }

    const timeHHMM = formatJstDisplayTime(item.validtime);
    let displayLabel;
    if (offsetMinutes === 0) {
      displayLabel = `${timeHHMM}（現在）`;
    } else if (offsetMinutes > 0) {
      displayLabel = `${timeHHMM}（${offsetMinutes}分後予測）`;
    } else {
      displayLabel = `${timeHHMM}（${Math.abs(offsetMinutes)}分前）`;
    }

    return {
      basetime: item.basetime,
      validtime: item.validtime,
      isForecast: item.isForecast,
      isCurrent: offsetMinutes === 0,
      offsetMinutes,
      displayLabel,
    };
  });

  return {
    latestBasetime,
    currentValidtime: currentValidTime,
    times,
  };
}

async function fetchWeatherAlerts(options = {}) {
  const now = Date.now();
  const forceRefresh = options.forceRefresh || false;

  if (!forceRefresh && alertsCache && now - alertsCacheTime < CACHE_TTL_MS) {
    return {
      ...alertsCache,
      cached: true,
      cachedAt: alertsCacheTime,
    };
  }

  try {
    const fetchFunc = options.fetchFn || globalThis.fetch;
    const res = await fetchFunc('https://www.jma.go.jp/bosai/warning/data/warning/130000.json', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CMK-GSX Mockup Weather Proxy',
      },
    });

    if (!res.ok) {
      throw new Error(`JMA warning API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const parsed = parseWarningData(data);

    alertsCache = parsed;
    alertsCacheTime = now;

    return {
      ...parsed,
      cached: false,
      cachedAt: now,
    };
  } catch (err) {
    console.error('Failed to fetch JMA warning data:', err.message);
    if (alertsCache) {
      return {
        ...alertsCache,
        cached: true,
        cachedAt: alertsCacheTime,
        fallback: true,
        error: err.message,
      };
    }

    // キャッシュもない場合は安全な空データを返す
    return {
      area: '江東区',
      areaCode: KOTO_KU_CODE,
      reportDatetime: null,
      publishingOffice: '気象庁',
      headline: '',
      alerts: [],
      hasWarning: false,
      hasSpecial: false,
      hasAdvisory: false,
      cached: false,
      fallback: true,
      error: err.message,
    };
  }
}

async function fetchRadarTimes(options = {}) {
  const now = Date.now();
  const forceRefresh = options.forceRefresh || false;

  if (!forceRefresh && radarTimesCache && now - radarTimesCacheTime < CACHE_TTL_MS) {
    return {
      ...radarTimesCache,
      cached: true,
      cachedAt: radarTimesCacheTime,
    };
  }

  try {
    const fetchFunc = options.fetchFn || globalThis.fetch;
    const [n1Res, n2Res] = await Promise.all([
      fetchFunc('https://www.jma.go.jp/bosai/jmatile/data/nowc/targetTimes_N1.json', {
        headers: { 'User-Agent': 'CMK-GSX Mockup Weather Proxy' },
      }),
      fetchFunc('https://www.jma.go.jp/bosai/jmatile/data/nowc/targetTimes_N2.json', {
        headers: { 'User-Agent': 'CMK-GSX Mockup Weather Proxy' },
      }),
    ]);

    if (!n1Res.ok || !n2Res.ok) {
      throw new Error(`JMA targetTimes API returned HTTP ${n1Res.status}/${n2Res.status}`);
    }

    const [n1Data, n2Data] = await Promise.all([n1Res.json(), n2Res.json()]);
    const parsed = parseRadarTimes(n1Data, n2Data);

    radarTimesCache = parsed;
    radarTimesCacheTime = now;

    return {
      ...parsed,
      cached: false,
      cachedAt: now,
    };
  } catch (err) {
    console.error('Failed to fetch JMA radar times data:', err.message);
    if (radarTimesCache) {
      return {
        ...radarTimesCache,
        cached: true,
        cachedAt: radarTimesCacheTime,
        fallback: true,
        error: err.message,
      };
    }

    return {
      latestBasetime: null,
      currentValidtime: null,
      times: [],
      cached: false,
      fallback: true,
      error: err.message,
    };
  }
}

function resetWeatherCache() {
  alertsCache = null;
  alertsCacheTime = 0;
  radarTimesCache = null;
  radarTimesCacheTime = 0;
}

function setWeatherCacheForTesting(alerts, radar) {
  if (alerts) {
    alertsCache = alerts;
    alertsCacheTime = Date.now();
  }
  if (radar) {
    radarTimesCache = radar;
    radarTimesCacheTime = Date.now();
  }
}

module.exports = {
  WARNING_CODE_MAP,
  KOTO_KU_CODE,
  CACHE_TTL_MS,
  parseWarningData,
  parseRadarTimes,
  fetchWeatherAlerts,
  fetchRadarTimes,
  resetWeatherCache,
  setWeatherCacheForTesting,
};
