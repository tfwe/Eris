const { Match, Player, Game, sequelize } = require('./dbinit.js')
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');

let checkInArray = [];
let matchStatsArray = [];



startTimer = () => {
  timerId = setTimeout(() => {
    console.log("Time's up!");
  }, 5000);
}

cancelTimer = () => {
  clearTimeout(timerId);
}

calculateElo = (winnerElo, loserElo) => {
  let K = 32; // Elo scale constant
  let winnerProb = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  let loserProb = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
  let newWinnerElo = winnerElo + K * (1 - winnerProb);
  let newLoserElo = loserElo + K * (0 - loserProb);
  newWinnerElo = Math.round(newWinnerElo)
  newLoserElo = Math.round(newLoserElo)
  return { newWinnerElo: newWinnerElo, newLoserElo: newLoserElo };
}


updateDB = async (matchStats) => {
  try {
    //find the match in the database
    let match = await Match.findOne({ where: { matchid: matchStats.matchid } });
    if (!match) {
      console.log("Match not found in database");
      return;
    }
    //update the match fields
    match.winner = matchStats.winner;
    match.finished = matchStats.finished;
    match.player1id = matchStats.player1.id;
    match.player2id = matchStats.player2.id;
    match.player1score = matchStats.player1.score;
    match.player2score = matchStats.player2.score;
    let count = 0;
    for (let i of matchStats.games) {
      let unique = Math.floor(Math.random() * 16777215 + 1).toString(16)
      i.matchid = `${matchStats.currentGame}-${unique}-${matchStats.matchid}`
      i.player1id = matchStats.player1.id
      i.player2id = matchStats.player2.id
      i.winner = matchStats.games[count].winner
      count = count + 1
      await Game.create(i)
    } 

        //save the updated match to the database
    await match.save();
    console.log("Match updated in database: ");
    console.log(matchStats);
  } catch (error) {
    console.log(error);
  }
}


module.exports = { updateDB, calculateElo, startTimer, cancelTimer, matchStatsArray, checkInArray }
