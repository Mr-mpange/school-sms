import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// Phone number regex patterns for different formats
const PHONE_PATTERNS = [
  /(\+255[0-9]{9})/g,  // +255XXXXXXXXX (Tanzania international)
  /(255[0-9]{9})/g,    // 255XXXXXXXXX (Tanzania without +)
  /(\+234[0-9]{10})/g, // +234XXXXXXXXXX (Nigeria international)
  /(234[0-9]{10})/g,   // 234XXXXXXXXXX (Nigeria without +)
  /(\+254[0-9]{9})/g,  // +254XXXXXXXXX (Kenya international)
  /(254[0-9]{9})/g,    // 254XXXXXXXXX (Kenya without +)
  /(0[67][0-9]{8})/g,  // 07XXXXXXXX or 06XXXXXXXX (local format)
];

// Normalize phone numbers to international format
export const normalizePhoneNumber = (number: string): string => {
  // Remove all non-digit characters except +
  const cleaned = number.replace(/[^\d+]/g, '');
  
  // Handle different formats
  if (cleaned.startsWith('+255')) return cleaned;
  if (cleaned.startsWith('255')) return '+' + cleaned;
  if (cleaned.startsWith('+254')) return cleaned;
  if (cleaned.startsWith('254')) return '+' + cleaned;
  if (cleaned.startsWith('+234')) return cleaned;
  if (cleaned.startsWith('234')) return '+' + cleaned;
  
  // Convert local formats to international (assuming Tanzania as default)
  if (cleaned.startsWith('07') || cleaned.startsWith('06')) {
    return '+255' + cleaned.substring(1);
  }
  
  return cleaned;
};

// Extract phone numbers from text content
export const extractPhoneNumbers = (content: string): string[] => {
  const allMatches: string[] = [];
  
  // Apply all patterns
  PHONE_PATTERNS.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      allMatches.push(...matches);
    }
  });
  
  // Normalize and deduplicate
  const normalized = allMatches
    .map(normalizePhoneNumber)
    .filter(num => num.length >= 10) // Filter out invalid numbers
    .filter((num, index, arr) => arr.indexOf(num) === index); // Remove duplicates
  
  return normalized;
};

// Parse CSV file
export const parseCSV = (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        try {
          const content = results.data
            .flat()
            .filter(cell => typeof cell === 'string')
            .join(' ');
          
          const phoneNumbers = extractPhoneNumbers(content);
          resolve(phoneNumbers);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error),
    });
  });
};

// Parse Excel file
export const parseExcel = async (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        let allContent = '';
        
        // Process all worksheets
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Convert all cells to string and concatenate
          const sheetContent = jsonData
            .flat()
            .filter(cell => cell !== null && cell !== undefined)
            .map(cell => String(cell))
            .join(' ');
          
          allContent += ' ' + sheetContent;
        });
        
        const phoneNumbers = extractPhoneNumbers(allContent);
        resolve(phoneNumbers);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

// Parse Word document (simplified - would need mammoth library for full .docx support)
export const parseWordDocument = async (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const phoneNumbers = extractPhoneNumbers(content);
        resolve(phoneNumbers);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

// Main function to extract phone numbers from any supported file type
export const extractPhoneNumbersFromFile = async (file: File): Promise<string[]> => {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  try {
    if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
      return await parseCSV(file);
    }
    
    if (fileType === 'application/vnd.ms-excel' || 
        fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return await parseExcel(file);
    }
    
    if (fileType === 'application/msword' || 
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.doc') || fileName.endsWith('.docx') ||
        fileType === 'text/plain' || fileName.endsWith('.txt')) {
      return await parseWordDocument(file);
    }
    
    throw new Error('Unsupported file type');
  } catch (error) {
    console.error('Error extracting phone numbers:', error);
    throw error;
  }
};