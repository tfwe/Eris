const fs = require('node:fs');
const path = require('node:path');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits, Collection, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { token, guildIds } = require('./config.json');

const { updateDB, matchStatsArray, checkInArray, K } = require('./helpers.js');
// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const stages = [
  {
    label: 'Town and City',
    description: 'Starter',
    value: 'town-and-city',
  },
  {
    label: 'Battlefield',
    description: 'Starter',
    value: 'battlefield',
  },
  {
    label: 'Small Battlefield',
    description: 'Starter',
    value: 'small-battlefield',
  },
  {
    label: 'Smashville',
    description: 'Starter',
    value: 'smashville',
  },
  {
    label: 'Pokemon Stadium 2',
    description: 'Starter',
    value: 'pokemon-stadium-2',
  },
  {
    label: 'Final Destination',
    description: 'Counterpick',
    value: 'final-destination',
  },
  {
    label: 'Hollow Bastion',
    description: 'Counterpick',
    value: 'hollow-bastion',
  },
  {
    label: 'Kalos Pokemon League',
    description: 'Counterpick',
    value: 'kalos-pokemon-league',
  },
];
const allStagesMenu = new StringSelectMenuBuilder({
  custom_id: 'game1-stage',
  placeholder: 'Choose a stage.',
  options: stages,
});
const K = 32 //elo constant

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

const { Player, Match, sequelize } = require('./dbinit.js')
// When the client is ready, run this code (only once)
client.once(Events.ClientReady, () => {
        console.log(`Logged in as ${client.user.tag}!`);
  Player.update({ matchid: 'N/A' }, { where: {} }); // make every player's matchid 'N/A'
  client.application.commands.set([])
});

client.on("guildCreate", guild => {
  if (!guildIds.includes(guild.id)) {
    guildIds.push(guild.id);
    fs.writeFile('./config.json', JSON.stringify({ token, guildIds, clientId }), (err) => {
      if (err) console.error(err);
    });
  }
});


client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isChatInputCommand()) return;
//
        const command = client.commands.get(interaction.commandName);
//
        if (!command) return;
//
        try {
                await command.execute(interaction);
    console.log(command.data.name)
    if (command.data.name === 'search') {
      const searchExpMins = 15
      setTimeout(async () => {
        try {
          let checkIn = checkInArray.find( checkin => checkin.messageid === interaction.id );
          if (!checkIn) {
            // return interaction.editReply({ content:`The match search has expired.`, components: [] });
          }
        } catch(error) {
          console.log(error)
          return
        }
      }, searchExpMins * 60 * 1000);
    }
    if (command.data.name === 'leave') {
      let matchStats = matchStatsArray.find( matchStats => matchStats.matchid === interaction.channel.id);
      if (!matchStats) {
        return 
      }
      console.log(matchStats)
      matchStats.finished = true
      matchStats.winner = (interaction.member.user.id === matchStats.player1.id) ? matchStats.player2.id : matchStats.player1.id
      await updateDB(matchStats)
      const postMatchExpMins = 5

      let newElo = { }
      if (matchStats.winner === matchStats.player1.id) {
        newElo = calculateElo(matchStats.player1.elo, matchStats.player2.elo, K);
        matchStats.player1.newElo = Math.round(newElo.newWinnerElo)
        matchStats.player2.newElo = Math.round(newElo.newLoserElo)

      } else if (matchStats.winner === matchStats.player2.id) {
        newElo = calculateElo(matchStats.player2.elo, matchStats.player1.elo, K);
        matchStats.player2.newElo = Math.round(newElo.newWinnerElo)
        matchStats.player1.newElo = Math.round(newElo.newLoserElo)
      }
      let player1 = await Player.findOne({ where: { userid: matchStats.player1.id } });
      let player2 = await Player.findOne({ where: { userid: matchStats.player2.id } });
      player1.matchid = 'N/A'
      player2.matchid = 'N/A'
      player1.updatedAt = new Date();
      player2.updatedAt = new Date();
      player1.elo = matchStats.player1.newElo;
      player2.elo = matchStats.player2.newElo;
      console.log(matchStats)
      console.log(matchStats.games)
      await player1.save();
      await player2.save();
      console.log(newElo)
    }
      
    if (command.data.name === 'dispute') {

    }

        } catch (error) {
                console.error(error);
                // await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
});

client.on('interactionCreate', async interaction => {
        if (!interaction.isButton()) return;
  let matchStarted = false
  const customId = interaction.customId
  const checkInExpMins = 15
  
  try {
    if (customId.match(/cancel/)) {
      const content = interaction.message.content.match(/<@(\d+)>/);
      const user1 = await client.users.fetch(content[1]);
      const user2 = interaction.user;
      if (user1.id !== user2.id) return await interaction.reply({ content: "You cannot cancel someone else's match.", ephemeral: true })
      return await interaction.update({content:`Match search canceled.`, components: [], embeds: []});
  }

    else if (customId.match(/accept/)) {
    
      const content = interaction.message.content.match(/<@(\d+)>/);
      const user1 = await client.users.fetch(content[1]);
      const user2 = interaction.user;
      if (user1.id === user2.id) return await interaction.reply({ content: "You cannot accept a match with yourself.", ephemeral: true })

      let player1 = await Player.findOne({ where: { userid: user1.id } });
      let player2 = await Player.findOne({ where: { userid: user2.id } });
      if (!player1) return await interaction.reply({ content: "Unable to match with user (they are not registered in the database but somehow they executed /search!)" })
      if (!player2) return await interaction.reply({ content: "Please register using /register to play ranked matches.", ephemeral: true });
      if (player2.matchid !== 'N/A') return await interaction.reply({ content: "You are currently in a match. You must finish all your matches before joining a ranked match.", ephemeral: true })
      if (player1.matchid !== 'N/A') return await interaction.reply({ content: "This player is currently in another match. They must finish all their matches before playing a new ranked match.", ephemeral: true })

      const thread = await interaction.channel.threads.create({
        name: `${user1.username} vs ${user2.username}`,
        autoArchiveDuration: 60,
        type: ChannelType.PrivateThread,
        reason: `Private match `,
      });
      await thread.members.add(interaction.member.user.id)
      await thread.members.add(user2.id);
      thread.send(`Starting match between ${user1} and ${user2}. Please test for lag and agree on delay settings before agreeing to play game 1. \nAfter game 1 has been started, you cannot leave the game unless you forfeit, or the match is over.`)
      let checkIn = checkInArray.find( checkin => checkin.matchid === thread.id);
      if (!checkIn) {
        checkIn = {
          messageid: interaction.message.id,
          matchid: thread.id,
          player1id: null,
          player2id: null,
        }
        checkInArray.push(checkIn);
      }

      const match = await { 
        matchid: thread.id, 
        player1id: player1.userid, 
        player2id: player2.userid, 
        player1elo: player1.elo, 
        player2elo: player2.elo 
      }
      Match.create(match)
      await player1.update({ matchid: thread.id }, { where: { userid: player1.userid } });
      await player2.update({ matchid: thread.id }, { where: { userid: player2.userid } });
      const matchDetailsEmbed = {
        color: 0xFFB900,
        title: 'Match Details',
        fields: [
          {
            name: player1.handle,
            value: player1.region,
            inline: true,
          },
          {
            name: 'ELO',
            value: player1.elo,
            inline: true,
          },
          {
            name: '\u200B',
            value: `\u200b`,
            inline: false,
          },
          {
            name: player2.handle,
            value: player2.region,
            inline: true,
          },
          {
            name: 'ELO',
            value: player2.elo,
            inline: true,
          },
        ],
        description: `Match has been created between ${user1} and ${user2}! Please head over to ${thread} to start the match.`,
      };

      await interaction.update({content: ``, embeds: [matchDetailsEmbed], components: [] });

      const row1 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`abort-`+`${match.matchid}`)
            .setLabel('Abort Match')
            .setStyle(ButtonStyle.Danger))
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId(`checkin-`+ `${match.matchid}`)
          .setLabel('Check In')
          .setStyle(ButtonStyle.Success))

      await thread.send({content: ``, embeds: [matchDetailsEmbed], components: [] })

      await thread.send({ content: `Push a button to abort the match or check into the match. Checking into a match means that you agree to play game 1. The match will automatically be aborted in ${checkInExpMins} minutes if game 1 has not started.`, components: [row1]})
            // thread.send({ content: `Please press the button under this message to check in for the match. Checking in means that you agree to play game 1.`, components: [row2] })
      
      setTimeout(async () => {
        let matchStats = matchStatsArray.find( matchStats => matchStats.matchid === thread.id);
        if (!matchStats) {
          thread.send('Match aborted.') 
          await thread.setLocked(true)
          await thread.setArchived(true)
          await Match.destroy({ where: { matchid: thread.id }});
          await player1.update({ matchid: 'N/A' }, { where: { userid: player1.userid } });
          await player2.update({ matchid: 'N/A' }, { where: { userid: player2.userid } });
          await player1.save();
          await player2.save();
        }
      }, checkInExpMins * 60 * 1000);
    }






    else if (customId.match(/abort/)) {
      // let player1 = await Player.findOne({ where: { userid: user1.id } });
      // let player2 = await Player.findOne({ where: { userid: user2.id } });
      const thread = interaction.channel
      interaction.update({ content: `Match aborted by ${interaction.member.user}.`, components: [] })
      const match = await Match.findOne({ where: { matchid: thread.id }})

      await thread.setLocked(true)
      await thread.setArchived(true)
      let player1 = await Player.findOne({ where: { userid: match.player1id } });
      let player2 = await Player.findOne({ where: { userid: match.player2id } });
      for (let i = 0; i < checkInArray.length; i++) {
        if (checkInArray[i].matchid === match.matchid) {
          checkInArray.splice(i, 1)
        }
      }
      await match.destroy()
      await player1.update({ matchid: 'N/A' }, { where: { userid: player1.userid } });
      await player2.update({ matchid: 'N/A' }, { where: { userid: player2.userid } });
      await player1.save();
      await player2.save();
    }






    else if (customId.match(/checkin/)) {
      const thread = interaction.channel
      const user = interaction.member.user
      
      let checkIn = checkInArray.find( checkin => checkin.matchid === thread.id);
      if (!checkIn) {
        checkIn = {
          matchid: thread.id,
          player1id: null,
          player2id: null,
        }
        checkInArray.push(checkIn);
      }

      let checkedInPlayer = await Player.findOne({ where: { userid: user.id, matchid: thread.id } });
      let checkedInMatch = await Match.findOne({ where: { matchid: thread.id }});
      if(checkedInPlayer && checkedInMatch) {
        if (checkedInPlayer.userid === checkedInMatch.player1id ) {
          if (checkIn.player1id) return interaction.reply({ content:`You have already checked in.`, ephemeral: true })
          checkIn.player1id = checkedInMatch.player1id
        }
        if (checkedInPlayer.userid === checkedInMatch.player2id ) {
          if (checkIn.player2id) return interaction.reply({ content:`You have already checked in.`, ephemeral: true })
          checkIn.player2id = checkedInMatch.player2id
        }
        if (checkIn.player1id && checkIn.player2id) {
          matchStarted = true
          let player1 = await Player.findOne({ where: { userid: checkIn.player1id } });
          let player2 = await Player.findOne({ where: { userid: checkIn.player2id } });
          let matchStats = matchStatsArray.find( matchStats => matchStats.matchid === thread.id);
          if (!matchStats) {
            const rpsWinner = Math.random() < 0.5 ? player1.userid : player2.userid
            matchStats = {
              finished: false,
              matchid: thread.id,
              player1: {
                id: player1.userid,
                handle: player1.handle,
                region: player1.region,
                elo: player1.elo,
                newElo: player1.elo,
                score: 0
              },
              player2: {
                id: player2.userid,
                handle: player2.handle,
                region: player2.region,
                elo: player2.elo,
                newElo: player2.elo,
                score: 0
              },
              rpsWinner: rpsWinner,
              winner: null,
              currentGame: 0,
              games: []
            }
            matchStatsArray.push(matchStats)
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
          const starterStages = stages.filter(
            option => option.description === "Starter"
          );
          const filteredStartersMenu = new StringSelectMenuBuilder({
            custom_id: 'game1-stage-' + thread.id,
            placeholder: 'Choose a stage.',
            options: starterStages.filter((stage) => !game.bans.includes(stage.value)),
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

      let matchStats = matchStatsArray.find( matchStats => matchStats.matchid === interaction.channel.id);
      if (!matchStats) {
        return /* await interaction.editReply({ content: "Something went wrong.", ephemeral: true }) */
      }
      console.log(matchStats)
      matchStats.finished = true
      const postMatchExpMins = 5


      let player1 = await Player.findOne({ where: { userid: matchStats.player1.id } });
      let player2 = await Player.findOne({ where: { userid: matchStats.player2.id } });
      player1.matchid = 'N/A'
      player2.matchid = 'N/A'
      player1.disputes = player1.disputes + 1
      player2.disputes = player2.disputes + 1
      player1.updatedAt = new Date();
      player2.updatedAt = new Date();
      await player1.save();
      await player2.save();

      await interaction.update({ components: [] })
      await thread.send({ content:`${interaction.member.user} has disputed the match!`, components: [] })
      matchStatsArray.splice(matchStatsArray.indexOf(matchStats), 1) 
      let checkIn = checkInArray.find( checkin => checkin.matchid === thread.id);
      if (checkIn) {
        checkInArray.splice(checkInArray.indexOf(checkIn))
      }
      await thread.setLocked(true)
      return await thread.setArchived(true)
    }
    else if (customId.match('dispute-cancel')) {
      return await interaction.update({ content:'Dispute canceled', components:[] })
    }
  } catch(error) {
    await interaction.reply({content: `Something went wrong` + `\n\`\`\`${error}\`\`\``})
    console.log(error)
    return
  }
})





client.on(Events.InteractionCreate, async interaction => {
  try {

    if (!interaction.isStringSelectMenu()) return
    const thread = interaction.channel 
    let matchStats = matchStatsArray.find( matchStats => matchStats.matchid === thread.id);
    if (matchStats) {
      let game = matchStats.games[matchStats.currentGame]
      
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

    }
    
    if (interaction.customId.match(/game1-stage/)) {
      const thread = interaction.channel
      const user = interaction.member.user
      let matchStats = matchStatsArray.find( matchStats => matchStats.matchid === thread.id);
      if (!matchStats) {
        return await interaction.reply('Something went wrong [0]')
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

      matchStats = matchStatsArray.find( matchStats => matchStats.matchid === thread.id);
      if (!matchStats) return
      let player1 = matchStats.player1 
      let player2 = matchStats.player2 
      {matchStats.games[matchStats.currentGame].bans.join(', ')}

      let rpsLoser = (matchStats.rpsWinner !== matchStats.player1.id) ? matchStats.player1.id : matchStats.player2.id
      let prevGameWinner
      rpsLoser = interaction.guild.members.cache.get(rpsLoser)
      rpsWinner = interaction.guild.members.cache.get(matchStats.rpsWinner)
      
      if (matchStats.games.length > 1) {
        prevGameWinner = matchStats.games[matchStats.currentGame - 1].winner
        prevGameLoser = (prevGameWinner === matchStats.player1.id) ? matchStats.player2.id : matchStats.player1.id
        prevGameWinner = interaction.guild.members.cache.get(prevGameWinner)
        prevGameLoser = interaction.guild.members.cache.get(prevGameLoser)
      }
      if (matchStats.games[matchStats.currentGame].bans.length < 1) {
        if (matchStats.games.length > 1) {
          if (user.id !== matchStats.games[matchStats.currentGame - 1].winner) {
            return interaction.reply({ content:`It is not your turn to ban stages.`, ephemeral: true })
          }
        }
        else if (matchStats.games.length == 1) {
          if (user.id !== matchStats.rpsWinner) {
            return interaction.reply({ content:`It is not your turn to ban stages.`, ephemeral: true })
          }
        }
        if (matchStats.games[matchStats.currentGame].bans.includes(interaction.values[0])) {
          return interaction.reply({ content:`That stage is currently banned. Please choose a different stage.`, ephemeral: true })
        }
        matchStats.games[matchStats.currentGame].bans.push(interaction.values[0])

        if (matchStats.games.length == 1) {
          const matchDetailsEmbed = {
            color: 0xFFB900,
            title: 'Match Details',
            fields: [
              {
                name: player1.handle,
                value: `Region: ${player1.region}\nELO: ${player1.elo}\nScore: ${player1.score}`,
                inline: true,
              },
              {
                name: player2.handle,
                value: `Region: ${player2.region}\nELO: ${player2.elo}\nScore: ${player2.score}`,
                inline: false,
              },
            ],
            description: `${rpsLoser}, please select an additional 2 stages to ban.\n\n Current bans: \`${matchStats.games[matchStats.currentGame].bans.join(', ')}\``,
          };

          return await interaction.update({
            content: '',
            embeds: [matchDetailsEmbed],
            components: [row2],
          });

        }
        
      let game = matchStats.games[matchStats.currentGame]
        if (game) {
          var filteredFullMenu = new StringSelectMenuBuilder({
            custom_id: 'game1-stage-' + thread.id,
            placeholder: 'Choose a stage.',
            options: stages.filter((stage) => !game.bans.includes(stage.value) && !interaction.values[0].includes(stage.value)),
          });
        }
        var row3 = new ActionRowBuilder()
          .addComponents(filteredFullMenu);
        const matchDetailsEmbed = {
          color: 0xFFB900,
          title: 'Match Details',
          fields: [
            {
              name: player1.handle,
              value: `Region: ${player1.region}\nELO: ${player1.elo}\nScore: ${player1.score}`,
              inline: true,
            },
            {
              name: player2.handle,
              value: `Region: ${player2.region}\nELO: ${player2.elo}\nScore: ${player2.score}`,
              inline: false,
            },
          ],
          description: `${prevGameWinner}, please select an additional 2 stages to ban.\n\n Current bans: \`${matchStats.games[matchStats.currentGame].bans.join(', ')}\``,
          };

          return await interaction.update({
            content: '',
            embeds: [matchDetailsEmbed],
            components: [row3],
          });
      }

      else if (matchStats.games[matchStats.currentGame].bans.length < 2) {
        if (matchStats.games.length > 1) {
          if (user.id !== matchStats.games[matchStats.currentGame - 1].winner) {
            return interaction.reply({ content:`It is not your turn to ban stages.`, ephemeral: true })
          }
        } else if (matchStats.games.length == 1) {
          if (user.id !== rpsLoser.id) {
            return interaction.reply({ content:`It is not your turn to ban stages.`, ephemeral: true })
          }
        }
        if (matchStats.games[matchStats.currentGame].bans.includes(interaction.values[0])) {
          return interaction.reply({ content:`That stage is currently banned. Please choose a different stage.`, ephemeral: true })
        }
        matchStats.games[matchStats.currentGame].bans.push(interaction.values[0])

        if (matchStats.games.length == 1) {
          const matchDetailsEmbed = {
          color: 0xFFB900,
          title: 'Match Details',
          fields: [
            {
              name: player1.handle,
              value: `Region: ${player1.region}\nELO: ${player1.elo}\nScore: ${player1.score}`,
              inline: true,
            },
            {
              name: player2.handle,
              value: `Region: ${player2.region}\nELO: ${player2.elo}\nScore: ${player2.score}`,
              inline: false,
            },
          ],
          description: `${rpsLoser}, please select an additional stage to ban.\n\n Current bans: \`${matchStats.games[matchStats.currentGame].bans.join(', ')}\``,
          };
          return await interaction.update({
            content: '',
            embeds: [matchDetailsEmbed],
            components: [row2],
          });
        }
        const matchDetailsEmbed = {
          color: 0xFFB900,
          title: 'Match Details',
          fields: [
            {
              name: player1.handle,
              value: `Region: ${player1.region}\nELO: ${player1.elo}\nScore: ${player1.score}`,
              inline: true,
            },
            {
              name: player2.handle,
              value: `Region: ${player2.region}\nELO: ${player2.elo}\nScore: ${player2.score}`,
              inline: false,
            },
          ],
          description: `${prevGameWinner}, please select an additional stage to ban.\n\n Current bans: \`${matchStats.games[matchStats.currentGame].bans.join(', ')}\``,
          };
          return await interaction.update({
            content: '',
            embeds: [matchDetailsEmbed],
            components: [row3],
          });
      }


      else if (matchStats.games[matchStats.currentGame].bans.length < 3) {
        if (matchStats.games.length > 1) {
          if (user.id !== matchStats.games[matchStats.currentGame - 1].winner) {
            return interaction.reply({ content:`It is not your turn to ban stages.`, ephemeral: true })
          }
        } else if (matchStats.games.length == 1) {
          if (user.id !== rpsLoser.id) {
            return interaction.reply({ content:`It is not your turn to ban stages.`, ephemeral: true })
          }
        }
        if (matchStats.games[matchStats.currentGame].bans.includes(interaction.values[0])) {
          return interaction.reply({ content:`That stage is currently banned. Please choose a different stage.`, ephemeral: true })
        }
        matchStats.games[matchStats.currentGame].bans.push(interaction.values[0])

        if (matchStats.games.length == 1) {
          const matchDetailsEmbed = {
            color: 0xFFB900,
            title: 'Match Details',
            fields: [
              {
                name: player1.handle,
                value: `Region: ${player1.region}\nELO: ${player1.elo}\nScore: ${player1.score}`,
                inline: true,
              },
              {
                name: player2.handle,
                value: `Region: ${player2.region}\nELO: ${player2.elo}\nScore: ${player2.score}`,
                inline: false,
              },
            ],
            description: `${rpsWinner}, please select a stage to play on.\n\n Current bans: \`${matchStats.games[matchStats.currentGame].bans.join(', ')}\``,
          };
          return await interaction.update({
            content: '',
            embeds: [matchDetailsEmbed],
            components: [row2],
          });
        }
        const matchDetailsEmbed = {
          color: 0xFFB900,
          title: 'Match Details',
          fields: [
            {
              name: player1.handle,
              value: `Region: ${player1.region}\nELO: ${player1.elo}\nScore: ${player1.score}`,
              inline: true,
            },
            {
              name: player2.handle,
              value: `Region: ${player2.region}\nELO: ${player2.elo}\nScore: ${player2.score}`,
              inline: false,
            },
          ],
          description: `${prevGameLoser}, please select a stage to play on.\n\n Current bans: \`${matchStats.games[matchStats.currentGame].bans.join(', ')}\``,
        };
        return await interaction.update({
          content: '',
          embeds: [matchDetailsEmbed],
          components: [row3],
        });
      }

      if (matchStats.games.length > 1) {
        if (user.id === matchStats.games[matchStats.currentGame - 1].winner) {
          return interaction.reply({ content:`It is not your turn to pick stages.`, ephemeral: true })
        }
      } else if (matchStats.games.length == 1) {
        if (user.id !== rpsWinner.id) {
          return interaction.reply({ content:`It is not your turn to pick stages.`, ephemeral: true })
        }
      }
      if (matchStats.games[matchStats.currentGame].bans.includes(interaction.values[0])) {
        return interaction.reply({ content:`That stage is currently banned. Please select a different stage.`, ephemeral: true })
      }
      matchStats.games[matchStats.currentGame].stage = interaction.values[0]

      const row4 = new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('game1-report-' + thread.id)
            .setPlaceholder('Choose the winner')
            .addOptions(
              {
                label: matchStats.player1.handle,
                // description: matchStats.games[matchStats.currentGame].player1char,
                value: matchStats.player1.id,
              },
              {
                label: matchStats.player2.handle,
                // description: matchStats.games[matchStats.currentGame].player2char,
                value: matchStats.player2.id,
              },
            ),
          );
      const matchDetailsEmbed = {
        color: 0xFFB900,
        title: 'Match Details',
        fields: [
          {
            name: player1.handle,
            value: `Region: ${player1.region}\nELO: ${player1.elo}\nScore: ${player1.score}`,
            inline: true,
          },
          {
            name: player2.handle,
            value: `Region: ${player2.region}\nELO: ${player2.elo}\nScore: ${player2.score}`,
            inline: false,
          },
        ],
        description: `Stage selection is completed! After the game is completed, both players should return to this thread and report the winner of the game. The game details are as follows: \n\nPicked Stage: \`${matchStats.games[matchStats.currentGame].stage}\``,
      };
      return await interaction.update({
        content: '',
        embeds: [matchDetailsEmbed],
        components: [row4],
      });
    }

    else if (interaction.customId.match(/game1-report/)) {
      let user = interaction.member.user
      matchStats = matchStatsArray.find( matchStats => matchStats.matchid === thread.id);
      if (!matchStats) return
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
      if (matchStats.games[matchStats.currentGame].report.player1 !== matchStats.games[matchStats.currentGame].report.player2) {
        const row4 = new ActionRowBuilder()
          .addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('game1-report-' + thread.id)
              .setPlaceholder('Choose the winner (1/2)')
              .addOptions(
                {
                  label: matchStats.player1.handle,
                  // description: matchStats.games[matchStats.currentGame].player1char,
                  value: matchStats.player1.id,
                },
                {
                  label: matchStats.player2.handle,
                  // description: matchStats.games[matchStats.currentGame].player2char,
                  value: matchStats.player2.id,
                },
              ),
            );
        const matchDetailsEmbed = {
          color: 0xFFB900,
          title: 'Match Details',
          fields: [
            {
              name: player1.handle,
              value: `Region: ${player1.region}\nELO: ${player1.elo}\nScore: ${player1.score}`,
              inline: true,
            },
            {
              name: player2.handle,
              value: `Region: ${player2.region}\nELO: ${player2.elo}\nScore: ${player2.score}`,
              inline: false,
            },
          ],
          description: `Stage selection is completed! After the game is completed, both players should return to this thread and report the winner of the game. The game details are as follows: \n\nPicked Stage: \`${matchStats.games[matchStats.currentGame].stage}\``,
        };
        return await interaction.update({
          content: '',
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
      else {
      }
      let gameWinner = interaction.guild.members.cache.get(matchStats.games[matchStats.currentGame].winner)
      let matchWinner = interaction.guild.members.cache.get(matchStats.winner)
      matchStats.currentGame = matchStats.currentGame + 1
      // console.log(matchStats)

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
        const matchDetailsEmbed = {
          color: 0xFFB900,
          title: 'Match Details',
          fields: [
            {
              name: player1.handle,
              value: `Region: ${player1.region}\nELO: ${player1.elo}\nScore: ${player1.score}`,
              inline: true,
            },
            {
              name: player2.handle,
              value: `Region: ${player2.region}\nELO: ${player2.elo}\nScore: ${player2.score}`,
              inline: false,
            },
          ],
          description: `${gameWinner}, please select the first stage you would like to ban next game. \nPlease let your opponent know if you will be switching characters and what character you will play!`,
        };
        return await interaction.update({
          content: '',
          embeds: [matchDetailsEmbed],
          components: [row3],
        });
      }
      await updateDB(matchStats)
      const postMatchExpMins = 5
      await thread.send({ content:`${matchWinner} wins!\n\nMatch is complete. This thread will be locked in ${postMatchExpMins} minutes.`})
        const getPreviousMatches = async (player1id, player2id) => {
        const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000)
        const previousMatches = await Match.findAll({
          where: {
            [Sequelize.Op.or]: [
              {
                player1id: player1id,
                player2id: player2id,
                createdAt: {
                  [Sequelize.Op.gt]: oneDayAgo,
                },
              },
              {
                player1id: player2id,
                player2id: player1id,
                createdAt: {
                  [Sequelize.Op.gt]: oneDayAgo,
                },
              },
            ],
          },
        })
        return previousMatches.length
      }

      let newElo = { }
      const previousMatches = await getPreviousMatches(matchStats.player1.id, matchStats.player2.id)
      if (previousMatches >= 3) {
        K = K / 3 // reduce the ELO constant to 1/3 of its normal value
      }

      if (matchStats.winner === matchStats.player1.id) {
        newElo = calculateElo(matchStats.player1.elo, matchStats.player2.elo, K);
        matchStats.player1.newElo = Math.round(newElo.newWinnerElo)
        matchStats.player2.newElo = Math.round(newElo.newLoserElo)

      } else if (matchStats.winner === matchStats.player2.id) {
        newElo = calculateElo(matchStats.player2.elo, matchStats.player1.elo, K);
        matchStats.player2.newElo = Math.round(newElo.newWinnerElo)
        matchStats.player1.newElo = Math.round(newElo.newLoserElo)
      }

      let player1db = await Player.findOne({ where: { userid: matchStats.player1.id } });
      let player2db = await Player.findOne({ where: { userid: matchStats.player2.id } });
      player1db.matchid = 'N/A'
      player2db.matchid = 'N/A'
      player1db.updatedAt = new Date();
      player2db.updatedAt = new Date();
      player1db.elo = matchStats.player1.newElo;
      player2db.elo = matchStats.player2.newElo;
      await player1db.save();
      await player2db.save();
      console.log(newElo)
      const matchDetailsEmbed = {
        color: 0xFFB900,
        title: 'Match Details',
        fields: [
          {
            name: player1.handle,
            value: `Region: ${player1.region}\nNew ELO: ${player1.newElo}\nScore: ${player1.score}`,
            inline: true,
          },
          {
            name: player2.handle,
            value: `Region: ${player2.region}\nNew ELO: ${player2.newElo}\nScore: ${player2.score}`,
            inline: false,
          },
        ],
        description: `${gameWinner}, please select the first stage you would like to ban next game. \nPlease let your opponent know if you will be switching characters and what character you will play!`,
      };
      interaction.update({
        content: '',
        embeds: [matchDetailsEmbed],
        components: [],
      });
      
      setTimeout(async () => {
        if (matchStats.finished) {
          let checkIn = checkInArray.find( checkin => checkin.matchid === thread.id);
          if (checkIn) {
            checkInArray.splice(checkInArray.indexOf(checkIn))
          }
          await thread.setLocked(true)
          await thread.setArchived(true)
          await matchStatsArray.splice(matchStatsArray.indexOf(matchStats), 1)
          return
        }
      }, postMatchExpMins * 60 * 1000);
    }
    
  } catch(error) {
    console.log(error)
  }
});

client.login(token);


