import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { v4 as uuidv4 } from "uuid";
import { HttpServer } from "./http-server";
import type { WaitMeRequest, WaitMeResponse } from "../types";

const HTTP_PORT = 19528;

export class WaitMeServer {
  private server: Server;
  private httpServer: HttpServer;

  constructor() {
    this.server = new Server(
      {
        name: "waitme",
        version: "0.0.1",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.httpServer = new HttpServer(HTTP_PORT);
    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "waitme",
          description:
            "智能代码审查交互工具，支持预定义选项、自由文本输入和图片上传",
          inputSchema: {
            type: "object" as const,
            properties: {
              message: {
                type: "string",
                description: "要显示给用户的消息",
              },
              predefined_options: {
                type: "array",
                items: { type: "string" },
                description: "预定义的选项列表（可选）",
              },
              is_markdown: {
                type: "boolean",
                description: "消息是否为Markdown格式，默认为true",
              },
            },
            required: ["message"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== "waitme") {
        throw new Error(`Unknown tool: ${request.params.name}`);
      }

      const args = request.params.arguments as {
        message: string;
        predefined_options?: string[];
        is_markdown?: boolean;
      };

      const waitmeRequest: WaitMeRequest = {
        requestId: uuidv4(),
        projectPath: process.cwd(),
        message: args.message,
        predefinedOptions: args.predefined_options,
        isMarkdown: args.is_markdown ?? true,
        timestamp: new Date().toISOString(),
      };

      try {
        const response = await this.httpServer.waitForResponse(waitmeRequest);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    await this.httpServer.start();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("WaitMe MCP Server running on stdio");
    console.error(`HTTP Server listening on port ${HTTP_PORT}`);
  }
}

const server = new WaitMeServer();
server.run().catch(console.error);
