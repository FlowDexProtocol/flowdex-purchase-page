import Header from '@/components/Header';
import Footer from '@/components/Footer';
import StatusChecker from '@/components/StatusChecker';
import { fetchPageContent } from '@/lib/cms';

export default async function StatusPage() {
  const globalContent = await fetchPageContent('global');

  return (
    <>
      <Header cmsGlobal={globalContent} />
      <main className="flex-1 pb-[60px] sm:pb-0">
        <StatusChecker cmsGlobal={globalContent} />
      </main>
      <Footer cmsGlobal={globalContent} />
    </>
  );
}
