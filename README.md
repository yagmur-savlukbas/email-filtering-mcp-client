# Email Reminder MCP Server 📧

An MCP (Model Context Protocol) server that automatically filters important emails from spam and surfaces what needs your attention. Perfect for managing busy inboxes!

## Features ✨

- **Smart Importance Scoring**: Automatically ranks emails by urgency and importance
- **Spam Filtering**: Filters out promotional emails and newsletters
- **VIP Senders**: Prioritize emails from important domains
- **Quick Summaries**: Get instant overview of your inbox status
- **Time-based Filtering**: Check emails from the last N hours
- **Mark as Read**: Handle emails directly from your AI assistant

## Setup 🚀

### 1. Install Dependencies

```bash
npm install
```

### 2. Get Gmail API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"
4. Configure OAuth Consent Screen (if not already done):
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" (unless you have a Google Workspace)
   - Fill in app name, user support email, developer email
   - Add scopes:
     - `https://www.googleapis.com/auth/gmail.readonly` - Read emails
     - `https://www.googleapis.com/auth/gmail.modify` - Modify emails (mark as read)
5. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Desktop app" as application type
   - Download the credentials JSON file
6. Save the downloaded file as `src/credentials.json`
   - The build process will automatically copy it to `dist/credentials.json`

**Required Scopes:**
- `gmail.readonly` - For reading/fetching emails
- `gmail.modify` - For marking emails as read and adding labels

### 3. Build the Project

```bash
npm run build
```

### 4. Configure MCP Client

Add this to your MCP settings file (e.g., Claude Desktop config):

**For macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**For Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "email-reminder": {
      "command": "node",
      "args": ["/absolute/path/to/email-reminder-mcp/dist/index.js"]
    }
  }
}
```

### 5. Authenticate with Gmail

**IMPORTANT:** You must run the authentication script BEFORE using the MCP server. The MCP server runs in a non-interactive mode and cannot handle OAuth flow interactively.

Run the authentication script:

```bash
node auth.js
```

This will:
1. Show you a Gmail authorization URL
2. Open that URL in your browser (or copy/paste it)
3. Sign in with your Google account and authorize the app
4. After authorization, you'll be redirected to a URL like `http://localhost/?code=4/0AeanS0...`
5. Copy the code portion (everything after `code=`) from that URL
6. Paste it back into the terminal when prompted
7. The script will create `token.json` for future use

**Note:** Once `token.json` exists, you won't need to run this script again unless the token expires.

## Usage 💡

Once configured, you can use these commands with your AI assistant:

### Get Important Emails

```
Show me my important emails from the last 24 hours
```

### Get Email Summary

```
Give me a summary of my unread emails
```

### Mark Email as Handled

```
Mark email [email_id] as read
```

### Add VIP Domain

```
Add example.com to my VIP senders
```

## Tools Available 🛠️

### `get_important_emails`
Fetches and filters important unread emails.

**Parameters:**
- `hours_back` (number): Hours to look back (default: 24)
- `min_importance` (number): Minimum importance score 0-100 (default: 30)
- `max_results` (number): Max emails to return (default: 10)

### `get_email_summary`
Quick overview of inbox status by category.

**Parameters:**
- `hours_back` (number): Hours to look back (default: 24)

### `mark_email_handled`
Mark an email as read.

**Parameters:**
- `email_id` (string): Email ID to mark

### `add_vip_domain`
Add domain to VIP list for higher priority.

**Parameters:**
- `domain` (string): Domain like "company.com"

### `get_vip_domains`
List all configured VIP domains.

## How It Scores Importance 📊

The server uses multiple factors to score emails (0-100):

**High Priority Indicators** (+points):
- Keywords: "urgent", "asap", "deadline", "action required"
- VIP sender domains (+20)
- Direct emails vs CC (+10)
- Recent emails (+15 if < 4 hours)
- Has attachments (+5)

**Low Priority Indicators** (-points):
- Spam keywords: "unsubscribe", "promotional", "marketing"
- Multiple spam indicators (-10)

## Customization ⚙️

### Adjusting Importance Keywords

Edit `src/index.ts` and modify the `IMPORTANCE_KEYWORDS` object:

```typescript
const IMPORTANCE_KEYWORDS: Record<string, number> = {
  urgent: 10,
  important: 8,
  // Add your own keywords...
};
```

### Adding Spam Indicators

Edit the `SPAM_INDICATORS` array:

```typescript
const SPAM_INDICATORS = [
  "unsubscribe",
  "promotional",
  // Add more spam indicators...
];
```

## Example Interactions 💬

**Example 1: Morning Email Check**
```
User: What important emails came in overnight?
Assistant: [Calls get_important_emails with hours_back: 8]
Found 3 important emails:
1. [Score: 85] From: boss@company.com - "URGENT: Q4 Report needed"
2. [Score: 72] From: client@important.com - "Meeting tomorrow at 10am"
3. [Score: 45] From: hr@company.com - "Benefits enrollment deadline"
```

**Example 2: Quick Summary**
```
User: How's my inbox looking?
Assistant: [Calls get_email_summary]
You have:
- ⚠️ 2 urgent emails
- 5 important emails
- 12 normal emails
- 8 likely spam
Recommendation: You have 2 urgent emails that need attention!
```

## Troubleshooting 🔧

### Authentication Issues

**"No token.json found" or "Authentication required"**
- Run `node auth.js` to generate the token file
- Make sure you completed the OAuth flow and pasted the code

**"Token expired" or "Invalid credentials"**
- Delete `token.json`
- Run `node auth.js` again to re-authenticate

**"Can't read code from stdin"**
- This happens if you try to authenticate through the MCP server directly
- Always use `node auth.js` for authentication, not the MCP server

### No Emails Showing Up

- Check your `hours_back` parameter
- Lower the `min_importance` threshold
- Verify Gmail API is enabled in Google Cloud Console

### Permission Errors

Make sure your OAuth consent screen is configured correctly and includes the required scopes.

## Security Notes 🔒

- Credentials are stored locally in `credentials.json` and `token.json`
- Never commit these files to version control
- The `.gitignore` file excludes them by default
- Tokens expire and require re-authentication

## Development 🔨

```bash
# Watch mode for development
npm run dev

# Build production version
npm run build

# Run directly
npm start
```

## License

MIT

## Contributing

Feel free to open issues or submit PRs for improvements!
