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

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1 pb-[60px] sm:pb-0">
        <Hero />
        <TierDisplay />
        <BuyForm />
        <DashboardTabs />
        <Leaderboard />
        <MarketCapScenarios />
        <StakingInfo />
        <TiersTable />
      </main>
      <Footer />
    </>
  );
}
