import React, { useEffect, useRef } from 'react';
import { DocSection, TocItem, ViewMode } from '../types';
import { FileText, ChevronRight, Upload, Download, List, Hash } from 'lucide-react';

interface SidebarProps {
  // Mode specific data
  viewMode: ViewMode;
  sections?: DocSection[]; // For Sectioned View
  toc?: TocItem[]; // For Continuous View
  
  activeId: string;
  onSelect: (id: string) => void;
  fileName: string;
  isOpen: boolean;
  onCloseMobile: () => void;
  onReset: () => void;
  onDownload: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  viewMode,
  sections, 
  toc,
  activeId, 
  onSelect, 
  fileName,
  isOpen,
  onCloseMobile,
  onReset,
  onDownload
}) => {
  // Ref for the currently active item to scroll it into view
  const activeItemRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll the sidebar to keep the active item visible
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeId]);
  
  const renderSectionedList = () => (
    <ul className="space-y-1">
      {sections?.map((section) => {
        const isActive = section.id === activeId;
        return (
          <li key={section.id}>
            <button
              onClick={() => {
                onSelect(section.id);
                onCloseMobile();
              }}
              className={`
                w-full text-left px-2 py-1.5 rounded-lg text-base transition-all duration-200 group flex items-center justify-between font-medium
                ${isActive 
                  ? 'bg-[#5ABDAC]/10 text-[#5ABDAC] ring-1 ring-[#5ABDAC]/30' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <span className="truncate">{section.title || "Untitled Section"}</span>
              {isActive && <ChevronRight size={16} className="text-[#5ABDAC]" />}
            </button>
          </li>
        );
      })}
    </ul>
  );

  const renderContinuousTOC = () => (
    <ul className="space-y-0.5">
      {toc?.map((item, index) => {
        const isActive = item.id === activeId;
        // Indentation based on header level - Increased for distinct visual hierarchy
        // Level 1: 0.5rem (8px)
        // Level 2: 2.0rem (32px)
        // Level 3: 3.5rem (56px)
        const paddingLeft = item.level === 1 ? '0.5rem' : item.level === 2 ? '2rem' : '3.5rem';
        const fontSize = item.level === 1 ? 'text-sm font-semibold' : 'text-xs font-medium';
        
        return (
          <li key={`${item.id}-${index}`}>
            <button
              ref={isActive ? activeItemRef : null}
              onClick={() => {
                onSelect(item.id);
                onCloseMobile();
              }}
              style={{ paddingLeft }}
              className={`
                w-full text-left py-1 pr-1 rounded-md transition-all duration-200 group flex items-center
                ${isActive 
                  ? 'bg-[#5ABDAC]/10 text-[#5ABDAC] shadow-sm shadow-[#5ABDAC]/5' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }
                ${fontSize}
              `}
            >
              {item.level === 1 && <Hash size={12} className={`mr-2 flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-40'}`} />}
              {item.level > 1 && <span className="mr-2 opacity-30">•</span>}
              <span className="truncate leading-relaxed">{item.title}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside 
      className="h-full bg-[#0f172a] shadow-xl flex flex-col"
    >
      <div className="flex flex-col h-full">
        {/* Header - Reduced padding to p-3 */}
        <div className="p-3 border-b border-slate-800 bg-[#0f172a]">
          <div className="flex items-center gap-2 text-slate-100 mb-2">
            <FileText size={20} className="text-[#5ABDAC] flex-shrink-0" />
            <h1 className="font-bold text-base tracking-tight leading-tight break-words truncate" title={fileName}>{fileName}</h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-widest bg-slate-900/50 p-1.5 rounded border border-slate-800/50">
            <List size={12} />
            {viewMode === 'sectioned' ? 'Sectioned View' : 'Continuous View'}
          </div>
        </div>

        {/* Navigation List - Reduced padding to px-1.5 */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-1.5 py-2">
          {viewMode === 'sectioned' ? renderSectionedList() : renderContinuousTOC()}
        </nav>

        {/* Footer - Reduced padding to p-3 */}
        <div className="p-3 border-t border-slate-800 bg-[#0f172a] space-y-2">
            <button 
              onClick={onDownload}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#5ABDAC] hover:bg-[#4AA89C] text-[#0f172a] rounded-lg text-sm font-bold transition-all shadow-lg shadow-[#5ABDAC]/10"
            >
              <Download size={16} />
              Export HTML
            </button>
            <button 
              onClick={onReset}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
            >
              <Upload size={16} />
              Open New File
            </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;