import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Building2, Mail, User } from "lucide-react";
import { useState } from "react";
import { useGetUsers, useUpdateUser } from "@workspace/api-client-react";

export default function Settings() {
  const { data: users, isLoading } = useGetUsers();
  const updateUser = useUpdateUser();
  
  // For demo purposes, assuming the first user is the logged in user
  const currentUser = users?.[0];

  const [formData, setFormData] = useState({
    name: currentUser?.name || "Sarah Connor",
    email: currentUser?.email || "sarah@acmecorp.com",
    company: currentUser?.company || "Acme Corp"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.id) {
      updateUser.mutate({
        id: currentUser.id,
        data: formData
      }, {
        onSuccess: () => alert("Profile updated successfully!")
      });
    } else {
      // Mock success if no backend DB user yet
      alert("Profile updated (Mock)!");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Manage your account and company preferences.</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8">
            <h2 className="text-xl font-display font-semibold text-slate-900 mb-6">Profile Information</h2>
            
            {isLoading ? (
              <div className="space-y-6 animate-pulse">
                <div className="h-10 bg-slate-100 rounded-xl" />
                <div className="h-10 bg-slate-100 rounded-xl" />
                <div className="h-10 bg-slate-100 rounded-xl" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all bg-slate-50 focus:bg-white"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      required
                      type="email"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all bg-slate-50 focus:bg-white"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Company Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all bg-slate-50 focus:bg-white"
                      value={formData.company}
                      onChange={e => setFormData({...formData, company: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <Button type="submit" disabled={updateUser.isPending} className="px-8">
                    {updateUser.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
