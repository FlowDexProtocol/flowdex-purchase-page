import Header from '@/components/Header';
import Hero from '@/components/Hero';
import TierDisplay from '@/components/TierDisplay';
import BuyForm from '@/components/BuyForm';
import DashboardTabs from '@/components/DashboardTabs';
import Leaderboard from '@/components/Leaderboard';
import MarketCapScenarios from '@/components/MarketCapScenarios';
import StakingInfo from '@/components/StakingInfo';
import TiersTable from '@/components/TiersTable';
import Footer from '@/components/Footer';
import { fetchPageContent } from '@/lib/cms';

export default async function Home() {
  const [buyContent, globalContent] = await Promise.all([fetchPageContent('buy'), fetchPageContent('global')]);

  return (
    <>
      <Header cmsGlobal={globalContent} />
      <main className="flex-1 pb-[60px] sm:pb-0">
        <Hero cmsBuy={buyContent} />
        <TierDisplay />
        <BuyForm cmsBuy={buyContent} cmsGlobal={globalContent} />
        <DashboardTabs />
        <Leaderboard />
        <MarketCapScenarios />
        <StakingInfo />
        <TiersTable />
      </main>
      <Footer cmsGlobal={globalContent} />
    </>
  );
}
