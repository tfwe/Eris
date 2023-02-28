const { SlashCommandBuilder } = require('discord.js');
const { Player, Match } = require('../dbinit.js');
const { getMatchCount, getRank } = require('../helpers.js');
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
    const highestPercentage = Math.round(100 - percentage);
    const inMatch = (player.matchid !== 'N/A')
    const rank = await getRank(player.userid)
    const matchCount = await getMatchCount(userId)
    const winsCount = await Match.count({
      where: {
        [Op.or]: [
          { player1id: player.userid, winner: player.userid },
          { player2id: player.userid, winner: player.userid },
        ],
      },
    });
    let regionPlayers = await Player.findAll({
      where: { region: player.region },
      order: [['elo', 'DESC']],
    });

    const regionPlayerIndex = regionPlayers.findIndex(p => p.userid === player.userid);
    const regionPlayerRank = regionPlayerIndex + 1;
    const regionTotalPlayers = regionPlayers.length;
    
    const playerInfoEmbed = {
      color: rank.color,
      title: 'Player Information',
      fields: [
        {
          name: 'Handle',
          value: `${player.handle}`,
          inline: true,
        },
        {
          name: 'Region',
          value: `${player.region}`,
          inline: true,
        },
        {
          name: 'ELO',
          value: `${player.elo}`,
          inline: true,
        },
        {
          name: 'Matches played',
          value: `${matchCount}`,
          inline: true,
        },
        {
          name: 'Matches won',
          value: `${winsCount}`,
          inline: true,
        },
        {
          name: 'Win rate',
          value: `${(winsCount / matchCount * 100).toFixed(2)}%`,
          inline: true,
        },
        {
          name: 'Rank in ' + `${player.region}`,
          value: `#${regionPlayerRank + '/' + regionTotalPlayers}`,
          inline: true,
        },
        {
          name: 'In a match',
          value: `${inMatch}`,
          inline: true,
        },
        {
          name: 'Disputes',
          value: `${player.disputes}`,
          inline: true,
        },
        {
          name: 'Created At',
          value: `${player.createdAt.toLocaleDateString()}`,
          inline: true,
        },
        {
          name: 'Updated At',
          value: `${player.updatedAt.toLocaleDateString()}`,
          inline: true,
        },
        {
          name: 'Rank',
          value: `${rank.label}`,
          inline: false,
        },
        {
          name: 'Global Rank',
          value: `#${playersWithHigherElo}/${totalPlayers}\n ELO greater than ${highestPercentage}% of ranked players`,
          inline: true,
        },
      ],
    };
    return interaction.reply({ content: '', embeds: [playerInfoEmbed] });
  },
};
