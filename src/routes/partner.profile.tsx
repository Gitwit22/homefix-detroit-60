import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Check, Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import { DemoFlag, PageIntro, SectionLabel } from "@/components/homefix";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { updateContractorProfile, type ContractorProfileInput } from "@/lib/homefix-api";
import {
  repairCategories,
  repairCategoryLabels,
  type RepairCategory,
} from "../../server/domain/repair";

export const Route = createFileRoute("/partner/profile")({
  head: () => ({
    meta: [
      { title: "Contractor Profile - HomeFix 313" },
      { name: "description", content: "Update contractor contact and service information." },
    ],
  }),
  component: ContractorProfilePage,
});

function ContractorProfilePage() {
  const router = useRouter();
  const { contractorProfile } = Route.useRouteContext();
  const [profile, setProfile] = useState<ContractorProfileInput>({
    displayName: contractorProfile.displayName,
    contactName: contractorProfile.contactName ?? "",
    phone: contractorProfile.phone ?? "",
    email: contractorProfile.email ?? "",
    performsInspections: contractorProfile.performsInspections,
    performsRepairs: contractorProfile.performsRepairs,
    supervisesTraining: contractorProfile.supervisesTraining,
    repairSpecialties: contractorProfile.repairSpecialties,
    serviceZipCodes: contractorProfile.serviceZipCodes,
    licenseNumber: contractorProfile.licenseNumber,
    licenseExpiresOn: contractorProfile.licenseExpiresOn,
    insuranceProvider: contractorProfile.insuranceProvider,
    insuranceExpiresOn: contractorProfile.insuranceExpiresOn,
  });
  const [zipCodes, setZipCodes] = useState(contractorProfile.serviceZipCodes.join(", "));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const setField = <Key extends keyof ContractorProfileInput>(
    key: Key,
    value: ContractorProfileInput[Key],
  ) => setProfile((current) => ({ ...current, [key]: value }));

  const toggleSpecialty = (specialty: RepairCategory, checked: boolean) => {
    setField(
      "repairSpecialties",
      checked
        ? [...profile.repairSpecialties, specialty]
        : profile.repairSpecialties.filter((item) => item !== specialty),
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setSaved(false);
    try {
      await updateContractorProfile({
        ...profile,
        serviceZipCodes: zipCodes
          .split(/[\s,]+/)
          .map((value) => value.trim())
          .filter(Boolean),
      });
      setSaved(true);
      await router.invalidate();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DemoFlag />
      <PageIntro
        eyebrow="Contractor settings"
        title="Your Profile"
        description="Keep your contact, service, and credential details current for inspection and repair assignments."
      />
      <form className="mt-10 grid gap-10" onSubmit={submit}>
        <section>
          <SectionLabel number="01">Business and primary contact</SectionLabel>
          <div className="mt-5 grid gap-5 border-y border-border py-6 sm:grid-cols-2">
            <ProfileInput
              label="Business name"
              value={profile.displayName}
              onChange={(value) => setField("displayName", value)}
              autoComplete="organization"
            />
            <ProfileInput
              label="Primary contact"
              value={profile.contactName}
              onChange={(value) => setField("contactName", value)}
              autoComplete="name"
            />
            <ProfileInput
              label="Phone"
              value={profile.phone}
              onChange={(value) => setField("phone", value)}
              autoComplete="tel"
              type="tel"
            />
            <ProfileInput
              label="Email"
              value={profile.email}
              onChange={(value) => setField("email", value)}
              autoComplete="email"
              type="email"
            />
          </div>
        </section>

        <section>
          <SectionLabel number="02">Service capabilities</SectionLabel>
          <div className="mt-5 grid gap-px bg-border sm:grid-cols-3">
            <Capability
              label="Professional inspections"
              checked={profile.performsInspections}
              onChange={(checked) => setField("performsInspections", checked)}
            />
            <Capability
              label="Repair work"
              checked={profile.performsRepairs}
              onChange={(checked) => setField("performsRepairs", checked)}
            />
            <Capability
              label="Training supervision"
              checked={profile.supervisesTraining}
              onChange={(checked) => setField("supervisesTraining", checked)}
            />
          </div>
          {profile.performsRepairs && (
            <div className="mt-6">
              <p className="text-sm font-semibold">Repair specialties</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {repairCategories.map((specialty) => (
                  <Capability
                    key={specialty}
                    label={repairCategoryLabels[specialty]}
                    checked={profile.repairSpecialties.includes(specialty)}
                    onChange={(checked) => toggleSpecialty(specialty, checked)}
                  />
                ))}
              </div>
            </div>
          )}
          <label className="mt-6 grid gap-2 text-sm font-semibold">
            Service ZIP codes
            <input
              className="min-h-12 border border-input bg-background px-3 font-normal"
              value={zipCodes}
              onChange={(event) => setZipCodes(event.target.value)}
              placeholder="48201, 48202"
              inputMode="numeric"
            />
            <small className="font-normal text-muted-foreground">
              Separate multiple five-digit ZIP codes with commas.
            </small>
          </label>
        </section>

        <section>
          <SectionLabel number="03">License and insurance</SectionLabel>
          <p className="mt-3 text-sm text-muted-foreground">
            Optional. Keep these details current when they apply to your work.
          </p>
          <div className="mt-5 grid gap-5 border-y border-border py-6 sm:grid-cols-2">
            <ProfileInput
              label="License number"
              value={profile.licenseNumber ?? ""}
              onChange={(value) => setField("licenseNumber", value)}
            />
            <ProfileInput
              label="License expiration"
              value={profile.licenseExpiresOn ?? ""}
              onChange={(value) => setField("licenseExpiresOn", value)}
              type="date"
            />
            <ProfileInput
              label="Insurance provider"
              value={profile.insuranceProvider ?? ""}
              onChange={(value) => setField("insuranceProvider", value)}
            />
            <ProfileInput
              label="Insurance expiration"
              value={profile.insuranceExpiresOn ?? ""}
              onChange={(value) => setField("insuranceExpiresOn", value)}
              type="date"
            />
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-4 border-t border-foreground pt-6">
          <Button type="submit" className="min-h-12 rounded-none" disabled={isSaving}>
            <Save /> {isSaving ? "Saving..." : "Save Profile"}
          </Button>
          {saved && (
            <p
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
              role="status"
            >
              <Check className="size-4" /> Profile saved
            </p>
          )}
          {error && (
            <p className="text-sm font-semibold text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
      </form>
    </>
  );
}

function ProfileInput({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <input
        className="min-h-12 border border-input bg-background px-3 font-normal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        autoComplete={autoComplete}
      />
    </label>
  );
}

function Capability({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-3 bg-background p-4 text-sm font-semibold">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      {label}
    </label>
  );
}
