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

    if (response.selectedOptions?.includes("enter_draft_mode")) {
      textParts.push("💬 用户希望先讨论，请使用 plan(mode='draft') 回复。");
    }
    if (response.selectedOptions?.includes("enter_final_mode")) {
      textParts.push("📋 用户希望直接拿最终方案，请使用 plan(mode='final') 回复。");
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

  private buildPlanContent(response: WaitMeResponse, request: WaitMeRequest) {
    const content: Array<{ type: "text" | "image"; text?: string; data?: string; mimeType?: string }> = [];
    const textParts: string[] = [];

    const selectedOptions = response.selectedOptions || [];
    const mode = request.planData?.mode || "final";

    // Draft 模式的响应
    const isContinueDraft = selectedOptions.includes("continue_draft");
    const isRequestFinal = selectedOptions.includes("request_final");
    const isRequestFinalQuick = selectedOptions.includes("request_final_quick");

    // Final 模式的响应
    const isApproved = selectedOptions.includes("approved");
    const isRejected = selectedOptions.includes("rejected");
    const needsModification = selectedOptions.includes("needs_modification");

    if (mode === "draft") {
      textParts.push("⚠️ 在获得用户批准前不要编写代码，仅讨论方案。");
      // 讨论模式的响应处理
      if (isContinueDraft) {
        textParts.push("💬 **用户希望继续讨论**，请根据反馈继续优化方案，使用 plan(mode='draft') 回复。");
      } else if (isRequestFinalQuick) {
        textParts.push("⚡ **用户希望直接进入执行**，请输出精简的最终方案并等待批准，使用 plan(mode='final') 回复。");
      } else if (isRequestFinal) {
        textParts.push("📋 **用户请求最终方案**，请使用 plan(mode='final') 提交完整的最终方案。");
      } else if (isRejected) {
        textParts.push("❌ **计划被拒绝**，请完全重新设计方案。");
      }
    } else {
      if (!isApproved) {
        textParts.push("⚠️ 在获得用户批准前不要编写代码，仅讨论方案。");
      }
      // Final 模式的响应处理
      if (isApproved) {
        textParts.push("✅ **计划已批准**，可以开始实施。");
      } else if (isRejected) {
        textParts.push("❌ **计划被拒绝**，请根据反馈重新设计方案。");
      } else if (needsModification) {
        textParts.push("✏️ **需要修改**，请根据用户反馈调整后，使用 plan(mode='draft') 继续讨论，或 plan(mode='final') 提交修改后的完整方案。");
      }
    }

    // 添加用户反馈
    if (response.userInput && response.userInput.trim()) {
      textParts.push(`\n**用户反馈：**\n${response.userInput.trim()}`);
    }

    // 添加焦点提醒（仅在批准时）
    if (isApproved && request.planData) {
      const focusParts: string[] = [];
      focusParts.push(`\n---\n📌 **当前焦点：${request.planData.title}**`);
      
      if (request.planData.filesToModify && request.planData.filesToModify.length > 0) {
        focusParts.push(`涉及文件：${request.planData.filesToModify.join(", ")}`);
      }
      
      focusParts.push("请专注于当前计划，忽略之前的话题。");
      textParts.push(focusParts.join("\n"));
    }

    // 处理图片附件
    const imageInfoParts: string[] = [];
    if (response.images && response.images.length > 0) {
      for (let i = 0; i < response.images.length; i++) {
        const image = response.images[i];
        let pureBase64 = image.data;
        if (pureBase64.includes(",")) {
          pureBase64 = pureBase64.split(",")[1];
        }
        content.push({
          type: "image" as const,
          data: pureBase64,
          mimeType: image.media_type,
        });

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

      textParts.push(...imageInfoParts);
      textParts.push(
        `💡 注意：用户提供了 ${response.images.length} 张图片。如果 AI 助手无法显示图片，图片数据已包含在上述 Base64 信息中。`
      );
    }

    // 合并内容
    if (textParts.length > 0) {
      content.push({
        type: "text" as const,
        text: textParts.join("\n"),
      });
    } else {
      content.push({
        type: "text" as const,
        text: "用户未提供任何反馈",
      });
    }

    return { content };
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "ask",
          description:
            "用于承接用户指令与补充信息的交互通道，支持文本、选项与图片。",
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
        {
          name: "plan",
          description:
            "在修改代码前提交实施计划，等待用户审批。支持两种模式：draft（讨论阶段，只回复当前点）和 final（提交完整最终方案）。",
          inputSchema: {
            type: "object" as const,
            properties: {
              mode: {
                type: "string",
                enum: ["draft", "final"],
                description: "模式：draft=讨论阶段，只回复当前讨论点；final=提交完整最终方案等待批准",
              },
              title: {
                type: "string",
                description: "计划标题，简洁描述要做什么",
              },
              description: {
                type: "string",
                description: "详细的方案说明，支持 Markdown 格式。draft 模式下可以只写当前讨论的点",
              },
              steps: {
                type: "array",
                items: { type: "string" },
                description: "具体执行步骤列表（可选，final模式建议提供完整列表）",
              },
              files_to_modify: {
                type: "array",
                items: { type: "string" },
                description: "计划修改的文件路径（可选，final模式建议提供完整列表）",
              },
            },
            required: ["mode", "title", "description"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      
      if (toolName === "ask") {
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
          type: "ask",
        };

        try {
          await this.httpClient.addRequest(waitmeRequest);
          const response = await this.httpClient.waitForResponse(
            waitmeRequest.requestId,
            REQUEST_TIMEOUT_MS
          );
          return this.buildMcpContent(response);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          return {
            content: [{ type: "text" as const, text: `Error: ${errorMessage}` }],
            isError: true,
          };
        }
      } else if (toolName === "plan") {
        const args = request.params.arguments as {
          mode: "draft" | "final";
          title: string;
          description: string;
          steps?: string[];
          files_to_modify?: string[];
        };

        const planRequest: WaitMeRequest = {
          requestId: uuidv4(),
          projectPath: process.cwd(),
          message: args.description,
          isMarkdown: true,
          timestamp: new Date().toISOString(),
          type: "plan",
          planData: {
            mode: args.mode,
            title: args.title,
            description: args.description,
            steps: args.steps,
            filesToModify: args.files_to_modify,
          },
        };

        try {
          await this.httpClient.addRequest(planRequest);
          const response = await this.httpClient.waitForResponse(
            planRequest.requestId,
            REQUEST_TIMEOUT_MS
          );
          return this.buildPlanContent(response, planRequest);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          return {
            content: [{ type: "text" as const, text: `Error: ${errorMessage}` }],
            isError: true,
          };
        }
      } else {
        throw new Error(`Unknown tool: ${toolName}`);
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
