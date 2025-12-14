import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import type {
  WaitMeRequest,
  WaitMeResponse,
  WindowRegistration,
  PendingRequest,
} from "../types";

export class HttpServer {
  private server: http.Server;
  private port: number;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private registeredWindows: Map<string, WindowRegistration> = new Map();
  private requestsByProject: Map<string, WaitMeRequest[]> = new Map();
  private proxyResponses: Map<string, WaitMeResponse> = new Map();
  private isProxy: boolean = false;

  constructor(port: number) {
    this.port = port;
    this.server = http.createServer(this.handleRequest.bind(this));
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          console.error(`Port ${this.port} is already in use, running in proxy mode`);
          this.isProxy = true;
          resolve();
        } else {
          reject(err);
        }
      });

      this.server.listen(this.port, "127.0.0.1", () => {
        console.error(`HTTP Server listening on http://127.0.0.1:${this.port}`);
        resolve();
      });
    });
  }

  stop(): void {
    if (!this.isProxy) {
      this.server.close();
      console.error("HTTP Server stopped");
    }
  }

  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  async waitForResponse(request: WaitMeRequest): Promise<WaitMeResponse> {
    if (this.isProxy) {
      return this.proxyWaitForResponse(request);
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(request.requestId, {
        request,
        resolve,
        reject,
      });

      const projectRequests =
        this.requestsByProject.get(request.projectPath) || [];
      projectRequests.push(request);
      this.requestsByProject.set(request.projectPath, projectRequests);

      this.notifyWindows(request);
    });
  }

  private async proxyWaitForResponse(request: WaitMeRequest): Promise<WaitMeResponse> {
    await this.httpPost("/api/proxy/add", request);

    while (true) {
      await new Promise((r) => setTimeout(r, 500));
      
      const data = await this.httpGet(`/api/proxy/poll/${request.requestId}`);
      if (data.response) {
        return data.response;
      }
    }
  }

  private httpPost(path: string, body: unknown): Promise<any> {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const req = http.request({
        hostname: "127.0.0.1",
        port: this.port,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      }, (res) => {
        let responseData = "";
        res.on("data", (chunk) => (responseData += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(responseData));
          } catch {
            resolve({});
          }
        });
      });
      req.on("error", reject);
      req.write(data);
      req.end();
    });
  }

  private httpGet(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: "127.0.0.1",
        port: this.port,
        path,
        method: "GET",
      }, (res) => {
        let responseData = "";
        res.on("data", (chunk) => (responseData += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(responseData));
          } catch {
            resolve({});
          }
        });
      });
      req.on("error", reject);
      req.end();
    });
  }

  private notifyWindows(request: WaitMeRequest): void {
    console.error(
      `New request ${request.requestId} for project ${request.projectPath}`
    );
  }

  private handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, DELETE, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type"
    );

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://127.0.0.1:${this.port}`);

    if (req.method === "GET" && url.pathname === "/ui") {
      this.serveWebUI(res);
    } else if (req.method === "GET" && url.pathname === "/api/requests") {
      this.handleGetRequests(url, res);
    } else if (req.method === "POST" && url.pathname === "/api/register") {
      this.handleRegister(req, res);
    } else if (req.method === "POST" && url.pathname === "/api/response") {
      this.handleResponse(req, res);
    } else if (req.method === "GET" && url.pathname === "/api/poll") {
      this.handlePoll(url, res);
    } else if (req.method === "DELETE" && url.pathname.startsWith("/api/request/")) {
      this.handleDelete(url, res);
    } else if (req.method === "POST" && url.pathname === "/api/proxy/add") {
      this.handleProxyAdd(req, res);
    } else if (req.method === "GET" && url.pathname.startsWith("/api/proxy/poll/")) {
      this.handleProxyPoll(url, res);
    } else if (req.method === "POST" && url.pathname === "/api/restart") {
      this.handleRestart(res);
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    }
  }

  private serveWebUI(res: http.ServerResponse): void {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WaitMe</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white min-h-screen">
  <div id="root" class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">WaitMe - 待处理请求</h1>
    <div id="requests" class="space-y-4"></div>
  </div>
  <script>
    async function loadRequests() {
      const res = await fetch('/api/requests');
      const data = await res.json();
      const container = document.getElementById('requests');
      
      if (data.requests.length === 0) {
        container.innerHTML = '<p class="text-gray-400">暂无待处理请求</p>';
        return;
      }
      
      container.innerHTML = data.requests.map(req => \`
        <div class="bg-gray-800 rounded-lg p-4" data-id="\${req.requestId}">
          <div class="text-sm text-gray-400 mb-2">\${req.projectPath}</div>
          <div class="prose prose-invert mb-4">\${req.message}</div>
          \${req.predefinedOptions ? \`
            <div class="flex flex-wrap gap-2 mb-4">
              \${req.predefinedOptions.map(opt => \`
                <button onclick="selectOption('\${req.requestId}', '\${opt}')" 
                  class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded">\${opt}</button>
              \`).join('')}
            </div>
          \` : ''}
          <textarea id="input-\${req.requestId}" class="w-full bg-gray-700 rounded p-2 mb-2" 
            placeholder="输入回复..."></textarea>
          <button onclick="sendResponse('\${req.requestId}')" 
            class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded">发送</button>
        </div>
      \`).join('');
    }
    
    async function selectOption(requestId, option) {
      await submitResponse(requestId, { selectedOptions: [option] });
    }
    
    async function sendResponse(requestId) {
      const input = document.getElementById('input-' + requestId);
      await submitResponse(requestId, { userInput: input.value });
    }
    
    async function submitResponse(requestId, data) {
      await fetch('/api/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, ...data })
      });
      loadRequests();
    }
    
    loadRequests();
    setInterval(loadRequests, 2000);
  </script>
</body>
</html>`;
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  }

  private handleGetRequests(
    url: URL,
    res: http.ServerResponse
  ): void {
    const projectPath = url.searchParams.get("projectPath");
    let requests: WaitMeRequest[];

    if (projectPath) {
      requests = this.requestsByProject.get(projectPath) || [];
    } else {
      requests = Array.from(this.pendingRequests.values()).map((p) => p.request);
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ requests }));
  }

  private handleRegister(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body) as WindowRegistration;
        this.registeredWindows.set(data.windowId, data);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  }

  private handleResponse(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body) as {
          requestId: string;
          userInput?: string;
          selectedOptions?: string[];
          images?: Array<{ data: string; media_type: string; filename?: string }>;
        };

        const pending = this.pendingRequests.get(data.requestId);
        if (!pending) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Request not found" }));
          return;
        }

        const response: WaitMeResponse = {
          userInput: data.userInput || null,
          selectedOptions: data.selectedOptions || [],
          images: data.images || [],
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: data.requestId,
            projectPath: pending.request.projectPath,
          },
        };

        pending.resolve(response);
        this.pendingRequests.delete(data.requestId);
        this.proxyResponses.set(data.requestId, response);

        const projectRequests =
          this.requestsByProject.get(pending.request.projectPath) || [];
        const index = projectRequests.findIndex(
          (r) => r.requestId === data.requestId
        );
        if (index > -1) {
          projectRequests.splice(index, 1);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  }

  private handlePoll(url: URL, res: http.ServerResponse): void {
    const projectPath = url.searchParams.get("projectPath");
    const requests = projectPath
      ? this.requestsByProject.get(projectPath) || []
      : Array.from(this.pendingRequests.values()).map((p) => p.request);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ requests }));
  }

  private handleProxyAdd(req: http.IncomingMessage, res: http.ServerResponse): void {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const request = JSON.parse(body) as WaitMeRequest;
        
        this.pendingRequests.set(request.requestId, {
          request,
          resolve: () => {},
          reject: () => {},
        });

        const projectRequests = this.requestsByProject.get(request.projectPath) || [];
        projectRequests.push(request);
        this.requestsByProject.set(request.projectPath, projectRequests);

        this.notifyWindows(request);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  }

  private handleProxyPoll(url: URL, res: http.ServerResponse): void {
    const requestId = url.pathname.split("/").pop();
    if (!requestId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing request ID" }));
      return;
    }

    const response = this.proxyResponses.get(requestId);
    if (response) {
      this.proxyResponses.delete(requestId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ response }));
      return;
    }

    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ response: null, completed: true }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ response: null, completed: false }));
  }

  private handleRestart(res: http.ServerResponse): void {
    // 清除所有待处理的请求
    for (const [requestId, pending] of this.pendingRequests) {
      const response: WaitMeResponse = {
        userInput: "[服务已重启，请求被取消]",
        selectedOptions: [],
        images: [],
        metadata: {
          timestamp: new Date().toISOString(),
          requestId,
          projectPath: pending.request.projectPath,
        },
      };
      pending.resolve(response);
    }
    this.pendingRequests.clear();
    this.requestsByProject.clear();
    this.proxyResponses.clear();
    this.registeredWindows.clear();

    console.error("Server restarted, all pending requests cleared");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
  }

  private handleDelete(url: URL, res: http.ServerResponse): void {
    const requestId = url.pathname.split("/").pop();
    if (!requestId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing request ID" }));
      return;
    }

    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Request not found" }));
      return;
    }

    const response: WaitMeResponse = {
      userInput: "[请求已被用户删除]",
      selectedOptions: [],
      images: [],
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        projectPath: pending.request.projectPath,
      },
    };

    pending.resolve(response);
    this.pendingRequests.delete(requestId);

    const projectRequests =
      this.requestsByProject.get(pending.request.projectPath) || [];
    const index = projectRequests.findIndex((r) => r.requestId === requestId);
    if (index > -1) {
      projectRequests.splice(index, 1);
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
  }
}
