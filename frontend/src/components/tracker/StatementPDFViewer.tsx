import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import * as XLSX from 'xlsx';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Loader2, 
  ZoomIn, 
  ZoomOut, 
  Sparkles, 
  Sun, 
  Moon, 
  X,
  Bot,
  Maximize2,
  Minimize2,
  Scan,
  Contrast,
  AlertTriangle,
  FileSpreadsheet,
  Image as ImageIcon,
  RefreshCw,
  Download,
  FileQuestion
} from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure the pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type DetectedType = 'DETECTING' | 'PDF' | 'IMAGE' | 'EXCEL' | 'CSV' | 'UNKNOWN';

interface Props {
  file: File | Blob;
  fileName?: string;
  isDarkMode: boolean;
  onToggleDarkMode?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  extractedTransactions?: any[];
}

// React Error Boundary to catch any unexpected rendering errors
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fileName?: string;
  fileSize?: number;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ViewerErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Document Viewer caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <DocumentErrorView 
          title="Document Display Error"
          message={this.state.error?.message || "An unexpected error occurred while parsing this document."}
          fileName={this.props.fileName}
          fileSize={this.props.fileSize}
          onRetry={() => {
            this.setState({ hasError: false, error: null });
            if (this.props.onReset) this.props.onReset();
          }}
        />
      );
    }
    return this.props.children;
  }
}

// Improved, high-visibility Error Handling Screen
interface DocumentErrorViewProps {
  title: string;
  message: string;
  fileName?: string;
  fileSize?: number;
  onRetry?: () => void;
  onDownload?: () => void;
}

function DocumentErrorView({
  title,
  message,
  fileName,
  fileSize,
  onRetry,
  onDownload
}: DocumentErrorViewProps) {
  const formattedSize = useMemo(() => {
    if (!fileSize) return 'Unknown size';
    if (fileSize < 1024) return `${fileSize} bytes`;
    if (fileSize < 1024 * 1024) return `${(fileSize / 1024).toFixed(1)} KB`;
    return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
  }, [fileSize]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#181a20] text-white min-h-[420px]">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-base font-black text-slate-100 tracking-tight">{title}</h3>
          <p className="text-xs text-rose-300/90 font-medium mt-1 bg-rose-950/40 border border-rose-800/40 p-2 rounded-lg break-words">
            {message}
          </p>
        </div>

        {/* File Metadata Card */}
        <div className="bg-slate-800/80 rounded-xl p-3 text-left text-xs border border-slate-700/60 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span>File Name:</span>
            <span className="font-mono text-slate-200 truncate max-w-[200px]" title={fileName}>
              {fileName || 'bank_statement'}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>File Size:</span>
            <span className="font-mono text-slate-300">{formattedSize}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Supported Formats:</span>
            <span className="text-slate-300 font-semibold">PDF, Excel (.xlsx/.xls), CSV, PNG, JPG</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 leading-relaxed">
          The document could not be rendered because its format is invalid or corrupted. Please verify the uploaded file or export a fresh statement from your bank.
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#331a6f] hover:bg-[#251352] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Parsing</span>
            </button>
          )}

          {onDownload && (
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-600 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StatementPDFViewer({ 
  file, 
  fileName,
  isDarkMode, 
  onToggleDarkMode,
  isExpanded = false,
  onToggleExpand,
  extractedTransactions = [] 
}: Props) {
  // Format detection
  const [detectedType, setDetectedType] = useState<DetectedType>('DETECTING');
  const [docError, setDocError] = useState<string | null>(null);

  // PDF state
  const [numPages, setNumPages] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);

  // Excel & CSV state
  const [excelWorkbook, setExcelWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [excelSheets, setExcelSheets] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetRows, setSheetRows] = useState<any[][]>([]);
  const [isLoadingSpreadsheet, setIsLoadingSpreadsheet] = useState<boolean>(false);

  // Layout & Zoom state
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [zoomMode, setZoomMode] = useState<'fit' | 'custom'>('fit');
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [enhanceContrast, setEnhanceContrast] = useState<boolean>(true);

  // AI Find popover toggle
  const [showAiFindPopover, setShowAiFindPopover] = useState<boolean>(false);
  const aiFindPopoverRef = useRef<HTMLDivElement>(null);
  const marksRef = useRef<HTMLElement[]>([]);

  const resolvedFileName = useMemo(() => {
    return fileName || (file as File).name || 'statement_document';
  }, [fileName, file]);

  const fileUrl = useMemo(() => URL.createObjectURL(file), [file]);

  // Detect file type via extension, mime type, and magic bytes
  useEffect(() => {
    let isCancelled = false;

    async function detect() {
      setDocError(null);
      const name = resolvedFileName.toLowerCase();
      const mime = (file.type || '').toLowerCase();

      // Check extension & mime first
      if (name.endsWith('.xlsx') || name.endsWith('.xls') || mime.includes('spreadsheet') || mime.includes('excel')) {
        if (!isCancelled) setDetectedType('EXCEL');
        return;
      }
      if (name.endsWith('.csv') || mime === 'text/csv' || mime === 'application/csv') {
        if (!isCancelled) setDetectedType('CSV');
        return;
      }
      if (/\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(name) || mime.startsWith('image/')) {
        if (!isCancelled) setDetectedType('IMAGE');
        return;
      }
      if (name.endsWith('.pdf') || mime === 'application/pdf') {
        // Inspect magic bytes to ensure it's not a disguised or truncated file
        try {
          const slice = await file.slice(0, 5).arrayBuffer();
          const b = new Uint8Array(slice);
          if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) {
            if (!isCancelled) setDetectedType('PDF');
            return;
          }
        } catch {}
      }

      // Deep inspection of magic bytes
      try {
        const slice = await file.slice(0, 16).arrayBuffer();
        const b = new Uint8Array(slice);

        // PDF: %PDF
        if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) {
          if (!isCancelled) setDetectedType('PDF');
          return;
        }
        // PNG: \x89PNG
        if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) {
          if (!isCancelled) setDetectedType('IMAGE');
          return;
        }
        // JPEG: \xFF\xD8\xFF
        if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) {
          if (!isCancelled) setDetectedType('IMAGE');
          return;
        }
        // ZIP / XLSX: PK\x03\x04
        if (b[0] === 0x50 && b[1] === 0x4B && b[2] === 0x03 && b[3] === 0x04) {
          if (!isCancelled) setDetectedType('EXCEL');
          return;
        }
        // Legacy XLS: \xD0\xCF\x11\xE0
        if (b[0] === 0xD0 && b[1] === 0xCF && b[2] === 0x11 && b[3] === 0xE0) {
          if (!isCancelled) setDetectedType('EXCEL');
          return;
        }

        // Try reading as CSV text
        const textSample = new TextDecoder('utf-8', { fatal: false }).decode(b);
        if (/^[A-Za-z0-9\s,;"'\-_/\.\n\r]+$/.test(textSample)) {
          if (!isCancelled) setDetectedType('CSV');
          return;
        }
      } catch (err) {
        console.warn('Failed byte detection:', err);
      }

      if (!isCancelled) {
        setDetectedType('UNKNOWN');
        setDocError('Unrecognized document format. Please upload a valid PDF, Excel (.xlsx/.xls), CSV, or Image (PNG/JPG).');
      }
    }

    detect();

    return () => {
      isCancelled = true;
    };
  }, [file, resolvedFileName]);

  // Parse Excel or CSV when detected
  useEffect(() => {
    if (detectedType !== 'EXCEL' && detectedType !== 'CSV') return;

    let isCancelled = false;
    setIsLoadingSpreadsheet(true);
    setDocError(null);

    file.arrayBuffer()
      .then((buf) => {
        if (isCancelled) return;
        try {
          const wb = XLSX.read(buf, { type: 'array', cellDates: true });
          if (!wb.SheetNames || wb.SheetNames.length === 0) {
            throw new Error('Spreadsheet contains no readable sheets.');
          }
          setExcelWorkbook(wb);
          setExcelSheets(wb.SheetNames);
          setActiveSheet(wb.SheetNames[0]);

          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
          setSheetRows(rows);
        } catch (err: any) {
          if (!isCancelled) {
            console.error('Error reading spreadsheet:', err);
            setDocError(err.message || 'Failed to parse spreadsheet contents.');
          }
        } finally {
          if (!isCancelled) setIsLoadingSpreadsheet(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setDocError(err.message || 'Could not load file buffer.');
          setIsLoadingSpreadsheet(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [file, detectedType]);

  // Switch active Excel sheet
  const handleSelectSheet = (sheetName: string) => {
    if (!excelWorkbook) return;
    setActiveSheet(sheetName);
    const ws = excelWorkbook.Sheets[sheetName];
    if (ws) {
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
      setSheetRows(rows);
    }
  };

  // Dynamically measure container width via ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    setContainerWidth(el.clientWidth);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Close AI Find popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (aiFindPopoverRef.current && !aiFindPopoverRef.current.contains(event.target as Node)) {
        setShowAiFindPopover(false);
      }
    };
    if (showAiFindPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAiFindPopover]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Find matches in PDF text layer
  useEffect(() => {
    if (detectedType !== 'PDF' || !debouncedSearch || !containerRef.current) {
      setMatchCount(0);
      setCurrentMatch(0);
      marksRef.current = [];
      return;
    }
    
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const marks = Array.from(containerRef.current.querySelectorAll('mark.pdf-search-match')) as HTMLElement[];
        marksRef.current = marks;
        setMatchCount(marks.length);
        setCurrentMatch(0);
        
        if (marks.length > 0) {
          marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
          updateActiveMarkStyle(marks, 0);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [debouncedSearch, numPages, zoomPercent, zoomMode, detectedType]);

  const updateActiveMarkStyle = (marks: HTMLElement[], activeIndex: number) => {
    marks.forEach((mark, index) => {
      if (index === activeIndex) {
        mark.style.backgroundColor = '#f97316';
        mark.style.color = '#fff';
        mark.style.outline = '2px solid #ea580c';
      } else {
        mark.style.backgroundColor = '#facc15';
        mark.style.color = '#000';
        mark.style.outline = 'none';
      }
    });
  };

  const handleNextMatch = () => {
    if (matchCount === 0) return;
    const nextMatch = (currentMatch + 1) % matchCount;
    setCurrentMatch(nextMatch);
    if (marksRef.current[nextMatch]) {
      marksRef.current[nextMatch].scrollIntoView({ behavior: 'smooth', block: 'center' });
      updateActiveMarkStyle(marksRef.current, nextMatch);
    }
  };

  const handlePrevMatch = () => {
    if (matchCount === 0) return;
    const prevMatch = (currentMatch - 1 + matchCount) % matchCount;
    setCurrentMatch(prevMatch);
    if (marksRef.current[prevMatch]) {
      marksRef.current[prevMatch].scrollIntoView({ behavior: 'smooth', block: 'center' });
      updateActiveMarkStyle(marksRef.current, prevMatch);
    }
  };

  const handleZoomIn = () => {
    setZoomMode('custom');
    setZoomPercent((prev) => Math.min(250, prev + 20));
  };

  const handleZoomOut = () => {
    setZoomMode('custom');
    setZoomPercent((prev) => Math.max(50, prev - 20));
  };

  const handleFitWidth = () => {
    setZoomMode('fit');
    setZoomPercent(100);
  };

  const handleSelectZoom = (val: string) => {
    if (val === 'fit') {
      handleFitWidth();
    } else {
      setZoomMode('custom');
      setZoomPercent(Number(val));
    }
  };

  const textRenderer = useCallback(
    (textItem: any) => {
      if (!debouncedSearch) return textItem.str;
      
      const text = textItem.str;
      const query = debouncedSearch;
      
      if (!text.toLowerCase().includes(query.toLowerCase())) {
        return text;
      }

      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
      return parts.map((part: string) => 
        part.toLowerCase() === query.toLowerCase() 
          ? `<mark class="pdf-search-match" style="background-color: #facc15; color: #000; border-radius: 2px; padding: 0 2px; font-weight: bold;">${part}</mark>` 
          : part
      ).join('');
    },
    [debouncedSearch]
  );

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setDocError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('react-pdf document load error:', error);
    setDocError(error.message || 'Invalid PDF structure. The uploaded file is either not a standard PDF or corrupted.');
  };

  // AI Entities extracted for quick AI find
  const aiEntities = useMemo(() => {
    const list: { label: string; value: string; type: string }[] = [];
    const seen = new Set<string>();

    extractedTransactions.forEach((txn) => {
      if (txn.payer_name && !seen.has(txn.payer_name.toLowerCase())) {
        seen.add(txn.payer_name.toLowerCase());
        list.push({ label: txn.payer_name, value: txn.payer_name, type: 'Payer' });
      }
      if (txn.transaction_reference && !seen.has(txn.transaction_reference.toLowerCase())) {
        seen.add(txn.transaction_reference.toLowerCase());
        list.push({ label: txn.transaction_reference, value: txn.transaction_reference, type: 'Ref' });
      }
      if (txn.amount && !seen.has(String(txn.amount))) {
        seen.add(String(txn.amount));
        list.push({ label: `RWF ${Number(txn.amount).toLocaleString()}`, value: String(txn.amount), type: 'Amount' });
      }
    });

    return list.slice(0, 15);
  }, [extractedTransactions]);

  const pageWidth = useMemo(() => {
    if (zoomMode === 'fit') {
      const available = containerWidth > 0 ? containerWidth - 48 : 720;
      return Math.max(420, available);
    }
    return Math.round(720 * (zoomPercent / 100));
  }, [zoomMode, containerWidth, zoomPercent]);

  const pixelRatio = useMemo(() => {
    if (typeof window === 'undefined') return 1;
    return Math.min(window.devicePixelRatio || 1, 2.5);
  }, []);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = resolvedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <ViewerErrorBoundary 
      fileName={resolvedFileName} 
      fileSize={(file as Blob).size}
      onReset={() => setDocError(null)}
    >
      <div className="flex flex-col h-full w-full bg-[#181a20] overflow-hidden">
        
        {/* Top Header Toolbar */}
        <div className="shrink-0 px-3 py-2 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 z-10 shadow-xs">
          
          {/* Left: Search Bar + AI Find + Match Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative w-52 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search statement (names, amts, refs)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNextMatch();
                }}
                className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#331a6f] focus:ring-1 focus:ring-[#331a6f] bg-slate-50 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* AI Find Button & Dropdown */}
            <div className="relative" ref={aiFindPopoverRef}>
              <button
                onClick={() => setShowAiFindPopover((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  showAiFindPopover
                    ? 'bg-[#331a6f] text-white border-[#331a6f] shadow-xs'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                }`}
                title="AI Find: Detected Payer Names, References & Amounts"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>AI Find</span>
              </button>

              {/* AI Find Quick Selection Popover */}
              {showAiFindPopover && (
                <div className="absolute top-full left-0 mt-1.5 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-30 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-purple-600" />
                      AI Detected in Statement
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{aiEntities.length} items</span>
                  </div>

                  {aiEntities.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                      {aiEntities.map((entity, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setSearchQuery(entity.value);
                            setShowAiFindPopover(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-purple-50 text-xs flex items-center justify-between text-slate-700 hover:text-purple-900 transition-colors cursor-pointer group"
                        >
                          <span className="truncate font-medium">{entity.label}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 group-hover:bg-purple-100 group-hover:text-purple-700 shrink-0">
                            {entity.type}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-[11px] text-slate-400">
                      No entities extracted yet. Type in search bar to highlight any term in statement.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Match Counter & Next/Prev Controls */}
            {debouncedSearch && detectedType === 'PDF' && (
              <div className="flex items-center gap-1.5 pl-1">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                  {matchCount > 0 ? `${currentMatch + 1} of ${matchCount}` : '0 results'}
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={handlePrevMatch}
                    disabled={matchCount === 0}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Previous match"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleNextMatch}
                    disabled={matchCount === 0}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Next match"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Fit Width + Zoom Controls + Contrast + Dark Mode + Expand */}
          <div className="flex items-center gap-1.5">
            
            {/* Format Badge Indicator */}
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
              {detectedType === 'PDF' && <FileText className="w-3 h-3 text-red-500" />}
              {(detectedType === 'EXCEL' || detectedType === 'CSV') && <FileSpreadsheet className="w-3 h-3 text-emerald-600" />}
              {detectedType === 'IMAGE' && <ImageIcon className="w-3 h-3 text-sky-500" />}
              {detectedType === 'UNKNOWN' && <FileQuestion className="w-3 h-3 text-amber-500" />}
              <span>{detectedType}</span>
            </span>

            {/* Fit Width Quick Button */}
            <button
              onClick={handleFitWidth}
              className={`p-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                zoomMode === 'fit'
                  ? 'bg-[#331a6f] text-white border-[#331a6f] shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="Fit document to pane width"
            >
              <Scan className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Fit Width</span>
            </button>

            {/* Zoom Percentages Controls */}
            <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={handleZoomOut}
                disabled={zoomMode === 'custom' && zoomPercent <= 50}
                className="p-1 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <select
                value={zoomMode === 'fit' ? 'fit' : zoomPercent}
                onChange={(e) => handleSelectZoom(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 px-1 py-0.5 rounded focus:outline-none cursor-pointer"
                title="Zoom selection"
              >
                <option value="fit">Fit Width</option>
                <option value={50}>50%</option>
                <option value={75}>75%</option>
                <option value={90}>90%</option>
                <option value={100}>100%</option>
                <option value={120}>120%</option>
                <option value={140}>140%</option>
                <option value={160}>160%</option>
                <option value={200}>200%</option>
              </select>

              <button
                onClick={handleZoomIn}
                disabled={zoomMode === 'custom' && zoomPercent >= 250}
                className="p-1 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Enhance Contrast Button */}
            <button
              onClick={() => setEnhanceContrast(!enhanceContrast)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-colors shrink-0 cursor-pointer ${
                enhanceContrast 
                  ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-2xs' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
              }`}
              title={enhanceContrast ? "Contrast Boosted (Active)" : "Boost Document Contrast"}
            >
              <Contrast className="w-3.5 h-3.5" />
            </button>

            {/* Small Light / Dark Mode Button */}
            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors shrink-0 cursor-pointer shadow-2xs"
                title={isDarkMode ? "Switch to Natural High-Contrast Document" : "Switch to Dark Inverted Document"}
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
              </button>
            )}

            {/* Expand / Maximize Pane Button */}
            {onToggleExpand && (
              <button
                onClick={onToggleExpand}
                className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-colors shrink-0 cursor-pointer ${
                  isExpanded 
                    ? 'bg-[#331a6f] text-white border-[#331a6f]' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title={isExpanded ? "Restore Split View" : "Expand Bank Statement to Full Width"}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Content Viewer Area */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar relative flex flex-col bg-[#181a20]"
        >
          {/* ERROR VIEW */}
          {docError ? (
            <DocumentErrorView 
              title="Unable to Load Document"
              message={docError}
              fileName={resolvedFileName}
              fileSize={(file as Blob).size}
              onRetry={() => {
                setDocError(null);
                setDetectedType('DETECTING');
              }}
              onDownload={handleDownload}
            />
          ) : detectedType === 'DETECTING' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              <span className="text-xs font-bold text-slate-300">Detecting document structure...</span>
            </div>
          ) : detectedType === 'PDF' ? (
            /* =================== PDF VIEWER =================== */
            <div className="p-4 flex flex-col items-center gap-6">
              <React.Suspense fallback={
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <span className="text-sm font-medium">Initializing PDF engine...</span>
                </div>
              }>
                <Document
                  file={fileUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <span className="text-sm font-medium">Rendering PDF statement...</span>
                    </div>
                  }
                  error={
                    <DocumentErrorView 
                      title="Invalid PDF Document"
                      message="Invalid PDF structure. This document appears to be an unsupported file format or corrupted PDF."
                      fileName={resolvedFileName}
                      fileSize={(file as Blob).size}
                      onRetry={() => setDocError(null)}
                      onDownload={handleDownload}
                    />
                  }
                >
                  {Array.from(new Array(numPages), (el, index) => (
                    <div 
                      key={`page_${index + 1}`} 
                      className="shadow-2xl shadow-black/60 rounded-xs bg-white ring-1 ring-black/25 transition-all mb-4"
                      style={{
                        filter: isDarkMode 
                          ? 'invert(0.92) hue-rotate(180deg) contrast(120%) brightness(102%)' 
                          : (enhanceContrast ? 'contrast(112%) brightness(98%)' : 'none')
                      }}
                    >
                      <Page 
                        pageNumber={index + 1} 
                        customTextRenderer={textRenderer}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        width={pageWidth}
                        devicePixelRatio={pixelRatio}
                        className="pdf-page"
                      />
                    </div>
                  ))}
                </Document>
              </React.Suspense>
            </div>
          ) : detectedType === 'IMAGE' ? (
            /* =================== IMAGE VIEWER =================== */
            <div className="p-4 flex flex-col items-center justify-center flex-1">
              <div 
                className="shadow-2xl shadow-black/60 rounded-sm ring-1 ring-black/25 overflow-hidden transition-all bg-white"
                style={{
                  width: zoomMode === 'fit' ? '100%' : `${pageWidth}px`,
                  maxWidth: zoomMode === 'fit' ? '100%' : 'none',
                  filter: isDarkMode 
                    ? 'invert(0.92) hue-rotate(180deg) contrast(120%) brightness(102%)' 
                    : (enhanceContrast ? 'contrast(112%) brightness(98%)' : 'none')
                }}
              >
                <img 
                  src={fileUrl} 
                  alt={resolvedFileName}
                  className="w-full h-auto object-contain block select-none"
                />
              </div>
            </div>
          ) : (detectedType === 'EXCEL' || detectedType === 'CSV') ? (
            /* =================== SPREADSHEET VIEWER =================== */
            <div className="flex flex-col h-full w-full">
              {/* Sheet Tabs */}
              {excelSheets.length > 1 && (
                <div className="shrink-0 bg-slate-900 border-b border-slate-700/80 px-3 py-1 flex items-center gap-1 overflow-x-auto">
                  {excelSheets.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSelectSheet(s)}
                      className={`px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        activeSheet === s
                          ? 'bg-[#331a6f] text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {isLoadingSpreadsheet ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  <span className="text-xs font-bold text-slate-300">Parsing spreadsheet transactions...</span>
                </div>
              ) : sheetRows.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                  <FileSpreadsheet className="w-10 h-10 mb-2 text-slate-500" />
                  <span className="text-sm font-bold text-slate-300">Spreadsheet is empty</span>
                </div>
              ) : (
                <div className="flex-1 overflow-auto p-4">
                  <div 
                    className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-300 inline-block min-w-full"
                    style={{
                      transform: zoomMode === 'fit' ? 'none' : `scale(${zoomPercent / 100})`,
                      transformOrigin: 'top left',
                      filter: isDarkMode 
                        ? 'invert(0.92) hue-rotate(180deg) contrast(120%) brightness(102%)' 
                        : (enhanceContrast ? 'contrast(108%) brightness(99%)' : 'none')
                    }}
                  >
                    <table className="w-full text-left border-collapse text-xs">
                      <tbody>
                        {sheetRows.slice(0, 500).map((row, rIdx) => {
                          const isHeader = rIdx === 0;
                          return (
                            <tr 
                              key={rIdx} 
                              className={isHeader 
                                ? 'bg-slate-100 font-black text-slate-900 border-b border-slate-300 sticky top-0' 
                                : 'border-b border-slate-100 hover:bg-slate-50/80 transition-colors'
                              }
                            >
                              {/* Row Index Column */}
                              <td className="py-1.5 px-2.5 bg-slate-50 text-[10px] font-mono text-slate-400 select-none border-r border-slate-200 text-center w-10">
                                {rIdx + 1}
                              </td>

                              {row.map((cell: any, cIdx: number) => {
                                const val = String(cell !== undefined && cell !== null ? cell : '');
                                const isMatch = debouncedSearch && val.toLowerCase().includes(debouncedSearch.toLowerCase());
                                
                                return (
                                  <td 
                                    key={cIdx} 
                                    className={`py-2 px-3 border-r border-slate-100 text-slate-800 whitespace-nowrap ${
                                      isMatch ? 'bg-amber-200 font-bold text-slate-900 ring-1 ring-amber-400' : ''
                                    }`}
                                  >
                                    {val}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {sheetRows.length > 500 && (
                      <div className="p-3 bg-slate-50 text-center text-slate-500 text-xs font-semibold border-t border-slate-200">
                        Showing first 500 rows of {sheetRows.length} total rows.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* =================== UNKNOWN FORMAT ERROR =================== */
            <DocumentErrorView 
              title="Unsupported Document Structure"
              message="The uploaded bank statement format cannot be opened by the viewer."
              fileName={resolvedFileName}
              fileSize={(file as Blob).size}
              onRetry={() => {
                setDocError(null);
                setDetectedType('DETECTING');
              }}
              onDownload={handleDownload}
            />
          )}
        </div>
      </div>
    </ViewerErrorBoundary>
  );
}
