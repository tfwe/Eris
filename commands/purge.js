// Importing necessary modules and initializing database models
const { SlashCommandBuilder } = require('discord.js');
const { Player } = require('../dbinit.js');
const Sequelize = require('sequelize');

// Define the command for purging inactive or duplicate players based on update time
module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Deletes all players who are inactive/lower elo duplicates'),
  async execute(interaction) {
    try {
      // Define the date 6 months ago from the current date
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Fetching all players from the database
      const players = await Player.findAll();

      // Grouping players by handle
      const groupedByHandle = players.reduce((acc, player) => {
        acc[player.handle] = acc[player.handle] || [];
        acc[player.handle].push(player);
        return acc;
      }, {});

      // Identifying duplicates and inactive players
      let toDelete = [];
      for (const handle in groupedByHandle) {
        if (groupedByHandle[handle].length > 1) {
          // Sort duplicates by ELO, highest first
          groupedByHandle[handle].sort((a, b) => b.elo - a.elo);
          
          // All except the highest ELO are considered lower ELO duplicates
          toDelete.push(...groupedByHandle[handle].slice(1));
        }
        // Add inactive players to the deletion list
        groupedByHandle[handle].forEach(player => {
          if (new Date(player.updatedAt) < sixMonthsAgo) {
            toDelete.push(player);
          }
        });
      }

      // Removing duplicates from the deletion list
      toDelete = toDelete.filter((value, index, self) => 
        index === self.findIndex((t) => (t.id === value.id)));

      // Deleting identified players from the database
      for (const player of toDelete) {
        await player.destroy();
      }

      // Sending confirmation message
      return interaction.reply(`Purged ${toDelete.length} players from the database.`);
    } catch (error) {
      // Handling errors during database operations
      return interaction.reply('Something went wrong during the purge process' + `\n\`` + error + `\``);
    }
  }
}
