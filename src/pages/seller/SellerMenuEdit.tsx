import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import type { MenuCategory, MenuItem } from '../../types/database'

type CategoryWithItems = MenuCategory & { menu_items: MenuItem[] }

const DIETARY = ['Eggless', 'Vegan', 'Gluten-Free', 'Jain', 'Keto', 'Low Sugar']

export default function SellerMenuEdit() {
  const { seller } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<CategoryWithItems[]>([])
  const [newCatName, setNewCatName] = useState('')
  const [addingItem, setAddingItem] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (seller) loadMenu()
  }, [seller])

  async function loadMenu() {
    if (!seller) return
    const { data } = await supabase
      .from('menu_categories')
      .select('*, menu_items(*)')
      .eq('seller_id', seller.id)
      .order('sort_order')
    setCategories(data ?? [])
    setLoading(false)
  }

  async function addCategory() {
    if (!seller || !newCatName.trim()) return
    const { data } = await supabase
      .from('menu_categories')
      .insert({ seller_id: seller.id, name: newCatName.trim(), sort_order: categories.length })
      .select('*, menu_items(*)')
      .single()
    if (data) setCategories([...categories, data])
    setNewCatName('')
  }

  async function deleteCategory(id: string) {
    await supabase.from('menu_categories').delete().eq('id', id)
    setCategories(categories.filter(c => c.id !== id))
  }

  async function addItem(categoryId: string, item: Partial<MenuItem>, photoFile?: File) {
    if (!seller) return

    let photo_url: string | null = null

    // Upload photo if provided
    if (photoFile) {
      const ext = photoFile.name.split('.').pop()
      const filename = `${Date.now()}.${ext}`
      const path = `${seller.auth_user_id}/menu/${filename}`
      const { error: uploadErr } = await supabase.storage.from('seller-media').upload(path, photoFile)
      if (!uploadErr) {
        photo_url = path
        // Auto-create gallery post
        await supabase.from('seller_photos').insert({
          seller_id: seller.id,
          storage_path: path,
          photo_type: 'gallery',
          caption: item.name ?? 'Menu item',
          sort_order: 999,
        })
      }
    }

    const { data } = await supabase
      .from('menu_items')
      .insert({ seller_id: seller.id, category_id: categoryId, ...item, photo_url })
      .select()
      .single()

    if (data) {
      setCategories(categories.map(c =>
        c.id === categoryId ? { ...c, menu_items: [...(c.menu_items ?? []), data] } : c
      ))
    }
    setAddingItem(null)
  }

  async function toggleAvailable(item: MenuItem) {
    await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id)
    setCategories(categories.map(c => ({
      ...c,
      menu_items: c.menu_items?.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i)
    })))
  }

  async function deleteItem(itemId: string, categoryId: string) {
    await supabase.from('menu_items').delete().eq('id', itemId)
    setCategories(categories.map(c =>
      c.id === categoryId ? { ...c, menu_items: c.menu_items?.filter(i => i.id !== itemId) } : c
    ))
  }

  function getUrl(path: string) {
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/seller-media/${path}`
  }

  if (loading) return <div className="page-loading">Loading…</div>

  return (
    <div className="editor-page">
      <div className="editor-header">
        <button className="back-btn" onClick={() => navigate('/seller/dashboard')}>← Back</button>
        <h1>Menu</h1>
      </div>

      <div className="editor-form">
        <div className="add-category-row">
          <input
            type="text"
            placeholder="New category (e.g. Cakes, Breads, Snacks)"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
          />
          <button className="btn-primary-sm" onClick={addCategory}>+ Add</button>
        </div>

        {categories.length === 0 && (
          <div className="menu-empty"><p>No categories yet. Add one above to get started.</p></div>
        )}

        {categories.map(cat => (
          <div key={cat.id} className="menu-cat-section">
            <div className="menu-cat-header">
              <h2>{cat.name}</h2>
              <div className="menu-cat-actions">
                <button className="add-item-btn" onClick={() => setAddingItem(cat.id)}>+ Add item</button>
                <button className="delete-cat-btn" onClick={() => deleteCategory(cat.id)}>Delete</button>
              </div>
            </div>

            {cat.menu_items?.map(item => (
              <div key={item.id} className={`menu-item-row ${!item.is_available ? 'unavailable' : ''}`}>
                <div className="menu-item-veg-dot" style={{ background: item.is_veg ? '#3B6D11' : '#993C1D' }} />
                {item.photo_url && (
                  <img src={getUrl(item.photo_url)} alt={item.name} className="menu-item-thumb-sm" />
                )}
                <div className="menu-item-details">
                  <span className="menu-item-name">{item.name}</span>
                  {item.flavour && (
                    <span className="menu-item-flags-inline" style={{ color: '#888' }}>{item.flavour}</span>
                  )}
                  {item.dietary_flags?.length > 0 && (
                    <span className="menu-item-flags-inline">{item.dietary_flags.join(' · ')}</span>
                  )}
                </div>
                <span className="menu-item-price">₹{item.price}</span>
                <div className="menu-item-actions">
                  <button className={`toggle-available ${item.is_available ? 'available' : 'unavailable'}`} onClick={() => toggleAvailable(item)}>
                    {item.is_available ? 'On' : 'Off'}
                  </button>
                  <button className="delete-item-btn" onClick={() => deleteItem(item.id, cat.id)}>✕</button>
                </div>
              </div>
            ))}

            {addingItem === cat.id && (
              <AddItemForm
                onSave={(item, photoFile) => addItem(cat.id, item, photoFile)}
                onCancel={() => setAddingItem(null)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function AddItemForm({ onSave, onCancel }: {
  onSave: (item: Partial<MenuItem>, photoFile?: File) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({ name: '', description: '', price: '', flavour: '', is_veg: true, is_available: true, dietary_flags: [] as string[] })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  function toggleFlag(flag: string) {
    setForm(f => ({
      ...f,
      dietary_flags: f.dietary_flags.includes(flag) ? f.dietary_flags.filter(d => d !== flag) : [...f.dietary_flags, flag]
    }))
  }

  function handlePhoto(file: File) {
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function handleSave() {
    if (!form.name.trim() || !form.price) return
    onSave({ ...form, price: Number(form.price), flavour: form.flavour.trim() || null }, photoFile ?? undefined)
  }

  return (
    <div className="add-item-form">
      <div className="add-item-photo-row">
        <label className="add-item-photo-btn">
          {photoPreview
            ? <img src={photoPreview} alt="Preview" className="item-photo-preview" />
            : <span>📷 Add photo<br /><small>Creates gallery post</small></span>
          }
          <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && handlePhoto(e.target.files[0])} />
        </label>

        <div className="add-item-fields">
          <div className="veg-toggle">
            <button className={`veg-btn ${form.is_veg ? 'veg' : ''}`} onClick={() => setForm({ ...form, is_veg: true })}>🟢 Veg</button>
            <button className={`veg-btn ${!form.is_veg ? 'nonveg' : ''}`} onClick={() => setForm({ ...form, is_veg: false })}>🔴 Non-veg</button>
          </div>
          <input type="text" placeholder="Item name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
          <input type="text" placeholder="Flavours (e.g. Chocolate, Vanilla, Strawberry)" value={form.flavour} onChange={e => setForm({ ...form, flavour: e.target.value })} />
          <input type="text" placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <input type="number" placeholder="Price (₹) *" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} min={0} />
        </div>
      </div>

      <div className="dietary-flags-row">
        {DIETARY.map(flag => (
          <button key={flag} className={`flag-btn ${form.dietary_flags.includes(flag) ? 'selected' : ''}`} onClick={() => toggleFlag(flag)}>
            {flag}
          </button>
        ))}
      </div>

      <div className="add-item-actions">
        <button onClick={onCancel}>Cancel</button>
        <button className="btn-primary-sm" onClick={handleSave} disabled={!form.name || !form.price}>Add item</button>
      </div>
    </div>
  )
}
