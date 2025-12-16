import html2pdf from 'html2pdf.js';
import { Document, Packer, Paragraph, TextRun, Table as DocxTable, TableRow, TableCell, AlignmentType, HeadingLevel } from 'docx';

export interface PDFMetadata {
  headerContent: string;
  footerContent: string;
  logoUrl: string | null;
  logoPos: { x: number; y: number };
  logoSize?: { width: number; height: number };
  fontSize?: number;
}

export const A4_PDF_OPTIONS = {
  margin: 0, // No margin - the content already has 20mm padding built in
  filename: 'worksheet.pdf',
  image: {
    type: 'jpeg',
    quality: 0.98,
  },
  html2canvas: {
    scale: 3.7795275591,
    useCORS: true,
    letterRendering: true,
    logging: false,
    backgroundColor: '#ffffff',
    width: 794, // 210mm at 96 DPI = 794px
    windowWidth: 794,
  },
  jsPDF: {
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
    compress: true,
  },
  pagebreak: {
    mode: ['avoid-all', 'css', 'legacy'],
    avoid: ['tr', 'td', 'th', 'li', 'img'],
  },
};

export const WORKSHEET_CSS = `
  @page {
    size: A4;
    margin: 0;
  }

  html, body {
    margin: 0;
    padding: 0;
    background: white;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  * {
    box-sizing: border-box;
  }

  .worksheet-page,
  .worksheet-page-content {
    font-family: 'Quicksand', sans-serif;
    color: #1e293b;
    line-height: 1.5;
    text-rendering: optimizeLegibility;
    width: 100%;
    background: white;
    margin: 0;
    position: relative;
    word-wrap: break-word;
  }

  /* TipTap ProseMirror content */
  .ProseMirror {
    outline: none;
  }

  .ProseMirror p {
    margin: 0.5rem 0 !important;
  }

  .ProseMirror h1 {
    font-size: 2em;
    font-weight: 700;
    margin: 1rem 0 0.5rem 0 !important;
  }

  .ProseMirror h2 {
    font-size: 1.5em;
    font-weight: 600;
    margin: 1rem 0 0.5rem 0 !important;
  }

  .ProseMirror h3 {
    font-size: 1.25em;
    font-weight: 600;
    margin: 1rem 0 0.5rem 0 !important;
  }

  .ProseMirror ul,
  .ProseMirror ol {
    padding-left: 1.5rem;
    margin: 0.5rem 0 !important;
  }

  .ProseMirror li {
    margin-bottom: 0.25rem !important;
  }

  .ProseMirror strong {
    font-weight: 700;
  }

  .ProseMirror em {
    font-style: italic;
  }

  .ProseMirror u {
    text-decoration: underline;
  }

  .worksheet-table, table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
  }

  .worksheet-table td,
  .worksheet-table th,
  table td,
  table th {
    border: 1px solid #cbd5e1;
    padding: 0.5rem;
    text-align: left;
  }

  .worksheet-table th,
  table th {
    background-color: #f1f5f9;
    font-weight: 600;
  }

  .worksheet-image, img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1rem 0;
  }

  .page-break-indicator {
    height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    page-break-after: always !important;
    display: block;
  }

  .ws-header-region {
    position: absolute;
    top: 20mm;
    left: 20mm;
    right: 20mm;
    min-height: 40px;
    max-height: 100px;
    border-bottom: 1px solid #e2e8f0;
    overflow: hidden;
  }

  .ws-footer-region {
    position: absolute;
    bottom: 20mm;
    left: 20mm;
    right: 20mm;
    min-height: 30px;
    max-height: 80px;
    border-top: 1px solid #e2e8f0;
    font-size: 0.875rem;
    color: #64748b;
  }

  ul, ol {
    list-style-position: inside;
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  ul {
    list-style-type: disc;
  }

  ol {
    list-style-type: decimal;
  }

  p {
    margin: 0.5rem 0;
  }

  h1, h2, h3 {
    page-break-after: avoid;
  }
`;

export const calculatePageBreaks = (editorElement: HTMLElement): number[] => {
  const PAGE_HEIGHT = 1123; // 297mm @ 96 DPI
  const PADDING = 75.6; // 20mm @ 96 DPI
  const CONTENT_HEIGHT = PAGE_HEIGHT - PADDING * 2;

  const breaks: number[] = [];
  const children = Array.from(editorElement.children);
  let currentHeight = 0;

  children.forEach((child, index) => {
    const childHeight = child.getBoundingClientRect().height;

    if (currentHeight + childHeight > CONTENT_HEIGHT) {
      breaks.push(index);
      currentHeight = childHeight;
    } else {
      currentHeight += childHeight;
    }
  });

  return breaks;
};

export const replaceVariables = (
  content: string,
  pageNum: number,
  totalPages: number,
  title: string = ''
): string => {
  return content
    .replace(/\{\{PAGE\}\}/g, pageNum.toString())
    .replace(/\{\{TOTAL\}\}/g, totalPages.toString())
    .replace(/\{\{DATE\}\}/g, new Date().toLocaleDateString())
    .replace(/\{\{TITLE\}\}/g, title);
};

export const prepareForExport = (html: string, meta: PDFMetadata): string => {
  const fontSize = meta.fontSize || 11;

  const styles = `
    <style>
      ${WORKSHEET_CSS}
      @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600&family=Quicksand:wght@400;500;600;700&display=swap');

      /* Apply user-selected font size to worksheet content */
      .worksheet-page {
        font-size: ${fontSize}pt !important;
      }
    </style>
  `;

  // Wrap content in worksheet-page div if not already wrapped
  let processed = html;
  if (!html.includes('worksheet-page')) {
    processed = `<div class="worksheet-page">${html}</div>`;
  }

  // Add headers/footers if defined
  if (meta.headerContent || meta.footerContent) {
    processed = processed.replace(
      /<div class="worksheet-page">/g,
      `<div class="worksheet-page">
        ${
          meta.headerContent
            ? `<div class="ws-header-region">${meta.headerContent}</div>`
            : ''
        }`
    );

    processed = processed.replace(
      /<\/div><!-- end page -->/g,
      `${
        meta.footerContent
          ? `<div class="ws-footer-region">${meta.footerContent}</div>`
          : ''
      }</div>`
    );
  }

  // Add logo overlay
  let logoHTML = '';
  if (meta.logoUrl) {
    const width = meta.logoSize?.width || 150;
    const height = meta.logoSize?.height || 150;
    logoHTML = `<img src="${meta.logoUrl}"
      style="position: absolute;
             left: ${meta.logoPos.x}px;
             top: ${meta.logoPos.y}px;
             width: ${width}px;
             height: ${height}px;
             z-index: 10;" />`;
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        ${styles}
      </head>
      <body>
        ${logoHTML}
        ${processed}
      </body>
    </html>
  `;
};

export const generatePDF = async (
  source: string | HTMLElement,
  meta: PDFMetadata,
  onProgress?: (percent: number) => void
): Promise<Blob> => {
  console.log('=== PDF Generation Debug ===');
  console.log('Source type:', typeof source === 'string' ? 'HTML string' : 'DOM element');
  console.log('Font size:', meta.fontSize);

  const fontSize = meta.fontSize || 11;
  const isDomSource = typeof source !== 'string';

  let elementToRender: HTMLElement;

  // If source is already a DOM element (the preview), use it directly
  if (isDomSource) {
    console.log('Using direct DOM element (100% WYSIWYG)');
    elementToRender = source.cloneNode(true) as HTMLElement;
  } else {
    // Fallback: create from HTML string
    console.log('Creating from HTML string');
    const container = document.createElement('div');
    container.className = 'pdf-worksheet-container worksheet-page';

    // Apply styles
    container.style.width = '210mm';
    container.style.minHeight = '297mm';
    container.style.padding = '20mm';
    container.style.fontSize = `${fontSize}pt`;
    container.style.fontFamily = 'Quicksand, sans-serif';
    container.style.lineHeight = '1.5';
    container.style.backgroundColor = 'white';
    container.style.color = '#1e293b';
    container.style.boxSizing = 'border-box';

    container.innerHTML = source;
    elementToRender = container;
  }

  // Create wrapper to hold the element
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.left = '-99999px';
  wrapper.style.top = '0';
  wrapper.style.visibility = 'hidden';
  wrapper.style.background = 'white';

  // Add CSS
  const styleElement = document.createElement('style');
  styleElement.textContent = WORKSHEET_CSS;
  wrapper.appendChild(styleElement);

  // Add logo if present
  if (!isDomSource && meta.logoUrl) {
    const logoImg = document.createElement('img');
    logoImg.src = meta.logoUrl;
    logoImg.style.position = 'absolute';
    logoImg.style.left = `${meta.logoPos.x}px`;
    logoImg.style.top = `${meta.logoPos.y}px`;
    logoImg.style.width = `${meta.logoSize?.width || 150}px`;
    logoImg.style.height = `${meta.logoSize?.height || 150}px`;
    logoImg.style.zIndex = '10';
    elementToRender.insertBefore(logoImg, elementToRender.firstChild);
  }

  wrapper.appendChild(elementToRender);
  document.body.appendChild(wrapper);

  try {
    onProgress?.(10);

    console.log('About to generate PDF from element...');
    console.log('Element HTML length:', elementToRender.innerHTML.length);
    console.log('Element visible text length:', elementToRender.textContent?.length || 0);
    console.log('Element computed height:', elementToRender.scrollHeight + 'px');

    // Wait for fonts and images to load
    await new Promise(resolve => setTimeout(resolve, 500));

    // Trim a trailing "blank page" caused by tiny overflow beyond a page boundary.
    // This prevents an extra empty page (sometimes rendered black by some PDF viewers).
    try {
      const probe = document.createElement('div');
      probe.style.height = '297mm';
      probe.style.width = '1px';
      probe.style.position = 'absolute';
      probe.style.left = '0';
      probe.style.top = '0';
      wrapper.appendChild(probe);
      const pageHeightPx = probe.getBoundingClientRect().height || 1122.5;
      probe.remove();

      const worksheetPage = elementToRender.querySelector('.worksheet-page-content') as HTMLElement | null;
      if (worksheetPage && pageHeightPx > 0) {
        const baseRect = worksheetPage.getBoundingClientRect();
        const excluded = new Set([
          'STYLE',
          'SCRIPT',
        ]);

        let maxBottom = 0;
        const elements = Array.from(worksheetPage.querySelectorAll('*')) as HTMLElement[];
        for (const el of elements) {
          if (excluded.has(el.tagName)) continue;
          if (
            el.classList.contains('worksheet-margin-overlays') ||
            el.classList.contains('worksheet-page-dividers') ||
            el.classList.contains('image-resize-handles') ||
            el.classList.contains('resize-handle') ||
            el.classList.contains('ws-logo-resize-handle') ||
            el.classList.contains('ws-logo-delete')
          ) {
            continue;
          }

          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') continue;

          const hasMeaningfulText = (el.textContent || '').trim().length > 0;
          const isMedia = el.tagName === 'IMG' || el.tagName === 'TABLE' || el.tagName === 'HR';
          if (!hasMeaningfulText && !isMedia) continue;

          const rect = el.getBoundingClientRect();
          if (rect.width < 1 || rect.height < 1) continue;
          maxBottom = Math.max(maxBottom, rect.bottom - baseRect.top);
        }

        // If we couldn't find anything meaningful, keep 1 page.
        const safetyPx = 8;
        const pagesNeeded = Math.max(1, Math.ceil((maxBottom + safetyPx) / pageHeightPx));
        const targetHeight = Math.round(pagesNeeded * pageHeightPx);

        // Only trim if there's tiny overflow beyond the final boundary (prevents cutting real content).
        const currentHeight = worksheetPage.scrollHeight;
        const overflow = currentHeight - targetHeight;
        if (overflow > 0 && overflow < 24) {
          worksheetPage.style.height = `${targetHeight}px`;
          worksheetPage.style.overflow = 'hidden';
          worksheetPage.style.backgroundColor = 'white';
        }
      }
    } catch (e) {
      console.warn('PDF trim skipped:', e);
    }

    onProgress?.(30);

    // Generate PDF using html2pdf - this will capture the EXACT rendering
    console.log('Calling html2pdf with element...');

    const blob = await (html2pdf() as any)
      .set(A4_PDF_OPTIONS)
      .from(elementToRender)
      .output('blob');

    console.log('PDF generated successfully');
    console.log('PDF blob size:', blob.size, 'bytes');

    onProgress?.(100);
    return blob;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  } finally {
    document.body.removeChild(wrapper);
  }
};

// Helper to convert HTML to plain text for DOCX export
const htmlToText = (html: string): string => {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
};

// Helper to parse HTML and create DOCX paragraphs
const htmlToParagraphs = (html: string, fontSize: number = 11): Paragraph[] => {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const paragraphs: Paragraph[] = [];

  // Convert pt to half-points (Word's size unit)
  const sizeInHalfPts = fontSize * 2;

  // Process node and its children recursively to build TextRuns
  const processNodeForRuns = (node: Node, formatting: { bold?: boolean; italic?: boolean; underline?: boolean; fontSize?: number; color?: string } = {}): TextRun[] => {
    const runs: TextRun[] = [];

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim() || text === ' ') { // Preserve spaces
        const textSize = formatting.fontSize || sizeInHalfPts;
        const runOptions: any = {
          text: text,
          bold: formatting.bold,
          italics: formatting.italic,
          underline: formatting.underline ? {} : undefined,
          size: textSize,
          font: 'Quicksand',
        };

        // Add color if present
        if (formatting.color) {
          runOptions.color = formatting.color.replace('#', '');
        }

        runs.push(new TextRun(runOptions));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const newFormatting = { ...formatting };

      // Update formatting based on element
      if (element.tagName === 'STRONG' || element.tagName === 'B') {
        newFormatting.bold = true;
      }
      if (element.tagName === 'EM' || element.tagName === 'I') {
        newFormatting.italic = true;
      }
      if (element.tagName === 'U') {
        newFormatting.underline = true;
      }

      // Check for inline styles
      if (element.style) {
        // Font size
        if (element.style.fontSize) {
          const inlineFontSize = element.style.fontSize;
          const sizeMatch = inlineFontSize.match(/(\d+)/);
          if (sizeMatch) {
            const size = parseInt(sizeMatch[1]);
            newFormatting.fontSize = size * 2;
          }
        }

        // Color
        if (element.style.color) {
          newFormatting.color = element.style.color;
        }
      }

      // Process all child nodes
      Array.from(element.childNodes).forEach((child) => {
        runs.push(...processNodeForRuns(child, newFormatting));
      });
    }

    return runs;
  };

  // Process top-level elements
  Array.from(temp.childNodes).forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as HTMLElement;

      if (element.tagName === 'P') {
        const runs = processNodeForRuns(element);
        paragraphs.push(
          new Paragraph({
            children: runs.length > 0 ? runs : [new TextRun({ text: '', size: sizeInHalfPts, font: 'Quicksand' })],
            spacing: { after: 120 }, // Small spacing after paragraphs
          })
        );
      } else if (['H1', 'H2', 'H3'].includes(element.tagName)) {
        const level =
          element.tagName === 'H1'
            ? HeadingLevel.HEADING_1
            : element.tagName === 'H2'
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3;

        const runs = processNodeForRuns(element);
        paragraphs.push(
          new Paragraph({
            children: runs.length > 0 ? runs : [new TextRun({ text: element.textContent || '', size: sizeInHalfPts, font: 'Quicksand' })],
            heading: level,
            spacing: { before: 240, after: 120 },
          })
        );
      } else if (element.tagName === 'UL' || element.tagName === 'OL') {
        // Handle lists
        const listItems = element.querySelectorAll('li');
        listItems.forEach((li, index) => {
          const runs = processNodeForRuns(li);
          paragraphs.push(
            new Paragraph({
              children: runs.length > 0 ? runs : [new TextRun({ text: li.textContent || '', size: sizeInHalfPts, font: 'Quicksand' })],
              bullet: element.tagName === 'UL' ? { level: 0 } : undefined,
              numbering: element.tagName === 'OL' ? { reference: 'default-numbering', level: 0 } : undefined,
              spacing: { after: 60 },
            })
          );
        });
      } else if (element.tagName === 'BR') {
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: '', size: sizeInHalfPts, font: 'Quicksand' })] }));
      } else if (element.tagName === 'TABLE') {
        // Handle tables - convert to simple text representation
        const rows = element.querySelectorAll('tr');
        rows.forEach((row) => {
          const cells = row.querySelectorAll('td, th');
          const cellTexts: string[] = [];
          cells.forEach((cell) => {
            cellTexts.push((cell.textContent || '').trim());
          });
          if (cellTexts.length > 0) {
            paragraphs.push(
              new Paragraph({
                children: [new TextRun({ text: cellTexts.join(' | '), size: sizeInHalfPts, font: 'Quicksand' })],
                spacing: { after: 60 },
              })
            );
          }
        });
      } else {
        // For other elements, try to process their content
        const runs = processNodeForRuns(element);
        if (runs.length > 0) {
          paragraphs.push(new Paragraph({ children: runs }));
        }
      }
    } else if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || '';
      if (text.trim()) {
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: text, size: sizeInHalfPts, font: 'Quicksand' })] }));
      }
    }
  });

  return paragraphs.length > 0 ? paragraphs : [new Paragraph({ children: [new TextRun({ text: '', size: sizeInHalfPts, font: 'Quicksand' })] })];
};

export const generateDOCX = async (
  editorHTML: string,
  title: string = 'Worksheet',
  fontSize: number = 11
): Promise<Blob> => {
  console.log('=== DOCX Generation Debug ===');
  console.log('Editor HTML length:', editorHTML.length);
  console.log('Editor HTML preview:', editorHTML.substring(0, 500));
  console.log('Font size:', fontSize);

  // Parse HTML content to DOCX paragraphs with font size
  const paragraphs = htmlToParagraphs(editorHTML, fontSize);
  console.log('Generated paragraphs count:', paragraphs.length);

  // Create document
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 260 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                size: fontSize * 2.5, // Slightly larger for title
                bold: true,
                font: 'Quicksand',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
          }),
          ...paragraphs,
        ],
      },
    ],
  });

  // Generate blob
  const blob = await Packer.toBlob(doc);
  return blob;
};

export const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
