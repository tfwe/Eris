const { ChannelType, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Player } = require('../dbinit.js')
const { K, rankedMatchesThreshold, getMatchCount, getRank, getPreviousMatches, updateElo } = require('../helpers.js')
const logger = require('../logger');
const { matchStatsArray } = require('../matches.json')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Forfeit and leave a match'),
  async execute(interaction) {
    if (!interaction.channel.isThread()) return await interaction.reply({ content: "Please use this command in a match thread.", ephemeral: true })


    let player1 = await Player.findOne({ where: { userid: interaction.member.user.id } });
    if (!player1) return await interaction.reply({ content: "Please register using /register to play ranked matches.", ephemeral: true });
    if (player1.matchid === 'N/A') return await interaction.reply({ content: "You are not currently in a match.", ephemeral: true })

    let matchStats = matchStatsArray.find( matchStats => matchStats.matchid === interaction.channel.id);
    if (!matchStats) {
      throw matchStatsException
    }
    if (!matchStats.started) {
      return interaction.reply({content:'You cannot leave a match that hasn\'t started.', ephemeral: true})
    }
    matchStats.winner = (interaction.member.user.id === matchStats.player1.id) ? matchStats.player2.id : matchStats.player1.id
    const postMatchExpMins = 5
    player1 = await Player.findOne({ where: { userid: matchStats.player1.id } });
    let player2 = await Player.findOne({ where: { userid: matchStats.player2.id } });
    if (!player1 || !player2) return logger.error(`[WARN] Something went wrong in leave`)
    await updateElo(matchStats)
    await player1.update({ matchid: 'N/A' }, { where: { userid: player1.userid } });
    await player2.update({ matchid: 'N/A' }, { where: { userid: player2.userid } });
    logger.error(player1)
    logger.error(player2)
    await player1.save();
    await player2.save();
    await updateDB(matchStats)
    matchStatsArray.splice(matchStatsArray.indexOf(matchStats), 1) 
    logger.info(`[chatCommand] ${interaction.member.user} successfully left match`)
    const post = await interaction.reply({ content:`${interaction.member.user} has left the game.`});
    await interaction.channel.setLocked(true)
    await interaction.channel.setArchived(true)
  }
}
