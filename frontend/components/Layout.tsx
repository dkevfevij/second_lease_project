import React, { type ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

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
          Copyright 2025 © Foliatech, Tous les droits sont réservés. — Version 1.0.12
        </footer>
      </div>
    </div>
  );
};

export default Layout;
