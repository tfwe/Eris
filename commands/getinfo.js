const { SlashCommandBuilder } = require('discord.js');
const { Player, Match } = require('../dbinit.js');
const { Sequelize } = require('sequelize');
const Op = Sequelize.Op;


module.exports = {
  data: new SlashCommandBuilder()
    .setName('getinfo')
    .setDescription('Retrieve information about a player')
    .addStringOption(option =>
      option.setName('mention')
      .setDescription('Mention the player')
      .setRequired(true)
    ),
  async execute(interaction) {
    const mention = interaction.options.getString('mention');
    const userId = mention.match(/\d+/g)[0];
    const player = await Player.findOne({ where: { userid: userId } });
    if (!player) {
      return interaction.reply('Player not found.');
    }
    const totalPlayers = await Player.count();
    const playersWithHigherElo = await Player.count({ where: { elo: { [Op.gte]: player.elo } } });
    const percentage = (playersWithHigherElo / totalPlayers) * 100;
    const highestPercentage = 100 - percentage;
    const inMatch = (player.matchid !== 'N/A')
    const matchCount = await Match.count({
      where: {
        [Op.or]: [
          { player1id: player.userid, winner: { [Op.ne]: 'N/A' } },
          { player2id: player.userid, winner: { [Op.ne]: 'N/A' } },
        ],
      },
    })
    const winsCount = await Match.count({
      where: {
        [Op.or]: [
          { player1id: player.userid, winner: player.userid },
          { player2id: player.userid, winner: player.userid },
        ],
      },
    });
    const regionPlayers = await Player.findAll({
      where: { region: player.region },
      order: [['elo', 'DESC']],
    });

    const regionPlayerIndex = regionPlayers.findIndex(p => p.userid === player.userid);
    const regionPlayerRank = regionPlayerIndex + 1;
    const regionTotalPlayers = regionPlayers.length;
    const playerInfo = `
\`\`\`Player Information:
-----------------
Handle: ${player.handle}
Region: ${player.region}
ELO: ${player.elo}
Matches played: ${matchCount}
Matches won: ${winsCount}
Win rate: ${(winsCount / matchCount * 100).toFixed(2)}%
Rank in ${player.region}: ${regionPlayerRank}/${regionTotalPlayers}

In a match: ${inMatch}
Disputes: ${player.disputes}
Created At: ${player.createdAt.toLocaleDateString()}
Updated At: ${player.updatedAt.toLocaleDateString()}

You are in the top ${highestPercentage.toFixed(2)}% of players! (#${playersWithHigherElo} / ${totalPlayers})
    \`\`\``;

    return interaction.reply(`${playerInfo}`);

  },
};
