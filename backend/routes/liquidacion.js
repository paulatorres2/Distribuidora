const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.get('/calcular', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const hoy = new Date().toISOString().split('T')[0];
  try {
    const { rows: tieneCeroCheck } = await pool.query(
      "SELECT 1 FROM solicitud_inicio_cero WHERE distribuidorId=$1 AND fecha=$2 AND estado='aprobado'",
      [userId, hoy]
    );
    const usarCero = tieneCeroCheck.length > 0;

    const { rows } = await pool.query(`
      WITH 
      inv_inicial AS (
        SELECT productId, CASE WHEN $3 THEN 0 ELSE COALESCE(SUM(cantidad),0) END AS cant
        FROM inventario WHERE distribuidorId=$1 AND fecha=$2 AND tipo='inicial' GROUP BY productId
      ),
      cargue_ap AS (
        SELECT productoId AS productId, COALESCE(SUM(cantidad),0) AS cant
        FROM cargue WHERE distribuidorId=$1 AND fecha=$2 AND estadoTipoId=2 GROUP BY productoId
      ),
      pnc_hoy AS (
        SELECT productid AS productId, COALESCE(SUM(cantidad),0) AS cant
        FROM pnc WHERE distribuidorId=$1 AND fecha=$2 GROUP BY productid
      ),
      inv_final AS (
        SELECT productId, COALESCE(SUM(cantidad),0) AS cant
        FROM inventario WHERE distribuidorId=$1 AND fecha=$2 AND tipo='final' GROUP BY productId
      )
      SELECT 
        p.productId, p.productname, p.price, p.price_sin_iva,
        COALESCE(ii.cant,0) AS inv_inicial,
        COALESCE(ca.cant,0) AS cargue,
        COALESCE(pn.cant,0) AS pnc,
        COALESCE(if2.cant,0) AS inv_final,
        (COALESCE(ii.cant,0)+COALESCE(ca.cant,0)-COALESCE(pn.cant,0)-COALESCE(if2.cant,0)) AS vendido,
        p.price*(COALESCE(ii.cant,0)+COALESCE(ca.cant,0)-COALESCE(pn.cant,0)-COALESCE(if2.cant,0)) AS subtotal,
        p.price_sin_iva*(COALESCE(ii.cant,0)+COALESCE(ca.cant,0)-COALESCE(pn.cant,0)-COALESCE(if2.cant,0)) AS subtotal_sin_iva
      FROM products p
      LEFT JOIN inv_inicial ii ON p.productId=ii.productId
      LEFT JOIN cargue_ap ca ON p.productId=ca.productId
      LEFT JOIN pnc_hoy pn ON p.productId=pn.productId
      LEFT JOIN inv_final if2 ON p.productId=if2.productId
      WHERE (COALESCE(ii.cant,0)+COALESCE(ca.cant,0))>0
      ORDER BY p.productname
    `, [userId, hoy, usarCero]);

    const total = rows.reduce((sum, r) => sum + (Number(r.subtotal) || 0), 0);
    const total_sin_iva = rows.reduce((sum, r) => sum + (Number(r.subtotal_sin_iva) || 0), 0);
    const { rows: userRows } = await pool.query('SELECT comision FROM Usuarios WHERE UserId=$1', [userId]);
    const comision_pct = Number(userRows[0]?.comision || 0);
    const comision_valor = Math.round(total_sin_iva * comision_pct / 100);
    const tieneNegativos = rows.some(r => Number(r.vendido) < 0);

    res.json({ items: rows, total, total_sin_iva, comision_pct, comision_valor, fecha: hoy, tieneNegativos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generar', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const hoy = new Date().toISOString().split('T')[0];
  try {
    const { rows: tieneCeroCheck } = await pool.query(
      "SELECT 1 FROM solicitud_inicio_cero WHERE distribuidorId=$1 AND fecha=$2 AND estado='aprobado'",
      [userId, hoy]
    );
    const usarCero = tieneCeroCheck.length > 0;

    const { rows: itemsCheck } = await pool.query(`
      WITH 
      inv_inicial AS (
        SELECT productId, CASE WHEN $3 THEN 0 ELSE COALESCE(SUM(cantidad),0) END AS cant
        FROM inventario WHERE distribuidorId=$1 AND fecha=$2 AND tipo='inicial' GROUP BY productId
      ),
      cargue_ap AS (
        SELECT productoId AS productId, COALESCE(SUM(cantidad),0) AS cant
        FROM cargue WHERE distribuidorId=$1 AND fecha=$2 AND estadoTipoId=2 GROUP BY productoId
      ),
      pnc_hoy AS (
        SELECT productid AS productId, COALESCE(SUM(cantidad),0) AS cant
        FROM pnc WHERE distribuidorId=$1 AND fecha=$2 GROUP BY productid
      ),
      inv_final AS (
        SELECT productId, COALESCE(SUM(cantidad),0) AS cant
        FROM inventario WHERE distribuidorId=$1 AND fecha=$2 AND tipo='final' GROUP BY productId
      )
      SELECT p.productId, p.productname, p.price,
        (COALESCE(ii.cant,0)+COALESCE(ca.cant,0)-COALESCE(pn.cant,0)-COALESCE(if2.cant,0)) AS vendido,
        p.price*(COALESCE(ii.cant,0)+COALESCE(ca.cant,0)-COALESCE(pn.cant,0)-COALESCE(if2.cant,0)) AS subtotal
      FROM products p
      LEFT JOIN inv_inicial ii ON p.productId=ii.productId
      LEFT JOIN cargue_ap ca ON p.productId=ca.productId
      LEFT JOIN pnc_hoy pn ON p.productId=pn.productId
      LEFT JOIN inv_final if2 ON p.productId=if2.productId
      WHERE (COALESCE(ii.cant,0)+COALESCE(ca.cant,0))>0
    `, [userId, hoy, usarCero]);

    const tieneNegativos = itemsCheck.some(r => Number(r.vendido) < 0);

    if (tieneNegativos) {
      const { rows: solAprobada } = await pool.query(
        "SELECT 1 FROM solicitud_liquidacion_negativa WHERE distribuidorId=$1 AND fecha=$2 AND estado='aprobado'",
        [userId, hoy]
      );
      const { rows: solRechazada } = await pool.query(
        "SELECT 1 FROM solicitud_liquidacion_negativa WHERE distribuidorId=$1 AND fecha=$2 AND estado='rechazado'",
        [userId, hoy]
      );

      if (!solAprobada.length && !solRechazada.length) {
        const { rows: solPendiente } = await pool.query(
          "SELECT 1 FROM solicitud_liquidacion_negativa WHERE distribuidorId=$1 AND fecha=$2 AND estado='pendiente'",
          [userId, hoy]
        );
        if (!solPendiente.length) {
          await pool.query(
            "INSERT INTO solicitud_liquidacion_negativa (distribuidorId, fecha, detalle, total) VALUES ($1,$2,$3,$4)",
            [userId, hoy, JSON.stringify(itemsCheck), itemsCheck.reduce((s,r) => s + Number(r.subtotal), 0)]
          );
        }
        return res.status(400).json({ 
          error: 'Hay productos con valores negativos. Se notificó al administrador para validar.',
          tieneNegativos: true
        });
      }

      if (solRechazada.length) {
        itemsCheck.forEach(item => {
          if (Number(item.vendido) < 0) {
            item.vendido = 0;
            item.subtotal = 0;
          }
        });
      }
    }

    const exist = await pool.query(
      'SELECT liquidacionId FROM liquidacion WHERE distribuidorId=$1 AND fecha=$2', [userId, hoy]
    );
    if (exist.rows.length) {
      return res.status(400).json({ error: 'Ya existe liquidación para hoy', liquidacionId: exist.rows[0].liquidacionid });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const total = itemsCheck.reduce((s, r) => s + Number(r.subtotal), 0);
      const { rows: liq } = await client.query(
        'INSERT INTO liquidacion (totalLiquidacion, distribuidorId, fecha) VALUES ($1,$2,$3) RETURNING *',
        [total, userId, hoy]
      );
      const liqId = liq[0].liquidacionid;
      for (const item of itemsCheck) {
        await client.query(
          'INSERT INTO detalleLiquidacion (liquidacionId, productoId, cantidadVendida, subtotal) VALUES ($1,$2,$3,$4)',
          [liqId, item.productid, item.vendido, item.subtotal]
        );
      }
      await client.query('COMMIT');
    // Guardar comision del dia
    const { rows: userComision } = await client.query(
        'SELECT comision FROM Usuarios WHERE UserId=$1', [userId]
    );
    const comision_pct = Number(userComision[0]?.comision || 0);

    const { rows: itemsConIva } = await client.query(`
        SELECT COALESCE(SUM(dl.subtotal),0) AS total,
                COALESCE(SUM(p.price_sin_iva * dl.cantidadVendida),0) AS total_sin_iva
        FROM detalleLiquidacion dl
        JOIN products p ON dl.productoId = p.productId
        WHERE dl.liquidacionId = $1
        `, [liqId]);

    const total_sin_iva = Number(itemsConIva[0]?.total_sin_iva || 0);
    const comision_valor = Math.round(total_sin_iva * comision_pct / 100);

    await client.query(
        'INSERT INTO pago_comision (distribuidorId, fecha, comision_valor) VALUES ($1,$2,$3)',
        [userId, hoy, comision_valor]
    );
    
      return res.status(201).json({ liquidacionId: liqId, total, fecha: hoy });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/vendedor', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  try {
    const { rows } = await pool.query(`
      SELECT l.*,
        (SELECT SUM(monto) FROM pagos p JOIN tipoEstado te ON p.tipoEstadoId=te.tipoEstadoId WHERE p.liquidacionId=l.liquidacionId AND te.especificacion='aceptado') AS pagado
      FROM liquidacion l
      WHERE l.distribuidorId = $1
      ORDER BY l.fecha DESC
      LIMIT 30
    `, [userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/solicitudes-negativas', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, u.username AS vendedor
      FROM solicitud_liquidacion_negativa s
      JOIN Usuarios u ON s.distribuidorId = u.UserId
      WHERE s.estado = 'pendiente'
      ORDER BY s.fecha DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/solicitudes-negativas/:id/aprobar', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      "UPDATE solicitud_liquidacion_negativa SET estado='aprobado', aprobado_por=$1, fecha_aprobacion=NOW() WHERE solicitudId=$2",
      [req.user.userId, req.params.id]
    );
    res.json({ message: 'Liquidación negativa aprobada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/solicitudes-negativas/:id/rechazar', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Obtener info de la solicitud
    const { rows: sol } = await client.query(
      'SELECT * FROM solicitud_liquidacion_negativa WHERE solicitudId=$1', [req.params.id]
    );
    if (!sol.length) throw new Error('Solicitud no encontrada');

    const { distribuidorid, fecha } = sol[0];

    // Marcar como rechazada
    await client.query(
      "UPDATE solicitud_liquidacion_negativa SET estado='rechazado', aprobado_por=$1, fecha_aprobacion=NOW() WHERE solicitudId=$2",
      [req.user.userId, req.params.id]
    );

    // Obtener productos con valores negativos
    const { rows: items } = await client.query(`
      WITH 
      inv_inicial AS (SELECT productId, COALESCE(SUM(cantidad),0) AS cant FROM inventario WHERE distribuidorId=$1 AND fecha=$2 AND tipo='inicial' GROUP BY productId),
      cargue_ap AS (SELECT productoId AS productId, COALESCE(SUM(cantidad),0) AS cant FROM cargue WHERE distribuidorId=$1 AND fecha=$2 AND estadoTipoId=2 GROUP BY productoId),
      pnc_hoy AS (SELECT productid AS productId, COALESCE(SUM(cantidad),0) AS cant FROM pnc WHERE distribuidorId=$1 AND fecha=$2 GROUP BY productid)
      SELECT p.productId,
        (COALESCE(ii.cant,0)+COALESCE(ca.cant,0)-COALESCE(pn.cant,0)) AS tope
      FROM products p
      LEFT JOIN inv_inicial ii ON p.productId=ii.productId
      LEFT JOIN cargue_ap ca ON p.productId=ca.productId
      LEFT JOIN pnc_hoy pn ON p.productId=pn.productId
      WHERE (COALESCE(ii.cant,0)+COALESCE(ca.cant,0)-COALESCE(pn.cant,0)) >= 0
    `, [distribuidorid, fecha]);

    // Para cada producto negativo, actualizar inventario final = inicial + cargue - pnc
    for (const item of items) {
      const { rows: invFinal } = await client.query(
        "SELECT inventarioId FROM inventario WHERE distribuidorId=$1 AND fecha=$2 AND productId=$3 AND tipo='final'",
        [distribuidorid, fecha, item.productid]
      );
      if (invFinal.length) {
        await client.query(
          "UPDATE inventario SET cantidad=$1 WHERE inventarioId=$2",
          [item.tope, invFinal[0].inventarioid]
        );
      } else {
        await client.query(
          "INSERT INTO inventario (distribuidorId, productId, cantidad, fecha, tipo) VALUES ($1,$2,$3,$4,'final')",
          [distribuidorid, item.productid, item.tope, fecha]
        );
      }
    }

    // También actualizar el inventario inicial del día siguiente
    const manana = new Date(fecha)
    manana.setDate(manana.getDate() + 1)
    const fechaManana = manana.toISOString().split('T')[0]

    for (const item of items) {
      const { rows: invInicial } = await client.query(
        "SELECT inventarioId FROM inventario WHERE distribuidorId=$1 AND fecha=$2 AND productId=$3 AND tipo='inicial'",
        [distribuidorid, fechaManana, item.productid]
      );
      if (invInicial.length) {
        await client.query(
          "UPDATE inventario SET cantidad=$1 WHERE inventarioId=$2",
          [item.tope, invInicial[0].inventarioid]
        );
      } else {
        await client.query(
          "INSERT INTO inventario (distribuidorId, productId, cantidad, fecha, tipo) VALUES ($1,$2,$3,$4,'inicial')",
          [distribuidorid, item.productid, item.tope, fechaManana]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Valores negativos corregidos en inventario. El vendedor puede generar la liquidación.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/solicitudes-negativas-vendedor', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const hoy = new Date().toISOString().split('T')[0];
  try {
    const { rows } = await pool.query(
      "SELECT estado FROM solicitud_liquidacion_negativa WHERE distribuidorId=$1 AND fecha=$2 ORDER BY solicitudId DESC LIMIT 1",
      [userId, hoy]
    );
    res.json(rows.length ? rows[0] : { estado: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT dl.*, p.productname, p.price
      FROM detalleLiquidacion dl
      JOIN products p ON dl.productoId = p.productId
      WHERE dl.liquidacionId = $1
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;