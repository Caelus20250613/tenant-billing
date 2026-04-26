"use client";

import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { useOCRStore } from "@/src/store/useOCRStore";

export default function ImagePane() {
  const [imageUrl, setImageUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { clearExtractedValues } = useOCRStore();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageUrl(URL.createObjectURL(file));
      clearExtractedValues();
    }
  };

  return (
    <div className="h-full w-full bg-gray-100 flex flex-col">
      <div className="p-3 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700">検針表ビューア</h2>
        <div className="flex gap-2">
          <input 
            type="file" 
            accept="image/jpeg, image/png, image/webp" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
          />
          <button
            disabled
            className="flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-50 cursor-not-allowed px-3 py-1.5 rounded border border-gray-200"
            title="検針表の分析はGemini等のAIチャットで行い、結果を「AIの結果を一括入力」から貼り付けてください"
          >
            <Upload className="w-3.5 h-3.5" />
            画像アップロード（無効）
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden relative p-4 flex items-center justify-center">
        <div className="relative w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-white overflow-hidden shadow-inner">
          {imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={imageUrl} 
                alt="検針表"
                className="max-h-full max-w-full object-contain opacity-100"
              />
            </>
          ) : (
            <div className="flex flex-col items-center text-gray-400">
              <Upload className="w-12 h-12 mb-3" />
              <p className="font-semibold">検針表の写真をアップロード</p>
              <p className="text-xs mt-1">上部の「画像アップロード」ボタンをクリック</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
