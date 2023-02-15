const Sequelize = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Match = sequelize.define('Game', {
    matchid: {
      type: Sequelize.STRING,
      unique: true,
      primaryKey: true
    },
    player1id: {
      type: Sequelize.STRING,
    },
    player2id: {
      type: Sequelize.STRING,
    },
    winner: {
      type: Sequelize.STRING,
      defaultValue: 'N/A'
    },
    stage: {
      type: Sequelize.STRING,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.NOW
    },
  });
  return Match;
};

