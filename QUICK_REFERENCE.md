# Quick Reference Guide - Email Automation with MCP

## Common Use Cases

### 1. Morning Email Check
**What you want:** See what important emails came in overnight

**Say to Claude:**
> "What important emails came in overnight?"
> "Check my emails from the last 8 hours"

### 2. Quick Inbox Status
**What you want:** Get a snapshot of your inbox

**Say to Claude:**
> "How's my inbox looking?"
> "Give me an email summary"
> "What's my email status?"

### 3. Filter by Urgency
**What you want:** Only see the most urgent emails

**Say to Claude:**
> "Show me only urgent emails (importance score above 70)"
> "What emails need immediate attention?"

### 4. Managing Specific Senders
**What you want:** Prioritize emails from important contacts

**Say to Claude:**
> "Add mycompany.com to VIP senders"
> "Make sure emails from client.com are always marked important"
> "What are my VIP domains?"

### 5. Handling Emails
**What you want:** Mark emails as read after reviewing

**Say to Claude:**
> "Mark email [id] as read"
> "I've handled that email about the deadline"

## Customizing for Your Workflow

### For Project Managers
Add these VIP domains:
- Your company domain
- Client domains
- Project management tool notifications (if not spam)

Keywords to prioritize:
- "sprint", "standup", "blocker", "milestone"

### For Sales Teams
Add VIP domains:
- Lead source domains
- CRM notification domains

Keywords to prioritize:
- "proposal", "contract", "quote", "demo"

### For Customer Support
Add VIP domains:
- Support ticket system
- VIP customer domains

Keywords to prioritize:
- "escalation", "sev1", "critical", "down"

### For Executives
Add VIP domains:
- Direct report domains
- Board member domains
- Key partner domains

Keywords to prioritize:
- "board", "executive", "strategic", "approval"

## Automation Ideas

### Daily Morning Routine
Ask Claude:
1. "What important emails came in since yesterday evening?"
2. "Are there any urgent items?"
3. "Give me a summary by category"

### Mid-Day Check-in
Ask Claude:
1. "Any new important emails in the last 4 hours?"
2. "Focus on emails with score above 60"

### End of Day Cleanup
Ask Claude:
1. "Show me all unread emails from today"
2. "Which ones can probably wait until tomorrow?" (low scores)
3. Mark handled ones as read

## Tips for Better Results

1. **Train the system:** Add VIP domains for your most important contacts
2. **Adjust thresholds:** Lower min_importance if missing emails, raise it if too noisy
3. **Use time filters:** Check emails from specific time windows
4. **Combine with actions:** After reviewing, ask Claude to mark emails as read
5. **Regular patterns:** Establish a routine (morning check, lunch check, evening cleanup)

## Troubleshooting Common Issues

### "I'm not seeing important emails"
- Lower the `min_importance` score (try 20 instead of 30)
- Check if sender domains need to be added as VIP
- Increase `hours_back` to look further back

### "Too many emails showing up"
- Raise the `min_importance` score (try 50 instead of 30)
- Add common newsletter domains to spam indicators
- Reduce `hours_back` to focus on recent emails

### "Emails from my boss are low priority"
- Add your company domain to VIP list
- Check if emails contain importance keywords in subject/body

### "Too much spam getting through"
- Review and update SPAM_INDICATORS in src/index.ts
- Lower the spam threshold (2 matches to 1 match)

## Integration Examples

### With Task Management
> "Check my urgent emails and create tasks for any action items"

### With Calendar
> "Show me emails about meetings and check if they're on my calendar"

### With Note-taking
> "Summarize my important emails from this week for my weekly review"

## Advanced Queries

### Combine Multiple Filters
> "Show me emails from the last 12 hours with importance above 50, max 5 emails"

### Specific Workflows
> "Check emails from client domains only, last 24 hours"

### Batch Operations
> "Show me all emails about the 'Project Phoenix', mark the ones I've reviewed as read"

## Privacy & Security Notes

- All email processing happens locally on your machine
- Credentials stored in `credentials.json` and `token.json`
- Never share these files
- The MCP server only accesses emails you explicitly query
- No data is sent to external servers except Google's Gmail API

## Performance Tips

- Use reasonable `hours_back` values (24-48 hours typical)
- Limit `max_results` to what you need (5-15 usually enough)
- Higher `min_importance` = faster filtering
- VIP domains improve relevance without slowing down

## Getting Help

If you need to modify the scoring algorithm, keyword lists, or add custom logic:
1. Edit `src/index.ts` for importance scoring
2. Edit `src/gmail.ts` for Gmail API interactions
3. Rebuild with `npm run build`
4. Restart your MCP client

Happy automating! 🚀
