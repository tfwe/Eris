const { Events } = require('discord.js');
const logger = require('../logger');

module.exports = {
	name: Events.InteractionCreate,
	once: true,
	async execute(interaction) {
    if (!interaction.isButton()) return;
    if (interaction.customId.match(/cancel/)) {
      const content = interaction.member
      const user1 = interaction.message.interaction.user
      const user2 = interaction.user;
      if (!user1 || !user2) {
        if (!user1) logger.error(`[WARN] user1 not found in guild while accepting search!`)
        if (!user2) logger.error(`[WARN] user2 not found in guild while accepting search!`)
        return interaction.reply({content: `Something went wrong while accepting the match. `, ephemeral: true })
      }
      if (user1.id !== user2.id) return await interaction.reply({ content: "You cannot cancel someone else's match.", ephemeral: true })
      logger.info(`[Button] ${user1.tag} canceled match search`);
      return await interaction.update({content:`Match search canceled.`, components: [], embeds: []});
    }
	},
};

