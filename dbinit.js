const Sequelize = require('sequelize');

const sequelize = new Sequelize('eris', 'username', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: '/home/carlo/Eris/db/eris.sqlite',
});

const Player = require('./db/Player.js')(sequelize, Sequelize.DataTypes);
const Match = require('./db/Match.js')(sequelize, Sequelize.DataTypes);
const Game = require('./db/Game.js')(sequelize, Sequelize.DataTypes);

const force = process.argv.includes('--force') || process.argv.includes('-f');

sequelize.sync({ force })
try {
  sequelize.authenticate();
  console.log('Connection to database has been established successfully.');
} catch (error) {
  console.error('Unable to connect to the database:', error);
}
module.exports = { Player, Match, Game }
