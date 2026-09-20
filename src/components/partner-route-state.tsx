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

function partnerErrorDescription(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "The partner service took too long to respond. Try again in a moment.";
  }
  if (error instanceof TypeError) {
    return "The partner service could not be reached. Check your connection and try again.";
  }
  return "The partner service is temporarily unavailable. Please try again.";
}

export function PartnerRouteError({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter();
  console.error(error);
  return (
    <div className="py-10">
      <DemoFlag />
      <PageIntro
        eyebrow="Partner workspace"
        title="Partner data could not be loaded."
        description={partnerErrorDescription(error)}
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
