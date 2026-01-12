import React, { useState, useRef, useEffect } from 'react';
import { ParsedDoc, ViewMode } from './types';
import { parseMarkdownByH1, parseTOC } from './utils/markdownUtils';
import { generateStandaloneHtml } from './utils/exportUtils';
import Sidebar from './components/Sidebar';
import MarkdownRenderer from './components/MarkdownRenderer';
import { UploadCloud, Menu, BookOpen, ScrollText, ChevronLeft, ChevronRight } from 'lucide-react';

const App: React.FC = () => {
  const [doc, setDoc] = useState<ParsedDoc | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('sectioned');
  
  // Ref for the main scrollable container
  const mainContentRef = useRef<HTMLElement>(null);
  
  // Resizable Sidebar State
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

  // Handle Resize Events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      let newWidth = e.clientX;
      if (newWidth < 250) newWidth = 250;
      if (newWidth > 600) newWidth = 600;
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none'; 
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Scroll Spy for Continuous View
  useEffect(() => {
    const handleScroll = () => {
      if (viewMode !== 'continuous' || !doc || !doc.toc || !mainContentRef.current) return;

      const container = mainContentRef.current;
      const { scrollTop, scrollHeight, clientHeight } = container;
      
      // Check if we are at the bottom of the page
      const isBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
      if (isBottom && doc.toc.length > 0) {
        const lastId = doc.toc[doc.toc.length - 1].id;
        if (activeSectionId !== lastId) {
            setActiveSectionId(lastId);
        }
        return;
      }

      // Find the visible section
      // Trigger point is slightly down from top (e.g. 150px) to allow header reading
      const triggerTop = 150; 
      let currentId: string | null = null;

      for (const item of doc.toc) {
        const element = document.getElementById(item.id);
        if (!element) continue;

        const rect = element.getBoundingClientRect();
        // If element top is above the trigger line, it implies this section has started.
        // As we iterate down, we keep updating currentId until we hit an element that is BELOW the trigger line.
        if (rect.top <= triggerTop) {
          currentId = item.id;
        } else {
          // Since items are ordered in DOM order, once we find an item below the trigger line,
          // we know the previous item (stored in currentId) is the active one.
          break;
        }
      }

      // Update state only if changed
      if (currentId && currentId !== activeSectionId) {
        setActiveSectionId(currentId);
      } else if (!currentId && doc.toc.length > 0 && scrollTop < triggerTop) {
        // If we are at the very top and no section matches (e.g. before first header), select first.
        const firstId = doc.toc[0].id;
        if (activeSectionId !== firstId) {
             setActiveSectionId(firstId);
        }
      }
    };

    const container = mainContentRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      // Initial check
      handleScroll();
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [viewMode, doc, activeSectionId]);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Strip extension for cleaner UI
    const cleanFileName = file.name.replace(/\.[^/.]+$/, "");

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const sections = parseMarkdownByH1(text);
      const toc = parseTOC(text);
      
      setDoc({
        fileName: cleanFileName,
        sections: sections,
        fullContent: text,
        toc: toc
      });

      if (viewMode === 'sectioned' && sections.length > 0) {
        setActiveSectionId(sections[0].id);
      } else if (viewMode === 'continuous' && toc.length > 0) {
        setActiveSectionId(toc[0].id);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleReset = () => {
    setDoc(null);
    setActiveSectionId(null);
    setSidebarOpen(false);
  };

  const handleDownload = () => {
    if (!doc) return;
    const htmlContent = generateStandaloneHtml(doc, viewMode);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Format date as YYMMDD-HHMM (UTC)
    const now = new Date();
    const year = now.getUTCFullYear().toString().slice(-2);
    const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = now.getUTCDate().toString().padStart(2, '0');
    const hour = now.getUTCHours().toString().padStart(2, '0');
    const minute = now.getUTCMinutes().toString().padStart(2, '0');
    const dateTime = `${year}${month}${day}-${hour}${minute}`;

    // doc.fileName is already stripped of extension
    // Naming convention: filename-dateTime-mode.html
    a.download = `${doc.fileName}-${dateTime}-${viewMode}.html`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Logic for scroll to specific ID in Continuous Mode
  const handleScrollTo = (id: string) => {
    setActiveSectionId(id);
    const element = document.getElementById(id);
    if (element) {
      // Smooth scroll triggers the scroll listener, which updates the sidebar as we go.
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // If no document is loaded, show upload screen with mode selector
  if (!doc) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-xl w-full text-center space-y-10">
          <div className="space-y-4">
            <h1 className="text-5xl font-extrabold text-white tracking-tight">Markdown to HTML</h1>
            <p className="text-slate-400 text-xl font-light">Transform Markdown into dark-themed HTML</p>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-6 w-full max-w-lg mx-auto">
            <button 
              onClick={() => setViewMode('sectioned')}
              className={`flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all duration-300 group relative overflow-hidden ${
                viewMode === 'sectioned' 
                  ? 'bg-[#5ABDAC]/10 border-[#5ABDAC] shadow-[0_0_30px_rgba(90,189,172,0.15)] scale-100' 
                  : 'bg-slate-900 border-slate-800 hover:border-slate-600 hover:bg-slate-800 hover:-translate-y-1 hover:shadow-xl'
              }`}
            >
              <div className={`p-4 rounded-xl transition-all duration-300 ${
                viewMode === 'sectioned' 
                  ? 'bg-[#5ABDAC] text-[#0f172a] shadow-lg shadow-[#5ABDAC]/20' 
                  : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'
              }`}>
                <BookOpen size={28} />
              </div>
              <div>
                <h3 className={`font-bold text-lg mb-1 transition-colors ${viewMode === 'sectioned' ? 'text-[#5ABDAC]' : 'text-slate-200 group-hover:text-white'}`}>Sectioned View</h3>
                <p className="text-xs text-slate-500 font-medium group-hover:text-slate-400">Split by H1 Headers (Tabs)</p>
              </div>
            </button>

            <button 
              onClick={() => setViewMode('continuous')}
              className={`flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all duration-300 group relative overflow-hidden ${
                viewMode === 'continuous' 
                  ? 'bg-[#5ABDAC]/10 border-[#5ABDAC] shadow-[0_0_30px_rgba(90,189,172,0.15)] scale-100' 
                  : 'bg-slate-900 border-slate-800 hover:border-slate-600 hover:bg-slate-800 hover:-translate-y-1 hover:shadow-xl'
              }`}
            >
              <div className={`p-4 rounded-xl transition-all duration-300 ${
                viewMode === 'continuous' 
                  ? 'bg-[#5ABDAC] text-[#0f172a] shadow-lg shadow-[#5ABDAC]/20' 
                  : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'
              }`}>
                <ScrollText size={28} />
              </div>
              <div>
                <h3 className={`font-bold text-lg mb-1 transition-colors ${viewMode === 'continuous' ? 'text-[#5ABDAC]' : 'text-slate-200 group-hover:text-white'}`}>Continuous View</h3>
                <p className="text-xs text-slate-500 font-medium group-hover:text-slate-400">Single Scrollable Page</p>
              </div>
            </button>
          </div>
          
          <div className="w-full max-w-lg mx-auto bg-[#0f172a] p-8 rounded-3xl shadow-2xl border border-slate-800 transition-all hover:border-[#5ABDAC]/50 hover:shadow-[#5ABDAC]/20 group mt-8">
            <label className="flex flex-col items-center cursor-pointer">
              <div className="w-16 h-16 bg-slate-800/50 text-[#5ABDAC] rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#5ABDAC]/10 group-hover:scale-110 transition-all duration-300 ring-1 ring-slate-700 group-hover:ring-[#5ABDAC]/50">
                <UploadCloud size={32} />
              </div>
              <span className="text-lg font-semibold text-slate-200 group-hover:text-[#5ABDAC] transition-colors">Select Markdown File</span>
              <input 
                type="file" 
                accept=".md,.markdown,.txt" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  // Get content to display based on mode
  let contentToRender: React.ReactNode;
  
  if (viewMode === 'sectioned') {
    const sectionIndex = doc.sections.findIndex(s => s.id === activeSectionId);
    const activeSection = doc.sections[sectionIndex];
    const prevSection = sectionIndex > 0 ? doc.sections[sectionIndex - 1] : null;
    const nextSection = sectionIndex < doc.sections.length - 1 ? doc.sections[sectionIndex + 1] : null;

    if (activeSection) {
      contentToRender = (
        <div className="w-full max-w-none text-slate-300 animate-fadeIn">
           <header className="mb-12 pb-8 border-b border-slate-800">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight mb-6 break-words">
                {activeSection.title}
              </h1>
              <div className="h-[1.5px] w-full rounded-full bg-gradient-to-r from-[#5ABDAC] to-transparent"></div>
            </header>
            <MarkdownRenderer content={activeSection.content} />
            
            {/* Navigation Buttons */}
            <div className="mt-16 pt-8 border-t border-slate-800 flex justify-between items-center">
                 <div className="w-1/2 pr-4">
                   {prevSection && (
                     <button 
                       onClick={() => { 
                         setActiveSectionId(prevSection.id);
                         mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                       }} 
                       className="group flex flex-col items-start text-left w-full hover:bg-slate-800/50 p-4 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-800"
                     >
                       <span className="text-sm font-mono text-slate-500 mb-1 flex items-center gap-1 group-hover:text-[#5ABDAC] transition-colors">
                         <ChevronLeft size={16} />
                         Previous
                       </span>
                       <span className="font-medium text-slate-300 group-hover:text-white transition-colors truncate w-full">{prevSection.title}</span>
                     </button>
                   )}
                 </div>
                 <div className="w-1/2 pl-4 flex justify-end">
                   {nextSection && (
                     <button 
                        onClick={() => { 
                          setActiveSectionId(nextSection.id);
                          mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                        }} 
                        className="group flex flex-col items-end text-right w-full hover:bg-slate-800/50 p-4 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-800"
                     >
                       <span className="text-sm font-mono text-slate-500 mb-1 flex items-center gap-1 group-hover:text-[#5ABDAC] transition-colors">
                         Next
                         <ChevronRight size={16} />
                       </span>
                       <span className="font-medium text-slate-300 group-hover:text-white transition-colors truncate w-full">{nextSection.title}</span>
                     </button>
                   )}
                 </div>
            </div>
        </div>
      );
    } else {
      contentToRender = <div className="text-slate-500">Select a section</div>;
    }
  } else {
    // Continuous Mode
    contentToRender = (
      <div className="w-full max-w-none text-slate-300">
        <MarkdownRenderer content={doc.fullContent} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#020617] overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0f172a] border-b border-slate-800 z-30 flex items-center px-4 justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 text-slate-400 hover:bg-slate-800 rounded-md"
          >
            <Menu size={24} />
          </button>
          <span className="font-semibold text-slate-200 truncate max-w-[200px]">{doc.fileName}</span>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div 
        className={`fixed inset-y-0 left-0 z-40 md:static transform transition-transform duration-300 md:transform-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: isSidebarOpen ? '85%' : `${sidebarWidth}px` }}
      >
        <Sidebar 
          viewMode={viewMode}
          sections={doc.sections}
          toc={doc.toc}
          activeId={activeSectionId || ''} 
          onSelect={viewMode === 'sectioned' ? setActiveSectionId : handleScrollTo}
          fileName={doc.fileName}
          isOpen={isSidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
          onReset={handleReset}
          onDownload={handleDownload}
        />
      </div>

      {/* Resizer Handle */}
      <div
        className="hidden md:block w-px bg-slate-800 relative z-50 cursor-col-resize flex-shrink-0 group hover:bg-[#5ABDAC] transition-colors delay-75"
        onMouseDown={startResizing}
      >
          {/* Hit area extender - invisible but wider */}
          <div className="absolute inset-y-0 -left-2 -right-2 z-10" />
      </div>

      {/* Main Content - Reduced padding here (px-5/10 from px-8/12) */}
      <main 
        ref={mainContentRef}
        className="flex-1 h-full overflow-y-auto bg-[#020617] pt-16 md:pt-0 relative scroll-smooth"
      >
        <div className="w-full h-full px-5 py-8 md:px-10 md:py-12 mx-auto">
          {contentToRender}
        </div>
      </main>
    </div>
  );
};

export default App;