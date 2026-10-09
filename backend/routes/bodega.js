const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/stock', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.productId, p.productname, p.price, ib.CantidadExistente,
             (p.price * ib.CantidadExistente) AS valor_total
      FROM products p
      JOIN Inventario_Bodega ib ON p.productId = ib.productId
      WHERE p.activo = TRUE
      ORDER BY p.productname
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/entrada', authMiddleware, adminOnly, async (req, res) => {
  const { items } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of items) {
      await client.query(
        'UPDATE Inventario_Bodega SET CantidadExistente = CantidadExistente + $1 WHERE productId = $2',
        [item.cantidad, item.productId]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Entrada registrada en bodega' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post('/cargue-cliente', authMiddleware, adminOnly, async (req, res) => {
  const { cliente, items, descuento } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let totalBruto = 0;
    const detalle = [];
    for (const item of items) {
      const { rows: prod } = await client.query('SELECT price FROM products WHERE productId=$1', [item.productId]);
      if (!prod.length) throw new Error(`Producto ${item.productId} no encontrado`);
      const subtotal = prod[0].price * item.cantidad;
      totalBruto += subtotal;
      detalle.push({ ...item, precio: prod[0].price, subtotal });
    }
    const totalNeto = totalBruto - (descuento || 0);
    const { rows: cc } = await client.query(
      'INSERT INTO cargue_cliente (cliente, descuento, total_bruto, total_neto, creado_por) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [cliente, descuento || 0, totalBruto, totalNeto, req.user.userId]
    );
    const ccId = cc[0].cargueclienteid;
    for (const d of detalle) {
      await client.query(
        'INSERT INTO detalle_cargue_cliente (cargueClienteId, productoId, cantidad, precio_unitario, subtotal) VALUES ($1,$2,$3,$4,$5)',
        [ccId, d.productId, d.cantidad, d.precio, d.subtotal]
      );
      await client.query(
        'UPDATE Inventario_Bodega SET CantidadExistente = CantidadExistente - $1 WHERE productId = $2',
        [d.cantidad, d.productId]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ cargueClienteId: ccId, totalBruto, totalNeto, descuento: descuento || 0 });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/cargues-clientes', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT cc.*, u.username AS creado_por_nombre
      FROM cargue_cliente cc
      JOIN Usuarios u ON cc.creado_por = u.UserId
      ORDER BY cc.fecha DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;