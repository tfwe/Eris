const { SlashCommandBuilder } = require('discord.js');
const { Player, Match } = require('../dbinit.js');
const logger = require('../logger.js');
const { getMatchCount, getRank, updateRank, getTotalRankedPlayers, getPlayersWithHigherElo, getRegionRankedPlayers, getRegionPlayersWithHigherElo } = require('../helpers.js');
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
    await interaction.deferReply();
    const mention = interaction.options.getString('mention');
    const userId = mention.match(/\d+/g)[0];
    const player = await Player.findOne({ where: { userid: userId } });
    if (!player) {
      return await interaction.reply({content: 'Player not found.', ephemeral: true});
    }
    const totalPlayers = await getTotalRankedPlayers();
    const playersWithHigherElo = await getPlayersWithHigherElo(player) 
    const percentage = Math.round((playersWithHigherElo / totalPlayers) * 100);
    const inMatch = (player.matchid !== 'N/A')
    await updateRank(player)
    const rank = await getRank(player)
    const unranked = await isUnranked(player)
    const matchCount = await getMatchCount(player)
    const winsCount = await Match.count({
      where: {
        [Op.or]: [
          { player1id: player.userid, winner: player.userid },
          { player2id: player.userid, winner: player.userid },
        ],
      },
    });
    const regionTotalPlayers = await getRegionRankedPlayers(player.region)
    const regionPlayerRank = await getRegionPlayersWithHigherElo(player, player.region);
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
          name: 'Rank',
          value: `${rank.label} \n${player.elo}${unranked ? '?' : ''}`,
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
          name: `${player.region} Rank`,
          value: `#${regionPlayerRank + 1} / ${regionTotalPlayers}`,
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
          name: 'Global Rank',
          value: `#${playersWithHigherElo + 1} / ${totalPlayers}\n Top ${(percentage) ? percentage : 0.1}% of ranked players`,
          inline: true,
        },
      ],
    };
    return await interaction.editReply({ content: '', embeds: [playerInfoEmbed] });
  },
};
