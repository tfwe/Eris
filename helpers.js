const fs = require('node:fs');
const { Match, Player, Game } = require('./dbinit.js')
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const logger = require('./logger.js')
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const { matchStatsArray } = require('./matches.json')

// module.exports = {

  const searchExpMins = 15
  const checkInExpMins = 15

  const K = 32 // elo constant

  const rankedMatchesThreshold = 3 // min number of matches in order to be ranked

  const ranks = [
    {
      label: 'Unranked',
      threshold: 101,
      color: 0x001B2F,
    },
    {
      label: 'Bronze I',
      threshold: 100,
      color: 0xCD7F32,
    },
    {
      label: 'Bronze II',
      threshold: 70,
      color: 0xCD7F32,
    },
    {
      label: 'Bronze III',
      threshold: 60,
      color: 0xCD7F32,
    },
    {
      label: 'Silver I',
      threshold: 50,
      color: 0xC0C0C0,
    },
    {
      label: 'Silver II',
      threshold: 40,
      color: 0xC0C0C0,
    },
    {
      label: 'Silver III',
      threshold: 30,
      color: 0xC0C0C0,
    },
    {
      label: 'Gold I',
      threshold: 25,
      color: 0xFFD700,
    },
    {
      label: 'Gold II',
      threshold: 20,
      color: 0xFFD700,
    },
    {
      label: 'Gold III',
      threshold: 15,
      color: 0xFFD700,
    },
    {
      label: 'Elite I',
      threshold: 10,
      color: 0x33CCCC,
    },
    {
      label: 'Elite II',
      threshold: 8,
      color: 0x33CCCC,
    },
    {
      label: 'Elite III',
      threshold: 6,
      color: 0x33CCCC,
    },
    {
      label: 'Champion',
      threshold: 3,
      color: 0xFF1493,
    },
  ]

  const stages = [
    {
      label: 'Town and City',
      description: 'Starter',
      value: 'town-and-city',
    },
    {
      label: 'Battlefield',
      description: 'Starter',
      value: 'Battlefield',
    },
    {
      label: 'Small Battlefield',
      description: 'Starter',
      value: 'small-battlefield',
    },
    {
      label: 'Smashville',
      description: 'Starter',
      value: 'smashville',
    },
    {
      label: 'Pokemon Stadium 2',
      description: 'Starter',
      value: 'pokemon-stadium-2',
    },
    {
      label: 'Final Destination',
      description: 'Counterpick',
      value: 'final-destination',
    },
    {
      label: 'Hollow Bastion',
      description: 'Counterpick',
      value: 'hollow-bastion',
    },
    {
      label: 'Kalos Pokemon League',
      description: 'Counterpick',
      value: 'kalos-pokemon-league',
    },
  ];

  startTimer = () => {
    timerId = setTimeout(() => {
      console.log("Time's up!");
    }, 5000);
  }

  cancelTimer = () => {
    clearTimeout(timerId);
  }

  updateRank = async (player) => {
    logger.info(`[helpers] updateRank(${player.userid})...`)
    logger.info(`[helpers] updateRank(${player.userid}) checking if unranked..`)
    const unranked = await isUnranked(player)
    if (unranked) {
      player.rank = 0
      await player.save
      logger.info(`[helpers] updateRank(${player.userid}) = ${ranks[player.rank].label}`)
      return
    } 
    logger.info(`[helpers] updateRank(${player.userid}) counting total players..`)
    let totalPlayers = await getTotalRankedPlayers()
    logger.info(`[helpers] updateRank(${player.userid}) counting better players..`)
    const playersWithHigherElo = await getPlayersWithHigherElo(player)
    if (totalPlayers <= 0) totalPlayers = 1
    logger.info(`[helpers] updateRank(${player.userid}) calculating percentile..`)
    let percentage = (playersWithHigherElo / totalPlayers) * 100;
    let index = player.rank
    logger.info(`[helpers] updateRank(${player.userid}) top ${percentage}%..`)
    index = 1
    while (percentage <= ranks[index].threshold) {
      if (index >= (ranks.length - 1)) break
      index = index + 1
      playerRank = ranks[index]
      player.rank = index
      logger.info(`[helpers] updateRank(${player.userid}) ranked up to ${ranks[index]} (threshold ${ranks[index].threshold})..`)
    }
    await player.save();
    logger.info(`[helpers] updateRank(${player.userid}) = ${ranks[player.rank].label}`)
  }
  
  getRank = async (player) => {
    logger.info(`[helpers] getRank(${player.userid}) = ${ranks[player.rank].label}`)
    return ranks[player.rank]
  }

  getMatchDetailsEmbed = async (matchStats) => {
    let player1 = await Player.findOne({ where: { userid: matchStats.player1.id } });
    let player2 = await Player.findOne({ where: { userid: matchStats.player2.id } });
    const rank1 = await getRank(player1)
    const rank2 = await getRank(player2)
    const unranked1 = await isUnranked(player1)
    const unranked2 = await isUnranked(player2)
    let matchDetailsEmbed = {
      color: 0xFFB900,
      title: 'Match Details',
      fields: [
        {
          name: player1.handle,
          value: `Region: ${player1.region}
          Rank: ${rank1.label} \n${player1.elo}${unranked1 ? '?' : ''}
          Score: ${matchStats.player1.score}`,
          inline: false,
        },
        {
          name: player2.handle,
          value: `Region: ${player2.region}
          Rank: ${rank2.label} \n${player2.elo}${unranked2 ? '?' : ''}
          Score: ${matchStats.player2.score}`,
          inline: false,
        },
      ],
      description: ``,
    };
    logger.info(`[helpers] getMatchDetailsEmbed()`)
    return matchDetailsEmbed
  }

  updateElo = async (matchStats) => {
    logger.info(`[helpers] updateElo() updating..`)
    let newElo = { }
    let processedK = K
    const previousMatches = await getPreviousMatches(matchStats.player1.id, matchStats.player2.id)
    let player1 = await Player.findOne({ where: { userid: matchStats.player1.id } });
    let player2 = await Player.findOne({ where: { userid: matchStats.player2.id } });
    if (!player1 || !player2) return logger.error(`[WARN] updateElo could not find player from matchStats`)
    if (previousMatches >= 3) {
      processedK = K / previousMatches // reduce the ELO constant by factor of number of matches in past 24 hours from original value
    }
    let winnerK = processedK
    let loserK = processedK
    
    if (matchStats.winner === matchStats.player1.id) {
      logger.info(`[helpers] updateElo() player1 ${matchStats.player1.id} is the winner`)
      logger.info(`[helpers] updateElo() fetching ranks..`)
      let winnerRank = await getRank(player1)
      let loserRank = await getRank(player2)
      if (winnerRank.label === 'Unranked') {
        logger.info(`[helpers] updateElo() calculating unranked winner K value..`)
        let matchCount = await getMatchCount(player1)
        if (matchCount < 1) matchCount = 1
        winnerK = winnerK*(rankedMatchesThreshold + 1 - matchCount)
      }
      if (loserRank.label === 'Unranked') {
        logger.info(`[helpers] updateElo() calculating unranked loser K value..`)
        let matchCount = await getMatchCount(player2)
        if (matchCount < 1) matchCount = 1
        loserK = loserK*(rankedMatchesThreshold + 1 - matchCount)
      }
      logger.info(`[helpers] updateElo() elo calculation..`)
      newElo = await calculateElo(matchStats.player1.elo, matchStats.player2.elo, winnerK, loserK);
      matchStats.player1.newElo = Math.round(newElo.newWinnerElo)
      matchStats.player2.newElo = Math.round(newElo.newLoserElo)
    } else if (matchStats.winner === matchStats.player2.id) {
      logger.info(`[helpers] updateElo() player2 ${matchStats.player2.id} is the winner`)
      logger.info(`[helpers] updateElo() fetching ranks..`)
      let winnerRank = await getRank(player2)
      let loserRank = await getRank(player1)
      if (winnerRank.label === 'Unranked') {
        logger.info(`[helpers] updateElo() calculating unranked winner K value..`)
        let matchCount = await getMatchCount(player2)
        if (matchCount < 1) matchCount = 1
        winnerK = winnerK*(rankedMatchesThreshold + 1 - matchCount)
      }
      if (loserRank.label === 'Unranked') {
        logger.info(`[helpers] updateElo() calculating unranked loser K value..`)
        let matchCount = await getMatchCount(player1)
        if (matchCount < 1) matchCount = 1
        loserK = loserK*(rankedMatchesThreshold + 1 - matchCount)
      }
      logger.info(`[helpers] updateElo() elo calculation..`)
      newElo = await calculateElo(matchStats.player2.elo, matchStats.player1.elo, winnerK, loserK);
      matchStats.player2.newElo = Math.round(newElo.newWinnerElo)
      matchStats.player1.newElo = Math.round(newElo.newLoserElo)
    }
    
    logger.info(`[helpers] updateElo() updating player objects..`)
    player1.matchid = 'N/A'
    player2.matchid = 'N/A'
    player1.updatedAt = new Date();
    player2.updatedAt = new Date();
    player1.elo = matchStats.player1.newElo;
    player2.elo = matchStats.player2.newElo;
    logger.info(`[helpers] updateElo() saving new elo..`)
    await player1.save();
    await player2.save();
    logger.info(`[helpers] updateElo() calculating new ranks..`)
    await updateRank(player1)
    await updateRank(player2)
    logger.info(`[helpers] updateElo() completed`)
  }

  calculateElo = (winnerElo, loserElo, winnerK, loserK) => {
    let winnerProb = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    let loserProb = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
    let newWinnerElo = winnerElo + winnerK * (1 - winnerProb);
    let newLoserElo = loserElo + loserK * (0 - loserProb);
    newWinnerElo = Math.round(newWinnerElo)
    newLoserElo = Math.round(newLoserElo)
    if (!newWinnerElo || !newLoserElo) return logger.error(`[WARN] calculateElo found a null elo value`)
    let newElo = { newWinnerElo: newWinnerElo, newLoserElo: newLoserElo };
    logger.info(`[helpers] calculateElo(${winnerElo}, ${loserElo}), ${winnerK}, ${loserK} = ${newElo}`)
    return newElo 
  }

  getPreviousMatches = async (player1id, player2id) => {
    const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000)
    const previousMatches = await Match.count({
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
    logger.info(`[helpers] getPreviousMatches(${player1id}, ${player2id}) = ${previousMatches}`)
    return previousMatches
  }

  updateDB = async (matchStats) => {
    try {
      let match = { }
      match.matchid = matchStats.matchid;
      match.winner = matchStats.winner;
      match.finished = matchStats.finished;
      match.player1id = matchStats.player1.id;
      match.player1id = matchStats.player1.id;
      match.player1elo = matchStats.player1.elo;
      match.player2elo = matchStats.player2.elo;
      match.player1score = matchStats.player1.score;
      match.player2score = matchStats.player2.score;
      let foundMatch = await Match.findOne({ where: { matchid: matchStats.matchid } });
      if (foundMatch) {
        logger.error(`[WARN] updateDB() tried to update already stored finished match in database ${matchStats.matchid}`)
        return
      }
      else {
        Match.create(match)
      }
      let count = 0;
      for (let i of matchStats.games) {
        let gameid = `${count}-${matchStats.matchid}`
        i.matchid = gameid
        i.player1id = matchStats.player1.id
        i.player2id = matchStats.player2.id
        i.winner = matchStats.games[count].winner
        count = count + 1
        let foundGame = await Game.findOne({ where: { matchid: gameid } });
        if (foundGame) {
          continue
        }
        await Game.create(i)
      } 
      logger.info(`[helpers] updateDB`)
      //save the updated match to the database
    } catch (error) {
      logger.error(error);
    }
  }

  getMatchCount = async (player) => {
    try {
      const matchCount = await Match.count({
        where: {
          [Op.or]: [
            { player1id: player.userid, winner: { [Op.ne]: 'N/A' } },
            { player2id: player.userid, winner: { [Op.ne]: 'N/A' } },
          ],
        },
      })
      logger.info(`[helpers] getMatchCount(${player.userid}) = ${matchCount}`)
      return matchCount 
    } catch (error) {
      logger.error(error)
    }
  }

  isUnranked = async (player) => {
    logger.info(`[helpers] isUnranked(${player.userid})..`)
    logger.info(`[helpers] isUnranked(${player.userid}) counting matches..`)
    const matchCount = await getMatchCount(player)
    logger.info(`[helpers] isUnranked(${player.userid}) checking if enough matches (${matchCount} <= ${rankedMatchesThreshold})..`)
    const unranked = (matchCount < rankedMatchesThreshold)
    logger.info(`[helpers] isUnranked(${player.userid}) = ${unranked}`)
    return unranked
  }

  getTotalRankedPlayers = async () => {
    let totalRankedPlayers = 0
    const players = await Player.findAll();
    for (const player of players) {
      let unranked = await isUnranked(player)
      if (!unranked) totalRankedPlayers++
    }
    logger.info(`[helpers] getTotalRankedPlayers() = ${totalRankedPlayers}`)
    return totalRankedPlayers
  }

  getRegionRankedPlayers = async (region) => {
    let totalRankedRegionPlayers = 0
    const players = await Player.findAll();
    for (const player of players) {
      let unranked = await isUnranked(player)
      if (!unranked && player.region === region) totalRankedRegionPlayers++
    }
    logger.info(`[helpers] getTotalRankedRegionPlayers() = ${totalRankedRegionPlayers}`)
    return totalRankedRegionPlayers
  }

  async function getPlayersWithHigherElo(player) {
    let rankedPlayers = 0
    const players = await Player.findAll();
    for (const p of players) {
      let unranked = await isUnranked(player)
      if (!unranked && p.elo > player.elo) rankedPlayers++
    }
    logger.info(`[helpers] getPlayersWithHigherElo() = ${rankedPlayers}`)
    return rankedPlayers
  }

  
  async function getRegionPlayersWithHigherElo(player, region) {
    let rankedRegionPlayers = 0
    const players = await Player.findAll();
    for (const p of players) {
      let unranked = await isUnranked(player)
      if (!unranked && p.region === region && p.elo > player.elo) rankedRegionPlayers++
    }
    logger.info(`[helpers] getRegionPlayersWithHigherElo() = ${rankedRegionPlayers}`)
    return rankedRegionPlayers
  }


  updateMatchesFile = async (matchStatsArray) => {
    logger.info(`[matches.json] updating matches.json, matchStatsArray length: ${matchStatsArray.length}`)
    await fs.writeFile('./matches.json', JSON.stringify({ matchStatsArray }), (err) => { 
      if (err) {
        logger.error(`[WARN] Error while writing matches.json: ${err}, message: ${interaction.customId}, matchStatsArray exists: ${(matchStatsArray) ? true : false}`);
        return
      }
    })
  }

  abortMatch = async (interaction) => {
    const user = interaction.member.user
    const thread = interaction.channel
    logger.info(`[Button] ${user.tag} aborted match`);
    const matchStats = matchStatsArray.find( matchStats => matchStats.matchid === thread.id);
    if (!matchStats) {
      logger.error('[WARN] matchStats not found in matchStatsArray when calling abortMatch, resetting player matchid.')
      let player1 = await Player.findOne({ where: { userid: user.id } });
      player1.matchid = 'N/A'
      await player1.save();
      await thread.setLocked(true)
      await thread.setArchived(true)
      return logger.info(`[WARN] reset matchid of user ${user.tag} due to lost matchStats`)
    }
    await thread.setLocked(true)
    await thread.setArchived(true)
    let player1 = await Player.findOne({ where: { userid: matchStats.player1.id } });
    let player2 = await Player.findOne({ where: { userid: matchStats.player2.id } });
    await matchStatsArray.splice(matchStatsArray.indexOf(matchStats), 1)
    await updateMatchesFile(matchStatsArray)
    player1.matchid = 'N/A'
    player2.matchid = 'N/A' 
    await player1.save();
    await player2.save();
    logger.info(`[helpers] abortMatch()`)
  }
// }

module.exports = { updateRank, updateDB, calculateElo, startTimer, cancelTimer, updateMatchesFile, getMatchDetailsEmbed, K, getPreviousMatches, getMatchCount, isUnranked, stages, searchExpMins, checkInExpMins, getRank, rankedMatchesThreshold, getTotalRankedPlayers, getPlayersWithHigherElo, getRegionPlayersWithHigherElo, getRegionRankedPlayers, abortMatch, updateElo }
