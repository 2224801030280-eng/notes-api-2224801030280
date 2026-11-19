const express = require('express');
const multer = require('multer');
const Note = require('../models/note');
const { bucket } = require('../storage');

const router = express.Router();

const BLOCKED_EXT = /\.(exe|bat|cmd|sh|js|mjs|html|htm|svg|php)$/i;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (BLOCKED_EXT.test(file.originalname)) {
      const err = new Error('Định dạng tệp không được phép tải lên vì lý do bảo mật');
      err.code = 'INVALID_FILE_TYPE';
      return cb(err);
    }
    cb(null, true);
  }
});

router.get('/', async (req, res) => {
  const filter = req.query.tag ? { tags: String(req.query.tag) } : {};
  const notes = await Note.find(filter).sort({ createdAt: -1 }).limit(50);
  res.json(notes);
});

router.get('/:id', async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ error: 'Không tìm thấy ghi chú' });
  res.json(note);
});

router.post('/', async (req, res) => {
  const { title, content, tags } = req.body ?? {};
  const note = await Note.create({ title, content, tags });
  res.status(201).json(note);
});

router.put('/:id', async (req, res) => {
  const { title, content, tags } = req.body ?? {};
  const note = await Note.findByIdAndUpdate(
    req.params.id,
    { title, content, tags },
    { new: true, runValidators: true }
  );
  if (!note) return res.status(404).json({ error: 'Không tìm thấy ghi chú' });
  res.json(note);
});

router.delete('/:id', async (req, res) => {
  const note = await Note.findByIdAndDelete(req.params.id);
  if (!note) return res.status(404).json({ error: 'Không tìm thấy ghi chú' });
  res.status(204).end();
});

router.post('/:id/attachment', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Thiếu tệp ở trường "file"' });
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ error: 'Không tìm thấy ghi chú' });

  const safeName = req.file.originalname.normalize('NFD').replace(/[^\w.-]/g, '_');
  const path = `${note._id}/${Date.now()}-${safeName}`;
  const { error } = await bucket().upload(path, req.file.buffer, {
    contentType: req.file.mimetype
  });
  if (error) throw new Error(error.message);

  note.attachmentUrl = bucket().getPublicUrl(path).data.publicUrl;
  await note.save();
  res.json(note);
});

module.exports = router;
