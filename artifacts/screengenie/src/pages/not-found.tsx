import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-6xl font-display font-bold text-slate-900">404</h1>
        <p className="text-xl text-slate-600 mt-4 mb-8">Oops! The page you're looking for doesn't exist.</p>
        <Button asChild size="lg">
          <Link href="/">Return to Dashboard</Link>
        </Button>
      </div>
    </AppLayout>
  );
}
