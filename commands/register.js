const { SlashCommandBuilder } = require('discord.js');
const { Player, sequelize } = require('../dbinit.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Registers the invoking user into the ranked players database')
    .addStringOption(option =>
		  option.setName('region')
        .setDescription('Your region')
        .setRequired(true)
        .addChoices(
          { name: 'Subarctic', value: 'Subarctic' },
          { name: 'Pacific Northwest', value: 'Pacific Northwest' },
          { name: 'Pacific', value: 'Pacific' },
          { name: 'Midwest', value: 'Midwest' },
          { name: 'Central', value: 'Central' },
          { name: 'Southeast', value: 'Southeast' },
          { name: 'Northeast', value: 'Northeast' },
          { name: 'Southeast', value: 'Southeast' },
          { name: 'North Mexico', value: 'North Mexico' },
          { name: 'South Mexico', value: 'South Mexico' },
          { name: 'Caribbean', value: 'Caribbean' },
          { name: 'Asia', value: 'Asia' },
          { name: 'Australia', value: 'Australia' },
          { name: 'Europe', value: 'Europe' },

        )
    ),
    async execute(interaction) {
    // establish a connection to the database
    // create the player object
    const elo = 1500;
    const handle = '@' + interaction.member.user.username + '#' + interaction.member.user.discriminator;
    const userid = interaction.member.user.id;
    const region = interaction.options.getString('region')
    const player = { handle, userid, region, elo };

    // create the player in the database
    try {
      await Player.create(player);
      return interaction.reply(`${interaction.member.user} has been registered to the ranked players database with region ${region} and ELO ${elo}!`);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return interaction.reply('User already exists in the database');
      }
      return interaction.reply('Something went wrong with registering user.' + `\n\`` + error + `\``);
    }
  },
};
