const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/', authMiddleware, adminOnly, async (req, res) => {
  const { negocio, activo, vendedor } = req.query;
  let query = `
    SELECT d.*, u.username AS vendedor
    FROM deudores d
    LEFT JOIN Usuarios u ON d.distribuidorId = u.UserId
    WHERE 1=1
  `;
  const params = [];
  if (negocio) { params.push(`%${negocio}%`); query += ` AND d.negocio ILIKE $${params.length}`; }
  if (activo !== undefined && activo !== '') { params.push(activo === 'true'); query += ` AND d.activo = $${params.length}`; }
  if (vendedor) { params.push(vendedor); query += ` AND d.distribuidorId = $${params.length}`; }
  query += ' ORDER BY d.fecha DESC';
  try {
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/vendedor', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM deudores WHERE distribuidorId=$1 ORDER BY fecha DESC',
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/pagar', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query(
      'UPDATE deudores SET activo=FALSE, fecha_pago=CURRENT_DATE WHERE deudorId=$1',
      [req.params.id]
    );
    res.json({ message: 'Deudor marcado como pagado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;