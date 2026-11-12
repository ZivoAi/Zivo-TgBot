
export interface ServiceToken {
  accessToken: string;
  expiresAt: number;
  tokenType: string;
}

export interface ZivoPalErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ZivoPalAuthClient {
  // Preserve the old public interface, not its unregistered JWT/HTTP contract.
  // No token cache or retry loop may reactivate this disabled adapter.
  public async getAccessToken(): Promise<string> {
    throw new AuthenticationError('Legacy service JWT minting is disabled. Use a registered Core service adapter.');
  }

  public async request<T>(
    _method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    _endpoint: string,
    _data?: unknown,
    _retryCount = 0
  ): Promise<T> {
    throw new AuthenticationError('Legacy service JWT minting is disabled. Use a registered Core service adapter.');
  }
}
