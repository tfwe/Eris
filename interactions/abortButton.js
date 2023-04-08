const { Events } = require('discord.js');
const { abortMatch } = require('../helpers.js');
const logger = require('../logger');

module.exports = {
	name: Events.InteractionCreate,
	once: true,
	async execute(interaction) {
    logger.info(`[InteractionCreate] Executing abortButton.js from ${interaction.user.tag}`)
    if (!interaction.isButton()) return;
    if (interaction.customId.match(/abort/)) {
      const thread = interaction.channel
      await interaction.update({ content: `Match aborted by ${interaction.member.user}.`, components: [] })
      await abortMatch(interaction) 
      return
    }
	},
};

