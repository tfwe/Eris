const { Match, Player, Game } = require('./dbinit.js')
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;


let checkInArray = [];
let matchStatsArray = [];

const K = 32 // elo constant

startTimer = () => {
  timerId = setTimeout(() => {
    console.log("Time's up!");
  }, 5000);
}

cancelTimer = () => {
  clearTimeout(timerId);
}

getMatchDetailsEmbed = (matchStats) => {
  let player1 = matchStats.player1
  let player2 = matchStats.player2
  let matchDetailsEmbed = {
    color: 0xFFB900,
    title: 'Match Details',
    fields: [
      {
        name: player1.handle,
        value: `Region: ${player1.region}\nELO: ${player1.elo}\nScore: ${player1.score}`,
        inline: true,
      },
      {
        name: player2.handle,
        value: `Region: ${player2.region}\nELO: ${player2.elo}\nScore: ${player2.score}`,
        inline: false,
      },
    ],
    description: ``,
  };
  return matchDetailsEmbed
}

        
calculateElo = (winnerElo, loserElo, K) => {
  let winnerProb = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  let loserProb = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
  let newWinnerElo = winnerElo + K * (1 - winnerProb);
  let newLoserElo = loserElo + K * (0 - loserProb);
  newWinnerElo = Math.round(newWinnerElo)
  newLoserElo = Math.round(newLoserElo)
  return { newWinnerElo: newWinnerElo, newLoserElo: newLoserElo };
}

getPreviousMatches = async (player1id, player2id) => {
  const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000)
  const previousMatches = await Match.findAll({
    where: {
      [Sequelize.Op.or]: [
        {
          player1id: player1id,
          player2id: player2id,
          createdAt: {
            [Op.gt]: oneDayAgo,
          },
        },
        {
          player1id: player2id,
          player2id: player1id,
          createdAt: {
            [Op.gt]: oneDayAgo,
          },
        },
      ],
    },
  })
  return previousMatches.length
}

updateDB = async (matchStats) => {
  try {
    let match = { }
    match.matchid = matchStats.matchid;
    match.winner = matchStats.winner;
    match.finished = matchStats.finished;
    match.player1id = matchStats.player1.id;
    match.player2id = matchStats.player2.id;
    match.player1score = matchStats.player1.score;
    match.player2score = matchStats.player2.score;
    let count = 0;
    for (let i of matchStats.games) {
      let unique = Math.floor(Math.random() * 16777215 + 1).toString(16)
      i.matchid = `${count}-${matchStats.matchid}`
      i.player1id = matchStats.player1.id
      i.player2id = matchStats.player2.id
      i.winner = matchStats.games[count].winner
      count = count + 1
      await Game.create(i)
    } 

    //save the updated match to the database
    await Match.create(match);
    console.log("Match updated in database: ");
    console.log(matchStats);
  } catch (error) {
    console.log(error);
  }
}

getMatchCount = async (userId) => {
  try {
    const player = await Player.findOne({ where: { userid: userId } });
    const matchCount = await Match.count({
      where: {
        [Op.or]: [
          { player1id: player.userid, winner: { [Op.ne]: 'N/A' } },
          { player2id: player.userid, winner: { [Op.ne]: 'N/A' } },
        ],
      },
    })
   return matchCount 
  } catch {
    console.log(error)
  }
}

isUnranked = (userId) => {
  const matchCount = getMatchCount(userId)
  return (matchCount <= 4)
}

module.exports = { updateDB, calculateElo, startTimer, cancelTimer, matchStatsArray, checkInArray, getMatchDetailsEmbed, K, getPreviousMatches, getMatchCount, isUnranked }
