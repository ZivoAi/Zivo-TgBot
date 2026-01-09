import axios, { AxiosInstance, AxiosError } from 'axios';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { logger } from './logger';

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
  private token: ServiceToken | null = null;
  private httpClient: AxiosInstance;

  constructor() {
    this.httpClient = axios.create({
      baseURL: config.zivopal.apiUrl,
      timeout: 10000,
    });
  }

  /**
   * Generate a service client JWT for zivopal-core
   * In production, use proper OAuth2 client-credentials flow
   */
  private generateServiceJWT(): string {
    const payload = {
      sub: config.zivopal.clientId,
      iss: config.zivopal.serviceName,
      aud: 'zivopal-core',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    };

    const token = jwt.sign(payload, config.zivopal.clientSecret, {
      algorithm: 'HS256',
    });

    return token;
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  public async getAccessToken(): Promise<string> {
    const now = Date.now();

    if (this.token && this.token.expiresAt > now + 60000) {
      // Token valid for > 1 min
      return this.token.accessToken;
    }

    const newToken = this.generateServiceJWT();
    this.token = {
      accessToken: newToken,
      expiresAt: now + 3600000,
      tokenType: 'Bearer',
    };

    logger.debug('Generated new service JWT for zivopal-core');
    return newToken;
  }

  /**
   * Make authenticated request to zivopal-core
   */
  public async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: unknown,
    retryCount = 0
  ): Promise<T> {
    const maxRetries = 3;
    const token = await this.getAccessToken();

    try {
      const response = await this.httpClient.request<T>({
        method,
        url: endpoint,
        data,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': `${config.zivopal.serviceName}/1.0`,
        },
      });

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ZivoPalErrorResponse>;

      if (axiosError.response?.status === 401 && retryCount < maxRetries) {
        logger.warn('Token unauthorized, refreshing and retrying');
        this.token = null;
        return this.request<T>(method, endpoint, data, retryCount + 1);
      }

      if (axiosError.response?.status === 429 && retryCount < maxRetries) {
        const backoffMs = Math.pow(2, retryCount) * 1000;
        logger.warn(`Rate limited, retrying after ${backoffMs}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return this.request<T>(method, endpoint, data, retryCount + 1);
      }

      const errorMessage =
        axiosError.response?.data?.message ||
        axiosError.message ||
        'Unknown error communicating with zivopal-core';

      logger.error(
        {
          error: axiosError.response?.data,
          status: axiosError.response?.status,
          endpoint,
        },
        `Failed to communicate with zivopal-core: ${errorMessage}`
      );

      throw new Error(`ZivoPal API error: ${errorMessage}`);
    }
  }
}
