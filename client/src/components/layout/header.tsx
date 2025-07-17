import { Button } from "@/components/ui/button";
import { Plus, Bell } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onGenerateReport?: () => void;
}

export default function Header({ title, subtitle, onGenerateReport }: HeaderProps) {
  return (
    <header className="bg-white border-b border-light-gray px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-gray">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {onGenerateReport && (
            <Button 
              onClick={onGenerateReport}
              className="bg-avallen-green text-white hover:bg-avallen-green-light"
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-slate-gray hover:text-avallen-green">
            <Bell className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
