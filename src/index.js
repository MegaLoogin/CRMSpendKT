require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(express.json());

// Логирование всех запросов
// app.use((req, res, next) => {
//   console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
//   next();
// });

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

const spendRoutes = require('./routes/spend');
app.use('/api/spend', spendRoutes);

const keitaroRoutes = require('./routes/keitaro');
app.use('/api/keitaro', keitaroRoutes);

const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);

const commissionRoutes = require('./routes/commission');
app.use('/api/commission', commissionRoutes);

const PORT = process.env.APP_PORT || 3000;
const MONGO_URL = process.env.MONGO_URL;

async function createInitialAdmin() {
  const adminExists = await User.findOne({ roles: 'admin' });
  if (!adminExists) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hashPassword = await bcrypt.hash(password, 10);
    const admin = new User({
      username,
      password: hashPassword,
      roles: ['admin'],
      btag: '',
      refreshTokens: []
    });
    await admin.save();
    console.log(`Создан админ: ${username} / ${password}`);
  }
}

mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('MongoDB connected');
    await createInitialAdmin();
  })
  .catch((err) => console.error('MongoDB connection error:', err));

app.use(express.static(path.join(__dirname, '../client/build')));

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

app.get('/', (req, res) => {
  res.send('CRM API работает!');
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
