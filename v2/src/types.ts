export interface WaitMeRequest {
  requestId: string;
  projectPath: string;
  message: string;
  predefinedOptions?: string[];
  isMarkdown?: boolean;
  timestamp: string;
}

export interface WaitMeResponse {
  userInput: string | null;
  selectedOptions: string[];
  images: ImageAttachment[];
  metadata: {
    timestamp: string;
    requestId: string;
    projectPath: string;
  };
}

export interface ImageAttachment {
  data: string;
  media_type: string;
  filename?: string;
}

export interface WindowRegistration {
  windowId: string;
  projectPath: string;
  registeredAt: string;
}

export interface PendingRequest {
  request: WaitMeRequest;
  resolve: (response: WaitMeResponse) => void;
  reject: (error: Error) => void;
}
