import CredentialsProvider from 'next-auth/providers/credentials';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import prisma from './prisma';
import { verifyPassword } from './password';
import { getDisplayName } from './displayName';
import { getSessionVersion } from './sessionVersion';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Email or Instagram username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error('Missing credentials.');
        }
        const identifier = credentials.identifier.trim().toLowerCase();
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier },
              { instagramHandle: identifier.replace(/^@/, '') }
            ]
          }
        });
        if (!user) {
          throw new Error('Account not found.');
        }
        const isValid = await verifyPassword(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error('Incorrect password.');
        }
        const displayName = getDisplayName(user);
        return {
          id: user.id,
          email: user.email,
          name: displayName,
          role: user.role,
          instagramHandle: user.instagramHandle,
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          preferredName: user.preferredName || null,
          shareFirstName: user.shareFirstName,
          profilePhotoUrl: user.profilePhotoUrl || null
        };
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      const sessionVersion = await getSessionVersion();
      if (user) {
        token.role = user.role;
        token.instagramHandle = user.instagramHandle;
        token.id = user.id;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.preferredName = user.preferredName;
        token.shareFirstName = user.shareFirstName;
        token.profilePhotoUrl = user.profilePhotoUrl;
        token.displayName = user.name;
        token.sessionVersion = sessionVersion;
      } else {
        token.sessionVersion = token.sessionVersion || sessionVersion;
      }
      return token;
    },
    async session({ session, token }) {
      const sessionVersion = await getSessionVersion();
      if (token.sessionVersion !== sessionVersion) {
        return null;
      }
      if (token) {
        session.user.role = token.role;
        session.user.instagramHandle = token.instagramHandle;
        session.user.id = token.id || token.sub;
        session.user.firstName = token.firstName || null;
        session.user.lastName = token.lastName || null;
        session.user.preferredName = token.preferredName || null;
        session.user.shareFirstName = token.shareFirstName ?? true;
        session.user.profilePhotoUrl = token.profilePhotoUrl || null;
        session.user.name = token.displayName || session.user.name;
        session.sessionVersion = sessionVersion;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login'
  },
  secret: process.env.NEXTAUTH_SECRET
};

export async function requireAuth(role) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (role && session.user.role !== role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return session;
}
