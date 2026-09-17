// Type declarations for Google Identity Services (GSI)
// https://developers.google.com/identity/oauth2/web/reference/js-reference

declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenResponse {
        access_token: string;
        expires_in: string;
        scope: string;
        token_type: string;
        error?: string;
      }

      interface ClientConfigError {
        type: string;
        message?: string;
      }

      interface TokenClientConfig {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: ClientConfigError) => void;
        prompt?: string;
      }

      interface TokenClient {
        requestAccessToken(options?: { prompt?: string }): void;
      }

      function initTokenClient(config: TokenClientConfig): TokenClient;
      function revoke(token: string, callback: () => void): void;
    }
  }
}
