import DashboardShell from '@/components/DashboardShell';
import { fetchPageContent } from '@/lib/cms';

export default async function Home() {
  const [buyContent, globalContent] = await Promise.all([fetchPageContent('buy'), fetchPageContent('global')]);

  return <DashboardShell cmsBuy={buyContent} cmsGlobal={globalContent} />;
}
