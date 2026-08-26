import React from "react";
import { BoothProvider, useBooth } from "@/context/BoothContext";
import { LandingPage } from "@/components/LandingPage";
import { CustomerTemplateSelect } from "@/components/CustomerTemplateSelect";
import { CustomerCaptureStudio } from "@/components/CustomerCaptureStudio";
import { CustomerFinalPreview } from "@/components/CustomerFinalPreview";
import { AdminLogin } from "@/components/AdminLogin";
import { AdminDashboard } from "@/components/AdminDashboard";

const ScreenRouter: React.FC = () => {
  const { screen } = useBooth();

  switch (screen) {
    case "landing":
      return <LandingPage />;
    case "template_select":
      return <CustomerTemplateSelect />;
    case "studio":
      return <CustomerCaptureStudio />;
    case "preview":
      return <CustomerFinalPreview />;
    case "admin_login":
      return <AdminLogin />;
    case "admin_dashboard":
      return <AdminDashboard />;
    default:
      return <LandingPage />;
  }
};

export default function App() {
  return (
    <BoothProvider>
      <div className="min-h-screen bg-neutral-950 font-sans text-white antialiased">
        <ScreenRouter />
      </div>
    </BoothProvider>
  );
}
