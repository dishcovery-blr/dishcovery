import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Consumer } from '../../types/database'

export default function AdminConsumers() {
  const [consumers, setConsumers] = useState<Consumer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadConsumers() }, [])

  async function loadConsumers() {
    const { data } = await supabase
      .from('consumers')
      .select('*')
      .order('created_at', { ascending: false })
    setConsumers(data ?? [])
    setLoading(false)
  }

  const filtered = search
    ? consumers.filter(c => c.display_name.toLowerCase().includes(search.toLowerCase()))
    : consumers

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Consumers</h1>

      <input
        className="admin-search"
        type="text"
        placeholder="Search by name…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 20 }}
      />

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : (
        <div className="admin-consumer-list">
          <div className="admin-consumer-header">
            <span>Name</span>
            <span>Joined</span>
          </div>
          {filtered.map(consumer => (
            <div key={consumer.id} className="admin-consumer-row">
              <span className="admin-consumer-name">{consumer.display_name}</span>
              <span className="admin-consumer-date">
                {new Date(consumer.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          ))}
          {filtered.length === 0 && <div className="admin-empty">No consumers found.</div>}
        </div>
      )}
    </div>
  )
}
