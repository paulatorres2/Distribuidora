const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT p.*, ib.CantidadExistente FROM products p LEFT JOIN Inventario_Bodega ib ON p.productId = ib.productId WHERE p.activo = TRUE ORDER BY p.productname'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { productname, price, price_sin_iva } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO products (productname, price, price_sin_iva) VALUES ($1,$2,$3) RETURNING *',
      [productname, price, price_sin_iva]
    );
    await pool.query(
      'INSERT INTO Inventario_Bodega (productId, CantidadExistente) VALUES ($1, 0)',
      [rows[0].productid]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  const { productname, price, price_sin_iva } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE products SET productname=$1, price=$2, price_sin_iva=$3 WHERE productId=$4 RETURNING *',
      [productname, price, price_sin_iva, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;