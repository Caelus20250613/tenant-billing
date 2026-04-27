import ImagePane from "./ImagePane";
import FormPane from "./FormPane";

export default function BillingInputPage() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      {/* 左ペイン: 画像ビューア (40%) */}
      <div className="w-2/5 h-full border-r border-gray-200 flex-shrink-0">
        <ImagePane />
      </div>

      {/* 右ペイン: フォームエリア (60%) */}
      <div className="flex-1 h-full min-w-0 relative">
        <FormPane />
      </div>
    </div>
  );
}
