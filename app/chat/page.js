import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import NavBar from '@/components/NavBar';
import ChatApp from '@/components/chat/ChatApp';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Chats | Manchester Gents' };

// Event chats and DMs in the browser (same chat server as the app).
// ?event=<eventId> opens an event's chat, ?dm=<userId> a DM, ?room=<roomId> any room.
export default async function ChatPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const query = new URLSearchParams(searchParams || {}).toString();
    redirect(`/login?redirect=${encodeURIComponent(`/chat${query ? `?${query}` : ''}`)}`);
  }
  const open = searchParams?.room
    ? { roomId: searchParams.room }
    : searchParams?.dm
      ? { userId: searchParams.dm }
      : searchParams?.event
        ? { eventId: searchParams.event }
        : null;
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavBar />
      <ChatApp me={{ id: session.user.id, name: session.user.name, isAdmin: session.user.role === 'ADMIN' }} initialOpen={open} />
    </div>
  );
}
