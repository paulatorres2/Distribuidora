const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/vendedor', authMiddleware, adminOnly, async (req, res) => {
  const { vendedorId, fecha } = req.query;
  if (!vendedorId || !fecha) return res.status(400).json({ error: 'Faltan parámetros' });

  try {
    // Inventario inicial
    const { rows: invInicial } = await pool.query(`
      SELECT p.productname, i.cantidad
      FROM inventario i
      JOIN products p ON i.productId = p.productId
      WHERE i.distribuidorId=$1 AND i.fecha=$2 AND i.tipo='inicial'
      ORDER BY p.productname
    `, [vendedorId, fecha]);

    // Inventario final
    const { rows: invFinal } = await pool.query(`
      SELECT p.productname, i.cantidad
      FROM inventario i
      JOIN products p ON i.productId = p.productId
      WHERE i.distribuidorId=$1 AND i.fecha=$2 AND i.tipo='final'
      ORDER BY p.productname
    `, [vendedorId, fecha]);

    // Cargue aprobado
    const { rows: cargue } = await pool.query(`
      SELECT p.productname, c.cantidad_solicitada, c.cantidad AS cantidad_aprobada, te.especificacion AS estado
      FROM cargue c
      JOIN products p ON c.productoId = p.productId
      JOIN tipoEstado te ON c.estadoTipoId = te.tipoEstadoId
      WHERE c.distribuidorId=$1 AND c.fecha=$2
      ORDER BY p.productname
    `, [vendedorId, fecha]);

    // PNC
    const { rows: pnc } = await pool.query(`
      SELECT p.productname, pn.cantidad, pn.validado
      FROM pnc pn
      JOIN products p ON pn.productid = p.productId
      WHERE pn.distribuidorId=$1 AND pn.fecha=$2
      ORDER BY p.productname
    `, [vendedorId, fecha]);

    // Liquidacion
    const { rows: liquidacion } = await pool.query(`
      SELECT l.liquidacionId, l.totalLiquidacion, l.estado, l.fecha
      FROM liquidacion l
      WHERE l.distribuidorId=$1 AND l.fecha=$2
    `, [vendedorId, fecha]);

    // Pagos
    let pagos = [];
    if (liquidacion.length) {
      const { rows: pagosRows } = await pool.query(`
        SELECT pg.monto, pg.negocio, tp.Especificacion AS tipopago, te.especificacion AS estado
        FROM pagos pg
        JOIN tipoPago tp ON pg.tipoPagoId = tp.TipoPagoId
        JOIN tipoEstado te ON pg.tipoEstadoId = te.tipoEstadoId
        WHERE pg.liquidacionId = $1
        ORDER BY pg.pagosId
      `, [liquidacion[0].liquidacionid]);
      pagos = pagosRows;
    }

    // Detalle liquidacion
    let detalleLiq = [];
    if (liquidacion.length) {
      const { rows: detalleRows } = await pool.query(`
        SELECT p.productname, dl.cantidadVendida, dl.subtotal
        FROM detalleLiquidacion dl
        JOIN products p ON dl.productoId = p.productId
        WHERE dl.liquidacionId = $1
        ORDER BY p.productname
      `, [liquidacion[0].liquidacionid]);
      detalleLiq = detalleRows;
    }

    res.json({ invInicial, invFinal, cargue, pnc, liquidacion: liquidacion[0] || null, pagos, detalleLiq });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;