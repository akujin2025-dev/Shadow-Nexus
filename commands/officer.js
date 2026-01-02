import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('officer')
    .setDescription('Get info about a specific officer.')
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('The officer you want information about.')
        .setRequired(true)
    ),

  async execute(interaction) {
    const name = interaction.options.getString('name').toLowerCase();

    // Temporary officer database — we will expand this into Sheets or API later
    const officers = {
      'kirk': {
        title: 'James T. Kirk',
        role: 'Command',
        ability: 'Inspirational Leader',
        synergy: 'Spock, Uhura',
        description: 'Boosts critical chance and increases damage when paired with synergy crew.'
      },
      'spock': {
        title: 'Spock',
        role: 'Science',
        ability: 'Logical',
        synergy: 'Kirk, Uhura',
        description: 'Reduces damage taken and boosts shield regeneration.'
      },
      'uhura': {
        title: 'Nyota Uhura',
        role: 'Command',
        ability: 'Interception Specialist',
        synergy: 'Kirk, Spock',
        description: 'Improves mitigation and increases accuracy in combat.'
      }
    };

    const officer = officers[name];

    if (!officer) {
      return interaction.reply({
        content: `I don’t have data for **${name}** yet.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(officer.title)
      .setColor('#ff0000')
      .addFields(
        { name: 'Role', value: officer.role, inline: true },
        { name: 'Ability', value: officer.ability, inline: true },
        { name: 'Synergy', value: officer.synergy, inline: true },
        { name: 'Description', value: officer.description }
      )
      .setFooter({ text: 'Shadow Syndicate Officer Database' });

    return interaction.reply({ embeds: [embed] });
  }
};
