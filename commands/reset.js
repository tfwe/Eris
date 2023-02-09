const { ChannelType, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Player } = require('../dbinit.js')
const { calculateElo } = require('../helpers.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Manually reset a player\'s match state')
    .addStringOption(option =>
      option.setName('player')
        .setDescription('The user who won the match')
        .setRequired(true)),
  async execute(interaction) {
    const playerId = interaction.options.getString('player').match(/\d+/g)[0];
    let player = await Player.findOne({ where: { userid: playerId } });
    if (!player) return interaction.reply({content:`That player could not be found in the database.`, ephemeral: true})
    try {
      player.matchid = 'N/A'
      await player.save()
      return interaction.reply(`Reset match state of ${interaction.options.getString('player')}`);
    } catch (error) {
      return interaction.reply('Something went wrong when resetting match state' + `\n\`` + error + `\``);
    }
  }
}

