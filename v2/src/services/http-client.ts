import type { WaitMeRequest, ImageAttachment } from "../types";

export class HttpClient {
  private baseUrl: string;

  constructor(port: number) {
    this.baseUrl = `http://127.0.0.1:${port}`;
  }

  async register(windowId: string, projectPath: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        windowId,
        projectPath,
        registeredAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to register: ${response.statusText}`);
    }
  }

  async getRequests(projectPath?: string): Promise<WaitMeRequest[]> {
    const url = new URL(`${this.baseUrl}/api/requests`);
    if (projectPath) {
      url.searchParams.set("projectPath", projectPath);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to get requests: ${response.statusText}`);
    }

    const data = await response.json();
    return data.requests;
  }

  async sendResponse(
    requestId: string,
    userInput?: string,
    selectedOptions?: string[],
    images?: ImageAttachment[]
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        userInput,
        selectedOptions,
        images,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send response: ${response.statusText}`);
    }
  }

  async deleteRequest(requestId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/request/${requestId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Failed to delete request: ${response.statusText}`);
    }
  }
}
