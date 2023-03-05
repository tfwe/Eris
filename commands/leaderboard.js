const { SlashCommandBuilder } = require('discord.js');
const { Player, sequelize } = require('../dbinit.js')
const { isUnranked, getMatchCount, getRank } = require('../helpers.js')

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
    await interaction.deferReply();
    // retrieve the region specified in the subcommand
    const region = await interaction.options.getString('region');

    // retrieve all players from the database sorted by elo
    let players = await Player.findAll({
      order: [['elo', 'DESC']],
    });

    // if a region is specified, filter the players by the region
    if (region) {
      players = await players.filter(player => player.region === region);
      // players = players.filter(player => !(isUnranked(player.userid)))
    }


    // create an array for the leaderboard
    let leaderboard = [];
    let count = 0
    let i = 0
    for (let player of players) {
      if (count >= 15) break
      // const rank = await getRank(player.userid)
      // const unranked = rank.label === 'Unranked' 
      // if (!unranked) {
        await leaderboard.push({
          name: `\`#${(i + 1).toString().padStart(2, '0')}:\` ${player.handle}`,
          value: `${player.region} | [ELO: ${player.elo}]`,
          inline: false
        });
        count = count + 1
      // }
      i = i + 1
    }

    // create the embed object for the leaderboard
    const leaderboardEmbed = {
      color: 0xFFB900,
      title: `${(region) ? region : 'Global'} Leaderboard`,
      fields: leaderboard
    };

    // send the leaderboard to the channel
    await interaction.editReply({
      content: '',
      embeds: [leaderboardEmbed]
    });
  }


};

