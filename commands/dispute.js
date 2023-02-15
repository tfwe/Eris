const { ChannelType, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Player } = require('../dbinit.js')
const { matchStatsArray, checkinArray } = require('../helpers.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dispute')
    .setDescription('End current match and flag for moderation.'),
  async execute(interaction) {
    if (!interaction.channel.isThread()) return await interaction.reply({ content: "Please use this command in a match thread.", ephemeral: true })
    const player1 = await Player.findOne({ where: { userid: interaction.member.user.id } });
    if (!player1) return await interaction.reply({ content: "Please register using /register to play ranked matches.", ephemeral: true });
    if (player1.matchid === 'N/A') return await interaction.reply({ content: "You are not currently in a match.", ephemeral: true })
    const row1 = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setCustomId(`dispute-confirm`)
      .setLabel('Dispute')
      .setStyle(ButtonStyle.Danger))

    const row2 = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setCustomId(`dispute-can`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary))
    return await interaction.reply({ content:`Disputing a match ends the match due to a disagreement or problem. The number of disputes your account is involved in is recorded. Are you sure you would like to dispute the match?`, components: [row1, row2], ephemeral: true })
  }
}

