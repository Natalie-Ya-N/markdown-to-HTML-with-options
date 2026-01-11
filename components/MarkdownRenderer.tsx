import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { visit } from 'unist-util-visit';
import { Info, AlertTriangle, AlertCircle, Flame, Lightbulb } from 'lucide-react';
import { slugify } from '../utils/markdownUtils';

interface MarkdownRendererProps {
  content: string;
}

// Remark plugin to detect [!NOTE], [!TIP], etc. in blockquotes
const remarkAlerts = () => {
  return (tree: any) => {
    visit(tree, 'blockquote', (node: any) => {
      if (!node.children || node.children.length === 0) return;
      const firstChild = node.children[0];
      // We look for a paragraph as the first child
      if (firstChild.type !== 'paragraph' || !firstChild.children || firstChild.children.length === 0) return;
      
      const firstTextNode = firstChild.children[0];
      if (firstTextNode.type !== 'text') return;
      
      const content = firstTextNode.value;
      const alertMatch = content.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
      
      if (alertMatch) {
        const alertType = alertMatch[1].toUpperCase();
        node.data = node.data || {};
        node.data.hProperties = node.data.hProperties || {};
        node.data.hProperties['data-alert-type'] = alertType;
        
        const newText = content.replace(alertMatch[0], '').trimStart();
        
        if (!newText && firstChild.children.length === 1) {
             firstTextNode.value = '';
        } else {
             firstTextNode.value = newText;
        }
      }
    });
  };
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Reset slug counts for each render cycle to ensure IDs match TOC generation logic exactly.
  // This allows duplicate headers to have predictable IDs (e.g., title, title-1).
  const slugCounts = new Map<string, number>();

  const getUniqueId = (text: string): string => {
    const rawId = slugify(text);
    let id = rawId;
    if (slugCounts.has(rawId)) {
      const count = slugCounts.get(rawId)! + 1;
      slugCounts.set(rawId, count);
      id = `${rawId}-${count}`;
    } else {
      slugCounts.set(rawId, 0);
    }
    return id;
  };

  // Helper to extract text from React children to generate ID
  const getNodeText = (children: React.ReactNode): string => {
    let text = "";
    React.Children.forEach(children, (child) => {
      if (typeof child === 'string') {
        text += child;
      } else if (React.isValidElement(child)) {
        const props = child.props as { children?: React.ReactNode };
        if (props.children) {
          text += getNodeText(props.children);
        }
      }
    });
    return text;
  };

  return (
    <div className="markdown-body w-full">
      <style>{`
        /* Base list styles - Top Level */
        .markdown-body ul, .markdown-body ol {
          margin-left: 0.5rem;
          padding-left: 1.5rem;
        }
        
        /* Nested lists get the guide line */
        .markdown-body li > ul, .markdown-body li > ol {
          border-left: 1px solid #334155;
          padding-left: 3rem;
          margin-left: -1.25rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }

        /* Table cell spacing */
        .markdown-body td br {
          display: block;
          margin-top: 3rem !important;
          content: " " !important;
          line-height: 0;
        }

        /* Remove top spacing/border for the very first header to avoid gap at start of page */
        .markdown-body > h1:first-child {
          margin-top: 0 !important;
          padding-top: 0 !important;
          border-top: none !important;
        }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkAlerts]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // We assign IDs to headers for scrolling functionality
          h1: ({node, children, ...props}) => {
            const id = getUniqueId(getNodeText(children));
            // H1 Styling:
            // mt-24 (6rem): Adds significant breathing room from previous section
            // pt-8: Padding between divider and text
            // border-t: The decorative divider line
            // mb-8: Space before content
            return <h1 id={id} className="text-2xl md:text-3xl font-extrabold text-white mt-24 pt-8 mb-8 border-t border-slate-800" {...props}>{children}</h1>
          }, 
          h2: ({node, children, ...props}) => {
            const id = getUniqueId(getNodeText(children));
            return <h2 id={id} className="text-xl md:text-2xl font-bold text-[#5ABDAC] mt-10 mb-5 pb-2 tracking-tight" {...props}>{children}</h2>
          },
          h3: ({node, children, ...props}) => {
            const id = getUniqueId(getNodeText(children));
            return <h3 id={id} className="text-lg md:text-xl font-semibold text-[#4A9E92] mt-8 mb-3" {...props}>{children}</h3>
          },
          h4: ({node, ...props}) => <h4 className="text-base md:text-lg font-semibold text-slate-300 mt-6 mb-2" {...props} />,
          
          // Updated: Changed leading-7 to leading-relaxed for slightly tighter text
          p: ({node, ...props}) => <p className="text-base leading-relaxed text-slate-300 mb-5" {...props} />,
          strong: ({node, ...props}) => <strong className="font-bold text-[#5ABDAC]" {...props} />,
          b: ({node, ...props}) => <b className="font-bold text-[#5ABDAC]" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc list-outside mb-5 text-slate-300 space-y-1.5 text-base marker:text-slate-500" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal list-outside mb-5 text-slate-300 space-y-1.5 text-base marker:text-slate-500" {...props} />,
          // Updated: Changed leading-7 to leading-relaxed
          li: ({node, ...props}) => <li className="pl-2 leading-relaxed" {...props} />,
          
          // Enhanced Blockquote / Callout Handler
          blockquote: ({node, className, children, ...props}) => {
            const alertType = props['data-alert-type'] as string | undefined;

            if (alertType) {
              // Reduced border width from 4px to 2px (border-l-4 -> border-l-2)
              let styles = "border-l-2 rounded-r p-4 my-6 text-sm ";
              let title = alertType;
              let Icon = Info;
              
              switch (alertType) {
                case 'NOTE':
                  styles += "border-blue-500 bg-blue-500/10 text-blue-200";
                  Icon = Info;
                  title = "Note";
                  break;
                case 'TIP':
                  styles += "border-green-500 bg-green-500/10 text-green-200";
                  Icon = Lightbulb;
                  title = "Tip";
                  break;
                case 'IMPORTANT':
                  styles += "border-purple-500 bg-purple-500/10 text-purple-200";
                  Icon = AlertCircle;
                  title = "Important";
                  break;
                case 'WARNING':
                  styles += "border-amber-500 bg-amber-500/10 text-amber-200";
                  Icon = AlertTriangle;
                  title = "Warning";
                  break;
                case 'CAUTION':
                  styles += "border-red-500 bg-red-500/10 text-red-200";
                  Icon = Flame;
                  title = "Caution";
                  break;
                default:
                  styles += "border-slate-500 bg-slate-800/50 text-slate-300";
              }

              return (
                <div className={styles} {...props}>
                  <div className="flex items-center gap-2 mb-2 font-bold opacity-90">
                    <Icon size={18} />
                    <span>{title}</span>
                  </div>
                  <div className="opacity-90 [&>p]:mb-0 [&>p:first-child]:mt-0">
                    {children}
                  </div>
                </div>
              );
            }

            // Default blockquote - Reduced border width, removed italic
            return (
              <blockquote className="border-l-2 border-[#5ABDAC] bg-slate-800/50 pl-5 py-3 my-6 rounded-r text-slate-400 text-sm shadow-sm" {...props}>
                {children}
              </blockquote>
            );
          },
          
          a: ({node, ...props}) => <a className="text-[#5ABDAC] hover:text-[#7CD4C6] underline transition-colors decoration-[#5ABDAC]/30 underline-offset-4" target="_blank" rel="noopener noreferrer" {...props} />,
          code: ({node, className, children, ...props}) => {
             const match = /language-(\w+)/.exec(className || '')
             const isInline = !match && String(children).indexOf('\n') === -1;
             
             if (isInline) {
                 return <code className="bg-slate-800 text-[#5ABDAC] rounded px-1.5 py-0.5 text-sm font-mono border border-slate-700" {...props}>{children}</code>
             }

             return (
               <div className="relative group my-6">
                 <pre className="bg-[#0d1117] text-slate-200 p-5 rounded-xl overflow-x-auto text-sm leading-relaxed border border-slate-800 shadow-2xl">
                   <code className={className} {...props}>
                     {children}
                   </code>
                 </pre>
               </div>
             )
          },
          // Modern Table Styles - Rounded corners, soft colors
          table: ({node, children, ...props}) => (
            <div className="my-8 rounded-lg border border-slate-700/50 shadow-lg overflow-hidden bg-[#0f172a]/40">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700/50" {...props}>
                   {children}
                </table>
              </div>
            </div>
          ),
          thead: ({node, ...props}) => <thead className="bg-slate-900/60" {...props} />,
          th: ({node, ...props}) => <th className="px-6 py-4 text-left text-sm font-bold text-slate-200 uppercase tracking-wider" {...props} />,
          tbody: ({node, ...props}) => <tbody className="divide-y divide-slate-700/50" {...props} />,
          td: ({node, ...props}) => <td className="px-6 py-4 align-top whitespace-pre-wrap text-sm text-slate-300/90 leading-relaxed" {...props} />,
          img: ({node, ...props}) => <img className="max-w-full h-auto rounded-xl shadow-2xl my-6 mx-auto border border-slate-800" {...props} />,
          hr: ({node, ...props}) => <hr className="my-10 border-slate-800" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;