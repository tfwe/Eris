const { SlashCommandBuilder } = require('discord.js');
const { Player, sequelize } = require('../dbinit.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listplayers')
	  .setDescription('Lists all the registered players in the ranked databse'),
  async execute(interaction) {
     // get a list of all players in the database
    const players = await Player.findAll();

    // create a message with a list of all player handles
    let message = 'Registered players:\n';
    players.forEach(player => {
      message += `${player.handle} - ELO: ${player.elo}\n`;
    });

    // send the message to the channel
    interaction.reply(message);
  }
}
