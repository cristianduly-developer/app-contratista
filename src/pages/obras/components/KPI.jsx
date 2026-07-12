export default function KPI({ label, value, color }) {
  return (
    <div className="rounded-xl p-3" style={{ background: '#13131A', border: '1px solid #2A2A3A' }}>
      <p className="text-gray-500 text-[10px] mb-0.5">{label}</p>
      <p className="font-bold text-[15px]" style={{ color }}>{value}</p>
    </div>
  )
}
