
import { ParsedDoc, ViewMode, TocItem } from '../types';
import { slugify } from './markdownUtils';

const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Common CSS shared between both export modes
const COMMON_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  body { font-family: 'Inter', sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 0; }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #334155; border-radius: 20px; }
  .custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: #475569; }
  
  /* Layout split */
  .layout-container { display: flex; height: 100vh; overflow: hidden; width: 100%; }
  
  /* Sidebar */
  .sidebar { 
    width: 300px; 
    background-color: #0f172a; 
    display: flex; 
    flex-direction: column; 
    flex-shrink: 0; 
  }

  /* Resizer */
  .resizer {
    width: 1px;
    background-color: #1e293b;
    cursor: col-resize;
    position: relative;
    flex-shrink: 0;
    z-index: 50;
    transition: background-color 0.2s;
  }
  
  /* Hit area for resizer */
  .resizer::after {
      content: '';
      position: absolute;
      top: 0; bottom: 0;
      left: -3px; right: -3px;
      z-index: 10;
  }

  .resizer:hover, .resizer.resizing {
    background-color: #5ABDAC;
    width: 1px; 
  }
  
  /* Reduced main content padding to 2rem */
  .main-content { flex: 1; overflow-y: auto; background-color: #020617; padding: 2rem; min-width: 0; scroll-behavior: smooth; }
  
  /* Sidebar Navigation Items */
  .nav-item {
    display: flex;
    align-items: center;
    width: 100%;
    text-align: left;
    padding: 0.25rem 0.25rem; /* Reduced padding for compact view */
    margin-bottom: 0.15rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    color: #94a3b8; /* slate-400 */
    text-decoration: none;
    /* Removed border-left: 4px solid transparent */
    transition: all 0.2s ease-in-out;
    box-sizing: border-box;
  }
  .nav-item:hover {
    color: #f8fafc;
    background-color: rgba(30, 41, 59, 0.5); /* slate-800/50 */
  }
  .nav-item.active {
    background-color: rgba(90, 189, 172, 0.1); /* #5ABDAC/10 */
    color: #5ABDAC;
    /* Removed border-left-color: #5ABDAC */
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    font-weight: 500;
  }
  
  /* Typography Overrides */
  .prose h1 { 
    font-size: 1.875rem !important; 
    line-height: 2.25rem !important; 
    margin-top: 6rem !important;
    padding-top: 2rem !important;
    border-top: 1px solid #1e293b !important;
    margin-bottom: 2rem !important;
    color: #5ABDAC !important;
    border-bottom: none !important;
  }
  
  /* Remove top spacing/border for the very first header */
  .markdown-rendered > h1:first-child {
    margin-top: 0 !important;
    padding-top: 0 !important;
    border-top: none !important;
  }

  .prose h2 { color: #5ABDAC !important; margin-top: 1.5em !important; }
  .prose h3 { color: #4A9E92 !important; }
  .prose a { color: #5ABDAC !important; }
  .prose strong { color: #5ABDAC !important; }
  .prose code { color: #5ABDAC !important; }
  
  /* Slightly tighter line height for body text (1.625) */
  .prose p, .prose ul, .prose ol, .prose li {
    line-height: 1.625 !important;
  }
  
  /* Blockquote Styling: Remove automatic quotes and italics from Tailwind Typography */
  .prose blockquote { 
    border-left-width: 2px !important; 
    border-left-color: #5ABDAC !important; 
    color: #94a3b8 !important;
    font-style: normal !important; /* Ensure no italics */
    quotes: none !important;
  }
  .prose blockquote p:first-of-type::before { content: none !important; }
  .prose blockquote p:last-of-type::after { content: none !important; }

  /* Callout Styles - Thinner border (2px) */
  .callout { border-left-width: 2px !important; border-radius: 0 0.25rem 0.25rem 0; padding: 1rem !important; margin: 1.5rem 0 !important; background-color: rgba(30, 41, 59, 0.5); }
  .callout-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; margin-bottom: 0.5rem; }
  .callout-note { border-color: #3b82f6 !important; background-color: rgba(59, 130, 246, 0.1) !important; color: #bfdbfe !important; }
  .callout-tip { border-color: #22c55e !important; background-color: rgba(34, 197, 94, 0.1) !important; color: #bbf7d0 !important; }
  .callout-important { border-color: #a855f7 !important; background-color: rgba(168, 85, 247, 0.1) !important; color: #e9d5ff !important; }
  .callout-warning { border-color: #f59e0b !important; background-color: rgba(245, 158, 11, 0.1) !important; color: #fde68a !important; }
  .callout-caution { border-color: #ef4444 !important; background-color: rgba(239, 68, 68, 0.1) !important; color: #fecaca !important; }

  /* Modern Table Styles - Rounded corners & Soft Colors */
  .table-outer-wrapper {
    margin-bottom: 2em;
    border: 1px solid rgba(51, 65, 85, 0.5); /* slate-700/50 */
    border-radius: 0.5rem; /* rounded-lg */
    overflow: hidden;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    background-color: rgba(15, 23, 42, 0.4); /* slate-900/40 */
  }
  
  .table-inner-wrapper {
    overflow-x: auto;
  }

  .prose table { 
    width: 100%; 
    text-align: left; 
    border-collapse: collapse; 
    margin: 0 !important; /* Wrapper handles margin */
    border: none !important;
  }
  
  .prose thead {
    background-color: rgba(15, 23, 42, 0.6); /* Soft dark header */
  }

  .prose thead th { 
    color: #e2e8f0; 
    padding: 1rem 1.5rem; 
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
  }
  
  .prose tbody td { 
    padding: 1rem 1.5rem; 
    color: rgba(203, 213, 225, 0.9); /* slate-300/90 */
    border-top: 1px solid rgba(51, 65, 85, 0.5); /* slate-700/50 */
    font-size: 0.875rem;
    line-height: 1.625;
  }

  /* Ensure separation between header and body */
  .prose tbody tr:first-child td {
     border-top: 1px solid rgba(51, 65, 85, 0.5);
  }

  .prose tbody tr:last-child td { 
     border-bottom: none; 
  }

  /* Lists with Guide Lines - Matching MarkdownRenderer.tsx */
  .prose ul, .prose ol {
    margin-left: 0.5rem !important;
    padding-left: 1.5rem !important;
    list-style-position: outside !important;
  }
  
  .prose li {
    padding-left: 0.5rem !important;
  }
  
  /* Nested lists get the guide line. The negative margin aligns the line under the parent bullet */
  .prose li > ul, .prose li > ol {
    border-left: 1px solid #334155 !important;
    padding-left: 3rem !important;
    margin-left: -1.25rem !important;
    margin-top: 0.5rem !important;
    margin-bottom: 0.5rem !important;
  }
  
  /* Ensure markers are visible */
  .prose li::marker {
    color: #64748b !important;
  }

  @media (max-width: 768px) {
    .layout-container { flex-direction: column; }
    .sidebar { width: 100% !important; height: auto; max-height: 30vh; }
    .main-content { padding: 1.5rem; }
    .resizer { display: none; }
  }
`;

const COMMON_SCRIPTS = `
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            marked.use({ breaks: true, gfm: true });
            
            // Helper to slugify text to match TOC, supporting unicode
            // Must match the logic in utils/markdownUtils.ts
            const slugify = (text) => {
              return text
                .toLowerCase()
                .trim()
                .replace(/\\s+/g, '-')
                .replace(/[^\\w\\-\\u0080-\\uFFFF]+/g, '');
            };

            // Process Markdown
            const rawDivs = document.querySelectorAll('.markdown-raw');
            rawDivs.forEach(div => {
                const raw = div.textContent; 
                let rendered = marked.parse(raw);
                div.nextElementSibling.innerHTML = rendered;
            });

            // Add IDs to headers in the rendered content with duplicate handling
            const slugCounts = {};
            // Select headers that are actually rendered
            const headers = document.querySelectorAll('.markdown-rendered h1, .markdown-rendered h2, .markdown-rendered h3');
            headers.forEach(header => {
               if (!header.id) {
                   // Note: header.textContent matches the 'cleanMarkdown' output effectively 
                   // because marked renders 'foo *bar*' as 'foo <em>bar</em>' and textContent is 'foo bar'.
                   const rawId = slugify(header.textContent);
                   let id = rawId;
                   if (slugCounts[rawId] !== undefined) {
                       slugCounts[rawId]++;
                       id = rawId + '-' + slugCounts[rawId];
                   } else {
                       slugCounts[rawId] = 0;
                   }
                   header.id = id;
               }
            });

            // Wrap tables for styling (Rounded Corners)
            const tables = document.querySelectorAll('.markdown-rendered table');
            tables.forEach(table => {
                if (!table.closest('.table-outer-wrapper')) {
                    const outerWrapper = document.createElement('div');
                    outerWrapper.className = 'table-outer-wrapper';
                    
                    const innerWrapper = document.createElement('div');
                    innerWrapper.className = 'table-inner-wrapper';
                    
                    table.parentNode.insertBefore(outerWrapper, table);
                    outerWrapper.appendChild(innerWrapper);
                    innerWrapper.appendChild(table);
                }
            });

            // Post-processing for Callouts styling
            document.querySelectorAll('.markdown-rendered blockquote').forEach(bq => {
                const firstP = bq.querySelector('p');
                if (!firstP) return;
                const text = firstP.textContent.trim();
                const match = text.match(/^\\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\\]/i);
                if (match) {
                    const type = match[1].toLowerCase();
                    const titleText = type.charAt(0).toUpperCase() + type.slice(1);
                    bq.classList.add('callout', 'callout-' + type);
                    const newText = firstP.innerHTML.replace(/^\\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\\]/i, '').trim();
                    firstP.innerHTML = newText;
                    const titleDiv = document.createElement('div');
                    titleDiv.className = 'callout-title';
                    titleDiv.innerHTML = '<span>' + titleText + '</span>';
                    bq.insertBefore(titleDiv, firstP);
                }
            });

            hljs.highlightAll();

            // --- Scroll Spy & Auto Highlight Logic for Continuous View ---
            const mainContent = document.querySelector('.main-content');
            const navItems = document.querySelectorAll('.nav-item');
            
            // Only active if we have nav items (Continuous Mode)
            if (navItems.length > 0 && mainContent && headers.length > 0) {
                const idToNavItem = {};
                navItems.forEach(item => {
                    const href = item.getAttribute('href');
                    if (href && href.startsWith('#')) {
                        idToNavItem[href.substring(1)] = item;
                    }
                });

                const onScroll = () => {
                    const triggerTop = 150; // Threshold similar to React App
                    let currentId = null;

                    // Iterate to find the current visible section
                    // We check which header is above the "trigger line"
                    for (let i = 0; i < headers.length; i++) {
                        const header = headers[i];
                        const rect = header.getBoundingClientRect();
                        
                        // If header is above the trigger line, it's a candidate
                        if (rect.top <= triggerTop) {
                            currentId = header.id;
                        } else {
                            // Headers are in order; if we find one below, stop
                            break;
                        }
                    }

                    // Check if we are at the bottom of the page
                    if (mainContent.scrollHeight - mainContent.scrollTop <= mainContent.clientHeight + 50) {
                        if (headers.length > 0) {
                             currentId = headers[headers.length - 1].id;
                        }
                    }

                    // Fallback to first item if at top and nothing selected
                    if (!currentId && mainContent.scrollTop < triggerTop && headers.length > 0) {
                        currentId = headers[0].id;
                    }

                    // Apply active class
                    if (currentId) {
                        navItems.forEach(i => i.classList.remove('active'));
                        if (idToNavItem[currentId]) {
                            const activeEl = idToNavItem[currentId];
                            activeEl.classList.add('active');
                            // Auto-scroll sidebar to keep active item in view
                            activeEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
                        }
                    }
                };
                
                // Attach listener
                mainContent.addEventListener('scroll', onScroll, { passive: true });
                // Initial check
                setTimeout(onScroll, 100); 
            }
            
            // --- Resizer Logic ---
            const resizer = document.getElementById('resizer');
            const sidebar = document.querySelector('.sidebar');
            if(resizer && sidebar) {
                let x = 0;
                let w = 0;
                const md = (e) => {
                    x = e.clientX;
                    const sbStyle = window.getComputedStyle(sidebar);
                    w = parseInt(sbStyle.width, 10);
                    document.addEventListener('mousemove', mm);
                    document.addEventListener('mouseup', mu);
                    resizer.classList.add('resizing');
                    document.body.style.cursor = 'col-resize';
                    document.body.style.userSelect = 'none'; 
                };
                const mm = (e) => {
                    const dx = e.clientX - x;
                    let nw = w + dx;
                    if(nw < 200) nw = 200;
                    if(nw > 600) nw = 600;
                    // Cap at 60% of viewport
                    if(nw > window.innerWidth * 0.6) nw = window.innerWidth * 0.6;
                    sidebar.style.width = nw + 'px';
                };
                const mu = () => {
                    document.removeEventListener('mousemove', mm);
                    document.removeEventListener('mouseup', mu);
                    resizer.classList.remove('resizing');
                    document.body.style.removeProperty('cursor');
                    document.body.style.removeProperty('user-select');
                };
                resizer.addEventListener('mousedown', md);
            }
        });
    </script>
`;

/**
 * GENERATOR: Sectioned View (Original)
 */
const generateSectionedHtml = (doc: ParsedDoc): string => {
  const sectionsHtml = doc.sections.map((section, index) => {
    
    // Navigation Logic
    const prevSection = index > 0 ? doc.sections[index - 1] : null;
    const nextSection = index < doc.sections.length - 1 ? doc.sections[index + 1] : null;

    const navButtons = `
       <div class="mt-16 pt-8 border-t border-slate-800 flex justify-between items-center">
         <div class="w-1/2 pr-4">
           ${prevSection ? `
             <button onclick="switchSection('${prevSection.id}')" class="group flex flex-col items-start text-left w-full hover:bg-slate-800/50 p-4 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-800">
               <span class="text-sm font-mono text-slate-500 mb-1 flex items-center gap-1 group-hover:text-[#5ABDAC] transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                 Previous
               </span>
               <span class="font-medium text-slate-300 group-hover:text-white transition-colors truncate w-full">${escapeHtml(prevSection.title)}</span>
             </button>
           ` : ''}
         </div>
         <div class="w-1/2 pl-4 flex justify-end">
           ${nextSection ? `
             <button onclick="switchSection('${nextSection.id}')" class="group flex flex-col items-end text-right w-full hover:bg-slate-800/50 p-4 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-800">
               <span class="text-sm font-mono text-slate-500 mb-1 flex items-center gap-1 group-hover:text-[#5ABDAC] transition-colors">
                 Next
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
               </span>
               <span class="font-medium text-slate-300 group-hover:text-white transition-colors truncate w-full">${escapeHtml(nextSection.title)}</span>
             </button>
           ` : ''}
         </div>
       </div>
    `;

    return `
      <div id="section-${section.id}" class="section-content ${index === 0 ? '' : 'hidden'}">
        <header class="mb-8 pb-4">
           <h1 class="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight leading-tight mb-6">${escapeHtml(section.title)}</h1>
           <div class="h-[1.5px] w-full rounded-full bg-gradient-to-r from-[#5ABDAC] to-transparent"></div>
        </header>
        <div class="prose prose-invert max-w-none">
          <div class="markdown-raw hidden">${escapeHtml(section.content)}</div>
          <div class="markdown-rendered"></div>
        </div>
        ${navButtons}
      </div>
    `;
  }).join('');

  const sidebarItemsHtml = doc.sections.map((section, index) => `
    <li>
      <button onclick="switchSection('${section.id}')" id="btn-${section.id}" class="w-full text-left px-2 py-1.5 rounded-lg text-sm transition-all duration-200 group flex items-center justify-between font-medium ${index === 0 ? 'bg-[#5ABDAC]/10 text-[#5ABDAC] ring-1 ring-[#5ABDAC]/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}">
        <span class="truncate">${escapeHtml(section.title)}</span>
      </button>
    </li>
  `).join('');

  const script = `
    <script>
        function switchSection(id) {
            document.querySelectorAll('.section-content').forEach(el => el.classList.add('hidden'));
            document.getElementById('section-' + id).classList.remove('hidden');
            const mainContent = document.querySelector('.main-content');
            if (mainContent) mainContent.scrollTop = 0;
            
            // Reset buttons
            document.querySelectorAll('button[id^="btn-"]').forEach(btn => {
                btn.className = "w-full text-left px-2 py-1.5 rounded-lg text-sm transition-all duration-200 group flex items-center justify-between font-medium text-slate-300 hover:bg-slate-800 hover:text-white";
            });
            const activeBtn = document.getElementById('btn-' + id);
            if (activeBtn) activeBtn.className = "w-full text-left px-2 py-1.5 rounded-lg text-sm transition-all duration-200 group flex items-center justify-between font-medium bg-[#5ABDAC]/10 text-[#5ABDAC] ring-1 ring-[#5ABDAC]/30";
        }
    </script>
  `;

  return buildHtmlSkeleton(doc.fileName, sidebarItemsHtml, sectionsHtml, script);
};

/**
 * GENERATOR: Continuous View (New)
 */
const generateContinuousHtml = (doc: ParsedDoc): string => {
  // Render just one content block with the full content
  const contentHtml = `
    <div class="prose prose-invert max-w-none">
       <div class="markdown-raw hidden">${escapeHtml(doc.fullContent)}</div>
       <div class="markdown-rendered"></div>
    </div>
  `;

  // Generate nested TOC for sidebar
  const sidebarItemsHtml = doc.toc.map((item) => {
    // Indentation based on header level - Increased for distinct visual hierarchy matching app
    // Level 1: 0.5rem, Level 2: 2.0rem, Level 3: 3.5rem
    const paddingLeft = item.level === 1 ? '0.5rem' : item.level === 2 ? '2rem' : '3.5rem';
    return `
    <li>
      <a href="#${item.id}" class="nav-item" style="padding-left: ${paddingLeft};">
        ${escapeHtml(item.title)}
      </a>
    </li>
    `;
  }).join('');

  return buildHtmlSkeleton(doc.fileName, sidebarItemsHtml, contentHtml, '');
};

const buildHtmlSkeleton = (fileName: string, sidebarContent: string, mainContent: string, extraScript: string) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(fileName)}</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <style>${COMMON_CSS}</style>
</head>
<body>
    <div class="layout-container">
        <aside class="sidebar">
            <div class="p-3 border-b border-slate-800 bg-slate-900">
                <h1 class="font-bold text-lg text-slate-100">${escapeHtml(fileName)}</h1>
            </div>
            <!-- Reduced padding on nav container to match app -->
            <nav class="flex-1 overflow-y-auto custom-scrollbar px-1.5 py-2">
                <ul class="space-y-1">${sidebarContent}</ul>
            </nav>
        </aside>
        
        <!-- Resizer handle -->
        <div id="resizer" class="resizer"></div>
        
        <main class="main-content custom-scrollbar">
            ${mainContent}
        </main>
    </div>
    ${COMMON_SCRIPTS}
    ${extraScript}
</body>
</html>`;
}

export const generateStandaloneHtml = (doc: ParsedDoc, mode: ViewMode): string => {
  if (mode === 'sectioned') {
    return generateSectionedHtml(doc);
  } else {
    return generateContinuousHtml(doc);
  }
};