import * as React from "react";
import { Sidebar } from "./Sidebar";
import { motion } from "framer-motion";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex-1 overflow-auto"
        >
          <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
