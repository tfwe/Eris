const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rules')
    .setDescription('Displays the current ruleset'),
  async execute(interaction) {
    
    const rulesEmbed = {
      color: 0xFFB900,
      title: 'Current Ruleset',
      image: {
        url: 'https://cdn.discordapp.com/attachments/531911630687174667/994750016788901938/unknown.png',
      },
    };
    return interaction.reply({ content: '', embeds: [rulesEmbed] });
  }
}
