const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Executes an admin command'),
  async execute(interaction) {
    return interaction.reply(`daniel`);
  },
};
