import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { HeroSection } from "@/components/home/hero-section";
import { FlowDiagram } from "@/components/home/flow-diagram";
import { FeaturesBento } from "@/components/home/features-bento";
import { DownloadSection } from "@/components/home/download-section";
import { CtaSection } from "@/components/home/cta-section";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <FlowDiagram />
        <FeaturesBento />
        <DownloadSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
