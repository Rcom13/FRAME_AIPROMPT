import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "./chatgpt-auth";
import MaintenancePage from "./MaintenancePage";
import { isMaintenanceOwner, maintenanceModeEnabled } from "./maintenance";
import Studio from "./Studio";

export const dynamic = "force-dynamic";

export default async function Home() {
  const account = await getChatGPTUser();
  const maintenance = maintenanceModeEnabled();
  if (maintenance && !isMaintenanceOwner(account)) {
    return <MaintenancePage signedIn={Boolean(account)} signInPath={chatGPTSignInPath("/")} signOutPath={chatGPTSignOutPath("/")} />;
  }
  const user = account ? {
    displayName: account.displayName,
    email: account.email,
    userId: account.userId,
  } : null;
  return <Studio user={user} developerAccess={Boolean(isMaintenanceOwner(account))} />;
}
