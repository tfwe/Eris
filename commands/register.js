const { SlashCommandBuilder } = require('discord.js');
const { Player, sequelize } = require('../dbinit.js')
const { rankedMatchesThreshold } = require('../helpers.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Registers the invoking user into the ranked players database')
    .addStringOption(option =>
		  option.setName('region')
        .setDescription('Your region')
        .setRequired(true)
        .addChoices(
          // { name: 'Atlantic', value: 'Atlantic'},
          // { name: 'Ontario', value: 'Ontario'},
          // { name: 'Subarctic', value: 'Subarctic' },
          // { name: 'Pacific Northwest', value: 'Pacific Northwest' },
          // { name: 'Pacific', value: 'Pacific' },
          // { name: 'Midwest', value: 'Midwest' },
          // { name: 'Central', value: 'Central' },
          // { name: 'Southeast', value: 'Southeast' },
          // { name: 'Northeast', value: 'Northeast' },
          // { name: 'North Mexico', value: 'North Mexico' },
          // { name: 'South Mexico', value: 'South Mexico' },
          // { name: 'Caribbean', value: 'Caribbean' },
          // { name: 'United Arab Emirates', value: 'United Arab Emirates' },
          { name: 'Oceania', value: 'Oceania' },
          // { name: 'Europe', value: 'Europe' },
          // { name: 'South America', value: 'South America' },
          { name: 'Synergy', value: 'Synergy'},
          { name: 'LLM (Low Latency Server)', value: 'LLM' },
        )
    ),
    async execute(interaction) {
    const elo = 1500;
    const handle = '@' + interaction.member.user.username + '#' + interaction.member.user.discriminator;
    const userid = interaction.member.user.id;
    const region = interaction.options.getString('region')
    const player = { handle, userid, region, elo };
    try {
      await Player.create(player);
      return interaction.reply(`${interaction.member.user} has been registered to the ranked players database with region ${region}! You must play ${rankedMatchesThreshold} ranked matches before earning a rank.`);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return interaction.reply({content: 'You are already registered in the database', ephemeral: true });
      }
      return interaction.reply('Something went wrong with registering user.' + `\n\`` + error + `\``);
    }
  },
};

