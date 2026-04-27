import { ChatClient } from './_components/chat-client';

export default function ChatPage({ params }: { params: { id: string } }) {
  return <ChatClient assessmentId={params?.id ?? ''} />;
}
