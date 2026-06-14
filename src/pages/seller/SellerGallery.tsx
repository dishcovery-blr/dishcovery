import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import type { SellerPhoto } from '../../types/database'

export default function SellerGallery() {
  const { seller } = useAuth()
  const navigate = useNavigate()
  const [photos, setPhotos] = useState<SellerPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [editingCaption, setEditingCaption] = useState<string | null>(null)
  const [captionText, setCaptionText] = useState('')

  useEffect(() => {
    if (seller) loadPhotos()
  }, [seller])

  async function loadPhotos() {
    if (!seller) return
    const { data } = await supabase
      .from('seller_photos')
      .select('*')
      .eq('seller_id', seller.id)
      .eq('photo_type', 'gallery')
      .order('sort_order', { ascending: true })
    setPhotos(data ?? [])
  }

  async function handleUpload(files: FileList) {
    if (!seller) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const path = `${seller.auth_user_id}/gallery/${filename}`
      const { error: uploadErr } = await supabase.storage
        .from('seller-media')
        .upload(path, file)
      if (!uploadErr) {
        await supabase.from('seller_photos').insert({
          seller_id: seller.id,
          storage_path: path,
          photo_type: 'gallery',
          sort_order: photos.length,
        })
      }
    }
    await loadPhotos()
    setUploading(false)
  }

  async function saveCaption(photoId: string) {
    await supabase.from('seller_photos').update({ caption: captionText }).eq('id', photoId)
    setPhotos(photos.map(p => p.id === photoId ? { ...p, caption: captionText } : p))
    setEditingCaption(null)
  }

  async function deletePhoto(photo: SellerPhoto) {
    await supabase.storage.from('seller-media').remove([photo.storage_path])
    await supabase.from('seller_photos').delete().eq('id', photo.id)
    setPhotos(photos.filter(p => p.id !== photo.id))
  }

  function getUrl(path: string) {
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/seller-media/${path}`
  }

  return (
    <div className="editor-page">
      <div className="editor-header">
        <button className="back-btn" onClick={() => navigate('/seller/dashboard')}>← Back</button>
        <h1>Gallery</h1>
        <label className="save-btn">
          {uploading ? 'Uploading…' : '+ Add photos'}
          <input type="file" accept="image/*" multiple hidden
            onChange={e => e.target.files && handleUpload(e.target.files)} />
        </label>
      </div>

      <div className="editor-form">
        <p className="section-hint">
          Add photos of your dishes. Each photo can have a caption — use it to describe the dish, ingredients, or portion size.
        </p>

        {photos.length === 0 && !uploading && (
          <div className="gallery-empty">
            <p>No photos yet.</p>
            <label className="upload-cta">
              Upload your first photo
              <input type="file" accept="image/*" multiple hidden
                onChange={e => e.target.files && handleUpload(e.target.files)} />
            </label>
          </div>
        )}

        <div className="gallery-manage-grid">
          {photos.map(photo => (
            <div key={photo.id} className="gallery-manage-item">
              <div className="gallery-manage-img-wrap">
                <img src={getUrl(photo.storage_path)} alt={photo.caption ?? 'Gallery photo'} />
                <button className="delete-photo-btn" onClick={() => deletePhoto(photo)}>✕</button>
              </div>
              {editingCaption === photo.id ? (
                <div className="caption-edit">
                  <textarea
                    value={captionText}
                    onChange={e => setCaptionText(e.target.value)}
                    placeholder="Describe this dish…"
                    rows={2}
                    autoFocus
                  />
                  <div className="caption-actions">
                    <button onClick={() => setEditingCaption(null)}>Cancel</button>
                    <button className="btn-primary-sm" onClick={() => saveCaption(photo.id)}>Save</button>
                  </div>
                </div>
              ) : (
                <div className="caption-display" onClick={() => {
                  setEditingCaption(photo.id)
                  setCaptionText(photo.caption ?? '')
                }}>
                  {photo.caption
                    ? <span>{photo.caption}</span>
                    : <span className="caption-placeholder">+ Add caption</span>
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}