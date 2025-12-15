import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { v4 as uuidv4 } from "uuid";
import { McpHttpClient } from "./http-client";
import type { WaitMeRequest, WaitMeResponse } from "../types";
import { HTTP_PORT, REQUEST_TIMEOUT_MS } from "../config";

export class WaitMeServer {
  private server: Server;
  private httpClient: McpHttpClient;

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

    this.httpClient = new McpHttpClient(HTTP_PORT);
    this.setupHandlers();
  }

  private buildMcpContent(response: WaitMeResponse) {
    const content: Array<{ type: "text" | "image"; text?: string; data?: string; mimeType?: string }> = [];
    const textParts: string[] = [];

    // 1. 处理选择的选项
    if (response.selectedOptions && response.selectedOptions.length > 0) {
      textParts.push(`选择的选项: ${response.selectedOptions.join(", ")}`);
    }

    // 2. 处理用户输入文本
    if (response.userInput && response.userInput.trim()) {
      textParts.push(response.userInput.trim());
    }

    // 3. 处理图片附件
    const imageInfoParts: string[] = [];
    if (response.images && response.images.length > 0) {
      for (let i = 0; i < response.images.length; i++) {
        const image = response.images[i];
        // 添加图片到结果中（图片在前）
        // 去掉 data:image/xxx;base64, 前缀，只保留纯 Base64
        let pureBase64 = image.data;
        if (pureBase64.includes(",")) {
          pureBase64 = pureBase64.split(",")[1];
        }
        content.push({
          type: "image" as const,
          data: pureBase64,
          mimeType: image.media_type,
        });

        // 生成图片信息
        const base64Len = image.data.length;
        const preview = base64Len > 50 ? `${image.data.substring(0, 50)}...` : image.data;
        const estimatedSize = Math.floor((base64Len * 3) / 4);
        const sizeStr = estimatedSize < 1024
          ? `${estimatedSize} B`
          : estimatedSize < 1024 * 1024
            ? `${(estimatedSize / 1024).toFixed(1)} KB`
            : `${(estimatedSize / (1024 * 1024)).toFixed(1)} MB`;

        const filenameInfo = image.filename ? `\n文件名: ${image.filename}` : "";
        imageInfoParts.push(
          `=== 图片 ${i + 1} ===${filenameInfo}\n类型: ${image.media_type}\n大小: ${sizeStr}\nBase64 预览: ${preview}\n完整 Base64 长度: ${base64Len} 字符`
        );
      }
    }

    // 4. 合并所有文本内容
    const allTextParts = [...textParts, ...imageInfoParts];

    // 5. 添加兼容性说明
    if (response.images && response.images.length > 0) {
      allTextParts.push(
        `💡 注意：用户提供了 ${response.images.length} 张图片。如果 AI 助手无法显示图片，图片数据已包含在上述 Base64 信息中。`
      );
    }

    // 6. 将文本内容添加到结果中（图片后面）
    if (allTextParts.length > 0) {
      content.push({
        type: "text" as const,
        text: allTextParts.join("\n\n"),
      });
    }

    // 7. 如果没有任何内容，添加默认响应
    if (content.length === 0) {
      content.push({
        type: "text" as const,
        text: "用户未提供任何内容",
      });
    }

    return { content };
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
        // 1. 添加请求到 HTTP Server
        await this.httpClient.addRequest(waitmeRequest);
        
        // 2. 轮询等待响应
        const response = await this.httpClient.waitForResponse(
          waitmeRequest.requestId,
          REQUEST_TIMEOUT_MS
        );
        return this.buildMcpContent(response);
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
    // 检查 HTTP Server 是否可用
    const health = await this.httpClient.checkHealth();
    if (!health) {
      console.error("WARNING: HTTP Server is not running on port " + HTTP_PORT);
      console.error("Please start the server first: waitme-server");
    } else {
      console.error(`Connected to HTTP Server (${health.pendingCount} pending requests)`);
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("WaitMe MCP Server running on stdio (client mode)");

    const gracefulShutdown = () => {
      console.error("MCP Server shutting down...");
      process.exit(0);
    };

    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGHUP", gracefulShutdown);
    process.stdin.on("close", gracefulShutdown);
    process.stdin.on("end", gracefulShutdown);
  }
}

const server = new WaitMeServer();
server.run().catch(console.error);
