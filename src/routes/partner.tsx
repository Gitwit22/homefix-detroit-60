import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { Database, LogOut, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	HomeFixApiError,
	getPartnerDemoControl,
	updatePartnerDemoControl,
	validateContractorAccess,
	type PartnerDemoControl,
} from "@/lib/homefix-api";
import {
	clearContractorSession,
	getStoredContractorSession,
} from "@/lib/contractor-session";

export const Route = createFileRoute("/partner")({
	beforeLoad: async () => {
		if (!getStoredContractorSession()) throw redirect({ to: "/contractors" });
		try {
			await validateContractorAccess();
		} catch (error) {
			if (error instanceof HomeFixApiError && error.status === 401) {
				throw redirect({ to: "/contractors" });
			}
			throw error;
		}
	},
	component: PartnerLayout,
});

function PartnerLayout() {
	const router = useRouter();
	const session = getStoredContractorSession();
	const [control, setControl] = useState<PartnerDemoControl | null>(null);
	const [operatorCode, setOperatorCode] = useState("");
	const [error, setError] = useState("");
	const [isWorking, setIsWorking] = useState(false);

	useEffect(() => {
		void getPartnerDemoControl().then(setControl).catch(console.error);
	}, []);

	const updateDemoData = async (action: "reset" | "restore") => {
		setIsWorking(true);
		setError("");
		try {
			setControl(await updatePartnerDemoControl(action, operatorCode));
			setOperatorCode("");
			await router.invalidate();
		} catch (updateError) {
			console.error(updateError);
			setError("The operator code was rejected or demo data could not be updated.");
		} finally {
			setIsWorking(false);
		}
	};

	const signOut = async () => {
		clearContractorSession();
		await router.navigate({ to: "/contractors" });
	};

	return (
		<>
			<div className="border-b border-foreground bg-background px-4 py-3 sm:px-6">
				<div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 lg:flex-row lg:items-center">
					<div className="flex items-center gap-3">
						<Database className="size-4 text-primary" aria-hidden="true" />
						<div>
							<p className="text-xs font-bold uppercase">Partner Data</p>
							<p className="text-xs text-muted-foreground">
								{control?.baselineEnabled === false
									? "Submitted resident cases only"
									: "Synthetic planning baseline with submitted resident cases"}
							</p>
						</div>
					</div>
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<div className="mr-2 text-xs sm:text-right">
							<p className="font-bold">{session?.displayName}</p>
							<p className="text-muted-foreground">Contractor access</p>
						</div>
						<label className="sr-only" htmlFor="partner-operator-code">Operator code</label>
						<input
							id="partner-operator-code"
							type="password"
							value={operatorCode}
							onChange={(event) => setOperatorCode(event.target.value)}
							placeholder="Operator code"
							className="h-10 border border-input bg-background px-3 text-sm"
							disabled={isWorking}
						/>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									variant={control?.baselineEnabled === false ? "outline" : "destructive"}
									className="h-10 rounded-none"
									disabled={!operatorCode || isWorking || control == null}
								>
									{control?.baselineEnabled === false ? <RotateCcw /> : <Trash2 />}
									{control?.baselineEnabled === false ? "Restore Demo Data" : "Reset Demo Data"}
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent className="rounded-none">
								<AlertDialogHeader>
									<AlertDialogTitle>
										{control?.baselineEnabled === false ? "Restore demo data?" : "Reset all demo data?"}
									</AlertDialogTitle>
									<AlertDialogDescription>
										{control?.baselineEnabled === false
											? "This restores the synthetic planning baseline and seeded workflow cases."
											: "This removes every demo submission and seeded case for all sessions. Resident cases are preserved."}
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										onClick={() => void updateDemoData(control?.baselineEnabled === false ? "restore" : "reset")}
									>
										Confirm
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
						<Button type="button" variant="outline" className="h-10 rounded-none" onClick={() => void signOut()}>
							<LogOut /> Sign Out
						</Button>
					</div>
					{error && <p className="text-xs font-semibold text-destructive lg:basis-full" role="alert">{error}</p>}
				</div>
			</div>
			<Outlet />
		</>
	);
}
