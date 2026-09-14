import prisma from './prisma';

const SESSION_VERSION_KEY = 'sessionVersion';
const DEFAULT_SESSION_VERSION = '1';

export async function getSessionVersion() {
  const setting = await prisma.globalSetting.findUnique({
    where: { key: SESSION_VERSION_KEY }
  });
  return setting?.value || DEFAULT_SESSION_VERSION;
}

export async function bumpSessionVersion() {
  const newVersion = Date.now().toString();
  await prisma.globalSetting.upsert({
    where: { key: SESSION_VERSION_KEY },
    update: { value: newVersion },
    create: { key: SESSION_VERSION_KEY, value: newVersion }
  });
  return newVersion;
}
