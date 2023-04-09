const { Events } = require('discord.js');
const { Player, sequelize } = require('../dbinit.js')
const { matchStatsArray } = require('../matches.json')
const { updateMatchesFile } = require('../helpers.js');
const logger = require('../logger');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
    try {
      if (!interaction.isButton()) return;
      const customId = interaction.customId
      if (customId.match('dispute-confirm')) {
        logger.info(`[InteractionCreate] Executing disputeConfirmButton.js from ${interaction.user.tag}`)
        const thread = interaction.channel
        const user = interaction.member.user
        let matchStats = matchStatsArray.find( matchStats => matchStats.matchid === interaction.channel.id);
        if (!matchStats) {
          logger.info(`[dispute] ${user.tag} attempted to dispute match that does not exist`)
          await interaction.reply({content: "Match could not be found. Aborting and locking thread.", ephemeral: true})
          await abortMatch(interaction)
          return await interaction.channel.send({ content: "Something went wrong. [5]", ephemeral: true })
        }
        if (!matchStats.started) {
          logger.info(`[dispute] ${user.tag} attempted to dispute match that exists but has not started, aborting: ${matchStats}`)
          await interaction.reply({content: "Attempted to dispute match before it had begun. Aborting and locking thread.", ephemeral: true})
          await thread.send('Aborting match and locking thread.')
          await abortMatch(interaction)
          return
        }
        const postMatchExpMins = 5
        let player1 = await Player.findOne({ where: { userid: matchStats.player1.id } });
        let player2 = await Player.findOne({ where: { userid: matchStats.player2.id } });
        if (!(player1 || player2)) {
          logger.error(`[WARN] Could not find one or both of player 1 and player 2 from user ${user.tag} on interaction ${interaction.customId}`)
          throw PlayerNotFound
          return
        }
        player1.matchid = 'N/A'
        player2.matchid = 'N/A'
        player1.disputes = player1.disputes + 1
        player2.disputes = player2.disputes + 1
        player1.updatedAt = new Date();
        player2.updatedAt = new Date();
        await player1.save();
        await player2.save();
        logger.info(`[Button] ${user.tag} confirmed dispute`);
        await interaction.update({ components: [] })
        await thread.send({ content:`${interaction.member.user} has disputed the match!`, components: [] })
        matchStatsArray.splice(matchStatsArray.indexOf(matchStats), 1)
        await updateMatchesFile(matchStatsArray)
        await thread.setLocked(true)
        return await thread.setArchived(true)
      }
    } catch(error) {
      await interaction.channel.send({content: `Something went wrong` + `\n\`\`\`${error}\`\`\``})
      const interactionInspect = util.inspect(interaction, {showHidden: false, depth: null, colors: true})
      logger.error(`[WARN] ${error} from ${interaction.member.user.tag} on message ${interaction.customId} ${interactionInspect}`);
      return
    }
	},
};

