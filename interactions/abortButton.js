const { Events } = require('discord.js');
const { abortMatch } = require('../helpers.js');
const logger = require('../logger');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
    if (!interaction.isButton()) return;
    if (interaction.customId.match(/abort/)) {
      logger.info(`[InteractionCreate] Executing abortButton.js from ${interaction.user.tag}`)
      const thread = interaction.channel
      await interaction.update({ content: `Match aborted by ${interaction.member.user}.`, components: [] })
      await abortMatch(interaction) 
      return
    }
	},
};

