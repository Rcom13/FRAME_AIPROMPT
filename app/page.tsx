import { getChatGPTUser } from "./chatgpt-auth";
import Studio from "./Studio";

export const dynamic = "force-dynamic";

export default async function Home() {
  const account = await getChatGPTUser();
  const user = account ? {
    displayName: account.displayName,
    email: account.email,
    userId: account.userId,
  } : null;
  return <Studio user={user} />;
}
