import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import BulkImportModal from './BulkImportModal';

export default function BulkImportButton() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button 
        onClick={() => setModalOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Download className="w-4 h-4 mr-2" />
        Bulk Import
      </Button>
      
      <BulkImportModal 
        open={modalOpen} 
        onOpenChange={setModalOpen}
      />
    </>
  );
}