import { Header } from "@/components/Header";
import { AccountPanel } from "@/components/AccountPanel";

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-page">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-text-primary">Account</h1>
        <AccountPanel />
      </main>
    </div>
  );
}
