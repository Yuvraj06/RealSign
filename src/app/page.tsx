import { HandScene } from "@/features/hand-viewer/components";
import { Interpreter } from "@/features/interpreter/components";
import {
  Hero,
  Limits,
  ScrollCue,
  SiteFooter,
  SiteNav,
  Vocabulary,
} from "@/features/landing/components";
import { ScrollStage } from "@/features/scroll-experience/components";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <ScrollStage
          hero={
            <>
              <Hero />
              <ScrollCue />
            </>
          }
          backdrop={<HandScene />}
          interpreter={<Interpreter />}
        />
        <Vocabulary />
        <Limits />
      </main>
      <SiteFooter />
    </>
  );
}
