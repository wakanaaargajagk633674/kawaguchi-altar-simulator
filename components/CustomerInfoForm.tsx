type CustomerInfoFormProps = {
  customerName: string;
  error?: string;
  onCustomerNameChange: (value: string) => void;
};

export default function CustomerInfoForm({
  customerName,
  error,
  onCustomerNameChange,
}: CustomerInfoFormProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-amber-700">見積もり情報</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          お客様名
        </h2>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">
          お客様名 <span className="text-rose-600">必須</span>
        </span>
        <input
          type="text"
          value={customerName}
          onChange={(event) => onCustomerNameChange(event.target.value)}
          placeholder="例：山田 太郎 様"
          className="mt-2 h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
        />
      </label>

      {error ? (
        <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
