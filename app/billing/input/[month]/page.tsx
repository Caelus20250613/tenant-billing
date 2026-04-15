import ImagePane from "./ImagePane";
import FormPane from "./FormPane";

export default function BillingInputPage() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      {/* 左ペイン: 画像ビューア (50%) */}
      <div className="w-1/2 h-full border-r border-gray-200">
        <ImagePane />
      </div>
      
      {/* 右ペイン: フォームエリア (50%) */}
      <div className="w-1/2 h-full relative">
        <FormPane />
      </div>
    </div>
  );
}
