const path = require('node:path');
const fs = require('node:fs');
const multer = require('multer');
const {
  getFaultReports,
  getFaultReportById,
  createFaultReport,
  acknowledgeFaultReport,
} = require('../state/faultReports');

// uploads ディレクトリの設定
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// multer ストレージ設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // 画像ファイルのみ許可（MIMEタイプまたは拡張子判定）
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, true); // モックアップ用のため柔軟に許可
    }
  },
});

function registerFaultRoutes(app) {
  // GET /api/fault-reports: 故障報告一覧取得
  app.get('/api/fault-reports', (req, res) => {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const list = getFaultReports(filter);
    res.status(200).json(list);
  });

  // POST /api/fault-reports: 新規故障報告作成 (multipart/form-data または application/json)
  app.post('/api/fault-reports', upload.single('photo'), (req, res) => {
    const body = req.body || {};
    const locationText = body.locationText;
    const description = body.description;
    const reporter = body.reporter;
    const photoFilename = req.file ? req.file.filename : null;

    if (!locationText || typeof locationText !== 'string' || !locationText.trim()) {
      // エラー時はアップロードされたファイルがあれば削除
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(400).json({ error: 'Missing or invalid locationText' });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(400).json({ error: 'Missing or invalid description' });
    }

    const result = createFaultReport({
      locationText,
      description,
      photoFilename,
      reporter,
    });

    if (!result.success) {
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(400).json({ error: result.reason || 'Failed to create fault report' });
    }

    return res.status(201).json({
      success: true,
      report: result.report,
    });
  });

  // GET /api/fault-reports/:id: 単一故障報告取得
  app.get('/api/fault-reports/:id', (req, res) => {
    const { id } = req.params;
    const item = getFaultReportById(id);
    if (!item) {
      return res.status(404).json({ error: `Fault report ${id} not found` });
    }
    res.status(200).json(item);
  });

  // POST /api/fault-reports/:id/acknowledge: 故障報告確認済更新
  app.post('/api/fault-reports/:id/acknowledge', (req, res) => {
    const { id } = req.params;
    const result = acknowledgeFaultReport(id);
    if (!result.success) {
      return res.status(404).json({ error: `Fault report ${id} not found` });
    }
    return res.status(200).json({
      success: true,
      report: result.report,
    });
  });
}

module.exports = { registerFaultRoutes };
