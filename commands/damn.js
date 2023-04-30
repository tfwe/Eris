const axios = require('axios');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gpt3')
    .setDescription('Generates text using GPT-3')
    .addStringOption(option => 
      option.setName('prompt')
      .setDescription('Enter a prompt to generate text')
      .setRequired(true)),
  async execute(interaction) {
    const prompt = interaction.options.getString('prompt');
    const response = await axios.post('https://api.openai.com/v1/v1/chat/completions', {
      prompt: prompt,
      max_tokens: 100,
      n: 1,
      stop: ['\n']
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` // remember to set the OPENAI_API_KEY environment variable
      }
    });
    const text = response.data.choices[0].text;
    return interaction.reply(text);
  },
};
