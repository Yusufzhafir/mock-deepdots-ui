import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import DashboardApp from '../../../components/DashboardApp';
import { messages } from '../../../lib/data';
import { getMessageById } from '../../../lib/metrics';

export function generateStaticParams() {
  return messages.map((message) => ({ id:message.id }));
}

export async function generateMetadata({ params }: { params:Promise<{id:string}> }):Promise<Metadata> {
  const { id }=await params;
  const message=getMessageById(messages,id);
  if (!message) return { title:'Message not found' };
  const description=`Performance and timing diagnostics for ${message.name}. Synthetic demo data.`;
  return {
    title:message.name,
    description,
    openGraph:{ title:message.name, description, images:[] },
    twitter:{ title:message.name, description, images:[] },
  };
}

export default async function MessagePage({ params }: { params:Promise<{id:string}> }) {
  const { id }=await params;
  if (!getMessageById(messages,id)) notFound();
  return <Suspense fallback={<div className="route-loading">Loading message performance…</div>}><DashboardApp section="message-detail" messageId={id}/></Suspense>;
}
