import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ChoiceGroup,
  DemoFlag,
  FormField,
  PhotoUploader,
  ProgressRail,
  RepairCategoryGrid,
} from "@/components/homefix";
import { submitIntakeServer } from "@/lib/intake.server";
import { HomeFixApiError, uploadRepairPhotos } from "@/lib/homefix-api";
import { lastCaseStorageKey } from "@/lib/resident-case";

export const Route = createFileRoute("/intake")({
  validateSearch: (search: Record<string, unknown>) => ({
    demo: search["demo"] === "denise-carter-pitch-v1" ? "denise-carter-pitch-v1" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Report a Repair — HomeFix 313" },
      { name: "description", content: "Complete a guided property and repair report." },
      { property: "og:title", content: "Report a Repair — HomeFix 313" },
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
  Carpentry: "carpentry",
  "Drywall / Plaster": "drywall_plaster",
  "Concrete / Masonry": "concrete_masonry",
  Flooring: "flooring",
  "Painting / Finishing": "painting_finishing",
  Other: "other",
};

type RepairDraft = {
  clientId: string;
  category: string;
  description: string;
  startedWhen: string;
  safe: string;
  worse: string;
  files: File[];
};

const demoDraftKey = "homefix:denise-carter-pitch-v1:draft";
const intakeGuideEvent = "homefix-guide:intake-step";

function intakeErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Saving took too long. Check your connection and try again.";
  }
  if (error instanceof HomeFixApiError) {
    if (error.status === 400)
      return "Some intake details were not accepted. Review them and try again.";
    if (error.status >= 500)
      return "The intake service is temporarily unavailable. Please try again.";
  }
  if (error instanceof TypeError) {
    return "We could not reach the intake service. Check your connection and try again.";
  }
  return "We could not save this intake yet. Please try again.";
}

function createRepairDraft(index: number, useDemoDefaults = true): RepairDraft {
  if (!useDemoDefaults) {
    return {
      clientId: crypto.randomUUID(),
      category: "",
      description: "",
      startedWhen: "",
      safe: "Not sure",
      worse: "No",
      files: [],
    };
  }
  return {
    clientId: crypto.randomUUID(),
    category: index === 1 ? "Heating" : index === 2 ? "Electrical" : "Roof / Water",
    description:
      index === 1
        ? "The furnace is unreliable and sometimes stops producing heat."
        : index === 2
          ? "Several outlets spark or stop working and need professional evaluation."
          : "Water stains have spread across the upstairs bedroom ceiling after heavy rain. The paint is bubbling and the ceiling feels damp.",
    startedWhen: "A few months ago",
    safe: "Yes",
    worse: index === 2 ? "No" : "Yes",
    files: [],
  };
}

function IntakePage() {
  const { demo } = Route.useSearch();
  const navigate = useNavigate({ from: "/intake" });
  const [step, setStep] = useState(1);
  const [owner, setOwner] = useState("Owner");
  const [primary, setPrimary] = useState("Yes");
  const [senior, setSenior] = useState(demo ? "Yes" : "No");
  const [children, setChildren] = useState("No");
  const [access, setAccess] = useState("No");
  const [fillingOutForSomeoneElse, setFillingOutForSomeoneElse] = useState(Boolean(demo));
  const [assistantName, setAssistantName] = useState(demo ? "Angela Carter" : "");
  const [assistantPhone, setAssistantPhone] = useState(demo ? "3135550123" : "");
  const [assistantRelationship, setAssistantRelationship] = useState(demo ? "Daughter" : "");
  const [assistantPrimary, setAssistantPrimary] = useState(Boolean(demo));
  const [permissionAcknowledged, setPermissionAcknowledged] = useState(Boolean(demo));
  const [repairs, setRepairs] = useState<RepairDraft[]>(() =>
    demo
      ? [createRepairDraft(0), createRepairDraft(1), createRepairDraft(2)]
      : [createRepairDraft(0, false)],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [createdCase, setCreatedCase] = useState<{
    caseId: string;
    repairNeedId: string;
    repairs: Array<{ clientId: string; repairNeedId: string }>;
  } | null>(null);
  const uploadedRepairIds = useRef(new Set<string>());

  const [firstName, setFirstName] = useState(demo ? "Denise" : "");
  const [lastName, setLastName] = useState(demo ? "Carter" : "");
  const [email, setEmail] = useState(demo ? "denise@example.com" : "");
  const [phone, setPhone] = useState(demo ? "3135550100" : "");
  const [streetAddress, setStreetAddress] = useState(demo ? "123 Main Street" : "");
  const [zipCode, setZipCode] = useState(demo ? "48205" : "");
  const [yearsAtProperty, setYearsAtProperty] = useState(demo ? "12" : "");

  const [householdSize, setHouseholdSize] = useState(demo ? "3" : "");
  const [incomeRange, setIncomeRange] = useState(demo ? "$41,000-$60,000" : "");
  const [applicantAge, setApplicantAge] = useState(demo ? "68" : "");

  useEffect(() => {
    if (!demo) return;
    const saved = localStorage.getItem(demoDraftKey);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved) as {
        step?: number;
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        streetAddress?: string;
        zipCode?: string;
        yearsAtProperty?: string;
        householdSize?: string;
        incomeRange?: string;
        applicantAge?: string;
        fillingOutForSomeoneElse?: boolean;
        assistantName?: string;
        assistantPhone?: string;
        assistantRelationship?: string;
        assistantPrimary?: boolean;
        permissionAcknowledged?: boolean;
        repairs?: Array<Omit<RepairDraft, "files">>;
      };
      if (draft.step && draft.step >= 1 && draft.step <= 5) setStep(draft.step);
      if (draft.firstName) setFirstName(draft.firstName);
      if (draft.lastName) setLastName(draft.lastName);
      if (draft.email !== undefined) setEmail(draft.email);
      if (draft.phone !== undefined) setPhone(draft.phone);
      if (draft.streetAddress) setStreetAddress(draft.streetAddress);
      if (draft.zipCode) setZipCode(draft.zipCode);
      if (draft.yearsAtProperty) setYearsAtProperty(draft.yearsAtProperty);
      if (draft.householdSize) setHouseholdSize(draft.householdSize);
      if (draft.incomeRange) setIncomeRange(draft.incomeRange);
      if (draft.applicantAge) setApplicantAge(draft.applicantAge);
      if (draft.fillingOutForSomeoneElse !== undefined)
        setFillingOutForSomeoneElse(draft.fillingOutForSomeoneElse);
      if (draft.assistantName !== undefined) setAssistantName(draft.assistantName);
      if (draft.assistantPhone !== undefined) setAssistantPhone(draft.assistantPhone);
      if (draft.assistantRelationship !== undefined)
        setAssistantRelationship(draft.assistantRelationship);
      if (draft.assistantPrimary !== undefined) setAssistantPrimary(draft.assistantPrimary);
      if (draft.permissionAcknowledged !== undefined)
        setPermissionAcknowledged(draft.permissionAcknowledged);
      if (draft.repairs?.length) {
        setRepairs(draft.repairs.map((repair) => ({ ...repair, files: [] })));
      }
    } catch {
      localStorage.removeItem(demoDraftKey);
    }
  }, [demo]);

  useEffect(() => {
    if (!demo) return;
    localStorage.setItem(
      demoDraftKey,
      JSON.stringify({
        step,
        firstName,
        lastName,
        email,
        phone,
        streetAddress,
        zipCode,
        yearsAtProperty,
        householdSize,
        incomeRange,
        applicantAge,
        fillingOutForSomeoneElse,
        assistantName,
        assistantPhone,
        assistantRelationship,
        assistantPrimary,
        permissionAcknowledged,
        repairs: repairs.map(({ files: _files, ...repair }) => repair),
      }),
    );
  }, [
    demo,
    step,
    firstName,
    lastName,
    email,
    phone,
    streetAddress,
    zipCode,
    yearsAtProperty,
    householdSize,
    incomeRange,
    applicantAge,
    fillingOutForSomeoneElse,
    assistantName,
    assistantPhone,
    assistantRelationship,
    assistantPrimary,
    permissionAcknowledged,
    repairs,
  ]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(intakeGuideEvent, { detail: { step } }));
  }, [step]);

  const titles = [
    "Tell us about the property",
    "Tell us about your household",
    "What needs attention?",
    "Show us what you see",
    "Review your repair report",
  ];

  const updateRepair = (clientId: string, changes: Partial<RepairDraft>) => {
    setRepairs((current) =>
      current.map((repair) => (repair.clientId === clientId ? { ...repair, ...changes } : repair)),
    );
  };

  const validateStep = () => {
    if (step === 1) {
      if (fillingOutForSomeoneElse && (!assistantName.trim() || !assistantPhone.trim())) {
        return "Enter the name and phone number of the person assisting with this application.";
      }
      if (fillingOutForSomeoneElse && assistantPhone.trim().length < 7) {
        return "Enter a valid phone number for the person assisting with this application.";
      }
      if (fillingOutForSomeoneElse && assistantPrimary && !permissionAcknowledged) {
        return "Confirm that the resident has given permission to make this person the primary contact.";
      }
      if (!firstName.trim() || !lastName.trim() || !streetAddress.trim()) {
        return "Enter the resident name and Detroit street address.";
      }
      if (!/^482\d{2}$/.test(zipCode)) return "Enter a valid five-digit Detroit ZIP code.";
      if (email && !/^\S+@\S+\.\S+$/.test(email))
        return "Enter a valid email address or leave it blank.";
      if (
        !yearsAtProperty ||
        !Number.isInteger(Number(yearsAtProperty)) ||
        Number(yearsAtProperty) < 0
      ) {
        return "Enter the number of years at the property.";
      }
    }
    if (step === 2) {
      if (!Number.isInteger(Number(householdSize)) || Number(householdSize) < 1) {
        return "Household size must be at least 1.";
      }
      if (!incomeRange) return "Choose a household income range.";
      if (!Number.isInteger(Number(applicantAge)) || Number(applicantAge) < 18) {
        return "Primary applicant age must be at least 18.";
      }
    }
    if (step === 3 && repairs.some((repair) => !repair.category || !repair.description.trim())) {
      return "Choose a category and describe each repair before continuing.";
    }
    if (
      step === 4 &&
      repairs.some((repair) =>
        repair.files.some(
          (file) =>
            !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
            file.size > 10 * 1024 * 1024,
        ),
      )
    ) {
      return "Each photo must be a JPG, PNG, or WebP file no larger than 10 MB.";
    }
    return "";
  };

  const next = async () => {
    const validationError = validateStep();
    if (validationError) {
      setFormError(validationError);
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setFormError("");
    if (step < 5) {
      setStep(step + 1);
      return;
    }

    setIsSubmitting(true);
    try {
      const response =
        createdCase ??
        (await submitIntakeServer({
          demoScenario: demo,
          assistance: fillingOutForSomeoneElse
            ? {
                fillingOutForSomeoneElse: true,
                assistant: {
                  name: assistantName.trim(),
                  phone: assistantPhone.trim(),
                  ...(assistantRelationship ? { relationship: assistantRelationship } : {}),
                  primaryContact: assistantPrimary,
                  permissionAcknowledged: assistantPrimary && permissionAcknowledged,
                },
              }
            : { fillingOutForSomeoneElse: false },
          resident: { firstName, lastName, email, phone },
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
          repairs: repairs.map((repair) => ({
            clientId: repair.clientId,
            category: categoryMap[repair.category] ?? "other",
            description: repair.description,
            startedWhen: repair.startedWhen,
            gettingWorse: repair.worse === "Yes",
            safetyStatus:
              repair.safe === "Yes" ? "safe" : repair.safe === "No" ? "unsafe" : "unsure",
            urgency: repair.safe === "No" ? "high" : repair.worse === "Yes" ? "high" : "moderate",
          })),
        }));

      if (!createdCase) {
        const savedCase = {
          caseId: response.caseId,
          repairNeedId: response.repairNeedId,
          repairs: response.repairs,
        };
        setCreatedCase(savedCase);
        localStorage.setItem(lastCaseStorageKey, response.caseId);
      }

      try {
        for (const repair of response.repairs) {
          const draft = repairs.find((item) => item.clientId === repair.clientId);
          if (
            draft &&
            draft.files.length > 0 &&
            !uploadedRepairIds.current.has(repair.repairNeedId)
          ) {
            await uploadRepairPhotos(repair.repairNeedId, draft.files);
            uploadedRepairIds.current.add(repair.repairNeedId);
          }
        }
      } catch (uploadError) {
        console.error("Case saved, but repair photos could not be uploaded.", uploadError);
      }

      navigate({
        to: "/assessment",
        search: { caseId: response.caseId, repairNeedId: response.repairNeedId, process: "1" },
      });
    } catch (error) {
      console.error(error);
      setFormError(intakeErrorMessage(error));
      requestAnimationFrame(() => errorRef.current?.focus());
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
          <p className="eyebrow">Guided repair report · Step {step} of 5</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight sm:text-6xl">{titles[step - 1]}</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Your answers help organize your Repair Passport and identify possible next steps.
            Financial questions are broad and preliminary.
          </p>
          {formError && (
            <p
              ref={errorRef}
              className="mt-5 border-l-4 border-destructive bg-destructive/10 p-4 text-sm font-semibold text-destructive"
              role="alert"
              tabIndex={-1}
            >
              {formError}
            </p>
          )}
          <div className="mt-10 border-y border-foreground py-8">
            {step === 1 && (
              <div className="space-y-10">
                <section aria-labelledby="application-completer-heading">
                  <h2 id="application-completer-heading" className="text-2xl">
                    Who is completing this application?
                  </h2>
                  <fieldset className="mt-5">
                    <legend className="font-semibold">Are you filling this out for someone else?</legend>
                    <RadioGroup
                      className="mt-3 gap-3"
                      value={fillingOutForSomeoneElse ? "assistant" : "resident"}
                      onValueChange={(value) => {
                        const isAssistant = value === "assistant";
                        setFillingOutForSomeoneElse(isAssistant);
                        if (!isAssistant) {
                          setAssistantPrimary(false);
                          setPermissionAcknowledged(false);
                        }
                      }}
                    >
                      <label className="flex min-h-12 cursor-pointer items-center gap-3 border border-input bg-paper px-4">
                        <RadioGroupItem value="resident" />
                        <span>No, I am completing this for myself</span>
                      </label>
                      <label className="flex min-h-12 cursor-pointer items-center gap-3 border border-input bg-paper px-4">
                        <RadioGroupItem value="assistant" />
                        <span>Yes, I am helping someone else</span>
                      </label>
                    </RadioGroup>
                  </fieldset>

                  {fillingOutForSomeoneElse && (
                    <div className="mt-6 border-l-4 border-primary bg-secondary/45 p-5 sm:p-6">
                      <p className="eyebrow">Person assisting with this application</p>
                      <div className="mt-5 grid gap-6 sm:grid-cols-2">
                        <FormField label="Your name">
                          <input
                            value={assistantName}
                            onChange={(event) => setAssistantName(event.target.value)}
                            autoComplete="name"
                          />
                        </FormField>
                        <FormField label="Your phone number">
                          <input
                            type="tel"
                            value={assistantPhone}
                            onChange={(event) => setAssistantPhone(event.target.value)}
                            autoComplete="tel"
                          />
                        </FormField>
                        <FormField label="Relationship to resident (optional)">
                          <select
                            value={assistantRelationship}
                            onChange={(event) => setAssistantRelationship(event.target.value)}
                          >
                            <option value="">Choose a relationship</option>
                            <option>Family member</option>
                            <option>Daughter</option>
                            <option>Son</option>
                            <option>Friend</option>
                            <option>Neighbor</option>
                            <option>Caregiver</option>
                            <option>Case worker</option>
                            <option>Other</option>
                          </select>
                        </FormField>
                      </div>
                      <label className="mt-6 flex cursor-pointer items-start gap-3 font-semibold">
                        <Checkbox
                          checked={assistantPrimary}
                          onCheckedChange={(checked) => {
                            const isPrimary = checked === true;
                            setAssistantPrimary(isPrimary);
                            if (!isPrimary) setPermissionAcknowledged(false);
                          }}
                        />
                        <span>
                          Make me the primary contact for this case
                          <small className="mt-1 block font-normal text-muted-foreground">
                            HomeFix will contact you first about case updates, documents, and
                            scheduling. The resident remains the applicant and property resident.
                          </small>
                        </span>
                      </label>
                      {assistantPrimary && (
                        <label className="mt-5 flex cursor-pointer items-start gap-3 border-t border-border pt-5 text-sm font-semibold">
                          <Checkbox
                            checked={permissionAcknowledged}
                            onCheckedChange={(checked) =>
                              setPermissionAcknowledged(checked === true)
                            }
                          />
                          <span>
                            The resident has given me permission to assist with this repair case and
                            receive communications about scheduling and case progress.
                          </span>
                        </label>
                      )}
                    </div>
                  )}
                </section>

                <section aria-labelledby="resident-information-heading">
                  <h2 id="resident-information-heading" className="text-2xl">
                    Resident information
                  </h2>
                  <div className="mt-5 grid gap-6 sm:grid-cols-2">
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
                      <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
                    </FormField>
                    <FormField label="Detroit street address">
                      <input
                        data-guide-target="intake-address"
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
                </section>
              </div>
            )}
            {step === 2 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField label="Household size">
                  <input
                    data-guide-target="intake-household-size"
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
                    <option value="">Choose a range</option>
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
                {repairs.map((repair, index) => (
                  <section key={repair.clientId} className="border-b border-border pb-8">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <h2 className="text-2xl">Repair {index + 1}</h2>
                      {repairs.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setRepairs((current) =>
                              current.filter((item) => item.clientId !== repair.clientId),
                            )
                          }
                          aria-label={`Remove repair ${index + 1}`}
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </div>
                    <RepairCategoryGrid
                      selected={repair.category}
                      onChange={(category) => updateRepair(repair.clientId, { category })}
                    />
                    <div className="mt-6">
                      <FormField label="Describe the problem">
                        <textarea
                          data-guide-target={index === 0 ? "intake-repair-description" : undefined}
                          rows={4}
                          value={repair.description}
                          onChange={(event) =>
                            updateRepair(repair.clientId, { description: event.target.value })
                          }
                        />
                      </FormField>
                    </div>
                    <div className="mt-6 grid gap-6 sm:grid-cols-2">
                      <FormField label="When did it start?">
                        <select
                          value={repair.startedWhen}
                          onChange={(event) =>
                            updateRepair(repair.clientId, { startedWhen: event.target.value })
                          }
                        >
                          <option value="">Choose a timeframe</option>
                          <option>Within the last week</option>
                          <option>A few months ago</option>
                          <option>More than a year ago</option>
                        </select>
                      </FormField>
                      <ChoiceGroup
                        label="Is the home safe to occupy?"
                        options={["Yes", "Not sure", "No"]}
                        value={repair.safe}
                        onChange={(safe) => updateRepair(repair.clientId, { safe })}
                      />
                      <ChoiceGroup
                        label="Has it gotten worse recently?"
                        options={["Yes", "No"]}
                        value={repair.worse}
                        onChange={(worse) => updateRepair(repair.clientId, { worse })}
                      />
                    </div>
                  </section>
                ))}
                {repairs.length < 8 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 rounded-none"
                    onClick={() =>
                      setRepairs((current) => [
                        ...current,
                        createRepairDraft(current.length, false),
                      ])
                    }
                  >
                    <Plus /> Add another repair
                  </Button>
                )}
              </div>
            )}
            {step === 4 && (
              <div className="space-y-10">
                {repairs.map((repair, index) => (
                  <section key={repair.clientId}>
                    <h2 className="mb-4 text-2xl">
                      Repair {index + 1}: {repair.category}
                    </h2>
                    <PhotoUploader
                      files={repair.files}
                      onChange={(files) => updateRepair(repair.clientId, { files })}
                      {...(index === 0 ? { dataGuideTarget: "intake-photo-upload" } : {})}
                    />
                  </section>
                ))}
              </div>
            )}
            {step === 5 && (
              <div className="space-y-6">
                <div className="grid gap-px bg-border sm:grid-cols-2">
                  <Review label="Resident" value={`${firstName} ${lastName}`} />
                  {fillingOutForSomeoneElse && (
                    <Review
                      label={assistantPrimary ? "Primary contact" : "Assisting contact"}
                      value={`${assistantName}${assistantRelationship ? ` · ${assistantRelationship}` : ""}`}
                    />
                  )}
                  <Review label="Property" value={`${streetAddress} · Detroit ${zipCode}`} />
                  <Review
                    label="Household"
                    value={`${householdSize} residents · ${senior === "Yes" ? "Senior household" : "No senior"}`}
                  />
                  {repairs.map((repair, index) => (
                    <Review
                      key={repair.clientId}
                      label={`Repair ${index + 1}`}
                      value={`${repair.category} · ${repair.files.length} photo${repair.files.length === 1 ? "" : "s"}`}
                    />
                  ))}
                  <Review label="Income range" value={incomeRange} />
                </div>
                <div className="flex gap-3 border-l-4 border-positive bg-positive/20 p-4">
                  <Check className="size-5 shrink-0" />
                  <p className="text-sm">
                    <strong>Ready for preliminary review.</strong>
                    <br />
                    <span className="text-muted-foreground">
                      This submission creates the Repair Passport and checks the report against
                      current programs.
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
              onClick={() => {
                setFormError("");
                setStep(step - 1);
              }}
              data-guide-target="intake-back"
            >
              <ArrowLeft />
              Back
            </Button>
            <Button
              className="min-h-12 rounded-none bg-primary px-6 text-primary-foreground"
              onClick={next}
              disabled={isSubmitting}
              data-guide-target={step === 5 ? "intake-submit" : "intake-continue"}
            >
              {step === 4
                ? "Continue"
                : step === 5
                  ? isSubmitting
                    ? "Saving..."
                    : "Check Initial Eligibility"
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
