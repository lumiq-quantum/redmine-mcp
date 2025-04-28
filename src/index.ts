import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Read config from command line arguments
// Usage: node build/index.js <REDMINE_URL> <API_KEY> <PROJECT_ID>
const [,, REDMINE_URL, API_KEY, PROJECT_ID] = process.argv;
if (!REDMINE_URL || !API_KEY || !PROJECT_ID) {
  console.error("Usage: node build/index.js <REDMINE_URL> <API_KEY> <PROJECT_ID>");
  process.exit(1);
}

const ACTIVITY_ID = 9;

// Create server instance
const server = new McpServer({
  name: "redmine",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});



// MCP Tool 1: Get latest issue assigned to me
server.tool(
  "get-latest-issue",
  "Get the most recent issue assigned to me",
  {},
  async () => {
    const response = await fetch(`${REDMINE_URL}/issues.json?assigned_to_id=me&sort=updated_on:desc&limit=1`, {
        method: "GET",
        headers: {
        "Accept": "*/*",
        "User-Agent": "MCP Redmine Client",
        "X-Redmine-API-Key": API_KEY,
      },
    });

    console.log("Response:", response);
    console.log("Response Headers:", response.headers);
    console.log("VISHAL TESTING", "VISHALLLL");

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch latest issue: ${response.status} ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    const issue = data.issues?.[0];

    if (!issue) {
      return {
        content: [
          {
            type: "text",
            text: "No issues assigned to you currently.",
          },
        ],
      };
    }

    const text = `Most recent assigned issue:\n\n` +
                 `ID: ${issue.id}\n` +
                 `Subject: ${issue.subject}\n` +
                 `Project: ${issue.project?.name}\n` +
                 `Updated On: ${issue.updated_on}`;

    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
    };
  }
);

// MCP Tool 2: Log time to most recent issue
server.tool(
  "log-time",
  "Log time to the most recent assigned open issue",
  {
    hours: z.number().positive().describe("Hours worked (e.g. 2.5)"),
    comments: z.string().describe("Work description"),
    spent_on: z.string().describe("Date of work (YYYY-MM-DD)"),
  },
  async ({ hours, comments, spent_on }) => {
    // Step 1: Fetch the most recent issue
    const issueResponse = await fetch(`${REDMINE_URL}/issues.json?assigned_to_id=me&sort=updated_on:desc&limit=1`, {
        method: "GET",
        headers: {
        "Accept": "*/*",
        "User-Agent": "MCP Redmine Client",
        "X-Redmine-API-Key": API_KEY,
      },
    });

    if (!issueResponse.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch issue: ${issueResponse.status} ${issueResponse.statusText}`,
          },
        ],
      };
    }

    const issueData = await issueResponse.json();
    const issue = issueData.issues?.[0];

    if (!issue) {
      return {
        content: [
          {
            type: "text",
            text: "No issues available to log time on.",
          },
        ],
      };
    }

    // Step 2: Log time entry
    const logResponse = await fetch(`${REDMINE_URL}/time_entries.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "*/*",
        "User-Agent": "MCP Redmine Client",
        "X-Redmine-API-Key": API_KEY,
      },
      body: JSON.stringify({
        time_entry: {
          project_id: PROJECT_ID,
          issue_id: issue.id,
          hours,
          spent_on,
          activity_id: ACTIVITY_ID,
          comments,
        },
      }),
    });

    if (!logResponse.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to log time: ${logResponse.status} ${logResponse.statusText}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully logged ${hours} hours to issue ID ${issue.id} with comments: "${comments}"`,
        },
      ],
    };
  }
);



async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Weather MCP Server running on stdio");
}
  
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});