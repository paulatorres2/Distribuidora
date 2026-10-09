const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.post('/', authMiddleware, async (req, res) => {
  const { liquidacionId, pagos } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const liq = await client.query(
      'SELECT totalLiquidacion FROM liquidacion WHERE liquidacionId=$1 AND distribuidorId=$2',
      [liquidacionId, req.user.userId]
    );
    if (!liq.rows.length) throw new Error('Liquidación no encontrada');
    const total = liq.rows[0].totalliquidacion;
    const sumPagos = pagos.reduce((s, p) => s + p.monto, 0);
    if (sumPagos !== total)
      throw new Error(`Los pagos (${sumPagos}) deben sumar exactamente ${total}`);
    const inserted = [];
    for (const pago of pagos) {
      const { rows } = await client.query(
        `INSERT INTO pagos (tipoPagoId, especificacion, monto, tipoEstadoId, liquidacionId, negocio)
         VALUES ($1,$2,$3,1,$4,$5) RETURNING *`,
        [pago.tipoPagoId, pago.especificacion, pago.monto, liquidacionId, pago.negocio || null]
      );
      inserted.push(rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json(inserted);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/pendientes', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT pg.*, tp.Especificacion AS tipopago, u.username AS vendedor,
             l.fecha AS fecha_liquidacion, l.totalLiquidacion
      FROM pagos pg
      JOIN tipoPago tp ON pg.tipoPagoId = tp.TipoPagoId
      JOIN liquidacion l ON pg.liquidacionId = l.liquidacionId
      JOIN Usuarios u ON l.distribuidorId = u.UserId
      JOIN tipoEstado te ON pg.tipoEstadoId = te.tipoEstadoId
      WHERE te.especificacion = 'pendiente'
      ORDER BY pg.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/aceptar', authMiddleware, adminOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: pago } = await client.query('SELECT * FROM pagos WHERE pagosId=$1', [req.params.id]);
    if (!pago.length) throw new Error('Pago no encontrado');
    await client.query(
      'UPDATE pagos SET tipoEstadoId=2, validado_por=$1, fecha_validacion=NOW() WHERE pagosId=$2',
      [req.user.userId, req.params.id]
    );
    // Verificar si todos los pagos de la liquidación están aceptados
    const { rows: todosPagos } = await client.query(
    'SELECT COUNT(*) AS total FROM pagos WHERE liquidacionid=$1',
    [pago[0].liquidacionid]
    );
    const { rows: pagosAceptados } = await client.query(
    'SELECT COUNT(*) AS total FROM pagos WHERE liquidacionid=$1 AND tipoEstadoid=2',
    [pago[0].liquidacionid]
    );
    if (Number(todosPagos[0].total) === Number(pagosAceptados[0].total)) {
    await client.query(
        "UPDATE liquidacion SET estado='completo' WHERE liquidacionid=$1",
        [pago[0].liquidacionid]
    );
    }
    
    const { rows: tipo } = await client.query(
      'SELECT Especificacion FROM tipoPago WHERE TipoPagoId=$1', [pago[0].tipopagoid]
    );
    if (tipo[0]?.especificacion?.toLowerCase() === 'credito' && pago[0].negocio) {
      const { rows: liq } = await client.query(
        'SELECT distribuidorId FROM liquidacion WHERE liquidacionId=$1', [pago[0].liquidacionid]
      );
      await client.query(
        'INSERT INTO deudores (negocio, monto, distribuidorId, pagoId) VALUES ($1,$2,$3,$4)',
        [pago[0].negocio, pago[0].monto, liq[0]?.distribuidorid, req.params.id]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Pago aceptado' });
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
      'UPDATE pagos SET tipoEstadoId=3, validado_por=$1, fecha_validacion=NOW() WHERE pagosId=$2',
      [req.user.userId, req.params.id]
    );
    res.json({ message: 'Pago rechazado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/liquidacion/:id', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT pg.*, tp.Especificacion AS tipopago, te.especificacion AS estado
      FROM pagos pg
      JOIN tipoPago tp ON pg.tipoPagoId = tp.TipoPagoId
      JOIN tipoEstado te ON pg.tipoEstadoId = te.tipoEstadoId
      WHERE pg.liquidacionId = $1
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;