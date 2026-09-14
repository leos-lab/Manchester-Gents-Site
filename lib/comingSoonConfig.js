import prisma from './prisma';

function parseDate(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  const date = new Date(parsed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getEnvComingSoonDefaults() {
  return {
    enabled: process.env.NEXT_PUBLIC_COMING_SOON !== 'false',
    disableAt: parseDate(process.env.NEXT_PUBLIC_COMING_SOON_DISABLE_AT) || null,
    source: 'env'
  };
}

export async function getComingSoonConfig() {
  const envDefaults = getEnvComingSoonDefaults();
  try {
    const config = await prisma.comingSoonConfig.findUnique({
      where: { id: 1 }
    });
    if (!config) {
      return envDefaults;
    }
    return {
      enabled: config.enabled ?? envDefaults.enabled,
      disableAt: config.disableAt ?? envDefaults.disableAt,
      source: 'db'
    };
  } catch (error) {
    console.error('Error loading coming-soon config:', error);
    return { ...envDefaults, source: 'env-fallback' };
  }
}

export async function upsertComingSoonConfig({ enabled, disableAt }) {
  return prisma.comingSoonConfig.upsert({
    where: { id: 1 },
    create: { id: 1, enabled, disableAt },
    update: { enabled, disableAt }
  });
}
