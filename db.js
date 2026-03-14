const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'data', 'database.sqlite'),
  logging: false
});

// ===== Сущность User =====
const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    avatar: {
      type: DataTypes.TEXT, // dataURL или ссылка
      allowNull: true
    }
  },
  {
    tableName: 'users'
  }
);

// ===== Сущность Application (заявка на аренду) =====
const Application = sequelize.define(
  'Application',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    direction: {
      type: DataTypes.STRING,
      allowNull: false
    },
    date: {
      type: DataTypes.STRING,
      allowNull: false
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'applications'
  }
);

// ===== Сущность Review (отзыв) =====
const Review = sequelize.define(
  'Review',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Аноним'
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  },
  {
    tableName: 'reviews'
  }
);

// Связи
User.hasMany(Application, { foreignKey: 'userId' });
Application.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Review, { foreignKey: 'userId', allowNull: true });
Review.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  User,
  Application,
  Review
};


