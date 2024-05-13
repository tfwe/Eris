// Importing necessary modules from discord.js library
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Player } = require('../dbinit.js'); // Assuming dbinit.js initializes the database models

// Exporting the module which contains the command data and the execute function
module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Lists all the registered players in the ranked database')
    .addStringOption(option =>
      option.setName('region')
      .setDescription('The region to show the leaderboard of')
      .setRequired(false)
      .addChoices(
          { name: 'Oceania', value: 'Oceania' },
          { name: 'Synergy', value: 'Synergy'},
          { name: 'LLM (Low Latency Server)', value: 'LLM' },
        )
    ),
  
  async execute(interaction) {
    await interaction.deferReply();
    const region = interaction.options.getString('region');
    let players = await Player.findAll({
      where: region ? { region: region } : {},
      order: [['elo', 'DESC']],
    });

    const pageSize = 15;
    let page = 0;
    const totalPages = Math.ceil(players.length / pageSize);

    const getLeaderboardEmbed = (players, page) => {
      const start = page * pageSize;
      const end = start + pageSize;
      const currentPlayers = players.slice(start, end);

      const fields = currentPlayers.map((player, index) => ({
        name: `\`#${start + index + 1}:\` ${player.handle}`,
        value: `${player.region} | [ELO: ${player.elo}]`,
        inline: false
      }));

      return {
        color: 0xFFB900,
        title: `${region ? region : 'Global'} Leaderboard`,
        fields: fields,
        footer: { text: `Page ${page + 1} of ${totalPages}` }
      };
    };

    const updateLeaderboard = async (interaction, page) => {
      const embed = getLeaderboardEmbed(players, page);
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('previous_page')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId('next_page')
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === totalPages - 1)
        );

      await interaction.update({ embeds: [embed], components: [row] });
    };

    await interaction.editReply({
      embeds: [getLeaderboardEmbed(players, page)],
      components: [
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('previous_page')
              .setLabel('Previous')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('next_page')
              .setLabel('Next')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(totalPages <= 1)
          )
      ]
    });

    const collector = interaction.channel.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
      if (i.user.id === interaction.user.id) {
        if (i.customId === 'previous_page' && page > 0) {
          page--;
          await updateLeaderboard(i, page);
        } else if (i.customId === 'next_page' && page < totalPages - 1) {
          page++;
          await updateLeaderboard(i, page);
        }
      } else {
        await i.reply({ content: "You cannot control this leaderboard.", ephemeral: true });
      }
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] });
    });
  }
};
