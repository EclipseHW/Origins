const DEFAULT_SITE_URL = "https://originsbase.com";

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;
}

export function getAbsoluteSiteUrl(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}
