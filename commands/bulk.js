const { SlashCommandBuilder } = require('discord.js');
const { Player, sequelize } = require('../dbinit.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bulk')
          .setDescription('Populates the ranked database with 20 dummy users'),
  async execute(interaction) {
    const players = [];
    for (let i = 0; i < 20; i++) {
      const userid = Math.floor(1000000000000000000 * Math.random()).toString();
      const handle = `@fakeplayer${i}#0000`;
      const region = 'Atlantis';
      const elo = Math.floor(Math.random() * (3000 - 1000 + 1)) + 1000;
      players.push({ userid, handle, region, elo });
    }
    try {
      await Player.bulkCreate(players);      
      return interaction.reply(`Successfully added 20 bulk users to database.`);
    } catch (error) {
      return interaction.reply(`Error adding bulk users to database.` + `\n\`` + error + `\``);
    }
  }
}

