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
    
    const playerInfoEmbed = {
      color: 0xFFB900,
      title: 'Player Information',
      fields: [
        {
          name: 'Handle',
          value: player.handle,
          inline: true,
        },
        {
          name: 'Region',
          value: player.region,
          inline: true,
        },
        {
          name: 'ELO',
          value: `${player.elo}`,
          inline: true,
        },
        {
          name: 'Matches played',
          value: matchCount,
          inline: true,
        },
        {
          name: 'Matches won',
          value: winsCount,
          inline: true,
        },
        {
          name: 'Win rate',
          value: `${(winsCount / matchCount * 100).toFixed(2)}%`,
          inline: true,
        },
        {
          name: 'Rank in ' + player.region,
          value: regionPlayerRank + '/' + regionTotalPlayers,
          inline: true,
        },
        {
          name: 'In a match',
          value: inMatch,
          inline: true,
        },
        {
          name: 'Disputes',
          value: player.disputes,
          inline: true,
        },
        {
          name: 'Created At',
          value: player.createdAt.toLocaleDateString(),
          inline: true,
        },
        {
          name: 'Updated At',
          value: player.updatedAt.toLocaleDateString(),
          inline: true,
        },
        {
          name: 'Rank',
          value: `Your rank surpasses ${highestPercentage.toFixed(2)}% of all players! (#${playersWithHigherElo}/${totalPlayers})`,
          inline: false,
        },
      ],
    };

    return interaction.reply({ content: '', embeds: [playerInfoEmbed] });
  },
};
