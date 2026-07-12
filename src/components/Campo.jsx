export default function Campo({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="text-gray-500 text-[11px] block mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none"
        style={{ background: '#13131A', border: '1px solid #2A2A3A' }} />
    </div>
  )
}
