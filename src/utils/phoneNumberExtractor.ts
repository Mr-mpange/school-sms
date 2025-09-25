import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// Regex for phone numbers in multiple formats
const PHONE_PATTERNS = [
  /(\+255[0-9]{9})/g,  // +255XXXXXXXXX
  /(255[0-9]{9})/g,    // 255XXXXXXXXX
  /(\+234[0-9]{10})/g, // +234XXXXXXXXXX
  /(234[0-9]{10})/g,   // 234XXXXXXXXXX
  /(\+254[0-9]{9})/g,  // +254XXXXXXXXX
  /(254[0-9]{9})/g,    // 254XXXXXXXXX
  /(0[67][0-9]{8})/g,  // 07XXXXXXXX or 06XXXXXXXX
];

// Normalize phone numbers to international format
export const normalizePhoneNumber = (number: string): string => {
  const cleaned = number.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+255')) return cleaned;
  if (cleaned.startsWith('255')) return '+' + cleaned;
  if (cleaned.startsWith('+254')) return cleaned;
  if (cleaned.startsWith('254')) return '+' + cleaned;
  if (cleaned.startsWith('+234')) return cleaned;
  if (cleaned.startsWith('234')) return '+' + cleaned;
  if (cleaned.startsWith('07') || cleaned.startsWith('06')) return '+255' + cleaned.substring(1);
  return cleaned;
};

// Parse PDF using pdf.js to extract selectable text (non-OCR)
async function parsePDF(file: File): Promise<string[]> {
  try {
    const pdfjsLib: any = await import('pdfjs-dist');
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += ' ' + pageText;
    }
    return extractPhoneNumbers(fullText);
  } catch (err) {
    console.error('PDF parse error:', err);
    throw new Error('Failed to read PDF');
  }
}

// OCR fallback for scanned PDFs: render first few pages and OCR them
async function ocrPdfPages(file: File, maxPages: number = 3): Promise<string[]> {
  try {
    const pdfjsLib: any = await import('pdfjs-dist');
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const allNums: string[] = [];
    const limit = Math.min(maxPages, pdf.numPages);
    for (let pageNum = 1; pageNum <= limit; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (blob) {
        const nums = await parseImageWithOCR(new File([blob], `page-${pageNum}.jpg`, { type: 'image/jpeg' }));
        allNums.push(...nums);
      }
    }
    // Deduplicate
    return Array.from(new Set(allNums.map(normalizePhoneNumber)));
  } catch (err) {
    console.error('PDF OCR fallback error:', err);
    return [];
  }
}

// Resize image before OCR for performance
async function resizeImageForOCR(file: File, maxDim: number): Promise<Blob | File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim) {
          URL.revokeObjectURL(url);
          resolve(file);
          return;
        }
        const scale = Math.min(maxDim / width, maxDim / height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          resolve(blob || file);
        }, 'image/jpeg', 0.9);
      } catch (_e) {
        URL.revokeObjectURL(url);
        resolve(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

// Parse images using Tesseract OCR
async function parseImageWithOCR(file: File): Promise<string[]> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker({
      workerPath: 'https://unpkg.com/tesseract.js@v5.0.3/dist/worker.min.js',
      corePath: 'https://unpkg.com/tesseract.js-core@v5.0.0/tesseract-core.wasm.js',
      langPath: 'https://unpkg.com/tesseract.js-core@v5.0.0/lang-data',
    } as any);
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const resized = await resizeImageForOCR(file, 2000);
    const { data: { text } } = await worker.recognize(resized);
    await worker.terminate();
    return extractPhoneNumbers(text || '');
  } catch (err) {
    console.error('OCR error:', err);
    throw new Error('Failed to run OCR on image');
  }
}

// Contact structure
export interface ContactRecord {
  phone_number: string;
  name: string | null;
  student_name: string | null;
  class_year: string | null;
  region: string | null;
}

// Helpers
function ci(str: any): string { return String(str || '').trim().toLowerCase(); }
function isTruthy(v: any): boolean { return v !== null && v !== undefined && String(v).trim() !== ''; }

// Extract contacts from rows (CSV/Excel)
function extractContactsFromRows(rows: any[][]): ContactRecord[] {
  if (!rows || rows.length === 0) return [];
  const headerIndex = rows.findIndex(r => Array.isArray(r) && r.some(isTruthy));
  if (headerIndex < 0) return [];
  const headerRow = rows[headerIndex] || [];
  const header = headerRow.map(ci);

  const findIdx = (candidates: string[]): number =>
    header.findIndex(h => candidates.some(c => h === c || h.includes(c)));

  const phoneIdx = findIdx(['phone number', 'phone', 'msisdn', 'mobile']);
  const parentIdx = findIdx(['parent name', 'name']);
  const studentIdx = findIdx(['student name', 'student']);
  const classIdx = findIdx(['class / level', 'class', 'level']);
  const regionIdx = findIdx(['region', 'location', 'area']);

  const contacts: ContactRecord[] = [];
  const seen = new Set<string>();

  for (const row of rows.slice(headerIndex + 1)) {
    if (!Array.isArray(row)) continue;
    const rawPhone = phoneIdx >= 0 ? row[phoneIdx] : null;
    if (!isTruthy(rawPhone)) continue;
    const normalized = normalizePhoneNumber(String(rawPhone));
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);

    contacts.push({
      phone_number: normalized,
      name: parentIdx >= 0 && isTruthy(row[parentIdx]) ? String(row[parentIdx]) : null,
      student_name: studentIdx >= 0 && isTruthy(row[studentIdx]) ? String(row[studentIdx]) : null,
      class_year: classIdx >= 0 && isTruthy(row[classIdx]) ? String(row[classIdx]) : null,
      region: regionIdx >= 0 && isTruthy(row[regionIdx]) ? String(row[regionIdx]) : null,
    });
  }

  return contacts;
}

// Parse CSV rows
async function parseCSVRows(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => resolve((results.data as any[]).map(r => Array.isArray(r) ? r : [r])),
      error: (err) => reject(err),
    });
  });
}

// Parse Excel rows
async function parseExcelRows(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const allRows: any[][] = [];
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
          (jsonData as any[]).forEach(row => allRows.push(Array.isArray(row) ? row : [row]));
        });
        resolve(allRows);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// Parse DOCX using mammoth
export const parseDocx = async (file: File): Promise<ContactRecord[]> => {
  try {
    const mammoth: any = await import('mammoth/mammoth.browser');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text: string = result?.value || '';
    const structured = parseStructuredContactsFromText(text);
    if (structured.length > 0) return structured;

    // fallback to phone numbers only
    const nums = extractPhoneNumbers(text);
    return nums.map(n => ({ phone_number: n, name: null, student_name: null, class_year: null, region: null }));
  } catch (err) {
    console.error('DOCX parse error:', err);
    throw new Error('Failed to read DOCX file');
  }
};

// Parse structured contacts from text
function parseStructuredContactsFromText(content: string): ContactRecord[] {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
  let headerIdx = lines.findIndex((l, i) =>
    ci(lines[i]) === 'student name' &&
    ci(lines[i + 1]) === 'parent name' &&
    ci(lines[i + 2]) === 'phone number' &&
    ci(lines[i + 3]).includes('class') &&
    ci(lines[i + 4]).includes('region')
  );

  if (headerIdx === -1) return [];

  const records: ContactRecord[] = [];
  let i = headerIdx + 5;
  while (i + 4 < lines.length) {
    const maybeIndex = lines[i];
    const hasIndex = /^\d+$/.test(maybeIndex);
    const base = hasIndex ? i + 1 : i;
    if (base + 4 >= lines.length) break;

    const student = lines[base];
    const parent = lines[base + 1];
    const phone = lines[base + 2];
    const klass = lines[base + 3];
    const region = lines[base + 4];

    const normalizedPhone = normalizePhoneNumber(phone);
    if (normalizedPhone) {
      records.push({
        phone_number: normalizedPhone,
        name: parent || null,
        student_name: student || null,
        class_year: klass || null,
        region: region || null,
      });
    }
    i = base + 5;
  }
  return records;
}

// Extract phone numbers from text
export const extractPhoneNumbers = (content: string): string[] => {
  const allMatches: string[] = [];
  const cleanedContent = content.replace(/[\s\-().\u00A0]/g, '');
  PHONE_PATTERNS.forEach(pattern => {
    const matchesOriginal = content.match(pattern);
    if (matchesOriginal) allMatches.push(...matchesOriginal);
    const matchesCleaned = cleanedContent.match(pattern);
    if (matchesCleaned) allMatches.push(...matchesCleaned);
  });
  return allMatches.map(normalizePhoneNumber).filter((num, i, arr) => arr.indexOf(num) === i);
};

// Extract contacts from any file
export const extractContactsFromFile = async (file: File): Promise<ContactRecord[]> => {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // CSV
  if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
    const rows = await parseCSVRows(file);
    const contacts = extractContactsFromRows(rows);
    if (contacts.length > 0) return contacts;
  }

  // Excel
  if (fileType.includes('excel') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
    const rows = await parseExcelRows(file);
    const contacts = extractContactsFromRows(rows);
    if (contacts.length > 0) return contacts;
  }

  // DOCX
  if (fileType.includes('word') || fileName.endsWith('.docx')) {
    return parseDocx(file);
  }

  // TXT
  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    const text = await file.text();
    const structured = parseStructuredContactsFromText(text);
    if (structured.length > 0) return structured;
    const nums = extractPhoneNumbers(text);
    return nums.map(n => ({ phone_number: n, name: null, student_name: null, class_year: null, region: null }));
  }

  // PDF (extract selectable text)
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    let nums = await parsePDF(file);
    if (!nums || nums.length === 0) {
      // Fallback to OCR a few pages for scanned PDFs
      nums = await ocrPdfPages(file, 3);
    }
    return nums.map(n => ({ phone_number: n, name: null, student_name: null, class_year: null, region: null }));
  }

  // Images (OCR)
  if (fileType.startsWith('image/') || fileName.match(/\.(png|jpg|jpeg|bmp|webp|heic|heif)$/i)) {
    const nums = await parseImageWithOCR(file);
    return nums.map(n => ({ phone_number: n, name: null, student_name: null, class_year: null, region: null }));
  }

  throw new Error('Unsupported file type');
};
