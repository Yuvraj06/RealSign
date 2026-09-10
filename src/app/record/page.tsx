import type { Metadata } from "next";
import { Recorder } from "@/features/recorder/components";

export const metadata: Metadata = {
  title: "letter recorder — realsign",
  description:
    "Records normalized hand landmarks for training the realsign letter classifier.",
  // A build tool, not a page for readers.
  robots: { index: false, follow: false },
};

export default function RecordPage() {
  return (
    <main className="flex-1 bg-white">
      <Recorder />
    </main>
  );
}
