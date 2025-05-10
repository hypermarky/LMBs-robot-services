# LMB's Robot - Discord Bot

This repository contains the source code for LMB's Robot, a quoting Discord bot designed to enhance server experience and user engagement.

## Features

*   **Advanced Quoting System:**
    *   **Context Menu Quoting:** Easily quote any message by right-clicking -> Apps -> "Quote This Message".
    *   **Slash Command Quoting:**
        *   `/quote add user:<user> text:<"quote text">`: Manually add a new quote.
        *   `/quote get [query]`: Retrieve a quote by its ID, by the quoter's name/ID, or a random quote if no query is provided.
        *   `/quote list [user]`: List all quotes on the server, with an option to filter by a specific user.
        *   `/quote delete id:<ID>`: Delete a quote by its ID (requires being the original adder of the quote or having server administrator permissions).
        *   `/quote help`: Displays detailed help information for all quote commands.
*   **Bot Statistics Tracking:**
    *   Monitors and records the total number of servers (guilds) the bot is a member of.
    *   Tracks the approximate total number of users across all servers.
    *   Stores these statistics in a MySQL database for display on the companion website.
*   **Customizable Activity Status:** Sets a dynamic activity status (e.g., "Listening to /quote help").

## Tech Stack

*   **Node.js:** JavaScript runtime environment.
*   **Discord.js v14:** A powerful Node.js module for interacting with the Discord API.
*   **MySQL2:** A MySQL client for Node.js, used to connect to the database for storing bot statistics.
*   **Dotenv:** For managing environment variables.
*   **ES Modules:** Utilizes modern JavaScript module syntax (`import`/`export`).

## Project Structure

```
/LMBs-robot-services/
├── commands/              # Directory for Discord command files (e.g., quote.js)
│   └── quote.js
├── utils/                 # Utility modules
│   ├── db.js              # MySQL database connection setup
│   └── quoteManager.js    # Logic for managing quotes (loading, saving, CRUD operations)
├── .env.example           # Example environment file
├── .gitignore
├── Dockerfile             # (If you plan to use Docker for deployment)
├── index.js               # Main bot application entry point
├── deploy-commands.js     # Script to register slash and context menu commands with Discord
├── package.json
├── package-lock.json
└── quotes.json            # Default local storage for quotes (can be replaced by database)
```

## Prerequisites

*   Node.js (v20.x LTS recommended, or as specified in `package.json` engines)
*   npm (comes with Node.js)
*   A MySQL server instance (local or cloud-hosted like Azure Database for MySQL, PlanetScale)
*   A Discord Bot Application created on the [Discord Developer Portal](https://discord.com/developers/applications)

## Setup and Installation

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-username/LMBs-robot-services.git
    cd LMBs-robot-services
    ```

2.  **Install Dependencies:**
    ```bash
    npm ci
    ```
    (Using `npm ci` is recommended for installing based on `package-lock.json` for consistency).

3.  **Create Bot Application & Get Token:**
    *   Go to the [Discord Developer Portal](https://discord.com/developers/applications).
    *   Create a new Application.
    *   Under the "Bot" tab, add a bot user.
    *   **Enable Privileged Gateway Intents:**
        *   `Presence Intent` (Optional, if needed for presence-related features)
        *   `Server Members Intent` (Optional, if you need detailed member lists beyond `guild.memberCount` - usually not required for basic stats).
        *   `Message Content Intent` (Required for the bot to read message content if it uses prefix commands or needs message content for context, though your current setup seems to be slash/context menu focused which is better).
    *   Copy the **Bot Token**.
    *   Note down the **Application (Client) ID**.

4.  **Set Up Environment Variables:**
    *   Create a `.env` file in the root of the `LMBs-robot-services` project by copying `.env.example` or creating it manually:
        ```env
        DISCORD_TOKEN=YOUR_BOT_TOKEN_HERE
        CLIENT_ID=YOUR_BOT_APPLICATION_CLIENT_ID_HERE
        GUILD_ID=YOUR_TEST_SERVER_ID_HERE # Optional: For deploying commands to a single test server initially

        # Database Credentials (for bot_stats)
        DB_HOST=your_mysql_host
        DB_USER=your_mysql_user
        DB_PASSWORD=your_mysql_password
        DB_NAME=your_mysql_database_name
        ```
    *   Replace the placeholder values with your actual credentials. `GUILD_ID` is used by `deploy-commands.js` for faster testing of command updates on a specific server.

5.  **Database Setup (for Bot Statistics):**
    *   Connect to your MySQL server.
    *   Create the database specified in `DB_NAME` if it doesn't exist.
    *   Create the `bot_stats` table using the following schema:
        ```sql
        CREATE TABLE bot_stats (
            stat_name VARCHAR(50) PRIMARY KEY,
            stat_value BIGINT NOT NULL,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
        ```

6.  **Deploy Commands to Discord:**
    *   Application (slash and context menu) commands need to be registered with Discord's API. Run the `deploy-commands.js` script:
        ```bash
        node deploy-commands.js
        ```
    *   You only need to run this when you add new commands or modify the structure (name, description, options, type) of existing commands.

7.  **Start the Bot:**
    *   For development with automatic restarts on file changes (recommended):
        ```bash
        npm run dev
        ```
    *   To run normally:
        ```bash
        npm run start
        ```
    Both scripts use `node -r dotenv/config index.js` to preload environment variables from the `.env` file.

## Bot Functionality Details

### Statistics Tracking
The bot automatically updates its server and user count in the configured MySQL database. This happens:
*   Upon successful startup (`ready` event).
*   When the bot joins a new guild (`guildCreate` event).
*   When the bot is removed from a guild (`guildDelete` event).
*   Periodically (e.g., every 15 minutes) as a fallback and for member count fluctuations.

This data is intended to be consumed by the companion website's backend API.

### Quote Management
Quote data is currently managed via `quotes.json` by default. For larger-scale use or more robust storage, consider migrating `quoteManager.js` to use a database.

## Deployment

This Discord bot is a Node.js application that needs to run continuously.

*   **Recommended Hosting:**
    *   **PaaS:** Render.com (Background Worker), Fly.io, Railway.app.
    *   **IaaS:** A Linux VPS (e.g., DigitalOcean, Linode, Vultr, Azure VM) using a process manager like `PM2`.
    *   **Azure App Service:** Requires a Basic (B1) tier or higher with "Always On" enabled to ensure 24/7 operation.
    *   **Azure Container Instances (ACI):** If you package the bot as a Docker image (a `Dockerfile` is included as a starting point).
*   **Environment Variables:** When deploying, ensure all environment variables from your `.env` file (especially `DISCORD_TOKEN` and `DB_*` variables) are configured in your hosting provider's environment variable settings. **Do not commit your actual `.env` file to Git.**
*   **Persistent Storage:**
    *   The current `quotes.json` will work on platforms with persistent filesystems. On ephemeral filesystems (common with some PaaS/container deployments without persistent volumes), `quotes.json` would be reset on each deploy/restart. For persistent quote storage, database integration for `quoteManager.js` is recommended.
    *   Bot statistics are stored in the external MySQL database, which is persistent.
