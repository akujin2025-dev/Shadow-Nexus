import {
  SlashCommandBuilder,
  EmbedBuilder
} from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------
// Load Officer Data (Safe Loader)
// -----------------------------
let officers = [];

try {
  const DATA_PATH = path.join(__dirname, "../data/output.json");
  const raw = fs.readFileSync(DATA_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (parsed && Array.isArray(parsed.officers)) {
    officers = parsed.officers;
    console.log(`Loaded ${officers.length} officers from output.json`);
  } else {
    console.error("output.json missing 'officers' array");
  }
} catch (err) {
  console.error("Failed to load officer data:", err.message);
}

// -----------------------------
// Lookup Maps + Helpers
// -----------------------------
const officerByName = new Map();

// FIX: Skip officers with missing names
officers.forEach((o) => {
  if (!o || !o.name) return;
  officerByName.set(o.name.toLowerCase(), o);
});

function fuzzyFind(query) {
  query = query.toLowerCase();
  return (
    officers.find((o) => o?.name?.toLowerCase() === query) ||
    officers.find((o) => o?.name?.toLowerCase().startsWith(query)) ||
    officers.find((o) => o?.name?.toLowerCase().includes(query))
  );
}

function getPortrait(officer) {
  if (!officer.portrait) return null;
  return `https://stfc.space${officer.portrait}`;
}

// -----------------------------
// Shared Embed Builder
// -----------------------------
function buildOfficerEmbed(officer) {
  const rarity = officer.rarity || "Unknown";
  const group = officer.group || "Unknown Group";
  const portrait = getPortrait(officer);

  const captain = officer.captain_ability || {};
  const ability = officer.officer_ability || {};
  const stats = officer.stats || {};
  const traits = officer.traits || [];
  const synergy = officer.synergy || [];

  const embed = new EmbedBuilder()
    .setColor("#00b3ff")
    .setTitle(`${officer.name} — ${rarity} (${group})`)
    .setThumbnail(portrait)
    .setFooter({
      text: `Data from STFC.space • Updated ${officer.lastUpdated || "N/A"}`,
    });

  if (captain.name) {
    embed.addFields({
      name: `🪐 Captain Ability — ${captain.name}`,
      value: captain.description || "No description available.",
    });
  }

  if (ability.name) {
    embed.addFields({
      name: `⚔️ Officer Ability — ${ability.name}`,
      value: ability.description || "No description available.",
    });
  }

  embed.addFields({
    name: "📊 Stats",
    value: `**ATK:** ${stats.attack || "?"}\n**DEF:** ${
      stats.defense || "?"
    }\n**HP:** ${stats.health || "?"}`,
    inline: true,
  });

  if (traits.length > 0) {
    embed.addFields({
      name: "🏷️ Traits",
      value: traits.join(", "),
      inline: true,
    });
  }

  if (synergy.length > 0) {
    embed.addFields({
      name: "🔗 Synergy",
      value: synergy
        .map((s) => `• **${s.group}**: +${s.value}%`)
        .join("\n"),
    });
  }

  return embed;
}

// -----------------------------
// Slash Command Definition
// -----------------------------
export default {
  data: new SlashCommandBuilder()
    .setName("officer")
    .setDescription("Shadow Nexus: Officer intelligence module")

    // /officer info
    .addSubcommand((sub) =>
      sub
        .setName("info")
        .setDescription("Get detailed info about an officer")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Officer name")
            .setAutocomplete(true)
            .setRequired(true)
        )
    )

    // /officer search
    .addSubcommand((sub) =>
      sub
        .setName("search")
        .setDescription("Search officers by name, trait, rarity, or ability")
        .addStringOption((opt) =>
          opt
            .setName("query")
            .setDescription("Search term")
            .setRequired(true)
        )
    )

    // /officer compare
    .addSubcommand((sub) =>
      sub
        .setName("compare")
        .setDescription("Compare two officers side-by-side")
        .addStringOption((opt) =>
          opt
            .setName("first")
            .setDescription("First officer")
            .setAutocomplete(true)
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("second")
            .setDescription("Second officer")
            .setAutocomplete(true)
            .setRequired(true)
        )
    ),

  // -----------------------------
  // Autocomplete Handler
  // -----------------------------
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();

    const matches = officers
      .filter((o) => o?.name?.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((o) => ({ name: o.name, value: o.name }));

    await interaction.respond(matches);
  },

  // -----------------------------
  // Command Execution
  // -----------------------------
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // /officer info
    if (sub === "info") {
      const name = interaction.options.getString("name").toLowerCase();
      const officer = officerByName.get(name) || fuzzyFind(name);

      if (!officer) {
        return interaction.reply({
          content: `No officer found matching **${name}**.`,
          ephemeral: true,
        });
      }

      return interaction.reply({ embeds: [buildOfficerEmbed(officer)] });
    }

    // /officer search
    if (sub === "search") {
      const query = interaction.options.getString("query").toLowerCase();

      const results = officers.filter((o) => {
        if (!o?.name) return false;

        return (
          o.name.toLowerCase().includes(query) ||
          (o.rarity || "").toLowerCase().includes(query) ||
          (o.group || "").toLowerCase().includes(query) ||
          (o.traits || []).some((t) => t.toLowerCase().includes(query)) ||
          (o.captain_ability?.description || "")
            .toLowerCase()
            .includes(query) ||
          (o.officer_ability?.description || "")
            .toLowerCase()
            .includes(query)
        );
      });

      if (results.length === 0) {
        return interaction.reply({
          content: `No officers found matching **${query}**.`,
          ephemeral: true,
        });
      }

      const list = results
        .slice(0, 20)
        .map((o) => `• **${o.name}** — ${o.rarity} (${o.group})`)
        .join("\n");

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#00b3ff")
            .setTitle(`Search Results (${results.length})`)
            .setDescription(list),
        ],
      });
    }

    // /officer compare
    if (sub === "compare") {
      const first = interaction.options.getString("first").toLowerCase();
      const second = interaction.options.getString("second").toLowerCase();

      const o1 = officerByName.get(first) || fuzzyFind(first);
      const o2 = officerByName.get(second) || fuzzyFind(second);

      if (!o1 || !o2) {
        return interaction.reply({
          content: `One or both officers could not be found.`,
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor("#00b3ff")
        .setTitle(`Officer Comparison`)
        .addFields(
          {
            name: o1.name,
            value: `**Rarity:** ${o1.rarity}\n**Group:** ${o1.group}\n**ATK:** ${
              o1.stats.attack
            }\n**DEF:** ${o1.stats.defense}\n**HP:** ${o1.stats.health}`,
            inline: true,
          },
          {
            name: o2.name,
            value: `**Rarity:** ${o2.rarity}\n**Group:** ${o2.group}\n**ATK:** ${
              o2.stats.attack
            }\n**DEF:** ${o2.stats.defense}\n**HP:** ${o2.stats.health}`,
            inline: true,
          }
        );

      return interaction.reply({ embeds: [embed] });
    }
  },
};
