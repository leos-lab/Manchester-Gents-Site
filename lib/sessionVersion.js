import prisma from './prisma';

const SESSION_VERSION_KEY = 'sessionVersion';
const DEFAULT_SESSION_VERSION = '1';

export async function getSessionVersion() {
  const setting = await prisma.globalSetting.findUnique({
    where: { key: SESSION_VERSION_KEY }
  });
  return setting?.value || DEFAULT_SESSION_VERSION;
}

// One member only, e.g. after a password reset: their website and app sign-ins
// (and chat connections) elsewhere stop working.
export async function bumpUserSessionVersion(userId) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
    select: { sessionVersion: true }
  });
  return user.sessionVersion;
}

// Everyone (Admin → Security → log everyone out).
export async function bumpSessionVersion() {
  const newVersion = Date.now().toString();
  await prisma.globalSetting.upsert({
    where: { key: SESSION_VERSION_KEY },
    update: { value: newVersion },
    create: { key: SESSION_VERSION_KEY, value: newVersion }
  });
  return newVersion;
}
