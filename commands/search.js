const { ChannelType, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Player } = require('../dbinit.js')
const searchExpMins = 15;



module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for a ranked best of 5 match'),
  async execute(interaction) {
    
    // retrieve the user's own region and elo from the database
    if (interaction.channel.isThread()) return await interaction.reply({ content: "Please use a text channel instead of a thread to use /search.", ephemeral: true })
    const player1 = await Player.findOne({ where: { userid: interaction.member.user.id } });
    if (!player1) return await interaction.reply({ content: "Please register using /register to play ranked matches.", ephemeral: true });
    if (player1.matchid !== 'N/A') return await interaction.reply({ content: "You are currently in a match. You must finish all your matches before joining a ranked match.", ephemeral: true })
    // Create the post message with the button
    const region = player1.region;
    const elo = player1.elo;

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`accept`+`${player1.userid}`)
          .setLabel('Accept Match')
          .setStyle(ButtonStyle.Primary))
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`cancel`+`${player1.userid}`)
          .setLabel('Cancel Search')
          .setStyle(ButtonStyle.Secondary))
    const playerDetailsEmbed = {
      color: 0xFFB900,
      title: 'Best of 5 Search',
      fields: [
        {
          name: 'Handle',
          value: player1.handle,
          inline: true,
        },
        {
          name: 'Region',
          value: player1.region,
          inline: true,
        },
        {
          name: 'ELO',
          value: player1.elo,
          inline: true,
        },
      ],
      description: `Press the button to accept the match.\n\nThis request will expire ${searchExpMins} minutes after it was created`,
    };

    const post = await interaction.reply({ content: `${interaction.member.user} is searching for a ranked match. `, embeds: [playerDetailsEmbed], components: [row] });
  },
};

