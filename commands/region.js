const { SlashCommandBuilder } = require('discord.js');
const { Player, sequelize } = require('../dbinit.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('region')
    .setDescription('Changes your region to the specified region in the database')
    .addStringOption(option =>
		  option.setName('region')
        .setDescription('Your region')
        .setRequired(true)
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
          { name: 'Australia', value: 'Australia' },
          { name: 'Europe', value: 'Europe' },
          { name: 'South America', value: 'South America' },

        )
    ),
    async execute(interaction) {
    // establish a connection to the database
    // create the player object
    

    // create the player in the database
    let player1 = await Player.findOne({ where: { userid: interaction.member.user.id } });
    if (!player1) return interaction.reply({content:`You are not registered in the database. Please type \`/register\` to register.`, ephemeral: true})
    try {
      player1.handle = '@' + interaction.member.user.username + '#' + interaction.member.user.discriminator;
      player1.userid = interaction.member.user.id;
      player1.region = interaction.options.getString('region')
      await player1.save()
      return interaction.reply(`${interaction.member.user} has been updated in the database with region ${player1.region}!`);
    } catch (error) {
      return interaction.reply('Something went wrong with changing user region.' + `\n\`` + error + `\``);
    }
  },
};

