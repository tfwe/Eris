const Sequelize = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Match = sequelize.define('Match', {
    matchid: {
      type: Sequelize.STRING,
      unique: true,
      primaryKey: true
    },
    winner: {
      type: Sequelize.STRING,
      defaultValue: 'N/A'
    },
    player1id: {
      type: Sequelize.STRING,
    },
    player2id: {
      type: Sequelize.STRING,
    },
    player1elo: {
      type: Sequelize.INTEGER,
    },
    player2elo: {
      type: Sequelize.INTEGER,
    },
    player1score: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    player2score: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.NOW
    },
  });
  return Match;
};

