[English](./README.md) | [Українська](./README.uk.md)

# Game Hunt Bot 🎮

Serverless bot that automatically monitors free game giveaways on popular platforms like **Epic Games**, **Steam**, and **PlayStation Plus**. It's designed to run on a schedule, check for new freebies, and send timely, well-formatted notifications to a Telegram channel, ensuring you never miss a deal.

## Features

- **Multi-Platform Monitoring**: Tracks free games on Epic Games, Steam, and PlayStation Plus (both Monthly and Catalog games).
- **Telegram Notifications**: Sends clean, formatted messages to a specified Telegram channel for new game announcements.
- **Admin Commands**: Allows the administrator to control the bot with Telegram commands:
  - `/check`: Instantly triggers a check for new free game giveaways.
  - `/stats`: Displays detailed statistics about the number of games stored in the database.
  - `/help`: Shows a help message about the bot's capabilities and available commands.
- **Persistent Storage**: Utilizes **Upstash (Redis)** for persistent storage in production and a local JSON file for development, preventing duplicate notifications.
- **Serverless Deployment**: Built to run as a cost-effective serverless function on platforms like Vercel.
- **Scheduled Checks**: Uses cron jobs (configured in `vercel.json`) to automate periodic checks for new giveaways.
- **Highly Configurable**: Easily enable or disable platform modules and tweak bot behavior through a central settings file.
- **Improved Messaging Architecture**: All message formatting and sending logic is centralized in the `telegram.js` module, making the code cleaner and easier to maintain.

## Technologies Used

- **Runtime**: [Node.js](https://nodejs.org/)
- **Deployment**: [Vercel](https://vercel.com/) (Serverless Functions)
- **Database**: [Upstash (Redis)](https://vercel.com/marketplace/upstash)
- **Scheduling**: Vercel Cron Jobs
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Language**: JavaScript (ES Modules)

## Getting Started

### Prerequisites

- Node.js and npm installed.
- A Telegram Bot Token from [@BotFather](https://t.me/BotFather).
- The ID of the Telegram channel/chat where notifications will be sent.
- (For production) An Upstash Redis (Vercel KV) database and its connection credentials.

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/game-hunt.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd game-hunt
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```

### Configuration

1.  **Environment Variables**: Create a `.env` file in the root directory and add your credentials. For production deployment on Vercel, you will need to add these in the project settings.

    _To find your `TELEGRAM_ADMIN_CHAT_ID`, message the `@userinfobot` on Telegram._

    ```env
    # Telegram Bot credentials (required)
    TELEGRAM_BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN"
    TELEGRAM_CHAT_ID="YOUR_TELEGRAM_CHAT_ID"

    # Upstash Redis / Vercel KV credentials (required for production)
    KV_REST_API_URL="YOUR_KV_REST_API_URL"
    KV_REST_API_TOKEN="YOUR_KV_REST_API_TOKEN"

    # --- Webhook for manual triggering (optional) ---
    # A long, random string to secure your webhook endpoint
    TELEGRAM_WEBHOOK_SECRET="YOUR_SUPER_SECRET_RANDOM_STRING"
    # Your personal Telegram User ID to restrict admin commands
    TELEGRAM_ADMIN_CHAT_ID="YOUR_PERSONAL_TELEGRAM_ID"
    # The Vercel project URL (e.g., your-project-name.vercel.app)
    VERCEL_URL="your-project-name.vercel.app"
    ```

2.  **Bot Settings**: Open `config/settings.js` to enable/disable specific platform modules and configure other bot options.
3.  **Cron Schedule**: Adjust the schedule in `vercel.json` to define how often the check should run. The default is `0 18 * * *` (every day at 18:00 UTC).

### Setting Up Bot Commands

To make the `/check`, `/stats`, and `/help` commands appear in the Telegram interface (when typing `/` in the chat), you need to register them via the Telegram Bot API.

1.  **Ensure** your `TELEGRAM_BOT_TOKEN` environment variable is set in your `.env` (or `.env.local`) file.
2.  Open your terminal in the project root directory (`game-hunt/`).
3.  Run the dedicated script to set up the commands:
    ```bash
    node scripts/setup-commands.js
    ```
4.  You should see a success message. To see the changes reflected, you might need to restart your Telegram client.

### Local Testing

This project includes a comprehensive test script `test-all.js` that allows you to check all functionality locally without deploying.

The script will perform the following actions:

- Fetch fresh data from all enabled platforms.
- Compare it against the data in your local `data/games.json` file.
- Display any new games it finds.
- Simulate updating the local storage file.
- Show you what the final Telegram messages will look like.

To run it, use the following command:

```bash
node test-all.js
```

### Deployment to Vercel

1.  Push the project to a Git repository (GitHub, GitLab, Bitbucket).
2.  Import the project on [Vercel](https://vercel.com) and connect a Vercel KV (Upstash Redis) storage.
3.  Add the environment variables from your `.env` file to the Vercel project settings.
4.  Deploy. Vercel will automatically set up the serverless function and the cron job based on your `vercel.json` configuration.
5.  **Set Up Telegram Webhook (Optional)**: To enable manual checks and admin commands, you need to register the webhook endpoint with Telegram. Open the following URL in your browser, replacing the placeholders with your values:
    ```
    https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<VERCEL_URL>/api/webhook?secret=<TELEGRAM_WEBHOOK_SECRET>
    ```
    You should see a success message.

## Project Structure

```
game-hunt/
├── 📁 api/                   # Vercel Serverless Function entry point
│   ├── 📄 check-games.js     # Main handler for checking games (cron)
│   └── 📄 webhook.js         # Handler for Telegram commands (e.g., /check)
├── 📁 config/                 # Configuration files
│   └── 📄 settings.js        # Module toggles and bot settings
├── 📁 data/                  # Local data storage for development
│   └── 📄 games.json         # Stores current and previous game lists
├── 📁 lib/                   # Core logic modules
│   ├── 📄 epic-games.js      # Logic for fetching Epic Games data
│   ├── 📄 steam.js           # Logic for fetching Steam data
│   ├── 📄 ps-plus.js         # Logic for fetching PlayStation Plus data
│   ├── 📄 storage.js        # Handles reading/writing to KV or local JSON
│   ├── 📄 kv.js              # Upstash Redis client configuration
│   └── 📄 telegram.js       # Handles sending messages to Telegram
├── 📁 scripts/                # Scripts for bot setup
│   └── 📄 setup-commands.js  # Script for registering bot commands with Telegram
├── 📄 test-all.js            # Comprehensive local test script
├── 📄 .env.example           # Example environment variables
├── 📄 vercel.json             # Vercel deployment and cron job configuration
└── 📄 package.json            # Project dependencies and scripts
```
