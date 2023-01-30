const { SlashCommandBuilder } = require('discord.js');
const { Player } = require('../dbinit.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getinfo')
    .setDescription('Retrieve information about a player')
    .addStringOption(option =>
      option.setName('mention')
      .setDescription('Mention the player')
      .setRequired(true)
    ),
  async execute(interaction) {
    const mention = interaction.options.getString('mention');
    const userId = mention.match(/\d+/g)[0];
    const player = await Player.findOne({ where: { userid: userId } });
    if (!player) {
      return interaction.reply('Player not found.');
    }
    const playerInfo = `
      \`\`\`Player Information:
      -----------------
      Handle: ${player.handle}
      Region: ${player.region}
      ELO: ${player.elo}
      Disputes: ${player.disputes}
      Created At: ${player.createdAt}
      Updated At: ${player.updatedAt}\`\`\``;    
    return interaction.reply(`Player Information: ${playerInfo}`);
  },
};

