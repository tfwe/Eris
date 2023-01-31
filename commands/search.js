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
    .setName('search')
    .setDescription('Search for a ranked best of 5 match'),
  async execute(interaction) {
    
    // retrieve the user's own region and elo from the database
    if (interaction.channel.isThread()) return await interaction.reply({ content: "Please use a text channel instead of a thread to use /search.", ephemeral: true })
    const user = await Player.findOne({ where: { userid: interaction.member.user.id } });
    if (!user) return await interaction.reply({ content: "Please register using /register to play ranked matches.", ephemeral: true });
    if (user.matchid !== 'N/A') return await interaction.reply({ content: "You are currently in a match. You must finish all your matches before joining a ranked match.", ephemeral: true })
    // Create the post message with the button
    const region = user.region;
    const elo = user.elo;

    const row = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setCustomId(`accept`+`${user.userid}`)
      .setLabel('Accept Match')
      .setStyle(ButtonStyle.Primary))
    
    const post = await interaction.reply({ content:`${interaction.member.user} is searching for a ranked match. Press the button to accept the match.\n\nThis request will expire ${searchExpMins} minutes after it was created` + showPlayerDetails(user), components: [row] });
  }
}
