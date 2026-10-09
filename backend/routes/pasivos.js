const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/', authMiddleware, adminOnly, async (req, res) => {
  const { desde, hasta } = req.query;
  let q = 'SELECT ps.*, u.username AS registrado_por_nombre FROM pasivos ps LEFT JOIN Usuarios u ON ps.registrado_por=u.UserId WHERE 1=1';
  const p = [];
  if (desde) { p.push(desde); q += ` AND ps.fecha >= $${p.length}`; }
  if (hasta) { p.push(hasta); q += ` AND ps.fecha <= $${p.length}`; }
  q += ' ORDER BY ps.fecha DESC';
  try {
    const { rows } = await pool.query(q, p);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { tipoGasto, monto, fecha, descripcion } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO pasivos (tipoGasto, monto, fecha, descripcion, registrado_por) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [tipoGasto, monto, fecha || new Date().toISOString().split('T')[0], descripcion, req.user.userId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM pasivos WHERE pasivoId=$1', [req.params.id]);
    res.json({ message: 'Pasivo eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;