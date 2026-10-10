const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/prestamos
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  const { activo } = req.query;
  try {
    const { rows } = await pool.query(`
      SELECT mp.*, 
        json_agg(json_build_object(
          'productname', p.productname,
          'cantidad', dp.cantidad,
          'productid', p.productId
        )) AS productos
      FROM mercancia_prestada mp
      JOIN detalle_prestamo dp ON mp.prestamoId = dp.prestamoId
      JOIN products p ON dp.productoId = p.productId
      WHERE mp.activo = $1
      GROUP BY mp.prestamoId
      ORDER BY mp.fecha DESC
    `, [activo !== 'false']);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/prestamos
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { distribuidor, direccion, items } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO mercancia_prestada (distribuidor, direccion, registrado_por) VALUES ($1,$2,$3) RETURNING *',
      [distribuidor, direccion, req.user.userId]
    );
    const prestamoId = rows[0].prestamoid;
    for (const item of items) {
      if (item.cantidad > 0) {
        await client.query(
          'INSERT INTO detalle_prestamo (prestamoId, productoId, cantidad) VALUES ($1,$2,$3)',
          [prestamoId, item.productId, item.cantidad]
        );
      }
    }
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/prestamos/:id/saldar
router.put('/:id/saldar', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query(
      'UPDATE mercancia_prestada SET activo=FALSE, fecha_saldado=NOW() WHERE prestamoId=$1',
      [req.params.id]
    );
    res.json({ message: 'Préstamo saldado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;