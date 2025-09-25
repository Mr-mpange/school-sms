// Type declarations for third-party libs we import dynamically in the browser
// These suppress TS module resolution errors when the libraries are installed at runtime.

declare module 'tesseract.js' {
  export function createWorker(options?: any): Promise<any>;
}

declare module 'pdfjs-dist' {
  export const GlobalWorkerOptions: { workerSrc?: string };
  export function getDocument(src: any): { promise: Promise<any> };
}

declare module 'pdfjs-dist/legacy/build/pdf' {
  export const GlobalWorkerOptions: { workerSrc?: string };
  export function getDocument(src: any): { promise: Promise<any> };
}

declare module 'mammoth' {
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>;
}

declare module 'mammoth/mammoth.browser' {
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>;
}
