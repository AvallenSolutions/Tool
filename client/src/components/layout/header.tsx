import { Button } from "@/components/ui/button";
import { Plus, Bell } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onGenerateReport?: () => void;
}

export default function Header({ title, subtitle, onGenerateReport }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && (
            <p className="text-sm text-green-100">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {onGenerateReport && (
            <Button 
              onClick={onGenerateReport}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
            <Bell className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
