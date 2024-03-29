const { Events } = require('discord.js');
const logger = require('../logger');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
    
    if (!interaction.isButton()) return;
    const customId = interaction.customId
    if (customId.match('dispute-can')) {
      logger.info(`[InteractionCreate] Executing disputeCancelButton.js from ${interaction.user.tag}`)
      const user = interaction.member.user
      logger.info(`[Button] ${user.tag} cancelled dispute`);
      return await interaction.update({ content:'Dispute canceled', components:[] })
    }
	},
};
