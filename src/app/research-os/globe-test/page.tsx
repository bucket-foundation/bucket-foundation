import FixedCanonGlobeBackground from "@/components/FixedCanonGlobeBackground";

// Diagnostic route: the decorative globe alone under a tall, plain page.
// No grain, no images, no reveal rows. Query flags on the globe apply.
export default function GlobeTestPage() {
  return (
    <>
      <FixedCanonGlobeBackground />
      <main className="relative z-10" style={{ height: 4200, padding: 40 }}>
        <p>globe test</p>
      </main>
    </>
  );
}
