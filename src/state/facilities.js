const INITIAL_FACILITIES = [
  { id: 'higashi2-gate', name: '東2ゲート', type: 'gate', state: 'open', x: 120, y: 340 },
  { id: 'higashi3-gate', name: '東3ゲート', type: 'gate', state: 'open', x: 180, y: 340 },
  { id: 'higashi123-shutter', name: '東123シャッター', type: 'shutter', state: 'open', x: 100, y: 200 },
  { id: 'higashi456-shutter', name: '東456シャッター', type: 'shutter', state: 'closed', x: 260, y: 200 },
  { id: 'higashi78-shutter', name: '東78シャッター', type: 'shutter', state: 'open', x: 420, y: 200 },
];

const facilities = INITIAL_FACILITIES.map((facility) => ({ ...facility }));

function getFacilities() {
  return facilities.map((facility) => ({ ...facility }));
}

module.exports = {
  getFacilities,
};
