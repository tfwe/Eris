const Sequelize = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Player = sequelize.define('Player', {
    userid: {
      type: Sequelize.STRING,
      primaryKey: true,
      unique: true,
    },
    handle: {
      type: Sequelize.STRING,
    },
    region: {
      type: Sequelize.STRING,
    },
    elo: {
      type: Sequelize.INTEGER,
      defaultValue: 1500,
      notNull: true
    },
    matchid: {
      type: Sequelize.STRING,
      defaultValue: 'N/A',
    },
    disputes: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.NOW
    },
  });
  return Player;
};

