const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('damn')
    .setDescription('?'),
  async execute(interaction) {
    return interaction.reply(`daniel`);
  },
};

