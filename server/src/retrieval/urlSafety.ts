import dns from "node:dns/promises";
import net from "node:net";
import { env } from "../config/env.js";

export class UnsafeUrlError extends Error {}

const PRIVATE_V4_RANGES: [string, number][] = [
  ["10.0.0.0", 8],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["0.0.0.0", 8],
];

function ipToLong(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateV4(ip: string): boolean {
  const target = ipToLong(ip);
  return PRIVATE_V4_RANGES.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (ipToLong(base) & mask) === (target & mask);
  });
}

function isPrivateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

/**
 * Guards against SSRF: rejects non-http(s) schemes always, and resolves the
 * hostname to reject private/loopback/link-local addresses when running in
 * production. Localhost is allowed outside production because the batch
 * command (Section 9) is explicitly tested against a locally-served company
 * site, and the retrieval code must not special-case a particular host.
 */
export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError(`Invalid URL: ${rawUrl}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError(`Unsupported protocol: ${url.protocol}`);
  }

  if (!env.isProduction) {
    return url;
  }

  const hostname = url.hostname;
  if (hostname === "localhost") {
    throw new UnsafeUrlError("Loopback host is not allowed in production");
  }

  const addresses = net.isIP(hostname)
    ? [hostname]
    : (await dns.lookup(hostname, { all: true })).map((a) => a.address);

  for (const address of addresses) {
    const family = net.isIP(address);
    if (family === 4 && isPrivateV4(address)) {
      throw new UnsafeUrlError(`Refusing to fetch private address ${address}`);
    }
    if (family === 6 && isPrivateV6(address)) {
      throw new UnsafeUrlError(`Refusing to fetch private address ${address}`);
    }
  }

  return url;
}
