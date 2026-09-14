import prisma from './prisma';

export async function getPhotoNoticeConfig() {
  try {
    const config = await prisma.photoNoticeConfig.findUnique({
      where: { id: 1 }
    });
    if (!config) {
      return { enabled: true, updatedAt: null, source: 'default' };
    }
    return {
      enabled: config.enabled,
      updatedAt: config.updatedAt,
      source: 'db'
    };
  } catch (error) {
    console.error('Error loading photo-notice config:', error);
    return { enabled: true, updatedAt: null, source: 'default-fallback' };
  }
}

export async function upsertPhotoNoticeConfig({ enabled }) {
  return prisma.photoNoticeConfig.upsert({
    where: { id: 1 },
    create: { id: 1, enabled },
    update: { enabled }
  });
}
