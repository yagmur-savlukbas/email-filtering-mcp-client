/**
 * Gmail API Integration
 * Handles authentication and email fetching
 */

import { google, gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import * as fs from "fs/promises";
import * as path from "path";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
];

// Paths relative to dist/ when running, or src/ during development
const TOKEN_PATH = path.join(process.cwd(), "dist", "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "dist", "credentials.json");

export interface Email {
  id: string;
  from: string;
  subject: string;
  body: string;
  received: Date;
  isDirect: boolean;
  hasAttachments: boolean;
  labels: string[];
}

export class GmailClient {
  private gmail: gmail_v1.Gmail | null = null;
  private auth: OAuth2Client | null = null;

  isAuthenticated(): boolean {
    return this.gmail !== null && this.auth !== null;
  }

  async authenticate(): Promise<void> {
    // Load client secrets
    let credentials;
    try {
      const content = await fs.readFile(CREDENTIALS_PATH, "utf-8");
      credentials = JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Error loading credentials.json. Please download it from Google Cloud Console.\n` +
          `Visit: https://console.cloud.google.com/apis/credentials\n` +
          `Error: ${error}`
      );
    }

    const { client_secret, client_id, redirect_uris } =
      credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // Check if we have a token
    try {
      const token = await fs.readFile(TOKEN_PATH, "utf-8");
      oAuth2Client.setCredentials(JSON.parse(token));
    } catch (error) {
      // Token doesn't exist - throw a helpful error instead of trying interactive auth
      // In MCP context, stdin is used for protocol, so we can't do interactive auth
      throw new Error(
        `No token.json found. Gmail authentication required.\n` +
        `Please run this script manually first to complete OAuth flow:\n` +
        `\n  node dist/index.js\n` +
        `\nAfter authentication, token.json will be created and MCP server can use it.\n` +
        `Or visit this URL to get an authorization code:\n` +
        `${oAuth2Client.generateAuthUrl({ access_type: "offline", scope: SCOPES })}\n` +
        `Then create token.json manually or use a separate script.`
      );
    }

    this.auth = oAuth2Client;
    this.gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  }

  private async getNewToken(oAuth2Client: OAuth2Client): Promise<void> {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });

    console.error("\n=================================");
    console.error("🔐 Gmail Authentication Required");
    console.error("=================================");
    console.error("\nAuthorize this app by visiting this URL:");
    console.error(`\n${authUrl}\n`);
    console.error(
      "After authorization, you'll get a code. Enter it below:\n"
    );

    // Read code from stdin
    const code = await new Promise<string>((resolve) => {
      const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      readline.question("Enter the code: ", (answer: string) => {
        readline.close();
        resolve(answer);
      });
    });

    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Store the token
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
    console.error("✅ Token stored successfully!\n");
  }

  async fetchUnreadEmails(hoursBack: number = 24): Promise<Email[]> {
    if (!this.gmail) {
      throw new Error("Gmail client not authenticated");
    }

    // Calculate timestamp
    const after = Math.floor(
      (Date.now() - hoursBack * 60 * 60 * 1000) / 1000
    );
    const query = `is:unread after:${after}`;

    try {
      const response = await this.gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 50,
      });

      const messages = response.data.messages || [];
      const emails: Email[] = [];

      for (const message of messages) {
        if (message.id) {
          const email = await this.getEmailDetails(message.id);
          if (email) {
            emails.push(email);
          }
        }
      }

      return emails;
    } catch (error) {
      console.error("Error fetching emails:", error);
      throw error;
    }
  }

  private async getEmailDetails(messageId: string): Promise<Email | null> {
    if (!this.gmail) {
      throw new Error("Gmail client not authenticated");
    }

    try {
      const response = await this.gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

      const message = response.data;
      const headers = message.payload?.headers || [];

      // Extract headers
      const getHeader = (name: string): string => {
        const header = headers.find(
          (h) => h.name?.toLowerCase() === name.toLowerCase()
        );
        return header?.value || "";
      };

      const subject = getHeader("Subject") || "No Subject";
      const from = getHeader("From") || "Unknown";
      const to = getHeader("To") || "";
      const dateStr = getHeader("Date");

      // Get email body
      const body = this.extractBody(message.payload);

      // Parse date
      const received = dateStr ? new Date(dateStr) : new Date();

      // Check if direct (simplified check)
      const isDirect = to.length > 0;

      // Check for attachments
      const hasAttachments = this.hasAttachments(message.payload);

      return {
        id: messageId,
        from,
        subject,
        body,
        received,
        isDirect,
        hasAttachments,
        labels: message.labelIds || [],
      };
    } catch (error) {
      console.error(`Error getting email details for ${messageId}:`, error);
      return null;
    }
  }

  private extractBody(
    payload: gmail_v1.Schema$MessagePart | undefined
  ): string {
    if (!payload) return "";

    // Check if there are parts (multipart email)
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          return Buffer.from(part.body.data, "base64").toString("utf-8");
        }
      }
      // If no plain text, try to get any text from nested parts
      for (const part of payload.parts) {
        const nestedBody = this.extractBody(part);
        if (nestedBody) return nestedBody;
      }
    }

    // Single part message
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, "base64").toString("utf-8");
    }

    return "";
  }

  private hasAttachments(
    payload: gmail_v1.Schema$MessagePart | undefined
  ): boolean {
    if (!payload) return false;

    if (payload.parts) {
      return payload.parts.some(
        (part) =>
          part.filename && part.filename.length > 0 && part.body?.attachmentId
      );
    }

    return false;
  }

  async markAsRead(messageId: string): Promise<void> {
    if (!this.gmail) {
      throw new Error("Gmail client not authenticated");
    }

    try {
      await this.gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          removeLabelIds: ["UNREAD"],
        },
      });
    } catch (error) {
      console.error("Error marking email as read:", error);
      throw error;
    }
  }

  async addLabel(messageId: string, label: string): Promise<void> {
    if (!this.gmail) {
      throw new Error("Gmail client not authenticated");
    }

    try {
      await this.gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          addLabelIds: [label],
        },
      });
    } catch (error) {
      console.error("Error adding label:", error);
      throw error;
    }
  }
}
