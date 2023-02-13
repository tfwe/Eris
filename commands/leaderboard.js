const { SlashCommandBuilder } = require('discord.js');
const { Player, sequelize } = require('../dbinit.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Lists all the registered players in the ranked database')
    .addStringOption(option =>
      option.setName('region')
      .setDescription('The region to show the leaderboard of')
      .setRequired(false)
      .addChoices(
          { name: 'Atlantic', value: 'Atlantic'},
          { name: 'Ontario', value: 'Ontario'},
          { name: 'Subarctic', value: 'Subarctic' },
          { name: 'Pacific Northwest', value: 'Pacific Northwest' },
          { name: 'Pacific', value: 'Pacific' },
          { name: 'Midwest', value: 'Midwest' },
          { name: 'Central', value: 'Central' },
          { name: 'Southeast', value: 'Southeast' },
          { name: 'Northeast', value: 'Northeast' },
          { name: 'North Mexico', value: 'North Mexico' },
          { name: 'South Mexico', value: 'South Mexico' },
          { name: 'Caribbean', value: 'Caribbean' },
          { name: 'Asia', value: 'Asia' },
          { name: 'Oceania', value: 'Oceania' },
          { name: 'Europe', value: 'Europe' },
          { name: 'South America', value: 'South America' },
        )
    ),
  async execute(interaction) {
    // retrieve the region specified in the subcommand
    const region = interaction.options.getString('region');

    // retrieve all players from the database sorted by elo
    let players = await Player.findAll({
      order: [['elo', 'DESC']],
    });

    // if a region is specified, filter the players by the region
    if (region) {
      players = players.filter(player => player.region === region);
    }

    // limit the result to the top 15 of the filtered players
    players = players.slice(0, 15);
    // create a string for the leaderboard
    let leaderboard = '```\n';
    leaderboard += `${(region) ? region : 'Global'} Leaderboard:\n`;
    leaderboard += '+-----------------------------+\n';
    leaderboard += '| #  | ELO  | Handle          |\n';
    leaderboard += '+-----------------------------+\n';
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      leaderboard += `| ${(i + 1).toString().padStart(2, '0')} | ${player.elo.toString().padEnd(4)} | ${player.handle.padEnd(15)} |\n`;
    }
    leaderboard += '+-----------------------------+\n';
    leaderboard += '```\n';

    // send the leaderboard to the channel
    interaction.reply(leaderboard);
  }
};

