export interface DocSection {
  id: string;
  title: string;
  content: string;
  raw: string;
}

export interface TocItem {
  id: string;
  title: string;
  level: number; // 1 for H1, 2 for H2, etc.
}

export interface ParsedDoc {
  fileName: string;
  // For Sectioned View
  sections: DocSection[];
  // For Continuous View
  fullContent: string; 
  toc: TocItem[];
}

export type ViewMode = 'sectioned' | 'continuous';