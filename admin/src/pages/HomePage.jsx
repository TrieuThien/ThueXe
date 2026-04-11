import Navbar from "../components/layout/home/Navbar";
import Footer from "../components/layout/home/Footer";
import HeroSection from "../components/home/HeroSection";
import StatsSection from "../components/home/StatsSection";
import FeaturesSection from "../components/home/FeaturesSection";
import WorkflowSection from "../components/home/WorkflowSection";
import PricingSection from "../components/home/PricingSection";
import FAQSection from "../components/home/FAQSection";

export default function HomePage() {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
                <HeroSection />
                <StatsSection />
                <FeaturesSection />
                <WorkflowSection />
                {/* <PricingSection /> */}
                <FAQSection />
            </main>
            <Footer />
        </div>
    );
}
