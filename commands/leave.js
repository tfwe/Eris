const { ChannelType, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Player } = require('../dbinit.js')
const { matchStatsArray, checkinArray } = require('../helpers.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Forfeit and leave a match'),
  async execute(interaction) {
    if (!interaction.channel.isThread()) return await interaction.reply({ content: "Please use this command in a match thread.", ephemeral: true })
    const player1 = await Player.findOne({ where: { userid: interaction.member.user.id } });
    if (!player1) return await interaction.reply({ content: "Please register using /register to play ranked matches.", ephemeral: true });
    if (player1.matchid === 'N/A') return await interaction.reply({ content: "You are not currently in a match.", ephemeral: true })

    const post = await interaction.reply({ content:`${interaction.member.user} has left the game.`});
    await interaction.channel.setLocked(true)
    await interaction.channel.setArchived(true)
  }
}

