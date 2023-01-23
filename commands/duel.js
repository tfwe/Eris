const { SlashCommandBuilder } = require('discord.js');
const { ChannelType } = require('discord.js');
const { Player, sequelize } = require('../dbinit.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duel')
    .setDescription('Request, Accept, or Deny a duel')
    .addSubcommand(subcommand =>
      subcommand
        .setName('request')
        .setDescription('Request a duel from a user')
        .addUserOption(option => 
          option
            .setName('user')
            .setDescription('The user you wish to challenge to a duel')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('accept')
        .setDescription('Accept a duel from a user')
        .addUserOption(option => 
          option
            .setName('user')
            .setDescription('The user who challenged you to a duel')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('deny')
        .setDescription('Deny a duel from a user')
        .addUserOption(option => 
          option
            .setName('user')
            .setDescription('The user who challenged you to a duel')
            .setRequired(true)
        )
    ), 
  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const user = interaction.member.user;
    const player = await Player.findOne({ where: { userid: target.user.id } });
    if (!player) {
      return interaction.reply(`Player not found in the database. They must register using \`/register <region>\` in order to play ranked matches with them.`);
    }
    
    if (interaction.options.getSubcommand() === 'request') {
      const mins = 10;
      interaction.reply(`${target}, you have been challenged to a duel by ${user}. Do you accept? Duel request will be active for ${mins} minutes. (Type /duel accept ${user} to accept the duel or /duel deny ${user} to deny)`);

      // schedule the removal of the active duel after the specified time has passed
      setTimeout(async () => {
        // make the duel no longer active
        // code here
        interaction.editReply(`The duel request from ${user} to ${target} has expired.`);
        return;
      }, mins * 60 * 1000);

    } else if (interaction.options.getSubcommand() === 'accept') {
  // check if the target has a pending duel request from the user
      if (player.hasPendingDuelRequestFrom(user)) {
    const thread = interaction.channel.threads.create({
      name: `${user.username} vs. ${target.user.username}`,
      autoArchiveDuration: 60,
      type: ChannelType.PrivateThread,
      reason: `Private match between ${user} and ${target}`,
    });
    thread.members.add(user);
    thread.members.add(target);
    console.log(`Created thread: ${thread.name}`);

    // remove the pending duel request
    player.removePendingDuelRequestFrom(user);
  } else {
    interaction.reply(`There is no pending duel request from ${user} to ${target}.`);
  }
} else if (interaction.options.getSubcommand() === 'deny') {
      // denyDuel();
        interaction.reply(`The duel request from ${user} to ${target} was denied.`);
    } else { 
      return interaction.reply(`Something went wrong while executing this command.`);
    }
  }
};

