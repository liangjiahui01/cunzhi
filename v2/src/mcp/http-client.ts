import * as http from "http";
import type { WaitMeRequest, WaitMeResponse } from "../types";
import { HTTP_PORT, REQUEST_TIMEOUT_MS } from "../config";

export class McpHttpClient {
  private port: number;

  constructor(port: number = HTTP_PORT) {
    this.port = port;
  }

  async checkHealth(): Promise<{ status: string; pendingCount: number } | null> {
    try {
      const data = await this.httpGet("/api/health");
      return data;
    } catch {
      return null;
    }
  }

  async addRequest(request: WaitMeRequest): Promise<void> {
    await this.httpPost("/api/request", request);
  }

  async waitForResponse(requestId: string, timeoutMs: number = REQUEST_TIMEOUT_MS): Promise<WaitMeResponse> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const data = await this.httpGet(`/api/poll/${requestId}`);
      
      if (data.response) {
        return data.response;
      }
      
      if (data.completed) {
        throw new Error("Request was completed without response");
      }
      
      await new Promise((r) => setTimeout(r, 500));
    }
    
    throw new Error("Request timed out");
  }

  private httpPost(path: string, body: unknown): Promise<any> {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: this.port,
          path,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(data),
          },
        },
        (res) => {
          let responseData = "";
          res.on("data", (chunk) => (responseData += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(responseData));
            } catch {
              resolve({});
            }
          });
        }
      );
      req.on("error", reject);
      req.write(data);
      req.end();
    });
  }

  private httpGet(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: this.port,
          path,
          method: "GET",
        },
        (res) => {
          let responseData = "";
          res.on("data", (chunk) => (responseData += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(responseData));
            } catch {
              resolve({});
            }
          });
        }
      );
      req.on("error", reject);
      req.end();
    });
  }
}
