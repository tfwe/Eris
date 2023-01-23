const { ChannelType, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Player } = require('../dbinit.js')
const searchExpMins = 15;


const showPlayerDetails = (player) => {
  return `\`\`\`
  Player Details:
  -----------------
  Handle: ${player.handle}
  Region: ${player.region}
  ELO: ${player.elo}\`\`\``;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Forfeit and leave a match'),
  async execute(interaction) {
    let matchAccepted = false
    // retrieve the user's own region and elo from the database
    if (!interaction.channel.isThread()) return await interaction.reply({ content: "Please use this command in a match thread.", ephemeral: true })
    const user = await Player.findOne({ where: { userid: interaction.member.user.id } });
    if (!user) return await interaction.reply({ content: "Please register using /register to play ranked matches.", ephemeral: true });
    if (user.matchid === 'N/A') return await interaction.reply({ content: "You are currently in not in a match.", ephemeral: true })
    // Create the post message with the button
    const region = user.region;
    const elo = user.elo;

    const post = await interaction.reply({ content:`${interaction.member.user} has left the game.` });
    await interaction.channel.setLocked(true)
    await interaction.channel.setArchived(true)
  }
}
