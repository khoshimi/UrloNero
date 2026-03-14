const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { sequelize, User, Application, Review } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));

// статика (сайт + загруженные файлы)
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// папка для аватарок
const AVATAR_DIR = path.join(__dirname, 'uploads', 'avatars');
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: AVATAR_DIR,
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '');
    cb(null, unique + ext);
  }
});

const uploadAvatar = multer({ storage: avatarStorage });

// ======= API: пользователи =======
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body || {};
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Не все поля заполнены' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Пользователь с таким e-mail уже существует' });
    }

    const user = await User.create({ name, email, phone, password });
    const { password: _, ...safeUser } = user.toJSON();
    res.json(safeUser);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Укажите e-mail и пароль' });
    }

    const user = await User.findOne({ where: { email, password } });
    if (!user) {
      return res.status(401).json({ error: 'Неверный e-mail или пароль' });
    }

    const { password: _, ...safeUser } = user.toJSON();
    res.json(safeUser);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/profile/avatar', uploadAvatar.single('avatar'), async (req, res) => {
  try {
    const email = req.body.email;
    if (!email || !req.file) {
      return res.status(400).json({ error: 'Нет email или файла avatar' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const relativePath = '/uploads/avatars/' + req.file.filename;
    user.avatar = relativePath;
    await user.save();

    const { password: _, ...safeUser } = user.toJSON();
    res.json(safeUser);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/profile', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res.status(400).json({ error: 'Не указан email' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const apps = await Application.findAll({
      where: { userId: user.id },
      order: [['createdAt', 'DESC']]
    });

    const { password: _, ...safeUser } = user.toJSON();
    res.json({ user: safeUser, applications: apps });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ======= API: заявки =======
app.post('/api/applications', async (req, res) => {
  try {
    const { email, direction, date, comment } = req.body || {};
    if (!email || !direction || !date) {
      return res.status(400).json({ error: 'Не хватает полей заявки' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const appItem = await Application.create({
      userId: user.id,
      direction,
      date,
      comment: comment || ''
    });
    res.json(appItem);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/applications', async (req, res) => {
  try {
    const email = req.query.email;
    let where = {};
    if (email) {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.json([]);
      }
      where.userId = user.id;
    }
    const apps = await Application.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(apps);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ======= API: отзывы =======
app.post('/api/reviews', async (req, res) => {
  try {
    const { name, text, email } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: 'Пустой текст отзыва' });
    }

    let userId = null;
    if (email) {
      const user = await User.findOne({ where: { email } });
      if (user) {
        userId = user.id;
      }
    }

    const review = await Review.create({
      name: name || 'Аноним',
      text,
      userId
    });
    res.json(review);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await Review.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(reviews);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

async function start() {
  try {
    await sequelize.sync();
    app.listen(PORT, () => {
      console.log(`Server started on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error('Не удалось запустить сервер', e);
  }
}

start();

