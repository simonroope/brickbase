import { AdminPanel } from "@/components/AdminPanel";

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-text-primary">Admin</h1>
      <AdminPanel />
    </main>
  );
}
