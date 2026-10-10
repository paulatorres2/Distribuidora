require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',        require('./routes/auth'));
app.use('/api/products',    require('./routes/products'));
app.use('/api/inventario',  require('./routes/inventario'));
app.use('/api/cargue',      require('./routes/cargue'));
app.use('/api/liquidacion', require('./routes/liquidacion'));
app.use('/api/pagos',       require('./routes/pagos'));
app.use('/api/pnc',         require('./routes/pnc'));
app.use('/api/deudores',    require('./routes/deudores'));
app.use('/api/pasivos',     require('./routes/pasivos'));
app.use('/api/bodega',      require('./routes/bodega'));
app.use('/api/dashboard',   require('./routes/dashboard'));
app.use('/api/informes', require('./routes/informes'));
app.use('/api/prestamos', require('./routes/prestamos'));

app.get('/api/ping', (req, res) => res.json({ ok: true }));


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));