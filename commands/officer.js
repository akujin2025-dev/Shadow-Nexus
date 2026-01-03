import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load officer data
const officersPath = path.join(__dirname, '../data/officers.json');
const officers = JSON.parse(fs.readFileSync(officersPath, 'utf8'));

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
    const input = interaction.options.getString('name').toLowerCase();

    // Direct match
    let officer = officers[input];

    // Alias match
    if (!officer) {
      officer = Object.values(officers).find(o =>
        o.aliases?.map(a => a.toLowerCase()).includes(input)
      );
    }

    if (!officer) {
      return interaction.reply({
        content: `I don’t have data for **${input}** yet.`,
        ephemeral: true
      });
    }

const embed = new EmbedBuilder()
  .setTitle(officer.title)
  .setColor('#ff0000')
  .setThumbnail(officer.image)   // ← Add this line
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
