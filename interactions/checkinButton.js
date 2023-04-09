const { Events , StringSelectMenuBuilder , ActionRowBuilder } = require('discord.js');
const { Player, sequelize } = require('../dbinit.js')
const { matchStatsArray } = require('../matches.json')
const { stages } = require('../helpers.js');
const logger = require('../logger');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
    try {
      if (!interaction.isButton()) return;
      const customId = interaction.customId
      if (customId.match(/checkin/)) {
        logger.info(`[InteractionCreate] Executing checkinButton.js from ${interaction.user.tag}`)
        const thread = interaction.channel
        const user = interaction.member.user
        logger.info(`[Button] ${user.tag} tried checkin`);
        let checkedInPlayer = await Player.findOne({ where: { userid: user.id, matchid: thread.id } });
        let matchStats = matchStatsArray.find( matchStats => matchStats.matchid === thread.id);
        if (!matchStats) {
          throw 'matchStatsException'
          return interaction.channel.send(`Something went wrong [4]`)
        }
        if(matchStats && checkedInPlayer) {
          if (checkedInPlayer.userid === matchStats.player1.id ) {
            if (matchStats.player1.checkedIn) return interaction.reply({ content:`You have already checked in.`, ephemeral: true })
            matchStats.player1.checkedIn = true
          } 
          else if (checkedInPlayer.userid === matchStats.player2.id ) {
            if (matchStats.player2.checkedIn) return interaction.reply({ content:`You have already checked in.`, ephemeral: true })
            matchStats.player2.checkedIn = true
          }
          if (matchStats.player1.checkedIn && matchStats.player2.checkedIn) {
            let player1 = await Player.findOne({ where: { userid: matchStats.player1.id } });
            let player2 = await Player.findOne({ where: { userid: matchStats.player2.id } });
            matchStats.started = true
            let game
            if (!matchStats.games[matchStats.currentGame]) {
              game = {
                player1char: null,
                player2char: null,
                wchar: null,
                bans: [],
                stage: null,
                report: {
                  player1: null,
                  player2: null
                },
                winner: null
              }
              matchStats.games.push(game)
            }
            game = matchStats.games[matchStats.currentGame]
            await updateMatchesFile(matchStatsArray)
            logger.info(`[Button] Match ${matchStats.matchid} checkin successful`);
            const starterStages = stages.filter(
              option => option.description === "Starter"
            );
            const filteredStartersMenu = new StringSelectMenuBuilder({
              custom_id: 'game1-stage-' + thread.id,
              placeholder: 'Choose a stage.',
              options: starterStages,
            });
            const row2 = new ActionRowBuilder()
              .addComponents(filteredStartersMenu);
            let rpsUser = interaction.guild.members.cache.get(matchStats.rpsWinner)
            return interaction.update({ content: `${rpsUser}, please choose a stage you would like to ban.`, components: [row2]})
          }
        }
        return await interaction.update({ content: interaction.message.content + `\n${user} has checked in for the match!` })
      }
    } catch(error) {
      await interaction.channel.send({content: `Something went wrong` + `\n\`\`\`${error}\`\`\``})
      const interactionInspect = util.inspect(interaction, {showHidden: false, depth: null, colors: true})
      logger.error(`[WARN] ${error} from ${interaction.member.user.tag} on message ${interaction.customId} ${interactionInspect}`);
      return
    }
	},
};

