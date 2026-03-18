import { 
  Client, 
  GatewayIntentBits, 
  GuildMember, 
  Role, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';
import { config } from './config.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

// Register Slash Commands
const registerCommands = async () => {
  if (!config.BOT_TOKEN || !config.CLIENT_ID || !config.GUILD_ID) return;

  const commands = [
    new SlashCommandBuilder()
      .setName('verify')
      .setDescription('Verify your role via our web portal'),
  ].map(command => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(config.BOT_TOKEN);

  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
      { body: commands },
    );
    console.log('Successfully registered /verify command.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
};

client.on('clientReady', async () => {
  console.log(`Bot logged in as ${client.user?.tag}`);
  await registerCommands();
});

// Handle Slash Command Interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'verify') {
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Click here to verify')
          .setStyle(ButtonStyle.Link)
          .setURL(config.BASE_URL)
      );

    await interaction.reply({
      content: 'Please click the button below to start your verification process:',
      components: [row],
      ephemeral: true, // Only the user can see this message
    });
  }
});

export const assignRole = async (userId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const guild = await client.guilds.fetch(config.GUILD_ID);
    if (!guild) return { success: false, message: 'Guild not found' };

    const member: GuildMember = await guild.members.fetch(userId);
    if (!member) return { success: false, message: 'User not in server' };

    const role: Role | null = await guild.roles.fetch(config.ROLE_ID);
    if (!role) return { success: false, message: 'Role not found' };

    await member.roles.add(role);
    return { success: true, message: 'Role assigned successfully' };
  } catch (error: any) {
    console.error('Error assigning role:', error);
    return { success: false, message: error.message || 'Unknown error' };
  }
};

export const startBot = () => {
  if (config.BOT_TOKEN) {
    client.login(config.BOT_TOKEN);
  }
};

export { client };
