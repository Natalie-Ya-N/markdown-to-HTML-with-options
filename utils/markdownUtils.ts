import { DocSection, TocItem } from '../types';

/**
 * Generates a URL-friendly slug from a string.
 * Supports Unicode to handle non-English headers (e.g., Chinese).
 * Matches logic in exportUtils and MarkdownRenderer.
 */
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    // Keep alphanumeric, underscores, hyphens, and unicode characters.
    // Removes ASCII punctuation/symbols.
    .replace(/[^\w\-\u0080-\uFFFF]+/g, '');
};

/**
 * Helper to strip basic markdown syntax from a string.
 * This ensures that a header like "# Hello *World*" generates the same ID ("hello-world")
 * during TOC parsing as it does when React renders the text content ("Hello World").
 */
const cleanMarkdown = (text: string): string => {
  return text
    // Remove links: [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images: ![text](url) -> text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove inline code: `text` -> text
    .replace(/`([^`]+)`/g, '$1')
    // Remove bold/italic: *text* or __text__ -> text
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');
};

/**
 * Splits raw markdown text into sections based on H1 (#) headers.
 */
export const parseMarkdownByH1 = (text: string): DocSection[] => {
  const lines = text.split('\n');
  const sections: DocSection[] = [];
  
  let currentTitle = "Introduction";
  let currentContentLines: string[] = [];
  let sectionIndex = 0;

  // Helper to push a section
  const pushSection = () => {
    if (currentContentLines.length > 0 || currentTitle !== "Introduction") {
      const content = currentContentLines.join('\n').trim();
      const raw = `# ${currentTitle}\n\n${content}`;
      
      sections.push({
        id: `section-${sectionIndex++}`,
        title: currentTitle.replace(/^#\s*/, '').trim(),
        content: content,
        raw: raw
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line is a top-level header (H1)
    if (/^#\s+(.+)/.test(line)) {
      if (sections.length > 0 || currentContentLines.length > 0) {
        pushSection();
      }
      currentTitle = line.replace(/^#\s+/, '').trim();
      currentContentLines = [];
    } else {
      currentContentLines.push(line);
    }
  }

  pushSection();

  if (sections.length > 1 && sections[0].title === "Introduction" && sections[0].content === "") {
    sections.shift();
  }

  return sections;
};

/**
 * Parses markdown to extract H1, H2, H3 for a Table of Contents.
 * Handles duplicate headers by appending a counter.
 */
export const parseTOC = (text: string): TocItem[] => {
  const lines = text.split('\n');
  const toc: TocItem[] = [];
  
  // Regex to match # Title, ## Title, ### Title
  // Captures: 1 = hashes, 2 = title text
  const headerRegex = /^(#{1,3})\s+(.+)$/;
  const slugCounts = new Map<string, number>();

  lines.forEach((line) => {
    const match = line.match(headerRegex);
    if (match) {
      const level = match[1].length;
      // Clean markdown syntax from title before slugifying to match renderer behavior
      const rawTitle = match[2].trim();
      const cleanTitle = cleanMarkdown(rawTitle);
      
      const rawId = slugify(cleanTitle);
      
      let id = rawId;
      if (slugCounts.has(rawId)) {
        const count = slugCounts.get(rawId)! + 1;
        slugCounts.set(rawId, count);
        id = `${rawId}-${count}`;
      } else {
        slugCounts.set(rawId, 0);
      }
      
      toc.push({
        id,
        title: rawTitle, // Keep original title with markdown for display (optional, but cleaner to display raw)
        level
      });
    }
  });

  return toc;
};