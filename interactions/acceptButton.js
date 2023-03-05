const { Events, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../logger');
const { Player, sequelize } = require('../dbinit.js')
const { checkInExpMins } = require('../helpers.js');
const { matchStatsArray } = require('../matches.json')

module.exports = {
	name: Events.InteractionCreate,
	once: true,
	async execute(interaction) {
    if (!interaction.isButton()) return;
    if (interaction.customId.match(/accept/)) {
      const user1id = interaction.customId.match(/-(\d+)/); // extract user id from user who did /search
      const user1 = interaction.message.interaction.user
      const user2 = interaction.user;
      if (!user1 || !user2) {
        if (!user1) logger.error(`[WARN] user1 not found in guild while accepting search!`)
        if (!user2) logger.error(`[WARN] user2 not found in guild while accepting search!`)
        return interaction.reply({content: `Something went wrong while accepting the match. `, ephemeral: true })
      }
      if (user1.id === user2.id) return await interaction.reply({ content: "You cannot accept a match with yourself.", ephemeral: true })
      let player1 = await Player.findOne({ where: { userid: user1.id } });
      let player2 = await Player.findOne({ where: { userid: user2.id } });
      if (!player1) {
        await interaction.reply({ content: "Unable to match with user", ephemeral: true })
        logger.error(`[WARN] ${user1.tag} found match while not in database, accepted by ${user2.tag}`)
      }
      if (!player2) return await interaction.reply({ content: "Please register using /register to play ranked matches.", ephemeral: true });
      if (player2.matchid !== 'N/A') return await interaction.reply({ content: "You are currently in a match. You must finish all your matches before joining a ranked match.", ephemeral: true })
      if (player1.matchid !== 'N/A') return await interaction.reply({ content: "This player is currently in another match. They must finish all their matches before playing a new ranked match.", ephemeral: true })
      logger.info(`[accept] ${user2.tag} accepted match from ${user1.tag}`);
      const thread = await interaction.channel.threads.create({
        name: `${player1.handle} vs ${player2.handle}`,
        type: ChannelType.PrivateThread,
        reason: `Ranked ELO best of 5 match`,
      });
      await thread.members.add(interaction.member.user.id)
      await thread.members.add(user2.id);
      thread.send(`Starting a best of 5 match between ${user1} and ${user2}. Please test for lag and agree on delay settings before agreeing to play game 1. \nAfter game 1 has been started, you cannot leave the game unless you forfeit, or the match is over.`)
      const rpsWinner = Math.random() < 0.5 ? player1.userid : player2.userid
      matchStats = {
        started: false,
        finished: false,
        matchid: thread.id,
        rankedChannel: {
          channelid: interaction.channel.id,
          messageid: interaction.message.id,
        },
        player1: {
          id: player1.userid,
          handle: player1.handle,
          region: player1.region,
          elo: player1.elo,
          checkedIn: false,
          newElo: null,
          score: 0
        },
        player2: {
          id: player2.userid,
          handle: player2.handle,
          region: player2.region,
          elo: player2.elo,
          checkedIn: false,
          newElo: null,
          score: 0
        },
        rpsWinner: rpsWinner,
        winner: null,
        currentGame: 0,
        games: []
      }
      matchStatsArray.push(matchStats)
      updateMatchesFile(matchStatsArray)
      await player1.update({ matchid: thread.id }, { where: { userid: player1.userid } });
      await player2.update({ matchid: thread.id }, { where: { userid: player2.userid } });
      logger.info(`[search] ${user1.tag} and ${user2.tag} updated matchid in database to ${thread.id}`)
      const matchDetailsEmbed = await getMatchDetailsEmbed(matchStats) 
      await interaction.message.edit({content: `Match has been created between ${user1} and ${user2}! Please head over to ${thread} to start the match.`, embeds: [matchDetailsEmbed], components: [] });
      const row1 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`abort-`+`${matchStats.matchid}`)
            .setLabel('Abort Match')
            .setStyle(ButtonStyle.Danger))
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId(`checkin-`+ `${matchStats.matchid}`)
          .setLabel('Check In')
          .setStyle(ButtonStyle.Success))
      await thread.send({content: ``, embeds: [matchDetailsEmbed], components: [] })
      await thread.send({ content: `Push a button to abort or check into the match. Checking into a match means that you agree to play game 1. The match will automatically be aborted in ${checkInExpMins} minutes if game 1 has not started.`, components: [row1]})
      setTimeout(async () => {
        let matchStats = matchStatsArray.find( matchStats => matchStats.matchid === thread.id);
        if (!matchStats) {
          throw 'matchStatsException'
          return await interaction.channel.send({ content: "Something went wrong. [5]", ephemeral: true })
        }
        if (matchStats.finished) return
        if (!matchStats.started) {
          thread.send('Match aborted.') 
          logger.info(`[accept] Locked and archived match thread ${matchStats.matchid}`);
          await thread.setLocked(true)
          await thread.setArchived(true)
          await player1.update({ matchid: 'N/A' }, { where: { userid: player1.userid } });
          await player2.update({ matchid: 'N/A' }, { where: { userid: player2.userid } });
          await player1.save();
          await player2.save();
        }
      }, checkInExpMins * 60 * 1000);
    }
	},
};




