const { ChannelType, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Player } = require('../dbinit.js')
const { updateRank, calculateElo, K, getPreviousMatches, getRank, getMatchCount, rankedMatchesThreshold } = require('../helpers.js')
const Sequelize = require('sequelize');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Manually report the results of a match')
    .addStringOption(option =>
      option.setName('winner')
        .setDescription('The user who won the match')
        .setRequired(true))
      .addStringOption(option2 =>
        option2.setName('loser')
          .setDescription('The user who lost the match')
          .setRequired(true)),
  async execute(interaction) {
    const winnerId = interaction.options.getString('winner').match(/\d+/g)[0];
    const loserId = interaction.options.getString('loser').match(/\d+/g)[0];
    let winnerPlayer = await Player.findOne({ where: { userid: winnerId } });
    let loserPlayer = await Player.findOne({ where: { userid: loserId } });
    if (!(winnerPlayer && loserPlayer)) return interaction.reply(`Could not find user in database.`)
    if (!winnerPlayer.elo) {
      winnerPlayer.elo = 1500
    }
    if (!loserPlayer.elo) {
      loserPlayer.elo = 1500
    }
    let processedK = K
    const previousMatches = await getPreviousMatches(winnerId, loserId)
    if (previousMatches >= 3) {
      processedK = K / previousMatches // reduce the ELO constant by factor of number of matches in past 24 hours from original value
    }
    let winnerK = processedK
    let loserK = processedK
    let winnerRank = await getRank(winnerPlayer)
    let loserRank = await getRank(loserPlayer)
    if (winnerRank.label === 'Unranked') {
      let matchCount = getMatchCount(winnerPlayer)
      if (matchCount < 1) matchCount = 1
      winnerK*(rankedMatchesThreshold + 1 - matchCount)
    }
    if (loserRank.label === 'Unranked') {
      let matchCount = getMatchCount(loserPlayer)
      if (matchCount < 1) matchCount = 1
      loserK*(rankedMatchesThreshold + 1 - matchCount)
    }

    let newElo = await calculateElo(winnerPlayer.elo, loserPlayer.elo, winnerK, loserK)
    try {
      winnerPlayer.elo = newElo.newWinnerElo
      loserPlayer.elo = newElo.newLoserElo
      
      await winnerPlayer.save()
      await loserPlayer.save()
      // await updateRank(winnerPlayer)
      // await updateRank(loserPlayer)
      return interaction.reply(`Updated elo between ${interaction.options.getString('winner')} and ${interaction.options.getString('loser')}`);
    } catch (error) {
      return interaction.reply('Something went wrong when reporting match winner' + `\n\`` + error + `\``);
    }

  }
}

