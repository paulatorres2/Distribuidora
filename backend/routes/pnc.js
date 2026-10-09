const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.post('/', authMiddleware, async (req, res) => {
  const { items } = req.body;
  const hoy = new Date().toISOString().split('T')[0];
  try {
    const inserted = [];
    for (const item of items) {
      const { rows } = await pool.query(
        'INSERT INTO pnc (productid, distribuidorId, cantidad, fecha) VALUES ($1,$2,$3,$4) RETURNING *',
        [item.productid, req.user.userId, item.cantidad, hoy]
      );
      inserted.push(rows[0]);
    }
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pendientes', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT pn.*, p.productname, u.username AS vendedor
      FROM pnc pn
      JOIN products p ON pn.productid = p.productId
      JOIN Usuarios u ON pn.distribuidorId = u.UserId
      WHERE pn.validado = FALSE
      ORDER BY pn.fecha DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/validar', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query(
      'UPDATE pnc SET validado=TRUE, validado_por=$1, fecha_validacion=NOW() WHERE pncid=$2',
      [req.user.userId, req.params.id]
    );
    res.json({ message: 'PNC validado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mes/:anio/:mes', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.productname, SUM(pn.cantidad) AS total_pnc
      FROM pnc pn
      JOIN products p ON pn.productid = p.productId
      WHERE EXTRACT(YEAR FROM pn.fecha) = $1 
      AND EXTRACT(MONTH FROM pn.fecha) = $2
      AND pn.validado = TRUE
      GROUP BY p.productname
      ORDER BY total_pnc DESC
    `, [req.params.anio, req.params.mes]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;