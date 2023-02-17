const { ChannelType, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, roleMention } = require('discord.js');
const { Player, Match } = require('../dbinit.js')
const { isUnranked, getMatchCount } = require('../helpers.js')
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
    const isLLMGuild = interaction.guild.id === '1052313301587066940'
    let rankedRole
    if (isLLMGuild) {
      rankedRole = roleMention('1076240686912913518')
    }
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
          value: `${/* (isUnranked(player1.userid)) ? 'Unranked' :  */player1.elo}`,
          inline: true,
        },
      ],
      description: `Press the button to accept the match.\n\nThis request will expire ${searchExpMins} minutes after it was created`,
    };

    const post = await interaction.reply({ content: `${interaction.member.user} is searching for a ranked match. ${(isLLMGuild) ? rankedRole : ''}`, embeds: [playerDetailsEmbed], components: [row] });
  },
};

