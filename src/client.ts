/**
 * iHRFlow HTTP client with JWT auto-login and token refresh.
 *
 * Mirrors the Python api_client.py logic:
 * - Automatic login on first request
 * - Token refresh when close to expiry (120s buffer)
 * - Falls back to full login if refresh fails
 */

export interface IHRFlowConfig {
  apiUrl: string;
  username: string;
  password: string;
  tenantId?: string;
}

export class IHRFlowClient {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private readonly tenantId: string;

  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(config: IHRFlowConfig) {
    this.baseUrl = config.apiUrl.replace(/\/+$/, "");
    this.username = config.username;
    this.password = config.password;
    this.tenantId = config.tenantId ?? "";
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.accessToken) {
      h["Authorization"] = `Bearer ${this.accessToken}`;
    }
    if (this.tenantId) {
      h["X-Tenant-ID"] = this.tenantId;
    }
    return h;
  }

  private get loginPath(): string {
    return this.tenantId
      ? `/auth/${this.tenantId}/login/admin`
      : "/auth/login/admin";
  }

  private async doLogin(): Promise<void> {
    const resp = await fetch(`${this.baseUrl}${this.loginPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login_type: "username",
        identifier: this.username,
        credential: this.password,
      }),
    });
    if (!resp.ok) {
      throw new Error(`Login failed: ${resp.status} ${await resp.text()}`);
    }
    const data = await resp.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.tokenExpiresAt = Date.now() / 1000 + (data.expires_in ?? 7200);
  }

  private async doRefresh(): Promise<void> {
    try {
      const resp = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
      if (!resp.ok) throw new Error(`Refresh failed: ${resp.status}`);
      const data = await resp.json();
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tokenExpiresAt = Date.now() / 1000 + (data.expires_in ?? 7200);
    } catch {
      await this.doLogin();
    }
  }

  private async ensureAuth(): Promise<void> {
    const now = Date.now() / 1000;
    if (now < this.tokenExpiresAt - 120) return;
    if (this.refreshToken) {
      await this.doRefresh();
    } else {
      await this.doLogin();
    }
  }

  async get(path: string, params?: Record<string, string | number | boolean>): Promise<any> {
    await this.ensureAuth();
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) qs.set(k, String(v));
      }
      const qsStr = qs.toString();
      if (qsStr) url += `?${qsStr}`;
    }
    const resp = await fetch(url, { headers: this.headers() });
    if (!resp.ok) {
      throw new Error(`GET ${path} failed: ${resp.status} ${await resp.text()}`);
    }
    return resp.json();
  }

  async post(path: string, body?: Record<string, any>): Promise<any> {
    await this.ensureAuth();
    const resp = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!resp.ok) {
      throw new Error(`POST ${path} failed: ${resp.status} ${await resp.text()}`);
    }
    return resp.json();
  }

  async put(path: string, body?: Record<string, any>): Promise<any> {
    await this.ensureAuth();
    const resp = await fetch(`${this.baseUrl}${path}`, {
      method: "PUT",
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!resp.ok) {
      throw new Error(`PUT ${path} failed: ${resp.status} ${await resp.text()}`);
    }
    return resp.json();
  }

  async patch(path: string, params?: Record<string, string | number | boolean>, body?: Record<string, any>): Promise<any> {
    await this.ensureAuth();
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) qs.set(k, String(v));
      }
      const qsStr = qs.toString();
      if (qsStr) url += `?${qsStr}`;
    }
    const resp = await fetch(url, {
      method: "PATCH",
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!resp.ok) {
      throw new Error(`PATCH ${path} failed: ${resp.status} ${await resp.text()}`);
    }
    return resp.json();
  }
}

export function createClient(
  apiUrl: string,
  username: string,
  password: string,
  tenantId?: string,
): IHRFlowClient {
  return new IHRFlowClient({ apiUrl, username, password, tenantId });
}
