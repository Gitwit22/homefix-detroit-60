import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { DemoFlag, PageIntro } from "@/components/homefix";

export function PartnerRouteLoading() {
  return (
    <div className="py-10">
      <DemoFlag />
      <PageIntro
        eyebrow="Partner workspace"
        title="Loading repair intelligence..."
        description="Please wait while partner data is prepared."
      />
    </div>
  );
}

export function PartnerRouteError({ reset }: { reset: () => void }) {
  const router = useRouter();
  return (
    <div className="py-10">
      <DemoFlag />
      <PageIntro
        eyebrow="Partner workspace"
        title="Partner data could not be loaded."
        description="Please try loading this page again."
      />
      <Button
        className="mt-4 min-h-12 rounded-none bg-primary"
        onClick={() => {
          router.invalidate();
          reset();
        }}
      >
        Try Again
      </Button>
    </div>
  );
}
