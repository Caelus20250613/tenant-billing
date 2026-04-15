import { create } from 'zustand';

interface OCRStore {
  extractedValues: number[];
  setExtractedValues: (values: number[]) => void;
  clearExtractedValues: () => void;
}

export const useOCRStore = create<OCRStore>((set) => ({
  extractedValues: [],
  setExtractedValues: (values) => set({ extractedValues: values }),
  clearExtractedValues: () => set({ extractedValues: [] }),
}));
