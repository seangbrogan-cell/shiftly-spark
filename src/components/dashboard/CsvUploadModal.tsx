import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useCreateEmployee } from '@/hooks/use-dashboard-data';
import { useSaveEmployeeWorkplaces } from '@/hooks/use-employee-workplaces';
import { useWorkplaces } from '@/hooks/use-workplaces';
import { Upload, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ParsedEmployee {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  error?: string;
}

interface CsvUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employerId: string;
  existingEmails: string[];
}

function parseCsv(text: string): ParsedEmployee[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];

  // Detect header row
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('first') || firstLine.includes('name') || firstLine.includes('email');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    const [firstName = '', lastName = '', email = '', phone = ''] = cols;

    let error: string | undefined;
    if (!firstName && !lastName) error = 'Missing name';
    else if (!email) error = 'Missing email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) error = 'Invalid email';

    return { firstName, lastName, email, phone, error };
  }).filter(e => e.firstName || e.lastName || e.email);
}

export function CsvUploadModal({ open, onOpenChange, employerId, existingEmails }: CsvUploadModalProps) {
  const [parsed, setParsed] = useState<ParsedEmployee[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const createEmployee = useCreateEmployee();

  const existingSet = new Set(existingEmails.map(e => e.toLowerCase()));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      // Mark duplicates
      rows.forEach(r => {
        if (!r.error && existingSet.has(r.email.toLowerCase())) {
          r.error = 'Already exists';
        }
      });
      setParsed(rows);
    };
    reader.readAsText(file);
  };

  const validRows = parsed.filter(r => !r.error);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    let success = 0;
    let failed = 0;

    for (const row of validRows) {
      try {
        const name = `${row.firstName} ${row.lastName}`.trim();
        await createEmployee.mutateAsync({
          employer_id: employerId,
          name,
          email: row.email.trim(),
          phone: row.phone.trim() || null,
          role: 'Staff',
          availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        });
        success++;
      } catch {
        failed++;
      }
    }

    setResults({ success, failed });
    setImporting(false);
    toast({
      title: 'Import complete',
      description: `${success} employee${success !== 1 ? 's' : ''} added${failed > 0 ? `, ${failed} failed` : ''}.`,
    });
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setParsed([]);
      setFileName('');
      setResults(null);
      if (fileRef.current) fileRef.current.value = '';
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Employees from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: First Name, Last Name, Email, Phone Number
          </DialogDescription>
        </DialogHeader>

        {parsed.length === 0 ? (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Click to upload CSV file</p>
              <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
            />
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Expected CSV format:</p>
              <code className="text-xs text-foreground">First Name,Last Name,Email,Phone Number</code>
              <br />
              <code className="text-xs text-muted-foreground">Jane,Doe,jane@example.com,+1 555 1234</code>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{fileName}</span>
                <Badge variant="secondary">{parsed.length} row{parsed.length !== 1 ? 's' : ''}</Badge>
                {validRows.length > 0 && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {validRows.length} valid
                  </Badge>
                )}
                {parsed.length - validRows.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" /> {parsed.length - validRows.length} issues
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setParsed([]); setFileName(''); setResults(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-lg border border-border overflow-x-auto max-h-[40vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Phone</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.map((row, i) => (
                    <TableRow key={i} className={row.error ? 'bg-destructive/5' : ''}>
                      <TableCell className="text-xs">{row.firstName} {row.lastName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.email}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.phone || '—'}</TableCell>
                      <TableCell>
                        {row.error ? (
                          <Badge variant="destructive" className="text-[10px]">{row.error}</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Ready</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {results && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 inline mr-1.5" />
                Import complete: {results.success} added{results.failed > 0 ? `, ${results.failed} failed` : ''}.
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button
                onClick={handleImport}
                disabled={validRows.length === 0 || importing || !!results}
              >
                {importing ? 'Importing…' : `Import ${validRows.length} Employee${validRows.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
