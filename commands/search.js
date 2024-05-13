const { ChannelType, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, roleMention } = require('discord.js');
const { Player, Match } = require('../dbinit.js')
const { searchExpMins, getRank } = require('../helpers.js')
const fs = require('fs'); // Import fs to read the JSON file
const logger = require('../logger');

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
    const unranked = await isUnranked(player1)
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
          value: `${rank.label} \n${player1.elo}${unranked ? '?' : ''}`,
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
    logger.info(`[search] Match search created from ${JSON.stringify(player1)}\nUnranked: ${unranked}\n Fields:${JSON.stringify(playerDetailsEmbed.fields)}`)
    if (ping) {
      post.content = post.content + ` ${rankedRole}` 
    }
    const message = await interaction.channel.send(post);
    const updateInterval = setInterval(async () => {
      try {
        // Re-read the JSON file to get updated match stats
        const matchStatsArray = JSON.parse(fs.readFileSync('../matches.json', 'utf8'));
        let matchStats = matchStatsArray.find( matchStats => matchStats.rankedChannel.messageid === interaction.id );
        if (matchStats) {
          // Update the score from matchStats
          const updatedFields = playerDetailsEmbed.fields.map(field => {
            if (field.name === 'Score') {
              field.value = matchStats.score;
            }
            return field;
          });
          await interaction.editReply({ embeds: [{ ...playerDetailsEmbed, fields: updatedFields }] });
        }
      } catch (error) {
        logger.error(error);
      }
    }, 60 * 1000); // Update every minute

    setTimeout(async () => {
      clearInterval(updateInterval); // Stop updating after 15 minutes
      try {
        if (!interaction.replied) {
          logger.info(`[search] Match search from ${interaction.member.user.tag} expired after 15 minutes`)
          await message.delete(); // Delete the message after 15 minutes if not accepted
          return interaction.editReply({ content:`The match search has expired.`, components: [] });
        }
      } catch(error) {
       logger.error(`Failed to delete the message or edit the reply after expiration: ${error}`);
      }
    }, 15 * 60 * 1000); // Timeout after 15 minutes

    // Event listener for button clicks
    const filter = i => ['accept-'+`${player1.userid}`, 'cancel-'+`${player1.userid}`].includes(i.customId);
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15 * 60 * 1000 });

    collector.on('collect', async i => {
      if (i.customId === 'accept-'+`${player1.userid}`) {
        // Handle match acceptance
        try {
          const match = await Match.create({
            player1Id: player1.userid,
            player2Id: i.user.id,
            status: 'active'
          });
          await interaction.editReply({ content: `Match accepted by ${i.user.tag}. Good luck!`, embeds: [], components: [] });
          clearInterval(updateInterval);
          collector.stop();
        } catch (error) {
          logger.error(`Error creating match: ${error}`);
          await i.reply({ content: "Failed to start match due to an error.", ephemeral: true });
        }
      } else if (i.customId === 'cancel-'+`${player1.userid}`) {
        // Handle match cancellation
        await interaction.editReply({ content: `Match search cancelled by ${interaction.member.user.tag}.`, embeds: [], components: [] });
        clearInterval(updateInterval);
        collector.stop();
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time') {
        logger.info(`[search] Match search from ${interaction.member.user.tag} timed out after 15 minutes`);
        if (!interaction.replied) {
          await interaction.editReply({ content: "The match search has timed out.", components: [] });
        }
      }
    });
  }
};
