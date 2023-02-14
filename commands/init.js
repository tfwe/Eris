const { SlashCommandBuilder } = require('discord.js');
const { Player, sequelize } = require('../dbinit.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('init')
    .setDescription('Force registers a player into the ranked database')
    .addStringOption(option =>
		  option.setName('region')
        .setDescription('player\'s region')
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
          { name: 'Oceania', value: 'Oceania' },
          { name: 'Europe', value: 'Europe' },
          { name: 'South America', value: 'South America' },

        )
    ).addStringOption(option =>
      option.setName('elo')
      .setDescription('The amount of elo they have')
      .setRequired(true)
    ).addStringOption(option =>
      option.setName('mention')
      .setDescription('Mention the player')
      .setRequired(true)
    ),
    async execute(interaction) {
    // establish a connection to the database
    // create the player object
    const elo = await interaction.options.getString('elo');
    const mention = await interaction.options.getString('mention')
    const userId = await mention.match(/\d+/g)[0];
    const user = await interaction.guild.members.cache.get(userId).user
    const handle = await '@' + user.username + '#' + user.discriminator;
    const region = await interaction.options.getString('region')
    const player = { handle, userId, region, elo };
    console.log(handle)

    // create the player in the database
    try {
      await Player.create(player);
      return interaction.reply(`${user} has been registered to the ranked players database with region ${region} and ELO ${elo}!`);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        let foundPlayer = await Player.findOne({ where: { userid: player.userId } });
        await Player.destroy(foundPlayer)
        await Player.create(player)
        return await interaction.reply(`${user} has been registered to the ranked players database with region ${player.region} and ELO ${player.elo}!`);
      }
      return await interaction.reply('Something went wrong with registering user.' + `\n\`` + error + `\``);
    }
  },
};

