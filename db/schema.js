const Sequelize = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Guild = sequelize.define('Guild', {
    guildid: {
      type: Sequelize.STRING,
      primaryKey: true
    },
  });

  const Player = sequelize.define('Player', {
    userid: {
      type: Sequelize.STRING,
      primaryKey: true,
    },
    handle: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    region: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    elo: {
      type: Sequelize.INTEGER,
      defaultValue: 1500,
      allowNull: false
    },
    rank: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    inMatch: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    matchesPlayed: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    disputes: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
  });

  const PlayerGuild = sequelize.define('PlayerGuild', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
  });

  const Match = sequelize.define('Match', {
    matchid: {
      type: Sequelize.STRING,
      primaryKey: true
    },
    guildid: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    player1id: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    player2id: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    winner: {
      type: Sequelize.STRING,
    },
    player1elo: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    player2elo: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    player1score: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    player2score: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
  });

  const Game = sequelize.define('Game', {
    gameid: {
      type: Sequelize.STRING,
      primaryKey: true
    },
    matchid: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    player1char: {
      type: Sequelize.STRING,
    },
    player2char: {
      type: Sequelize.STRING,
    },
    winner: {
      type: Sequelize.STRING,
    },
    stage: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  });

  Guild.hasMany(Match, {
    foreignKey: 'matchid'
  });
  Match.belongsTo(Guild, {
    foreignKey: 'guildid'
  });

  Player.hasMany(Match, {
    foreignKey: 'player1id'
  });
  Player.hasMany(Match, {
    foreignKey: 'player2id'
  });
  Match.belongsTo(Player, {
    as: 'Player1',
    foreignKey: 'player1id'
  });
  Match.belongsTo(Player, {
    as: 'Player2',
    foreignKey: 'player2id'
  });
  
  Player.belongsToMany(Guild, { 
    through: PlayerGuild, 
    foreignKey: 'userid' 
  });
  Guild.belongsToMany(Player, { 
    through: PlayerGuild, 
    foreignKey: 'guildid' 
  });

  Match.hasMany(Game, { 
    foreignKey: 'matchid' 
  });
  Game.belongsTo(Match, { 
    foreignKey: 'matchid'
  });

  return {
    Guild,
    Player,
    Match,
    Game,
  };
};
