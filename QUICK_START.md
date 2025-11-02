# 🚀 Quick Start Guide

Get your email automation running in 5 minutes!

## Step 1: Install Dependencies
```bash
npm install
```

## Step 2: Get Gmail Credentials

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable Gmail API
4. Configure OAuth Consent Screen:
   - Add scopes: `gmail.readonly` and `gmail.modify`
5. Create OAuth 2.0 credentials (Desktop app)
6. Download as `src/credentials.json`
   - The build script will copy it to `dist/` automatically

**Required Scopes:**
- `https://www.googleapis.com/auth/gmail.readonly` - Read emails
- `https://www.googleapis.com/auth/gmail.modify` - Modify emails (mark as read)

**Quick link:** https://console.cloud.google.com/apis/credentials

## Step 3: Build
```bash
npm run build
```

Or use the setup script:
```bash
./setup.sh
```

## Step 4: Configure MCP Client

Add to your MCP config file:

**Claude Desktop (macOS):**
`~/Library/Application Support/Claude/claude_desktop_config.json`

**Claude Desktop (Windows):**
`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "email-reminder": {
      "command": "node",
      "args": ["/full/path/to/email-reminder-mcp/dist/index.js"]
    }
  }
}
```

Replace `/full/path/to/` with your actual path!

## Step 5: Authenticate with Gmail

**⚠️ IMPORTANT:** You must authenticate BEFORE using the MCP server. Run this authentication script:

```bash
node auth.js
```

**Authentication Steps:**
1. The script will display a Gmail authorization URL
2. Open that URL in your browser (copy/paste if needed)
3. Sign in with your Google account
4. Click "Allow" to authorize the app
5. You'll be redirected to a URL like: `http://localhost/?code=4/0AeanS0...`
6. **Copy the code** - everything after `code=` in that URL
7. Paste the code back into your terminal
8. The script creates `token.json` automatically

**Why this step is needed:** The MCP server runs in non-interactive mode and cannot handle OAuth flow. You must create the token file first using this script.

## Step 6: Restart Claude Desktop

1. Quit Claude Desktop completely (Cmd+Q)
2. Reopen Claude Desktop
3. The MCP server should now connect successfully

## First Test

Try saying to Claude:
> "What important emails do I have?"

You should see the email reminder server fetch and filter your emails!

## Next Steps

- Read [README.md](README.md) for full documentation
- Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for common patterns
- Customize importance keywords in `src/index.ts`
- Add VIP domains for your important contacts

## Common Issues

**"Command not found"**
- Make sure you used the absolute path in MCP config
- Run `npm run build` to ensure dist/index.js exists

**"Authentication failed" or "No token.json found"**
- Run `node auth.js` to authenticate and create token.json
- Make sure you pasted the complete authorization code
- Verify Gmail API is enabled in Google Cloud Console

**"No emails showing"**
- Try lowering the min_importance score
- Check hours_back parameter
- Verify you have unread emails in Gmail

## Example Conversations

```
You: Check my important emails from today
Claude: [Fetches emails, shows top 5 by importance]

You: Add mycompany.com to VIP senders
Claude: [Adds domain, confirms]

You: Give me an email summary
Claude: [Shows breakdown: 2 urgent, 5 important, 10 normal]
```

## Need Help?

- 📖 Full docs: [README.md](README.md)
- 🔍 Use cases: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- 🐛 Issues: Check credentials.json and token.json exist

That's it! You're ready to automate your email workflow. 🎉
