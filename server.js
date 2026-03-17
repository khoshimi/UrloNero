const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const { sequelize, User, Application, Review, ContentBlock } = require('./db');

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

function hashPassword(password) {
  return crypto
    .createHash('sha256')
    .update('urlo-nero-salt-' + String(password))
    .digest('hex');
}

// ======= Вспомогательные функции для админа =======
async function findAdminByEmail(email) {
  if (!email) return null;
  return User.findOne({ where: { email, isAdmin: true } });
}

async function requireAdmin(req, res, next) {
  try {
    const adminEmail = req.headers['x-admin-email'];
    const admin = await findAdminByEmail(adminEmail);
    if (!admin) {
      return res.status(403).json({ error: 'Нет прав администратора' });
    }
    req.admin = admin;
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка проверки прав администратора' });
  }
}

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

    const passwordHash = hashPassword(password);
    const user = await User.create({ name, email, phone, password: passwordHash });
    const { password: _, ...safeUser } = user.toJSON();
    res.json(safeUser);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// вход администратора
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Укажите e-mail и пароль' });
    }
    
    const passwordHash = hashPassword(password);
    const admin = await User.findOne({ where: { email, password: passwordHash, isAdmin: true } });
    
    if (!admin) {
      return res.status(401).json({ error: 'Неверные данные администратора' });
    }
    
    const { password: _, ...safeAdmin } = admin.toJSON();
    res.json({ ...safeAdmin, isAdmin: true });
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

    const passwordHash = hashPassword(password);
    const user = await User.findOne({ where: { email, password: passwordHash } });
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
    
    // Если это админ - добавляем флаг
    if (user.isAdmin) {
      res.json({ user: { ...safeUser, isAdmin: true }, applications: apps, isAdmin: true });
    } else {
      res.json({ user: safeUser, applications: apps });
    }
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

// список всех заявок для админа
app.get('/api/admin/applications', requireAdmin, async (req, res) => {
  try {
    const apps = await Application.findAll({
      include: [{ model: User, attributes: ['id', 'name', 'email', 'phone'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(apps);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// изменение статуса заявки
app.patch('/api/admin/applications/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body || {};
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Некорректный статус' });
    }
    const appItem = await Application.findByPk(id, { include: [User] });
    if (!appItem) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }
    appItem.status = status;
    await appItem.save();

    if (status === 'approved' && appItem.User && appItem.User.email) {
      console.log(
        `Отправка письма пользователю ${appItem.User.email} об одобрении заявки #${appItem.id}`
      );
    }

    res.json(appItem);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// список пользователей для админа
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ======= API: контент =======
app.get('/api/admin/content', requireAdmin, async (req, res) => {
  try {
    const items = await ContentBlock.findAll({ order: [['key', 'ASC']] });
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/admin/content', requireAdmin, async (req, res) => {
  try {
    const { key, value } = req.body || {};
    if (!key) {
      return res.status(400).json({ error: 'Нет ключа контента' });
    }
    const [item] = await ContentBlock.findOrCreate({
      where: { key },
      defaults: { value: value || '' }
    });
    if (value !== undefined) {
      item.value = value;
      await item.save();
    }
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.delete('/api/admin/content/:key', requireAdmin, async (req, res) => {
  try {
    const key = req.params.key;
    await ContentBlock.destroy({ where: { key } });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/content', async (req, res) => {
  try {
    const keys = (req.query.keys || '').split(',').filter(Boolean);
    let where = {};
    if (keys.length) {
      where.key = keys;
    }
    const items = await ContentBlock.findAll({ where });
    res.json(items);
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

app.get('/api/admin/reviews', requireAdmin, async (req, res) => {
  try {
    const reviews = await Review.findAll({
      include: [{ model: User, attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(reviews);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.delete('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    await Review.destroy({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.patch('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { isVisible } = req.body || {};
    
    const review = await Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ error: 'Отзыв не найден' });
    }
    
    if (isVisible !== undefined) {
      review.isVisible = isVisible;
      await review.save();
    }
    
    res.json(review);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

async function start() {
  try {
    // ПРИНУДИТЕЛЬНО пересоздаем таблицы с правильной структурой
    await sequelize.sync({ force: true });
    
    console.log('✅ База данных пересоздана');

    // Создаем администратора
    const admin = await User.create({
      name: 'Администратор',
      email: 'admin@gmail.com',
      phone: '+7 999 999-99-99',
      password: hashPassword('admin'),
      isAdmin: true
    });

    console.log('===========================================');
    console.log('✅ АДМИН СОЗДАН!');
    console.log('===========================================');
    console.log('📧 Email: admin@gmail.com');
    console.log('🔑 Пароль: admin');
    console.log('===========================================');
    console.log('👉 Админ-панель доступна по адресу:');
    console.log('👉 http://localhost:3000/admin.html');
    console.log('===========================================');

    app.listen(PORT, () => {
      console.log(`🌐 Сервер запущен: http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error('❌ Ошибка запуска сервера', e);
  }
}

start();