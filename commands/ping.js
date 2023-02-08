const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check if bot is online'),
  async execute(interaction) {
    return interaction.reply({content: `pong`, ephemeral: true});
  },
};

