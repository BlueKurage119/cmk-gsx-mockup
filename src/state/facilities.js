const INITIAL_FACILITIES = [
  { id: 'higashi1-gate', name: '東1ゲート', type: 'gate', state: 'open', x: 2329, y: 532 },
  { id: 'higashi2-gate', name: '東2ゲート', type: 'gate', state: 'open', x: 2380, y: 184 },
  { id: 'higashi3-gate', name: '東3ゲート', type: 'gate', state: 'open', x: 2218, y: 44 },
  { id: 'higashi4-gate', name: '東4ゲート', type: 'gate', state: 'open', x: 906, y: 103 },
  { id: 'higashi5-gate', name: '東5ゲート', type: 'gate', state: 'closed', x: 1061, y: 1355 },
  { id: 'higashi6-gate', name: '東6ゲート', type: 'gate', state: 'open', x: 1649, y: 1355 },
  { id: 'higashi7-5-gate', name: '東7.5ゲート', type: 'gate', state: 'open', x: 524, y: 1355 },
  { id: 'higashi13-gate', name: '東13ゲート', type: 'checkpoint', state: 'open', x: 20, y: 1300 },
  { id: 'higashi1-a-shutter', name: '東1-A', type: 'shutter', state: 'open', x: 1989, y: 178 },
  { id: 'higashi1-b-shutter', name: '東1-B', type: 'shutter', state: 'open', x: 1917, y: 178 },
  { id: 'higashi1-c-shutter', name: '東1-C', type: 'shutter', state: 'open', x: 2158, y: 314 },
  { id: 'higashi1-d-shutter', name: '東1-D', type: 'shutter', state: 'closed', x: 2158, y: 510 },
  { id: 'higashi1-12-shutter', name: '東1-1/2', type: 'shutter', state: 'open', x: 1904, y: 628 },
  { id: 'higashi1-34-shutter', name: '東1-3/4', type: 'shutter', state: 'open', x: 2002, y: 628 },
  { id: 'higashi2-a-shutter', name: '東2-A', type: 'shutter', state: 'open', x: 1587, y: 178 },
  { id: 'higashi2-b-shutter', name: '東2-B', type: 'shutter', state: 'open', x: 1515, y: 178 },
  { id: 'higashi2-12-shutter', name: '東2-1/2', type: 'shutter', state: 'open', x: 1502, y: 628 },
  { id: 'higashi2-34-shutter', name: '東2-3/4', type: 'shutter', state: 'closed', x: 1600, y: 628 },
  { id: 'higashi3-a-shutter', name: '東3-A', type: 'shutter', state: 'open', x: 1185, y: 178 },
  { id: 'higashi3-b-shutter', name: '東3-B', type: 'shutter', state: 'open', x: 1113, y: 178 },
  { id: 'higashi3-c-shutter', name: '東3-C', type: 'shutter', state: 'open', x: 944, y: 314 },
  { id: 'higashi3-d-shutter', name: '東3-D', type: 'shutter', state: 'open', x: 944, y: 510 },
  { id: 'higashi3-12-shutter', name: '東3-1/2', type: 'shutter', state: 'open', x: 1100, y: 628 },
  { id: 'higashi3-34-shutter', name: '東3-3/4', type: 'shutter', state: 'open', x: 1198, y: 628 },
  { id: 'higashi7-a-shutter', name: '東7-A', type: 'shutter', state: 'open', x: 315, y: 1280 },
  { id: 'higashi7-b-shutter', name: '東7-B', type: 'shutter', state: 'open', x: 446, y: 1280 },
  { id: 'higashi7-c-shutter', name: '東7-C', type: 'shutter', state: 'open', x: 645, y: 1007 },
  { id: 'higashi7-d-shutter', name: '東7-D', type: 'shutter', state: 'open', x: 209, y: 1016 },
  { id: 'higashi8-a-shutter', name: '東8-A', type: 'shutter', state: 'open', x: 778, y: 457 },
  { id: 'higashi8-b-shutter', name: '東8-B', type: 'shutter', state: 'closed', x: 566, y: 448 },
];

const facilities = INITIAL_FACILITIES.map((facility) => ({ ...facility }));

function getFacilities() {
  return facilities.map((facility) => ({ ...facility }));
}

module.exports = {
  getFacilities,
};
