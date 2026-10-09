const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM usuarios WHERE username = $1 AND activo = TRUE', [username]
    );
    if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      { userId: user.userid, username: user.username, usertype: user.usertype },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    );
    res.json({ token, user: { id: user.userid, username: user.username, usertype: user.usertype } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/vendedores', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT userid, username FROM Usuarios WHERE usertype = 'vendedor' AND activo = TRUE ORDER BY username"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/comision/:id', authMiddleware, async (req, res) => {
  if (req.user.usertype !== 'admin')
    return res.status(403).json({ error: 'Solo administradores' });
  const { comision } = req.body;
  try {
    await pool.query(
      'UPDATE Usuarios SET comision=$1 WHERE UserId=$2',
      [comision, req.params.id]
    );
    res.json({ message: 'Comisión actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/register', authMiddleware, async (req, res) => {
  if (req.user.usertype !== 'admin')
    return res.status(403).json({ error: 'Solo administradores' });
  const { username, password, usertype, comision } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const tipoId = usertype === 'admin' ? 1 : 2;
    const { rows } = await pool.query(
      'INSERT INTO Usuarios (username, password, usertype, TipoUsuarioId, comision) VALUES ($1,$2,$3,$4,$5) RETURNING userid, username, usertype',
      [username, hash, usertype, tipoId, comision || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/desactivar/:id', authMiddleware, async (req, res) => {
  if (req.user.usertype !== 'admin')
    return res.status(403).json({ error: 'Solo administradores' });
  if (req.user.userId == req.params.id)
    return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' });
  try {
    await pool.query(
      'UPDATE Usuarios SET activo=FALSE WHERE UserId=$1',
      [req.params.id]
    );
    res.json({ message: 'Usuario desactivado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/activar/:id', authMiddleware, async (req, res) => {
  if (req.user.usertype !== 'admin')
    return res.status(403).json({ error: 'Solo administradores' });
  try {
    await pool.query(
      'UPDATE Usuarios SET activo=TRUE WHERE UserId=$1',
      [req.params.id]
    );
    res.json({ message: 'Usuario activado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/vendedores-todos', authMiddleware, async (req, res) => {
  if (req.user.usertype !== 'admin')
    return res.status(403).json({ error: 'Solo administradores' });
  try {
    const { rows } = await pool.query(
      "SELECT userid, username, activo, comision FROM Usuarios WHERE usertype = 'vendedor' ORDER BY username"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;