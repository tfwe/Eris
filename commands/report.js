const { ChannelType, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Player } = require('../dbinit.js')
const { updateRank, calculateElo, K, getPreviousMatches, getRank, getMatchCount, rankedMatchesThreshold } = require('../helpers.js')
const Sequelize = require('sequelize');

// Define the command for reporting match results
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
    // Extracting user IDs from the interaction options
    const winnerId = interaction.options.getString('winner').match(/\d+/g)[0];
    const loserId = interaction.options.getString('loser').match(/\d+/g)[0];
    
    // Fetching player data from the database
    let winnerPlayer = await Player.findOne({ where: { userid: winnerId } });
    let loserPlayer = await Player.findOne({ where: { userid: loserId } });
    
    // Handling cases where players are not found in the database
    if (!(winnerPlayer && loserPlayer)) return interaction.reply(`Could not find user in database.`)
    
    // Setting default ELO for new players
    if (!winnerPlayer.elo) {
      winnerPlayer.elo = 1500
    }
    if (!loserPlayer.elo) {
      loserPlayer.elo = 1500
    }
    
    // Adjusting K value based on the number of previous matches
    let processedK = K
    const previousMatches = await getPreviousMatches(winnerId, loserId)
    if (previousMatches >= 3) {
      processedK = K / previousMatches // reduce the ELO constant by factor of number of matches in past 24 hours from original value
    }
    let winnerK = processedK
    let loserK = processedK
    
    // Calculating ranks for winner and loser
    let winnerRank = await getRank(winnerPlayer)
    let loserRank = await getRank(loserPlayer)
    
    // Adjusting K value based on unranked status and match count
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

    // Calculating new ELO values
    let newElo = await calculateElo(winnerPlayer.elo, loserPlayer.elo, winnerK, loserK)
    
    // Updating player data in the database
    try {
      winnerPlayer.elo = newElo.newWinnerElo
      loserPlayer.elo = newElo.newLoserElo
      
      // Incrementing match counts for both players
      winnerPlayer.matches += 1;
      loserPlayer.matches += 1;
      
      // Saving updated player data
      await winnerPlayer.save()
      await loserPlayer.save()
      
      // // Optionally updating ranks (if rank system is implemented)
      // await updateRank(winnerPlayer)
      // await updateRank(loserPlayer)
      
      // Sending confirmation message
      return interaction.reply(`Updated elo between ${interaction.options.getString('winner')} and ${interaction.options.getString('loser')}`);
    } catch (error) {
      // Handling errors during database operations
      return interaction.reply('Something went wrong when reporting match winner' + `\n\`` + error + `\``);
    }
  }
}
