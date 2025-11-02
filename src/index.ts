#!/usr/bin/env node

/**
 * MCP Server for Important Email Reminders
 * Filters spam and surfaces important emails automatically
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { GmailClient, Email } from "./gmail.js";

// Email importance scoring criteria
const IMPORTANCE_KEYWORDS: Record<string, number> = {
  urgent: 10,
  important: 8,
  asap: 10,
  deadline: 7,
  meeting: 6,
  "action required": 9,
  "please respond": 7,
  invoice: 6,
  payment: 6,
  reminder: 5,
  interview: 8,
  approval: 7,
};

const SPAM_INDICATORS = [
  "unsubscribe",
  "promotional",
  "marketing",
  "newsletter",
  "no-reply",
  "advertisement",
  "deals",
  "offer expires",
  "limited time",
  "act now",
];

// Add your important contact domains here
let VIP_DOMAINS: string[] = [];

interface ScoredEmail extends Email {
  importanceScore: number;
}

function scoreEmailImportance(email: Email): number {
  let score = 0;
  const subject = email.subject.toLowerCase();
  const sender = email.from.toLowerCase();
  const body = email.body.toLowerCase().substring(0, 500); // First 500 chars

  // Check for spam indicators (negative score)
  const spamCount = SPAM_INDICATORS.filter(
    (indicator) => subject.includes(indicator) || body.includes(indicator)
  ).length;

  if (spamCount >= 2) {
    return -10; // Likely spam
  }

  // Check VIP sender
  if (VIP_DOMAINS.some((domain) => sender.includes(domain))) {
    score += 20;
  }

  // Check importance keywords
  for (const [keyword, points] of Object.entries(IMPORTANCE_KEYWORDS)) {
    if (subject.includes(keyword)) {
      score += points * 1.5; // Subject keywords worth more
    }
    if (body.includes(keyword)) {
      score += points;
    }
  }

  // Check if it's a direct email (not CC)
  if (email.isDirect) {
    score += 10;
  }

  // Recent emails are more important
  const hoursOld =
    (Date.now() - email.received.getTime()) / (1000 * 60 * 60);
  if (hoursOld < 4) {
    score += 15;
  } else if (hoursOld < 24) {
    score += 5;
  }

  // Has attachments
  if (email.hasAttachments) {
    score += 5;
  }

  return Math.min(score, 100); // Cap at 100
}

class EmailReminderServer {
  private server: Server;
  private gmailClient: GmailClient;

  constructor() {
    this.server = new Server(
      {
        name: "email-reminder-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.gmailClient = new GmailClient();
    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "get_important_emails",
          description:
            "Get a filtered list of important unread emails, excluding spam and low-priority items. Returns emails sorted by importance score.",
          inputSchema: {
            type: "object",
            properties: {
              hours_back: {
                type: "number",
                description: "How many hours back to check (default: 24)",
                default: 24,
              },
              min_importance: {
                type: "number",
                description:
                  "Minimum importance score 0-100 (default: 30)",
                default: 30,
              },
              max_results: {
                type: "number",
                description: "Maximum number of emails to return (default: 10)",
                default: 10,
              },
            },
          },
        },
        {
          name: "mark_email_handled",
          description:
            "Mark an email as read to remove it from future reminders",
          inputSchema: {
            type: "object",
            properties: {
              email_id: {
                type: "string",
                description: "The email ID to mark as read",
              },
            },
            required: ["email_id"],
          },
        },
        {
          name: "add_vip_domain",
          description:
            "Add a sender domain to VIP list for higher priority (e.g., 'company.com')",
          inputSchema: {
            type: "object",
            properties: {
              domain: {
                type: "string",
                description: "Domain to add as VIP (e.g., 'company.com')",
              },
            },
            required: ["domain"],
          },
        },
        {
          name: "get_vip_domains",
          description: "List all VIP domains currently configured",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_email_summary",
          description:
            "Get a quick summary of unread emails by category and urgency",
          inputSchema: {
            type: "object",
            properties: {
              hours_back: {
                type: "number",
                description: "How many hours back to check (default: 24)",
                default: 24,
              },
            },
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "get_important_emails":
            return await this.getImportantEmails(args);
          case "mark_email_handled":
            return await this.markEmailHandled(args);
          case "add_vip_domain":
            return await this.addVipDomain(args);
          case "get_vip_domains":
            return await this.getVipDomains();
          case "get_email_summary":
            return await this.getEmailSummary(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private async getImportantEmails(args: any) {
    const hoursBack = args.hours_back ?? 24;
    const minImportance = args.min_importance ?? 30;
    const maxResults = args.max_results ?? 10;

    // Authenticate lazily when needed
    if (!this.gmailClient.isAuthenticated()) {
      await this.gmailClient.authenticate();
    }

    // Fetch emails from Gmail
    const emails = await this.gmailClient.fetchUnreadEmails(hoursBack);

    // Score and filter emails
    const scoredEmails: ScoredEmail[] = emails
      .map((email: Email) => ({
        ...email,
        importanceScore: scoreEmailImportance(email),
      }))
      .filter((email: ScoredEmail) => email.importanceScore >= minImportance)
      .sort((a: ScoredEmail, b: ScoredEmail) => b.importanceScore - a.importanceScore)
      .slice(0, maxResults);

    const result = {
      totalImportant: scoredEmails.length,
      summary: `Found ${scoredEmails.length} important emails in last ${hoursBack} hours`,
      emails: scoredEmails.map((email: ScoredEmail) => ({
        id: email.id,
        from: email.from,
        subject: email.subject,
        snippet: email.body.substring(0, 150) + "...",
        received: email.received.toISOString(),
        importanceScore: email.importanceScore,
        isDirect: email.isDirect,
        hasAttachments: email.hasAttachments,
      })),
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async markEmailHandled(args: any) {
    const emailId = args.email_id;
    if (!emailId) {
      throw new Error("email_id is required");
    }

    // Authenticate lazily when needed
    if (!this.gmailClient.isAuthenticated()) {
      await this.gmailClient.authenticate();
    }

    await this.gmailClient.markAsRead(emailId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully marked email ${emailId} as read`,
        },
      ],
    };
  }

  private async addVipDomain(args: any) {
    const domain = args.domain;
    if (!domain) {
      throw new Error("domain is required");
    }

    if (!VIP_DOMAINS.includes(domain)) {
      VIP_DOMAINS.push(domain);
    }

    return {
      content: [
        {
          type: "text",
          text: `Added "${domain}" to VIP list. Emails from this domain will be prioritized.\nCurrent VIP domains: ${VIP_DOMAINS.join(", ")}`,
        },
      ],
    };
  }

  private async getVipDomains() {
    return {
      content: [
        {
          type: "text",
          text:
            VIP_DOMAINS.length > 0
              ? `VIP Domains: ${VIP_DOMAINS.join(", ")}`
              : "No VIP domains configured yet. Use add_vip_domain to add important sender domains.",
        },
      ],
    };
  }

  private async getEmailSummary(args: any) {
    const hoursBack = args.hours_back ?? 24;

    // Authenticate lazily when needed
    if (!this.gmailClient.isAuthenticated()) {
      await this.gmailClient.authenticate();
    }

    const emails = await this.gmailClient.fetchUnreadEmails(hoursBack);
    const scoredEmails: ScoredEmail[] = emails.map((email: Email) => ({
      ...email,
      importanceScore: scoreEmailImportance(email),
    }));

    const urgent = scoredEmails.filter((e: ScoredEmail) => e.importanceScore >= 70).length;
    const important = scoredEmails.filter(
      (e: ScoredEmail) => e.importanceScore >= 40 && e.importanceScore < 70
    ).length;
    const normal = scoredEmails.filter(
      (e: ScoredEmail) => e.importanceScore >= 0 && e.importanceScore < 40
    ).length;
    const spam = scoredEmails.filter((e: ScoredEmail) => e.importanceScore < 0).length;

    const summary = {
      timeframe: `Last ${hoursBack} hours`,
      totalUnread: emails.length,
      breakdown: {
        urgent: urgent,
        important: important,
        normal: normal,
        likelySpam: spam,
      },
      recommendation:
        urgent > 0
          ? `⚠️ You have ${urgent} urgent email(s) that need attention!`
          : important > 0
          ? `You have ${important} important email(s) to review.`
          : "All caught up! No urgent emails.",
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }

  async run() {
    // Don't authenticate during startup - do it lazily when needed
    // This prevents stdin conflicts with MCP protocol

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Email Reminder MCP Server running on stdio");
  }
}

// Start the server
const server = new EmailReminderServer();
server.run().catch((error) => {
  console.error("Fatal error starting MCP server:", error);
  process.exit(1);
});

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});
