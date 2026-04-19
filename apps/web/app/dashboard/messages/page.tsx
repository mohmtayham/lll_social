import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { MessagesClient } from './MessagesClient';

export default async function MessagesPage() {
  // Server-side session check protects this route before client code runs.
  const session = await getSession();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Keep backend URL configurable for dev/prod environments.
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000';

  // Pass auth context to client component so websocket + API calls can be authorized.
  return (
    <MessagesClient
      accessToken={session.accessToken}
      currentUserId={session.user.id}
      backendUrl={backendUrl}
    />
  );
}
