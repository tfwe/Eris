const Sequelize = require('sequelize');
const logger = require('./logger.js');
const { dbLoc } = require('./config.json');
// dbLoc is a string specifying database path

const sequelize = new Sequelize('eris', 'username', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: msg => logger.debug(msg),
	storage: dbLoc,
});

const { Guild, Player, Match, Game, Rank, GuildRank, GuildRegion} = require('./db/schema.js')(sequelize, Sequelize.DataTypes);
// const Player = require('./db/Player.js')(sequelize, Sequelize.DataTypes);
// const Match = require('./db/Match.js')(sequelize, Sequelize.DataTypes);
// const Game = require('./db/Game.js')(sequelize, Sequelize.DataTypes);

const force = process.argv.includes('--force') || process.argv.includes('-f');
async function initializeDb() {
  try {
    sequelize.sync({ force })
    sequelize.authenticate();
    logger.info('Connection to database has been established successfully.');
    // const players = await Player.findAll();
    // for (const player of players) {
      // await updateRank(player);
    // }
    // logger.info('Rank updates have been processed successfully.');
  } catch (error) {
    logger.error(`Unable to connect to the database: ${error}`);
  }
}

module.exports = { Player, Match, Game, Guild, Rank, GuildRank, GuildRegion, initializeDb }
