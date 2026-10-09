const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.get('/hoy', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const hoy = new Date().toISOString().split('T')[0];
  try {
    const { rows } = await pool.query(`
      SELECT i.*, p.productname, p.price
      FROM inventario i
      JOIN products p ON i.productId = p.productId
      WHERE i.distribuidorId = $1 AND i.fecha = $2 AND i.tipo = 'inicial'
      ORDER BY p.productname
    `, [userId, hoy]);

    if (!rows.length) {
      const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const { rows: ayer_rows } = await pool.query(`
        SELECT i.*, p.productname, p.price
        FROM inventario i
        JOIN products p ON i.productId = p.productId
        WHERE i.distribuidorId = $1 AND i.fecha = $2 AND i.tipo = 'final'
        ORDER BY p.productname
      `, [userId, ayer]);
      return res.json({ inventario: ayer_rows, esDeAyer: true });
    }
    res.json({ inventario: rows, esDeAyer: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/inicial', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const { items } = req.body;
  const hoy = new Date().toISOString().split('T')[0];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const check = await client.query(
      "SELECT 1 FROM inventario WHERE distribuidorId=$1 AND fecha=$2 AND tipo='inicial'",
      [userId, hoy]
    );
    if (check.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ya registraste inventario inicial hoy' });
    }
    for (const item of items) {
      await client.query(
        "INSERT INTO inventario (distribuidorId, productId, cantidad, fecha, tipo) VALUES ($1,$2,$3,$4,'inicial')",
        [userId, item.productId, item.cantidad, hoy]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ message: 'Inventario inicial registrado' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post('/final', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const { items } = req.body;
  const hoy = new Date().toISOString().split('T')[0];
  const manana = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const check = await client.query(
      "SELECT 1 FROM inventario WHERE distribuidorId=$1 AND fecha=$2 AND tipo='final'",
      [userId, hoy]
    );
    if (check.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ya registraste inventario final hoy' });
    }
    for (const item of items) {
      await client.query(
        "INSERT INTO inventario (distribuidorId, productId, cantidad, fecha, tipo) VALUES ($1,$2,$3,$4,'final')",
        [userId, item.productId, item.cantidad, hoy]
      );
    }
    for (const item of items) {
      await client.query(
        "INSERT INTO inventario (distribuidorId, productId, cantidad, fecha, tipo) VALUES ($1,$2,$3,$4,'inicial') ON CONFLICT DO NOTHING",
        [userId, item.productId, item.cantidad, manana]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ message: 'Inventario final registrado. Mañana tendrás tu inventario inicial listo.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/historial/:userId', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT i.*, p.productname, p.price
      FROM inventario i
      JOIN products p ON i.productId = p.productId
      WHERE i.distribuidorId = $1
      ORDER BY i.fecha DESC, i.tipo
    `, [req.params.userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vendedor solicita inicio en cero
router.post('/solicitar-cero', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const hoy = new Date()
  hoy.setDate(hoy.getDate() - 1)
  const fecha = hoy.toISOString().split('T')[0]
  try {
    const check = await pool.query(
      "SELECT 1 FROM solicitud_inicio_cero WHERE distribuidorId=$1 AND fecha=$2",
      [userId, fecha]
    );
    if (check.rows.length) {
      return res.status(400).json({ error: 'Ya enviaste esta solicitud' });
    }
    await pool.query(
      "INSERT INTO solicitud_inicio_cero (distribuidorId, fecha) VALUES ($1,$2)",
      [userId, fecha]
    );
    res.status(201).json({ message: 'Solicitud enviada al administrador' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin obtiene solicitudes pendientes
router.get('/solicitudes-cero', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, u.username AS vendedor
      FROM solicitud_inicio_cero s
      JOIN Usuarios u ON s.distribuidorId = u.UserId
      WHERE s.estado = 'pendiente'
      ORDER BY s.fecha DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin aprueba solicitud - marca la liquidacion para usar cero en inventario inicial
router.put('/solicitudes-cero/:id/aprobar', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: sol } = await client.query(
      'SELECT * FROM solicitud_inicio_cero WHERE solicitudId=$1', [req.params.id]
    );
    if (!sol.length) throw new Error('Solicitud no encontrada');

    await client.query(
      "UPDATE solicitud_inicio_cero SET estado='aprobado', aprobado_por=$1, fecha_aprobacion=NOW() WHERE solicitudId=$2",
      [req.user.userId, req.params.id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Solicitud aprobada. El inventario inicial no sumará a la liquidación.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;