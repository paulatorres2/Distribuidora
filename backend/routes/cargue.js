const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.post('/', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const { items } = req.body;
  const hoy = new Date().toISOString().split('T')[0];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insertedItems = [];
    for (const item of items) {
      const { rows } = await client.query(
        `INSERT INTO cargue (distribuidorId, productoId, cantidad_solicitada, cantidad, fecha, estadoTipoId)
         VALUES ($1, $2, $3, 0, $4, 1) RETURNING *`,
        [userId, item.productoId, item.cantidad, hoy]
      );
      insertedItems.push(rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json(insertedItems);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/pendientes', authMiddleware, adminOnly, async (req, res) => {
  const { vendedorId } = req.query;
  let query = `
    SELECT c.*, u.username AS vendedor, p.productname, p.price, ib.CantidadExistente AS stock
    FROM cargue c
    JOIN Usuarios u ON c.distribuidorId = u.UserId
    JOIN products p ON c.productoId = p.productId
    JOIN Inventario_Bodega ib ON p.productId = ib.productId
    JOIN tipoEstado te ON c.estadoTipoId = te.tipoEstadoId
    WHERE te.especificacion = 'pendiente'
  `;
  const params = [];
  if (vendedorId) { params.push(vendedorId); query += ` AND c.distribuidorId = $${params.length}`; }
  query += ' ORDER BY c.fecha DESC, u.username';
  try {
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/vendedor', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const hoy = new Date().toISOString().split('T')[0];
  try {
    const { rows } = await pool.query(`
      SELECT c.*, p.productname, p.price, te.especificacion AS estado
      FROM cargue c
      JOIN products p ON c.productoId = p.productId
      JOIN tipoEstado te ON c.estadoTipoId = te.tipoEstadoId
      WHERE c.distribuidorId = $1 AND c.fecha = $2
      ORDER BY p.productname
    `, [userId, hoy]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/aprobar', authMiddleware, adminOnly, async (req, res) => {
  const { cantidadAprobada } = req.body;
  const adminId = req.user.userId;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: cargue } = await client.query(
      'SELECT * FROM cargue WHERE cargueId = $1', [req.params.id]
    );
    if (!cargue.length) throw new Error('Cargue no encontrado');
    const { productoid } = cargue[0];
    const { rows: stock } = await client.query(
      'SELECT CantidadExistente FROM Inventario_Bodega WHERE productId = $1', [productoid]
    );
    const stockDisponible = stock[0]?.cantidadexistente || 0;
    const aprobado = Math.min(cantidadAprobada, stockDisponible);
    await client.query(
      `UPDATE cargue SET cantidad = $1, estadoTipoId = 2, aprobado_por = $2, fecha_aprobacion = NOW()
       WHERE cargueId = $3`,
      [aprobado, adminId, req.params.id]
    );
    await client.query(
      'UPDATE Inventario_Bodega SET CantidadExistente = CantidadExistente - $1 WHERE productId = $2',
      [aprobado, productoid]
    );
    await client.query('COMMIT');
    res.json({ cargueId: req.params.id, cantidadAprobada: aprobado });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.put('/:id/rechazar', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query(
      'UPDATE cargue SET estadoTipoId = 3, aprobado_por = $1, fecha_aprobacion = NOW() WHERE cargueId = $2',
      [req.user.userId, req.params.id]
    );
    res.json({ message: 'Cargue rechazado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;