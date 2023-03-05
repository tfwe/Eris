const fs = require('node:fs');
const util = require('util')
const path = require('node:path');
const Sequelize = require('sequelize');
const logger = require('./logger');
const { Match, Player, Game } = require('./dbinit.js')
const Op = Sequelize.Op;
const { Client, Events, GatewayIntentBits, Collection, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { token, guildIds, clientId, dbLoc } = require('./config.json');
const { matchStatsArray } = require('./matches.json')
const { updateDB, updateElo, K, getMatchDetailsEmbed, getPreviousMatches, stages, searchExpMins, getRank, rankedMatchesThreshold, abortMatch } = require('./helpers.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const interactionsPath = path.join(__dirname, 'interactions');
const interactionFiles = fs.readdirSync(interactionsPath).filter(file => file.endsWith('.js'));


const allStagesMenu = new StringSelectMenuBuilder({
  custom_id: 'game1-stage',
  placeholder: 'Choose a stage.',
  options: stages,
});

//JSON.toString complains when running into a BigInt for some reason, this happens when JSON.toString() is called on interaction object
BigInt.prototype.toJSON = function() { return this.toString() }
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    logger.error(`[WARN] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, () => {
  logger.info(`Logged in as ${client.user.tag}!`);
  client.application.commands.set([])
});

client.on("guildCreate", guild => {
  if (!guildIds.includes(guild.id)) {
    guildIds.push(guild.id);
    fs.writeFile('./config.json', JSON.stringify({ token, guildIds, clientId, dbLoc }), (err) => {
      if (err) logger.error(err);
    });
  }
});



client.on(Events.InteractionCreate, async interaction => {
  for (const file of interactionFiles) {
    const filePath = path.join(interactionsPath, file);
    const event = require(filePath);
    logger.info(`[InteractionCreate] Executing ${file}`)
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }

  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  await command.execute(interaction);
  try {
    logger.info(`[chatCommand] ${interaction.member.user.tag} used ${interaction}`)
    updateMatchesFile(matchStatsArray)
  } catch (error) {
    await interaction.channel.send({content: `Something went wrong` + `\n\`\`\`${error}\`\`\``})
    const interactionInspect = util.inspect(interaction, {showHidden: false, depth: null, colors: true})
    logger.error(`[WARN] ${error} from ${interaction.member.user.tag} on message ${interaction.customId} ${interactionInspect}`);
    return
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;
  const customId = interaction.customId
  try {
    
   if (customId.match(/checkin/)) {
      const thread = interaction.channel
      const user = interaction.member.user
      logger.info(`[Button] ${user.tag} tried checkin`);
      let checkedInPlayer = await Player.findOne({ where: { userid: user.id, matchid: thread.id } });
      let matchStats = matchStatsArray.find( matchStats => matchStats.matchid === thread.id);
      if (!matchStats) {
        throw 'matchStatsException'
        return interaction.channel.send(`Something went wrong [4]`)
      }
      if(matchStats && checkedInPlayer) {
        if (checkedInPlayer.userid === matchStats.player1.id ) {
          if (matchStats.player1.checkedIn) return interaction.reply({ content:`You have already checked in.`, ephemeral: true })
          matchStats.player1.checkedIn = true
        } 
        else if (checkedInPlayer.userid === matchStats.player2.id ) {
          if (matchStats.player2.checkedIn) return interaction.reply({ content:`You have already checked in.`, ephemeral: true })
          matchStats.player2.checkedIn = true
        }
        if (matchStats.player1.checkedIn && matchStats.player2.checkedIn) {
          let player1 = await Player.findOne({ where: { userid: matchStats.player1.id } });
          let player2 = await Player.findOne({ where: { userid: matchStats.player2.id } });
          matchStats.started = true
          let game
          if (!matchStats.games[matchStats.currentGame]) {
            game = {
              player1char: null,
              player2char: null,
              wchar: null,
              bans: [],
              stage: null,
              report: {
                player1: null,
                player2: null
              },
              winner: null
            }
            matchStats.games.push(game)
          }
          game = matchStats.games[matchStats.currentGame]
          updateMatchesFile(matchStatsArray)
          logger.info(`[Button] Match ${matchStats.matchid} checkin successful`);
          const starterStages = stages.filter(
            option => option.description === "Starter"
          );
          const filteredStartersMenu = new StringSelectMenuBuilder({
            custom_id: 'game1-stage-' + thread.id,
            placeholder: 'Choose a stage.',
            options: starterStages,
          });
          const row2 = new ActionRowBuilder()
            .addComponents(filteredStartersMenu);
          let rpsUser = interaction.guild.members.cache.get(matchStats.rpsWinner)
          return interaction.update({ content: `${rpsUser}, please choose a stage you would like to ban.`, components: [row2]})
        }
      }
      return await interaction.update({ content: interaction.message.content + `\n${user} has checked in for the match!` })
    }
    else if (customId.match('dispute-confirm')) {
      const thread = interaction.channel
      const user = interaction.member.user
      let matchStats = matchStatsArray.find( matchStats => matchStats.matchid === interaction.channel.id);
      if (!matchStats) {
        logger.info(`[dispute] ${user.tag} attempted to dispute match that does not exist`)
        await interaction.reply({content: "Match could not be found. Aborting and locking thread.", ephemeral: true})
        abortMatch(interaction)
        return await interaction.channel.send({ content: "Something went wrong. [5]", ephemeral: true })
      }
      if (!matchStats.started) {
        logger.info(`[dispute] ${user.tag} attempted to dispute match that exists but has not started, aborting: ${matchStats}`)
        await interaction.reply({content: "Attempted to dispute match before it had begun. Aborting and locking thread.", ephemeral: true})
        await thread.send('Aborting match and locking thread.')
        await abortMatch(interaction)
        return
      }
      const postMatchExpMins = 5
      let player1 = await Player.findOne({ where: { userid: matchStats.player1.id } });
      let player2 = await Player.findOne({ where: { userid: matchStats.player2.id } });
      if (!(player1 || player2)) {
        logger.error(`[WARN] Could not find one or both of player 1 and player 2 from user ${user.tag} on interaction ${interaction.customId}`)
        throw PlayerNotFound
        return
      }
      player1.matchid = 'N/A'
      player2.matchid = 'N/A'
      player1.disputes = player1.disputes + 1
      player2.disputes = player2.disputes + 1
      player1.updatedAt = new Date();
      player2.updatedAt = new Date();
      await player1.save();
      await player2.save();
      logger.info(`[Button] ${user.tag} confirmed dispute`);
      await interaction.update({ components: [] })
      await thread.send({ content:`${interaction.member.user} has disputed the match!`, components: [] })
      matchStatsArray.splice(matchStatsArray.indexOf(matchStats), 1) 
      await thread.setLocked(true)
      return await thread.setArchived(true)
    }
    else if (customId.match('dispute-can')) {
      const user = interaction.member.user
      logger.info(`[Button] ${user.tag} cancelled dispute`);
      return await interaction.update({ content:'Dispute canceled', components:[] })
    }
    await updateMatchesFile(matchStatsArray)
  } catch(error) {
      await interaction.channel.send({content: `Something went wrong` + `\n\`\`\`${error}\`\`\``})
      const interactionInspect = util.inspect(interaction, {showHidden: false, depth: null, colors: true})
      logger.error(`[WARN] ${error} from ${interaction.member.user.tag} on message ${interaction.customId} ${interactionInspect}`);
    return
  }
})

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (!interaction.isStringSelectMenu()) return
    const user = interaction.user
    const thread = interaction.channel 
    let matchStats = matchStatsArray.find( matchStats => matchStats.matchid === thread.id);
    if (!matchStats) {
      throw 'matchStatsException'
      return await interaction.reply('Something went wrong [6]')
    }
    let game
    if (!matchStats.games[matchStats.currentGame]) {
      game = {
        player1char: null,
        player2char: null,
        wchar: null,
        bans: [],
        stage: null,
        report: {
          player1: null,
          player2: null
        },
        winner: null
      }
      matchStats.games.push(game)
    }
    game = matchStats.games[matchStats.currentGame]
    var starterStages = stages.filter(
      option => option.description === "Starter"
    );
    if (game) {
      var filteredStartersMenu = new StringSelectMenuBuilder({
        custom_id: 'game1-stage-' + thread.id,
        placeholder: 'Choose a stage.',
        options: starterStages.filter((stage) => !game.bans.includes(stage.value) && !interaction.values[0].includes(stage.value)),
      });
      var fullMenu = new StringSelectMenuBuilder({
        custom_id: 'game1-stage-' + thread.id,
        placeholder: 'Choose a stage.',
        options: stages.filter((stage) => !interaction.values[0].includes(stage.value)),
      });
      var filteredFullMenu = new StringSelectMenuBuilder({
        custom_id: 'game1-stage-' + thread.id,
        placeholder: 'Choose a stage.',
        options: stages.filter((stage) => !game.bans.includes(stage.value) && !interaction.values[0].includes(stage.value)),
      });
    var row3 = new ActionRowBuilder()
      .addComponents(filteredFullMenu);
    }
    var row2 = new ActionRowBuilder()
      .addComponents(filteredStartersMenu);
    if (interaction.customId.match(/game1-stage/)) {
      let matchStats = matchStatsArray.find( matchStats => matchStats.matchid === thread.id);
      if (!matchStats) {
        throw 'matchStatsException'
        return await interaction.reply('Something went wrong [0]')
      }
      game = matchStats.games[matchStats.currentGame]
      let player1 = matchStats.player1 
      let player2 = matchStats.player2 
      let rpsLoser = (matchStats.rpsWinner !== matchStats.player1.id) ? matchStats.player1.id : matchStats.player2.id
      let prevGameWinner
      rpsLoser = interaction.guild.members.cache.get(rpsLoser)
      rpsWinner = interaction.guild.members.cache.get(matchStats.rpsWinner)
      logger.debug(`[Stage Menu] Rps winner ${rpsWinner.user.tag} and loser ${rpsLoser.user.tag} chosen`) 
      if (matchStats.games.length > 1) {
        prevGameWinner = matchStats.games[matchStats.currentGame - 1].winner
        prevGameLoser = (prevGameWinner === matchStats.player1.id) ? matchStats.player2.id : matchStats.player1.id
        prevGameWinner = interaction.guild.members.cache.get(prevGameWinner)
        prevGameLoser = interaction.guild.members.cache.get(prevGameLoser)
      }
      if (matchStats.games[matchStats.currentGame].bans.length < 1) {
        if (matchStats.games.length > 1) {
          if (user.id !== matchStats.games[matchStats.currentGame - 1].winner) {
            logger.debug(`[Stage Menu] ${user.tag} tried to ban out of turn, bans: ${matchStats.bans}, games length: ${matchStats.games.length}`)
            return interaction.reply({ content:`It is not your turn to ban stages.`, ephemeral: true })
          }
        }
        else if (matchStats.games.length == 1) {
          if (user.id !== matchStats.rpsWinner) {
            logger.debug(`[Stage Menu] ${user.tag} tried to ban out of turn, bans: ${matchStats.bans}, games length: ${matchStats.games.length}`)
            return interaction.reply({ content:`It is not your turn to ban stages.`, ephemeral: true })
          }
        }
        if (matchStats.games[matchStats.currentGame].bans.includes(interaction.values[0])) {
            logger.debug(`[Stage Menu] ${user.tag} tried to pick banned stage ${interaction.values[0]}, bans: ${matchStats.bans}, games length: ${matchStats.games.length}`)
          return interaction.reply({ content:`That stage is currently banned. Please choose a different stage.`, ephemeral: true })
        }
        matchStats.games[matchStats.currentGame].bans.push(interaction.values[0])
        logger.info(`[StringSelectMenu] ${user.tag} banned stage ${interaction.values[0]} on game ${JSON.stringify(matchStats.currentGame)}: ${JSON.stringify(matchStats.games[matchStats.currentGame])}`);
        await updateMatchesFile(matchStatsArray)
        if (matchStats.games.length == 1) {
          let matchDetailsEmbed = await getMatchDetailsEmbed(matchStats)
          return await interaction.update({
            content: `${rpsLoser}, please select an additional 2 stages to ban.\n\n Current bans: \`${matchStats.games[matchStats.currentGame].bans.join(', ')}\``,
            embeds: [matchDetailsEmbed],
            components: [row2],
          });
        }
        logger.error(`${user}`)
        var row3 = new ActionRowBuilder()
          .addComponents(filteredFullMenu);
        let matchDetailsEmbed = await getMatchDetailsEmbed(matchStats)
        return await interaction.update({
        content: `${prevGameWinner}, please select an additional 2 stages to ban.\n\n Current bans: \`${matchStats.games[matchStats.currentGame].bans.join(', ')}\``,
        embeds: [matchDetailsEmbed],
        components: [row3],
      });
    }
      else if (matchStats.games[matchStats.currentGame].bans.length < 2) {
        if (matchStats.games.length > 1) {
          if (user.id !== matchStats.games[matchStats.currentGame - 1].winner) {
            logger.debug(`[Stage Menu] ${user.tag} tried to ban out of turn, bans: ${matchStats.bans}, games length: ${matchStats.games.length}`)
            return interaction.reply({ content:`It is not your turn to ban stages.`, ephemeral: true })
          }
        } else if (matchStats.games.length == 1) {
          if (user.id !== rpsLoser.id) {
            logger.debug(`[Stage Menu] ${user.tag} tried to ban out of turn, bans: ${matchStats.bans}, games length: ${matchStats.games.length}`)
            return interaction.reply({ content:`It is not your turn to ban stages.`, ephemeral: true })
          }
        }
        if (matchStats.games[matchStats.currentGame].bans.includes(interaction.values[0])) {
          logger.debug(`[Stage Menu] ${user.tag} tried to pick banned stage ${interaction.values[0]}, bans: ${matchStats.bans}, games length: ${matchStats.games.length}`)
          return interaction.reply({ content:`That stage is currently banned. Please choose a different stage.`, ephemeral: true })
        }
        matchStats.games[matchStats.currentGame].bans.push(interaction.values[0])
        logger.info(`[StringSelectMenu] ${user.tag} banned stage ${interaction.values[0]} on game ${JSON.stringify(matchStats.currentGame)}: ${JSON.stringify(matchStats.games[matchStats.currentGame])}`);
        updateMatchesFile(matchStatsArray)
        let matchDetailsEmbed = await getMatchDetailsEmbed(matchStats)
        if (matchStats.games.length == 1) {
          return await interaction.update({
            content: `${rpsLoser}, please select an additional stage to ban.\n\n Current bans: \`${matchStats.games[matchStats.currentGame].bans.join(', ')}\``,
            embeds: [matchDetailsEmbed],
            components: [row2],
          });
        }
        return await interaction.update({
          content: `${prevGameWinner}, please select an additional stage to ban.\n\n Current bans: \`${matchStats.games[matchStats.currentGame].bans.join(', ')}\``,
          embeds: [matchDetailsEmbed],
          components: [row3],
        });
      }
      else if (matchStats.games[matchStats.currentGame].bans.length < 3) {
        if (matchStats.games.length > 1) {
          if (user.id !== matchStats.games[matchStats.currentGame - 1].winner) {
            logger.debug(`[Stage Menu] ${user.tag} tried to ban out of turn, bans: ${matchStats.bans}, games length: ${matchStats.games.length}`)
            return interaction.reply({ content:`It is not your turn to ban stages.`, ephemeral: true })
          }
        } else if (matchStats.games.length == 1) {
          if (user.id !== rpsLoser.id) {
            logger.debug(`[Stage Menu] ${user.tag} tried to ban out of turn, bans: ${matchStats.bans}, games length: ${matchStats.games.length}`)
            return interaction.reply({ content:`It is not your turn to ban stages.`, ephemeral: true })
          }
        }
        if (matchStats.games[matchStats.currentGame].bans.includes(interaction.values[0])) {
          logger.debug(`[Stage Menu] ${user.tag} tried to pick banned stage ${interaction.values[0]}, bans: ${matchStats.bans}, games length: ${matchStats.games.length}`)
          return interaction.reply({ content:`That stage is currently banned. Please choose a different stage.`, ephemeral: true })
        }
        matchStats.games[matchStats.currentGame].bans.push(interaction.values[0])
        logger.info(`[StringSelectMenu] ${user.tag} banned stage ${interaction.values[0]} on game ${JSON.stringify(matchStats.currentGame)}: ${JSON.stringify(matchStats.games[matchStats.currentGame])}`);
        let matchDetailsEmbed = await getMatchDetailsEmbed(matchStats)
        updateMatchesFile(matchStatsArray)

        if (matchStats.games.length == 1) {
          return await interaction.update({
            content: `${rpsWinner}, please select a stage to play on.\n\n Current bans: \`${matchStats.games[matchStats.currentGame].bans.join(', ')}\``,
            embeds: [matchDetailsEmbed],
            components: [row2],
          });
        }
        return await interaction.update({
          content: `${prevGameLoser}, please select a stage to play on.\n\n Current bans: \`${matchStats.games[matchStats.currentGame].bans.join(', ')}\``,
          embeds: [matchDetailsEmbed],
          components: [row3],
        });
      }
      if (matchStats.games.length > 1) {
        if (user.id === matchStats.games[matchStats.currentGame - 1].winner) {
          logger.debug(`[Stage Menu] ${user.tag} tried to pick stage out of turn, bans: ${matchStats.bans}, games length: ${matchStats.games.length}`)
          return interaction.reply({ content:`It is not your turn to pick stages.`, ephemeral: true })
        }
      } else if (matchStats.games.length == 1) {
        if (user.id !== rpsWinner.id) {
          logger.debug(`[Stage Menu] ${user.tag} tried to pick stage out of turn, bans: ${matchStats.bans}, games length: ${matchStats.games.length}`)
          return interaction.reply({ content:`It is not your turn to pick stages.`, ephemeral: true })
        }
      }
      if (matchStats.games[matchStats.currentGame].bans.includes(interaction.values[0])) {
        return interaction.reply({ content:`That stage is currently banned. Please select a different stage.`, ephemeral: true })
      }
      logger.info(`[StringSelectMenu] ${user.tag} picked stage ${interaction.values[0]} on game ${JSON.stringify(matchStats.currentGame)}: ${JSON.stringify(matchStats.games[matchStats.currentGame])}`);
      matchStats.games[matchStats.currentGame].stage = interaction.values[0]
      updateMatchesFile(matchStatsArray)
      let matchDetailsEmbed = await getMatchDetailsEmbed(matchStats)
      const row4 = new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('game1-report-' + thread.id)
            .setPlaceholder('Choose the winner')
            .addOptions(
              {
                label: matchStats.player1.handle,
                value: matchStats.player1.id,
              },
              {
                label: matchStats.player2.handle,
                value: matchStats.player2.id,
              },
            ),
          );
      return await interaction.update({
        content: `Stage selection is completed! After the game is completed, both players should return to this thread and report the winner of the game. The game details are as follows: \n\nPicked Stage: \`${matchStats.games[matchStats.currentGame].stage}\``,
        embeds: [matchDetailsEmbed],
        components: [row4],
      });
  }
    else if (interaction.customId.match(/game1-report/)) {
      let user = interaction.member.user
      matchStats = matchStatsArray.find( matchStats => matchStats.matchid === thread.id);
      if (!matchStats) {
        throw 'matchStatsException'
        return interaction.channel.send('Something went wrong [3]')
      }
      let player1 = matchStats.player1
      let player2 = matchStats.player2
      let user1 = interaction.guild.members.cache.get(matchStats.player1.id)
      let user2 = interaction.guild.members.cache.get(matchStats.player2.id)
      if (user.id === matchStats.player1.id) {
        matchStats.games[matchStats.currentGame].report.player1 = interaction.values[0]
      }
      else if (user.id === matchStats.player2.id) {
        matchStats.games[matchStats.currentGame].report.player2 = interaction.values[0]
      }
      if (matchStats.games[matchStats.currentGame].report.player1 !== matchStats.games[matchStats.currentGame].report.player2 && 
        !(matchStats.games[matchStats.currentGame].report.player1 == null && 
          matchStats.games[matchStats.currentGame].report.player2 == null)) {
        const row4 = new ActionRowBuilder()
          .addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('game1-report-' + thread.id)
              .setPlaceholder('Choose the winner (1/2)')
              .addOptions(
                {
                  label: matchStats.player1.handle,
                  value: matchStats.player1.id,
                },
                {
                  label: matchStats.player2.handle,
                  value: matchStats.player2.id,
                },
              ),
            );
        let matchDetailsEmbed = await getMatchDetailsEmbed(matchStats)
        
        logger.info(`[StringSelectMenu] ${user.tag} picked winner ${interaction.values[0]} on game ${JSON.stringify(matchStats.currentGame)}: ${JSON.stringify(matchStats.games[matchStats.currentGame])} (1/2)`);
        return await interaction.update({
          content: `Stage selection is completed! After the game is completed, both players should return to this thread and report the winner of the game. The game details are as follows: \n\nPicked Stage: \`${matchStats.games[matchStats.currentGame].stage}\`\n\nThe game cannot proceed unless both players agree on the same winner.`,
          embeds: [matchDetailsEmbed],
          components: [row4],
        });
      }
      matchStats.games[matchStats.currentGame].winner = matchStats.games[matchStats.currentGame].report.player1
      if (matchStats.games[matchStats.currentGame].winner === matchStats.player1.id) {
        matchStats.player1.score = matchStats.player1.score + 1
        if (matchStats.player1.score >= 3) {
          matchStats.winner = matchStats.player1.id
          matchStats.finished = true
        }
      }
      else if (matchStats.games[matchStats.currentGame].winner === matchStats.player2.id) {
        matchStats.player2.score = matchStats.player2.score + 1
        if (matchStats.player2.score >= 3) {
          matchStats.winner = matchStats.player2.id
          matchStats.finished = true
        }
      }
      logger.info(`[StringSelectMenu] ${user.tag} picked winner ${interaction.values[0]} on game ${matchStats.currentGame}: ${JSON.stringify(matchStats.games[matchStats.currentGame])}, (2/2) proceeding`);
      let gameWinner = interaction.guild.members.cache.get(matchStats.games[matchStats.currentGame].winner)
      matchStats.currentGame = matchStats.currentGame + 1
      if (!matchStats.finished) {
        let game = matchStats.games[matchStats.currentGame]
        if (game) {
          var filteredFullMenu = new StringSelectMenuBuilder({
            custom_id: 'game1-stage-' + thread.id,
            placeholder: 'Choose a stage.',
            options: stages.filter((stage) => !game.bans.includes(stage.value) && !interaction.values[0].includes(stage.value)),
          });
        }
        var row3 = new ActionRowBuilder()
          .addComponents(fullMenu);
        let player1 = matchStats.player1
        let player2 = matchStats.player2
        let matchDetailsEmbed = await getMatchDetailsEmbed(matchStats)
        await updateMatchesFile(matchStatsArray)
        const rankedChannel = await client.channels.cache.get(matchStats.rankedChannel.channelid);
        let message = await rankedChannel.messages.fetch(matchStats.messageid)
        const messageInspect = util.inspect(message, {showHidden: false, depth: null, colors: true})
        // logger.error(`${messageInspect}`)
        return await interaction.update({
          content: `${gameWinner}, please select the first stage you would like to ban next game. \nPlease let your opponent know if you will be switching characters and what character you will play!`,
          embeds: [matchDetailsEmbed],
          components: [row3],
        });
      }
      let matchWinner = interaction.guild.members.cache.get(matchStats.winner)
      await updateDB(matchStats)
      const postMatchExpMins = 5
      await thread.send({ content:`${matchWinner} wins!\n\nMatch is complete. This thread will be locked in ${postMatchExpMins} minutes.`})
      const rank1 = await getRank(player1.id)
      const rank2 = await getRank(player2.id)
      const matchEndEmbed = {
        color: 0xFFB900,
        title: 'Match Results',
        fields: [
         {
            name: player1.handle,
            value: `Region: ${player1.region}
            New Rank: ${rank1.label} ${(rank1.label === 'Unranked') ? '' :  ('[ELO: ' + player1.elo) + ']'}
            Score: ${player1.score}`,
            inline: false,
          },
          {
            name: player2.handle,
            value: `Region: ${player2.region}
            New Rank: ${rank2.label} ${(rank2.label === 'Unranked') ? '' :  ('[ELO: ' + player2.elo) + ']'}
            Score: ${player2.score}`,
            inline: false,
          },
        ],
        description: `${gameWinner} wins!`,
      };
      await interaction.update({
        content: '',
        embeds: [matchEndEmbed],
        components: [],
      });
      const rankedChannel = await client.channels.cache.get(matchStats.rankedChannel.channelid);
      let message = await rankedChannel.messages.fetch(matchStats.messageid)
      const messageInspect = util.inspect(message, {showHidden: false, depth: null, colors: true})
      // logger.error(`${messageInspect}`)
      logger.info(`[StringSelectMenu] ${matchWinner} wins match ${JSON.stringify(matchStats)}`);
      await updateElo(matchStats)
      await updateMatchesFile(matchStatsArray)
      setTimeout(async () => {
        if (matchStats.finished) {
          await thread.setLocked(true)
          await thread.setArchived(true)
          logger.info(`[StringSelectMenu] Locked and archived match thread ${matchStats.matchid}`);
          await matchStatsArray.splice(matchStatsArray.indexOf(matchStats), 1)
          updateMatchesFile(matchStatsArray)
          return
        }
      }, postMatchExpMins * 60 * 1000);
    } 
  } catch(error) {
    const interactionInspect = util.inspect(interaction, {showHidden: false, depth: null, colors: true})
    logger.error(`[WARN] ${error} from ${interaction.member.user.tag} on message ${interaction.customId} ${interactionInspect}`);;
    return
  }
});

client.on(Events.Debug, m => logger.debug(m));
client.on(Events.Warn, m => logger.warn(m));
client.on(Events.Error, m => logger.error(m));
client.login(token);
