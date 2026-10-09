const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/admin', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { rows: bodega } = await pool.query(`
      SELECT COALESCE(SUM(p.price * ib.CantidadExistente), 0) AS valor_total_bodega,
             COALESCE(SUM(ib.CantidadExistente), 0) AS unidades_totales
      FROM products p JOIN Inventario_Bodega ib ON p.productId = ib.productId WHERE p.activo=TRUE
    `);

    const { rows: deudores } = await pool.query(
      'SELECT COUNT(*) AS total, COALESCE(SUM(monto),0) AS monto_total FROM deudores WHERE activo=TRUE'
    );

    const { rows: activos_mes } = await pool.query(`
        SELECT COALESCE(SUM(p.monto),0) AS total
        FROM pagos p JOIN tipoEstado te ON p.tipoEstadoId=te.tipoEstadoId
        WHERE te.especificacion='aceptado'
        AND p.tipoPagoId != 6
        AND DATE_TRUNC('month', p.created_at) = DATE_TRUNC('month', CURRENT_DATE)
        `);

    const { rows: descuentos_mes } = await pool.query(`
        SELECT COALESCE(SUM(p.monto),0) AS total
        FROM pagos p JOIN tipoEstado te ON p.tipoEstadoId=te.tipoEstadoId
        WHERE te.especificacion='aceptado'
        AND p.tipoPagoId = 6
        AND DATE_TRUNC('month', p.created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    const { rows: pasivos_mes } = await pool.query(`
      SELECT COALESCE(SUM(monto),0) AS total FROM pasivos
      WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    const { rows: ventas_vendedor } = await pool.query(`
      SELECT u.username, COALESCE(SUM(l.totalLiquidacion),0) AS total_ventas, COUNT(l.liquidacionId) AS dias_trabajados
      FROM Usuarios u
      LEFT JOIN liquidacion l ON u.UserId = l.distribuidorId
      AND DATE_TRUNC('month', l.fecha) = DATE_TRUNC('month', CURRENT_DATE)
      WHERE u.usertype = 'vendedor' AND u.activo = TRUE
      GROUP BY u.username ORDER BY total_ventas DESC
    `);

    const { rows: evolucion } = await pool.query(`
      WITH meses AS (
        SELECT generate_series(
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months'),
        DATE_TRUNC('month', CURRENT_DATE),
        '1 month'::interval
        ) AS mes
      ),
      activos_m AS (
        SELECT DATE_TRUNC('month', created_at) AS mes, SUM(monto) AS total
        FROM pagos p JOIN tipoEstado te ON p.tipoEstadoId=te.tipoEstadoId
        WHERE te.especificacion='aceptado' AND p.tipoPagoId != 6 GROUP BY 1
      ),
      descuentos_m AS (
        SELECT DATE_TRUNC('month', created_at) AS mes, SUM(monto) AS total
        FROM pagos p JOIN tipoEstado te ON p.tipoEstadoId=te.tipoEstadoId
        WHERE te.especificacion='aceptado' AND p.tipoPagoId = 6 GROUP BY 1
      ),
      pasivos_m AS (
        SELECT DATE_TRUNC('month', fecha) AS mes, SUM(monto) AS total
        FROM pasivos GROUP BY 1
      )
      SELECT TO_CHAR(m.mes,'YYYY-MM') AS mes,
            COALESCE(a.total,0) AS activos,
            COALESCE(d.total,0) AS descuentos,
            COALESCE(p.total,0) AS pasivos
      FROM meses m
      LEFT JOIN activos_m a ON m.mes=a.mes
      LEFT JOIN descuentos_m d ON m.mes=d.mes
      LEFT JOIN pasivos_m p ON m.mes=p.mes
      ORDER BY m.mes
    `);

    const { rows: cargues_pend } = await pool.query(
      "SELECT COUNT(*) AS total FROM cargue WHERE estadoTipoId=1"
    );

    const { rows: pagos_pend } = await pool.query(
      "SELECT COUNT(*) AS total FROM pagos WHERE tipoEstadoId=1"
    );

    res.json({
      bodega: bodega[0],
      deudores: deudores[0],
      activos_mes: activos_mes[0].total,
      descuentos_mes: descuentos_mes[0].total,
      pasivos_mes: pasivos_mes[0].total,
      ventas_vendedor,
      evolucion,
      pendientes: {
        cargues: cargues_pend[0].total,
        pagos: pagos_pend[0].total
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/vendedor', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  try {
    const { rows: mes } = await pool.query(`
      SELECT COALESCE(SUM(totalLiquidacion),0) AS total_mes, COUNT(*) AS dias
      FROM liquidacion
      WHERE distribuidorId=$1 AND DATE_TRUNC('month', fecha)=DATE_TRUNC('month', CURRENT_DATE)
    `, [userId]);

    const { rows: historico } = await pool.query(`
      SELECT TO_CHAR(fecha,'YYYY-MM-DD') AS fecha, totalLiquidacion
      FROM liquidacion
      WHERE distribuidorId=$1 AND fecha >= CURRENT_DATE - 30
      ORDER BY fecha
    `, [userId]);

    const { rows: deudores } = await pool.query(
      'SELECT * FROM deudores WHERE distribuidorId=$1 AND activo=TRUE ORDER BY fecha DESC',
      [userId]
    );

    const { rows: por_mes } = await pool.query(`
      SELECT TO_CHAR(DATE_TRUNC('month', fecha),'YYYY-MM') AS mes,
             COALESCE(SUM(totalLiquidacion),0) AS total
      FROM liquidacion
      WHERE distribuidorId=$1 AND fecha >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY 1 ORDER BY 1
    `, [userId]);

    res.json({ mes: mes[0], historico, deudores, por_mes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/comisiones/:vendedorId', authMiddleware, async (req, res) => {
  const { mes, anio } = req.query;
  const fechaInicio = `${anio}-${mes}-01`;
  try {
    const { rows } = await pool.query(`
      SELECT pc.*, l.totalliquidacion,
        TO_CHAR(pc.fecha, 'YYYY-MM-DD') AS fecha_str
      FROM pago_comision pc
      LEFT JOIN liquidacion l ON l.distribuidorId=pc.distribuidorId AND l.fecha=pc.fecha
      WHERE pc.distribuidorId=$1
      AND DATE_TRUNC('month', pc.fecha) = DATE_TRUNC('month', $2::date)
      ORDER BY pc.fecha
    `, [req.params.vendedorId, fechaInicio]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/comisiones/:id/pagar', authMiddleware, async (req, res) => {
  if (req.user.usertype !== 'admin')
    return res.status(403).json({ error: 'Solo administradores' });
  try {
    await pool.query(
      'UPDATE pago_comision SET pagado=TRUE, fecha_pago=NOW(), pagado_por=$1 WHERE pagoComisionId=$2',
      [req.user.userId, req.params.id]
    );
    res.json({ message: 'Comisión marcada como pagada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;