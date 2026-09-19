import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChoiceGroup,
  DemoFlag,
  FormField,
  PhotoUploader,
  ProgressRail,
  RepairCategoryGrid,
} from "@/components/homefix";
import { submitIntakeServer } from "@/lib/intake.server";

export const Route = createFileRoute("/intake")({
  head: () => ({
    meta: [
      { title: "Repair Assessment — HomeFix 313" },
      { name: "description", content: "Complete a guided property and repair assessment." },
      { property: "og:title", content: "Repair Assessment — HomeFix 313" },
      {
        property: "og:description",
        content: "Tell HomeFix about your property, household, and repair needs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntakePage,
});

const categoryMap: Record<string, string> = {
  "Roof / Water": "roof_water_intrusion",
  Heating: "hvac",
  Plumbing: "plumbing",
  Electrical: "electrical",
  Accessibility: "accessibility",
  Structural: "structural",
  Environmental: "lead_environmental",
  Other: "other",
};

function IntakePage() {
  const navigate = useNavigate({ from: "/intake" });
  const [step, setStep] = useState(1);
  const [owner, setOwner] = useState("Owner");
  const [primary, setPrimary] = useState("Yes");
  const [senior, setSenior] = useState("Yes");
  const [children, setChildren] = useState("No");
  const [access, setAccess] = useState("No");
  const [category, setCategory] = useState("Roof / Water");
  const [safe, setSafe] = useState("Yes");
  const [worse, setWorse] = useState("Yes");
  const [photos, setPhotos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [firstName, setFirstName] = useState("Denise");
  const [lastName, setLastName] = useState("Carter");
  const [email, setEmail] = useState("denise@example.com");
  const [phone, setPhone] = useState("3135550100");
  const [streetAddress, setStreetAddress] = useState("123 Main Street");
  const [zipCode, setZipCode] = useState("48224");
  const [yearsAtProperty, setYearsAtProperty] = useState("12");

  const [householdSize, setHouseholdSize] = useState("3");
  const [incomeRange, setIncomeRange] = useState("$41,000-$60,000");
  const [applicantAge, setApplicantAge] = useState("68");

  const [description, setDescription] = useState(
    "Water stains have spread across the upstairs bedroom ceiling after heavy rain. The paint is bubbling and the ceiling feels damp.",
  );
  const [startedWhen, setStartedWhen] = useState("A few months ago");

  const titles = [
    "Tell us about the property",
    "Tell us about your household",
    "What needs attention?",
    "Show us what you see",
    "Review your repair report",
  ];

  const next = async () => {
    if (step < 5) {
      setStep(step + 1);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await submitIntakeServer({
        resident: {
          firstName,
          lastName,
          email,
          phone,
        },
        property: {
          streetAddress,
          city: "Detroit",
          state: "MI",
          zipCode,
          occupancyType: owner === "Owner" ? "owner" : "renter",
          primaryResidence: primary === "Yes",
          yearsAtProperty: Number(yearsAtProperty),
        },
        household: {
          householdSize: Number(householdSize),
          incomeRange,
          applicantAge: Number(applicantAge),
          seniorHousehold: senior === "Yes",
          childrenInHousehold: children === "Yes",
          accessibilityNeeds: access === "Yes",
        },
        repair: {
          category: categoryMap[category] ?? "other",
          description,
          startedWhen,
          gettingWorse: worse === "Yes",
          safeToOccupy: safe !== "No",
          urgency: safe === "No" ? "high" : worse === "Yes" ? "high" : "moderate",
        },
      });

      if (!response.success) {
        throw new Error("Submission failed");
      }

      navigate({
        to: "/assessment",
        search: { caseId: response.caseId, repairNeedId: response.repairNeedId, process: "1" },
      });
    } catch (error) {
      console.error(error);
      window.alert("We couldn’t save this intake yet. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-28 sm:px-6 lg:px-10 lg:py-12">
      <div className="grid gap-8 lg:grid-cols-[190px_minmax(0,1fr)]">
        <aside>
          <DemoFlag />
          <div className="mt-6 sticky top-28">
            <ProgressRail current={step} />
          </div>
        </aside>
        <section>
          <p className="eyebrow">Guided property assessment · Step {step} of 5</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight sm:text-6xl">{titles[step - 1]}</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Your answers help organize your Repair Passport and identify possible next steps.
            Financial questions are broad and preliminary.
          </p>
          <div className="mt-10 border-y border-foreground py-8">
            {step === 1 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField label="First name">
                  <input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                </FormField>
                <FormField label="Last name">
                  <input value={lastName} onChange={(event) => setLastName(event.target.value)} />
                </FormField>
                <FormField label="Email (optional)">
                  <input value={email} onChange={(event) => setEmail(event.target.value)} />
                </FormField>
                <FormField label="Phone (optional)">
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} />
                </FormField>
                <FormField label="Detroit street address">
                  <input
                    value={streetAddress}
                    onChange={(event) => setStreetAddress(event.target.value)}
                  />
                </FormField>
                <FormField label="ZIP code">
                  <input
                    value={zipCode}
                    onChange={(event) => setZipCode(event.target.value)}
                    inputMode="numeric"
                  />
                </FormField>
                <ChoiceGroup
                  label="Do you own or rent?"
                  options={["Owner", "Renter"]}
                  value={owner}
                  onChange={setOwner}
                />
                <ChoiceGroup
                  label="Is this your primary residence?"
                  options={["Yes", "No"]}
                  value={primary}
                  onChange={setPrimary}
                />
                <FormField label="How many years have you lived here?">
                  <input
                    type="number"
                    value={yearsAtProperty}
                    onChange={(event) => setYearsAtProperty(event.target.value)}
                    min="0"
                  />
                </FormField>
              </div>
            )}
            {step === 2 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField label="Household size">
                  <input
                    type="number"
                    value={householdSize}
                    onChange={(event) => setHouseholdSize(event.target.value)}
                    min="1"
                  />
                </FormField>
                <FormField
                  label="Household income range"
                  hint="Choose the range that feels closest. An exact amount is not needed yet."
                >
                  <select
                    value={incomeRange}
                    onChange={(event) => setIncomeRange(event.target.value)}
                  >
                    <option value="Below $20,000">Below $20,000</option>
                    <option value="$21,000-$40,000">$21,000–$40,000</option>
                    <option value="$41,000-$60,000">$41,000–$60,000</option>
                    <option value="$61,000-$80,000">$61,000–$80,000</option>
                    <option value="Above $80,000">Above $80,000</option>
                  </select>
                </FormField>
                <FormField label="Primary applicant age">
                  <input
                    type="number"
                    value={applicantAge}
                    onChange={(event) => setApplicantAge(event.target.value)}
                    min="18"
                  />
                </FormField>
                <ChoiceGroup
                  label="Senior household?"
                  options={["Yes", "No"]}
                  value={senior}
                  onChange={setSenior}
                />
                <ChoiceGroup
                  label="Children in household?"
                  options={["Yes", "No"]}
                  value={children}
                  onChange={setChildren}
                />
                <ChoiceGroup
                  label="Disability-related repair needs?"
                  options={["Yes", "No"]}
                  value={access}
                  onChange={setAccess}
                />
              </div>
            )}
            {step === 3 && (
              <div className="space-y-7">
                <RepairCategoryGrid selected={category} onChange={setCategory} />
                <FormField label="Describe the problem">
                  <textarea
                    rows={5}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </FormField>
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField label="When did it start?">
                    <select
                      value={startedWhen}
                      onChange={(event) => setStartedWhen(event.target.value)}
                    >
                      <option>Within the last week</option>
                      <option>A few months ago</option>
                      <option>More than a year ago</option>
                    </select>
                  </FormField>
                  <ChoiceGroup
                    label="Is the home safe to occupy?"
                    options={["Yes", "Not sure", "No"]}
                    value={safe}
                    onChange={setSafe}
                  />
                  <ChoiceGroup
                    label="Has it gotten worse recently?"
                    options={["Yes", "No"]}
                    value={worse}
                    onChange={setWorse}
                  />
                </div>
              </div>
            )}
            {step === 4 && <PhotoUploader hasPhotos={photos} onUpload={() => setPhotos(!photos)} />}
            {step === 5 && (
              <div className="space-y-6">
                <div className="grid gap-px bg-border sm:grid-cols-2">
                  <Review label="Resident" value={`${firstName} ${lastName}`} />
                  <Review label="Property" value={`${streetAddress} · Detroit ${zipCode}`} />
                  <Review
                    label="Household"
                    value={`${householdSize} residents · ${senior === "Yes" ? "Senior household" : "No senior"}`}
                  />
                  <Review
                    label="Repair"
                    value={`${category} · ${worse === "Yes" ? "Getting worse" : "Stable"}`}
                  />
                  <Review
                    label="Photos"
                    value={photos ? "Mock photos attached" : "No photos attached"}
                  />
                  <Review label="Income range" value={incomeRange} />
                </div>
                <div className="flex gap-3 border-l-4 border-positive bg-positive/20 p-4">
                  <Check className="size-5 shrink-0" />
                  <p className="text-sm">
                    <strong>Ready for preliminary review.</strong>
                    <br />
                    <span className="text-muted-foreground">
                      This submission saves real intake values and starts analysis for this case.
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-between gap-3">
            <Button
              variant="outline"
              className="min-h-12 rounded-none"
              disabled={step === 1}
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft />
              Back
            </Button>
            <Button
              className="min-h-12 rounded-none bg-primary px-6 text-primary-foreground"
              onClick={next}
              disabled={isSubmitting}
            >
              {step === 4
                ? "Continue"
                : step === 5
                  ? isSubmitting
                    ? "Saving..."
                    : "View Assessment"
                  : "Continue"}
              <ArrowRight />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-5">
      <span className="eyebrow">{label}</span>
      <strong className="mt-2 block">{value}</strong>
    </div>
  );
}
