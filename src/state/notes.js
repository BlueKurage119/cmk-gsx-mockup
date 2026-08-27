const VALID_LAYERS = new Set(['detail', 'summary']);

let notes = [];
let nextNoteId = 1;

function getNotes(filter = {}) {
  let result = notes;
  if (filter.layer) {
    result = result.filter((n) => n.layer === filter.layer);
  }
  return result.map((n) => ({ ...n }));
}

function validateCreate({ x, y, layer, text }) {
  if (typeof x !== 'number' || typeof y !== 'number' || Number.isNaN(x) || Number.isNaN(y)) return 'INVALID_COORDINATES';
  if (!VALID_LAYERS.has(layer)) return 'INVALID_LAYER';
  if (typeof text !== 'string' || text.trim() === '') return 'INVALID_TEXT';
  return null;
}

/**
 * 削除→更新→作成の順に一括適用する
 * @returns {Object} { success, created, updated, deletedIds } または { success: false, reason, detail }
 */
function commitNoteChanges({ creates = [], updates = [], deletes = [] } = {}) {
  // 事前バリデーション（一件でも不正なら全体を失敗させ、部分適用しない）
  for (const c of creates) {
    const reason = validateCreate(c);
    if (reason) return { success: false, reason, detail: c };
  }
  for (const u of updates) {
    if (!notes.some((n) => n.id === u.id)) return { success: false, reason: 'NOT_FOUND', detail: u.id };
    if (u.layer !== undefined && !VALID_LAYERS.has(u.layer)) return { success: false, reason: 'INVALID_LAYER', detail: u.id };
    if (u.text !== undefined && (typeof u.text !== 'string' || u.text.trim() === '')) {
      return { success: false, reason: 'INVALID_TEXT', detail: u.id };
    }
  }
  for (const id of deletes) {
    if (!notes.some((n) => n.id === id)) return { success: false, reason: 'NOT_FOUND', detail: id };
  }

  // 1. 削除
  const deletedIds = [];
  deletes.forEach((id) => {
    const idx = notes.findIndex((n) => n.id === id);
    if (idx !== -1) {
      notes.splice(idx, 1);
      deletedIds.push(id);
    }
  });

  // 2. 更新（削除済みIDが指定されていた場合はスキップする）
  const updated = [];
  updates.forEach((u) => {
    const note = notes.find((n) => n.id === u.id);
    if (!note) return;
    if (u.text !== undefined) note.text = u.text.trim();
    if (u.layer !== undefined) note.layer = u.layer;
    note.updatedAt = Date.now();
    updated.push({ ...note });
  });

  // 3. 作成
  const created = [];
  creates.forEach((c) => {
    const note = {
      id: `note-${nextNoteId++}`,
      x: c.x,
      y: c.y,
      layer: c.layer,
      text: c.text.trim(),
      author: typeof c.author === 'string' && c.author.trim() ? c.author.trim() : '東地区外務H1',
      createdAt: Date.now(),
      updatedAt: null,
    };
    notes.push(note);
    created.push({ ...note });
  });

  return { success: true, created, updated, deletedIds };
}

function resetNotes() {
  notes = [];
  nextNoteId = 1;
}

module.exports = {
  VALID_LAYERS,
  getNotes,
  commitNoteChanges,
  resetNotes,
};
