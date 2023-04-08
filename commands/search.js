const { ChannelType, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, roleMention } = require('discord.js');
const { Player, Match } = require('../dbinit.js')
const { searchExpMins, getRank } = require('../helpers.js')
const { matchStatsArray } = require('../matches.json')

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
    const rank = await getRank(player1)
    let rankedRole

    //temporary solution to allow Low Latency Matchmaking to have a role ping
    let ping = false
    const isLLMGuild = interaction.guild.id === '1052313301587066940'
    if (isLLMGuild) {
      rankedRole = '<@&1076240686912913518>'
      ping = true
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`accept-`+`${player1.userid}`)
          .setLabel('Accept Match')
          .setStyle(ButtonStyle.Primary))
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`cancel-`+`${player1.userid}`)
          .setLabel('Cancel Search')
          .setStyle(ButtonStyle.Secondary))
    const playerDetailsEmbed = {
      color: rank.color,
      title: `Best of 5 Search`,
      fields: [
        {
          name: 'Handle',
          value: player1.handle,
          inline: true,
        },
        {
          name: 'Rank',
          value: `${rank.label} \n[ELO: ${player1.elo}${isUnranked(player1) ? '?]' : ']'}`,
          inline: true,
        },
        {
          name: 'Region',
          value: player1.region,
          inline: true,
        },
      ],
      description: `Press the button to accept the match from ${interaction.member.user}.\n\nThis request will expire ${searchExpMins} minutes after it was created`,
    };
    await interaction.reply({ content: ``, embeds: [playerDetailsEmbed], components: [row]});
    let post = { 
      content: `${interaction.member.user} is searching for a ranked match.`, 
    }
    if (ping) {
      post.content = post.content + ` ${rankedRole}` 
    }
    await interaction.channel.send(post)
    setTimeout(async () => {
      try {
        let matchStats = matchStatsArray.find( matchStats => matchStats.rankedChannel.messageid === interaction.id );
        if (!interaction.replied) {
          logger.info(`[search] Match search from ${interaction.member.user.tag} expired after ${searchExpMins} minutes`)
          if (matchStats) {
            return logger.debug('[search] search timer expired but matchStats exists meaning players have checked in')
          }
          return interaction.editReply({ content:`The match search has expired.`, components: [] });
        }
      } catch(error) {
        logger.error(error)
        return
      }
    }, searchExpMins * 60 * 1000);
  },
};
