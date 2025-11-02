#!/usr/bin/env node

/**
 * Standalone Gmail authentication script
 * Run this once to generate token.json
 * Then the MCP server can use it
 */

import { google } from "googleapis";
import * as fs from "fs/promises";
import * as path from "path";
import * as readline from "readline";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
];

// Auth script reads from src/ and writes to both src/ and dist/
const SRC_TOKEN_PATH = path.join(process.cwd(), "src", "token.json");
const SRC_CREDENTIALS_PATH = path.join(process.cwd(), "src", "credentials.json");
const DIST_TOKEN_PATH = path.join(process.cwd(), "dist", "token.json");
const DIST_CREDENTIALS_PATH = path.join(process.cwd(), "dist", "credentials.json");

async function authenticate() {
  // Load client secrets - try src/ first, then dist/
  let credentials;
  let credentialsPath;
  try {
    const content = await fs.readFile(SRC_CREDENTIALS_PATH, "utf-8");
    credentials = JSON.parse(content);
    credentialsPath = SRC_CREDENTIALS_PATH;
  } catch (error) {
    try {
      const content = await fs.readFile(DIST_CREDENTIALS_PATH, "utf-8");
      credentials = JSON.parse(content);
      credentialsPath = DIST_CREDENTIALS_PATH;
    } catch (error2) {
      console.error(
        "Error loading credentials.json. Please download it from Google Cloud Console."
      );
      console.error("Place it at: src/credentials.json or dist/credentials.json");
      console.error("Visit: https://console.cloud.google.com/apis/credentials");
      process.exit(1);
    }
  }

  const { client_secret, client_id, redirect_uris } =
    credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we already have a token in dist/ (where the MCP server looks)
  try {
    const token = await fs.readFile(DIST_TOKEN_PATH, "utf-8");
    oAuth2Client.setCredentials(JSON.parse(token));
    console.log("✅ Token already exists at:", DIST_TOKEN_PATH);
    console.log("You're all set! The MCP server can now use this token.");
    return;
  } catch (error) {
    // Need to get new token
  }

  // Get new token
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("\n=================================");
  console.log("🔐 Gmail Authentication Required");
  console.log("=================================");
  console.log("\nAuthorize this app by visiting this URL:\n");
  console.log(authUrl);
  console.log("\nAfter authorization, you'll get a code. Enter it below:\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise((resolve) => {
    rl.question("Enter the code: ", (answer) => {
      rl.close();
      resolve(answer);
    });
  });

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Ensure dist/ directory exists
    const distDir = path.dirname(DIST_TOKEN_PATH);
    await fs.mkdir(distDir, { recursive: true });

    // Copy credentials.json to dist/ if it's in src/
    if (credentialsPath === SRC_CREDENTIALS_PATH) {
      const credentialsContent = await fs.readFile(SRC_CREDENTIALS_PATH, "utf-8");
      await fs.writeFile(DIST_CREDENTIALS_PATH, credentialsContent);
      console.log("✓ Copied credentials.json to dist/");
    }

    // Store the token in dist/ (where the MCP server reads from)
    await fs.writeFile(DIST_TOKEN_PATH, JSON.stringify(tokens));
    console.log("\n✅ Token stored successfully at:", DIST_TOKEN_PATH);
    console.log("The MCP server can now access your Gmail!");
  } catch (error) {
    console.error("Error getting token:", error);
    process.exit(1);
  }
}

authenticate().catch(console.error);

