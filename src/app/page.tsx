import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AnnouncementBanner } from "@/components/sections/announcement-banner";
import { Hero } from "@/components/sections/hero";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Benefits } from "@/components/sections/benefits";
import { PackagesPreview } from "@/components/sections/packages-preview";
import { ReferralLevels } from "@/components/sections/referral-levels";
import { Security } from "@/components/sections/security";
import { Faq } from "@/components/sections/faq";
import { FinalCta } from "@/components/sections/final-cta";

export default function Home() {
  return (
    <>
      <Navbar />
      <AnnouncementBanner />
      <main>
        <Hero />
        <HowItWorks />
        <Benefits />
        <PackagesPreview />
        <ReferralLevels />
        <Security />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
