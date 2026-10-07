import { isHostedAuthMode } from "@/lib/auth-mode";

let workersEnvPromise: Promise<Record<string, unknown> | null> | null = null;

export async function getOptionalEnvValue(
  name: string,
): Promise<string | undefined> {
  return getEnvValueSync((await getWorkersEnv()) ?? {}, name);
}

/**
 * Sync variant for callers that already hold an env record (e.g. a Durable
 * Object's `this.env`, needed because Think's `getModel()` hook is sync).
 * Same policy as the async form: process.env first (where local `.env.local`
 * secrets land in dev), skipping empty strings, then the given env.
 */
export function getEnvValueSync(
  // `object` so interface-typed envs (e.g. Cloudflare.Env) are accepted
  // without a cast.
  env: object,
  name: string,
): string | undefined {
  const processValue =
    typeof process !== "undefined" ? process.env?.[name] : undefined;
  if (processValue) {
    return processValue;
  }
  const value: unknown = Reflect.get(env, name);
  return typeof value === "string" && value !== "" ? value : undefined;
}

export async function getRequiredEnvValue(name: string): Promise<string> {
  const value = await getOptionalEnvValue(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function isHostedServerAuthMode(): Promise<boolean> {
  return isHostedAuthMode(await getOptionalEnvValue("AUTH_MODE"));
}

/**
 * A `fetch` that egresses through the deployment's Cloudflare Mesh / VPC
 * network when one is bound, else the global fetch.
 *
 * Bing Webmaster throttles Cloudflare Workers' shared egress IPs (HTTP 400,
 * ErrorCode 17 "ThrottleIP"), so the Bing client must not use the default
 * egress. A Worker bound to the account's Mesh network egresses from a
 * different IP Bing accepts; deploy/alchemy/alchemy.run.ts names that binding
 * `EGRESS` (set BING_EGRESS_NETWORK_ID to attach it).
 */
export async function getEgressFetch(): Promise<typeof fetch> {
  const env = await getWorkersEnv();
  const binding: unknown = env ? Reflect.get(env, "EGRESS") : undefined;
  if (isFetcher(binding)) {
    const egress = binding;
    return (input, init) => egress.fetch(input, init);
  }
  return fetch;
}

function isFetcher(value: unknown): value is { fetch: typeof fetch } {
  if (typeof value !== "object" || value === null) return false;
  const candidate: unknown = (value as { fetch?: unknown }).fetch;
  return typeof candidate === "function";
}

async function getWorkersEnv(): Promise<Record<string, unknown> | null> {
  if (!workersEnvPromise) {
    workersEnvPromise = loadWorkersEnv();
  }
  return workersEnvPromise;
}

async function loadWorkersEnv(): Promise<Record<string, unknown> | null> {
  try {
    const workersModule = await import("cloudflare:workers");
    return isRecord(workersModule.env) ? workersModule.env : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
