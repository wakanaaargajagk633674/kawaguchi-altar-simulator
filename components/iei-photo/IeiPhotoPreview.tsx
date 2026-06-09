"use client";

type IeiPhotoPreviewProps = {
  /** 元写真（Before）のローカルプレビュー URL */
  beforeUrl: string | null;
  /** 加工後（After）の画像 URL。MVP では常に null（未実装） */
  afterUrl: string | null;
  /** 処理が完了したか（After 枠の表示文言を切り替える） */
  completed: boolean;
};

/**
 * Before / After プレビュー枠。
 * MVP では After は実装されていないため、未実装である旨を表示する。
 */
export default function IeiPhotoPreview({
  beforeUrl,
  afterUrl,
  completed,
}: IeiPhotoPreviewProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-amber-700">プレビュー</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          Before / After
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Before */}
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Before（元写真）</p>
          <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
            {beforeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={beforeUrl}
                alt="元写真"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="px-4 text-center text-sm text-slate-500">
                写真をアップロードすると表示されます
              </span>
            )}
          </div>
        </div>

        {/* After */}
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">After（加工後）</p>
          <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-lg border border-dashed border-stone-300 bg-stone-50">
            {afterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={afterUrl}
                alt="加工後の写真"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="whitespace-pre-line px-4 text-center text-sm text-slate-500">
                {completed
                  ? "画像処理エンジン未接続のため、現在はモック表示です"
                  : "処理を開始すると、ここに加工後の写真が表示されます"}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
