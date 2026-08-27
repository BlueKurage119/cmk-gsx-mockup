const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');
const { resetNotes } = require('../src/state/notes');

async function listenServer() {
  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    baseUrl,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test('GET /api/notes returns empty array initially', async () => {
  resetNotes();
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/notes`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.deepEqual(data, []);
  } finally {
    await close();
  }
});

test('POST /api/notes/commit creates notes successfully and reflects in GET /api/notes', async () => {
  resetNotes();
  const { baseUrl, close } = await listenServer();
  try {
    const creates = [
      { x: 500, y: 300, layer: 'summary', text: '東1ホール入口に案内看板設置' },
      { x: 800, y: 600, layer: 'detail', text: '指揮所連絡: 警備配置変更' },
    ];
    const res = await fetch(`${baseUrl}/api/notes/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creates }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.created.length, 2);
    assert.equal(data.created[0].id, 'note-1');
    assert.equal(data.created[0].x, 500);
    assert.equal(data.created[0].y, 300);
    assert.equal(data.created[0].layer, 'summary');
    assert.equal(data.created[0].text, '東1ホール入口に案内看板設置');
    assert.equal(data.created[0].author, '東地区外務H1');
    assert.equal(data.created[1].id, 'note-2');
    assert.equal(data.created[1].layer, 'detail');

    // GET /api/notes で確認
    const getRes = await fetch(`${baseUrl}/api/notes`);
    const allNotes = await getRes.json();
    assert.equal(allNotes.length, 2);
  } finally {
    await close();
  }
});

test('POST /api/notes/commit updates existing notes', async () => {
  resetNotes();
  const { baseUrl, close } = await listenServer();
  try {
    // まず作成
    await fetch(`${baseUrl}/api/notes/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creates: [{ x: 400, y: 200, layer: 'detail', text: '初期メモ' }],
      }),
    });

    // 更新
    const res = await fetch(`${baseUrl}/api/notes/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: [{ id: 'note-1', text: '更新済みメモ', layer: 'summary' }],
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.updated.length, 1);
    assert.equal(data.updated[0].id, 'note-1');
    assert.equal(data.updated[0].text, '更新済みメモ');
    assert.equal(data.updated[0].layer, 'summary');
    assert.ok(typeof data.updated[0].updatedAt === 'number');

    // GET で確認
    const getRes = await fetch(`${baseUrl}/api/notes`);
    const allNotes = await getRes.json();
    assert.equal(allNotes[0].text, '更新済みメモ');
    assert.equal(allNotes[0].layer, 'summary');
  } finally {
    await close();
  }
});

test('POST /api/notes/commit deletes notes', async () => {
  resetNotes();
  const { baseUrl, close } = await listenServer();
  try {
    await fetch(`${baseUrl}/api/notes/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creates: [
          { x: 100, y: 100, layer: 'detail', text: '削除対象' },
          { x: 200, y: 200, layer: 'summary', text: '残すメモ' },
        ],
      }),
    });

    const res = await fetch(`${baseUrl}/api/notes/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deletes: ['note-1'],
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.deepEqual(data.deletedIds, ['note-1']);

    const getRes = await fetch(`${baseUrl}/api/notes`);
    const allNotes = await getRes.json();
    assert.equal(allNotes.length, 1);
    assert.equal(allNotes[0].id, 'note-2');
  } finally {
    await close();
  }
});

test('POST /api/notes/commit handles creates, updates, and deletes combined in fixed order (delete -> update -> create)', async () => {
  resetNotes();
  const { baseUrl, close } = await listenServer();
  try {
    await fetch(`${baseUrl}/api/notes/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creates: [
          { x: 100, y: 100, layer: 'detail', text: '削除されるノート' },
          { x: 200, y: 200, layer: 'summary', text: '更新されるノート' },
        ],
      }),
    });

    const res = await fetch(`${baseUrl}/api/notes/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deletes: ['note-1'],
        updates: [{ id: 'note-2', text: '内容更新済み' }],
        creates: [{ x: 300, y: 300, layer: 'detail', text: '新規追加ノート' }],
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.deepEqual(data.deletedIds, ['note-1']);
    assert.equal(data.updated.length, 1);
    assert.equal(data.created.length, 1);

    const getRes = await fetch(`${baseUrl}/api/notes`);
    const allNotes = await getRes.json();
    assert.equal(allNotes.length, 2);
    assert.equal(allNotes[0].id, 'note-2');
    assert.equal(allNotes[0].text, '内容更新済み');
    assert.equal(allNotes[1].id, 'note-3');
    assert.equal(allNotes[1].text, '新規追加ノート');
  } finally {
    await close();
  }
});

test('POST /api/notes/commit validation: invalid coordinates, layer, or empty text rejects entire request with 400', async () => {
  resetNotes();
  const { baseUrl, close } = await listenServer();
  try {
    const invalidCreates = [
      { x: 100, y: 100, layer: 'summary', text: '正常' },
      { x: 'invalid', y: 200, layer: 'summary', text: '座標エラー' },
    ];
    const res = await fetch(`${baseUrl}/api/notes/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creates: invalidCreates }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.reason, 'INVALID_COORDINATES');

    // 何も適用されていないことを確認（部分適用の防止）
    const getRes = await fetch(`${baseUrl}/api/notes`);
    const allNotes = await getRes.json();
    assert.deepEqual(allNotes, []);

    // 不正な layer
    const resLayer = await fetch(`${baseUrl}/api/notes/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creates: [{ x: 100, y: 100, layer: 'unknown_layer', text: 'レイヤー不正' }],
      }),
    });
    assert.equal(resLayer.status, 400);
    assert.equal((await resLayer.json()).reason, 'INVALID_LAYER');

    // 空 text
    const resText = await fetch(`${baseUrl}/api/notes/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creates: [{ x: 100, y: 100, layer: 'detail', text: '   ' }],
      }),
    });
    assert.equal(resText.status, 400);
    assert.equal((await resText.json()).reason, 'INVALID_TEXT');
  } finally {
    await close();
  }
});

test('POST /api/notes/commit validation: non-existent id in updates or deletes returns 400', async () => {
  resetNotes();
  const { baseUrl, close } = await listenServer();
  try {
    const resUpdate = await fetch(`${baseUrl}/api/notes/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: [{ id: 'non-existent', text: '更新' }],
      }),
    });
    assert.equal(resUpdate.status, 400);
    assert.equal((await resUpdate.json()).reason, 'NOT_FOUND');

    const resDelete = await fetch(`${baseUrl}/api/notes/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deletes: ['non-existent'],
      }),
    });
    assert.equal(resDelete.status, 400);
    assert.equal((await resDelete.json()).reason, 'NOT_FOUND');
  } finally {
    await close();
  }
});

test('GET /api/notes?layer=summary returns summary notes only and filters out detail notes', async () => {
  resetNotes();
  const { baseUrl, close } = await listenServer();
  try {
    await fetch(`${baseUrl}/api/notes/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creates: [
          { x: 100, y: 100, layer: 'summary', text: '概要層ノート1' },
          { x: 200, y: 200, layer: 'detail', text: '詳細層ノート（指揮所限定）' },
          { x: 300, y: 300, layer: 'summary', text: '概要層ノート2' },
        ],
      }),
    });

    const res = await fetch(`${baseUrl}/api/notes?layer=summary`);
    assert.equal(res.status, 200);
    const summaryNotes = await res.json();
    assert.equal(summaryNotes.length, 2);
    assert.equal(summaryNotes[0].layer, 'summary');
    assert.equal(summaryNotes[0].text, '概要層ノート1');
    assert.equal(summaryNotes[1].layer, 'summary');
    assert.equal(summaryNotes[1].text, '概要層ノート2');
    assert.ok(!summaryNotes.some((n) => n.layer === 'detail'), 'detail notes must not be present');
  } finally {
    await close();
  }
});
