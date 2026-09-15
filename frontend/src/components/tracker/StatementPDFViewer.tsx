import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Search, ChevronDown, ChevronUp, FileText, Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure the pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Props {
  file: File | Blob;
  isDarkMode: boolean;
}

export default function StatementPDFViewer({ file, isDarkMode }: Props) {
  const [numPages, setNumPages] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const marksRef = useRef<HTMLElement[]>([]);

  // Debounce search query to avoid lag while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // When debounced search changes, wait for react-pdf to re-render the text layers, then find all marks
  useEffect(() => {
    if (!debouncedSearch || !containerRef.current) {
      setMatchCount(0);
      setCurrentMatch(0);
      marksRef.current = [];
      return;
    }
    
    // We use a timeout to allow the React-PDF text layer to re-render with the new customTextRenderer marks
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const marks = Array.from(containerRef.current.querySelectorAll('mark.pdf-search-match')) as HTMLElement[];
        marksRef.current = marks;
        setMatchCount(marks.length);
        setCurrentMatch(0);
        
        // Scroll to first match
        if (marks.length > 0) {
          marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
          updateActiveMarkStyle(marks, 0);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [debouncedSearch, numPages]);

  const updateActiveMarkStyle = (marks: HTMLElement[], activeIndex: number) => {
    marks.forEach((mark, index) => {
      if (index === activeIndex) {
        mark.style.backgroundColor = '#f97316'; // orange-500
        mark.style.color = '#fff';
      } else {
        mark.style.backgroundColor = '#facc15'; // yellow-400
        mark.style.color = '#000';
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

  const textRenderer = useCallback(
    (textItem: any) => {
      if (!debouncedSearch) return textItem.str;
      
      const text = textItem.str;
      const query = debouncedSearch;
      
      if (!text.toLowerCase().includes(query.toLowerCase())) {
        return text;
      }

      // We split by regex and wrap with mark tags. 
      // React-PDF safely injects the returned string as HTML when using customTextRenderer.
      const parts = text.split(new RegExp(`(${query})`, 'gi'));
      return parts.map((part: string) => 
        part.toLowerCase() === query.toLowerCase() 
          ? `<mark class="pdf-search-match" style="background-color: #facc15; color: #000; border-radius: 2px; padding: 0 1px;">${part}</mark>` 
          : part
      ).join('');
    },
    [debouncedSearch]
  );

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const fileUrl = React.useMemo(() => URL.createObjectURL(file), [file]);

  return (
    <div className="flex flex-col h-full w-full bg-[#323639]">
      {/* Top Search Bar (Outside Document Viewer) */}
      <div className="shrink-0 p-3 bg-white border-b border-slate-200 flex items-center justify-between z-10 shadow-sm">
        <div className="relative w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Find in document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNextMatch();
            }}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#331a6f] focus:ring-1 focus:ring-[#331a6f]"
          />
        </div>
        
        <div className="flex items-center gap-4">
          {debouncedSearch && (
            <span className="text-xs font-medium text-slate-500">
              {matchCount > 0 ? `${currentMatch + 1} of ${matchCount}` : '0 results'}
            </span>
          )}
          
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMatch}
              disabled={matchCount === 0}
              className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Previous Match"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMatch}
              disabled={matchCount === 0}
              className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Next Match"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Document Pages Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto custom-scrollbar relative p-4 flex flex-col items-center gap-4"
        style={{ filter: isDarkMode ? 'invert(1) hue-rotate(180deg) brightness(95%) contrast(105%)' : 'none' }}
      >
        <React.Suspense fallback={
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <span className="text-sm">Initializing PDF engine...</span>
          </div>
        }>
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-sm">Loading PDF...</span>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-48 text-rose-400">
                <FileText className="w-8 h-8 mb-2" />
                <span className="text-sm">Failed to load PDF</span>
              </div>
            }
          >
            {Array.from(new Array(numPages), (el, index) => (
              <div key={`page_${index + 1}`} className="mb-4 shadow-xl shadow-black/20 bg-white">
                <Page 
                  pageNumber={index + 1} 
                  customTextRenderer={textRenderer}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  width={700}
                  className="pdf-page"
                />
              </div>
            ))}
          </Document>
        </React.Suspense>
      </div>
    </div>
  );
}
