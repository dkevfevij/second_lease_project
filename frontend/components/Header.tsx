import Header from "./Header";
import Sidebar from "./Sidebar";
import type { ReactNode } from "react";


interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
        <footer className="bg-white py-3 text-center text-xs text-gray-500 border-t">
          Copyright 2025 © Nisrine, Tous les droits sont réservés. — Version 1.0.12
        </footer>
      </div>
    </div>
  );
};

export default Layout;