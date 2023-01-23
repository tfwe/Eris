const { SlashCommandBuilder } = require('discord.js');
const { Player, sequelize } = require('../dbinit.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
	  .setDescription('Lists all the registered players in the ranked databse'),
  async execute(interaction) {
    // retrieve all players from the database sorted by elo
    const players = await Player.findAll({
      order: [['elo', 'DESC']],
      limit: 30,
    });

    // create a string for the leaderboard
    let leaderboard = '```\n';
    leaderboard += `Ranking | ELO  | Handle             | Region       \n`;
    leaderboard += `--------------------------------------------------\n`;
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      leaderboard += `${(i+1).toString().padStart(2, '0')}.    | ${player.elo}  | ${player.handle.padEnd(20)} | ${player.region.padEnd(15)}\n`;
    }
    leaderboard += '```\n';

    // send the leaderboard to the channel
    interaction.reply(leaderboard);
  }

}
