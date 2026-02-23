import React, { useState, useRef, useEffect } from 'react'
import TailorLayout from '../../layouts/TailorLayout'
import Card from '../../components/ui/Card'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { FiX, FiCamera, FiUpload, FiImage } from 'react-icons/fi'
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'

const sample = [
  { id: 'ST-2001', user: 'Aarav', service: 'Alter', cloth: 'Pant', slot: '11:00-12:00', status: 'Accepted' },
  { id: 'ST-2002', user: 'Riya', service: 'Stitch', cloth: 'Blouse', slot: '14:00-15:00', status: 'Accepted' },
]

const Orders = () => {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}')
      if (!u.id) return

      const q = query(collection(db, 'orders'), where('tailorId', '==', u.id))
      const unsub = onSnapshot(q, (snapshot) => {
        const liveOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setOrders(liveOrders)
      })
      return () => unsub()
    } catch (error) {
      console.error('Error loading live orders:', error)
    }
  }, [])
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [photos, setPhotos] = useState([])
  const [uploadMode, setUploadMode] = useState(null) // 'camera' or 'upload'
  const [stream, setStream] = useState(null)
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const openPhotoModal = (order) => {
    setSelectedOrder(order)
    setPhotos([])
    setUploadMode(null)
    setShowPhotoModal(true)
  }

  const closePhotoModal = () => {
    // Stop camera stream if active
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setShowPhotoModal(false)
    setSelectedOrder(null)
    setPhotos([])
    setUploadMode(null)
  }

  // Stop camera when modal closes or component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera if available
      })
      setStream(mediaStream)
      setUploadMode('camera')
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Could not access camera. Please check permissions or use file upload instead.')
      setUploadMode('upload')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setUploadMode(null)
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (!blob) return

      const reader = new FileReader()
      reader.onloadend = () => {
        const newPhoto = {
          id: Date.now() + Math.random(),
          file: blob,
          preview: reader.result,
          name: `camera-photo-${Date.now()}.jpg`
        }
        setPhotos(prev => [...prev, newPhoto])
      }
      reader.readAsDataURL(blob)
    }, 'image/jpeg', 0.9)
  }

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const imageFiles = files.filter(file => file.type.startsWith('image/'))

    imageFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotos(prev => [...prev, {
          id: Date.now() + Math.random(),
          file: file,
          preview: reader.result,
          name: file.name
        }])
      }
      reader.readAsDataURL(file)
    })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removePhoto = (photoId) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId))
  }

  const handleMarkReady = async () => {
    if (photos.length === 0) {
      alert('Please upload at least one photo before marking as ready')
      return
    }

    if (selectedOrder) {
      try {
        const orderRef = doc(db, 'orders', selectedOrder.id)
        await updateDoc(orderRef, {
          status: 'Ready',
          photos: photos.map(p => p.preview),
          readyAt: new Date().toISOString(),
          needsRevision: false,
          satisfactionStatus: null
        })
      } catch (error) {
        console.error('Error saving order to Firestore:', error)
      }
    }
    closePhotoModal()
  }

  return (
    <TailorLayout>
      <div className="grid lg:grid-cols-2 gap-4">
        {orders.map(o => (
          <Card key={o.id} className="p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{o.id}</div>
              <div className="text-sm text-neutral-600">{o.slot}</div>
            </div>
            <div className="text-sm text-neutral-600 mt-1">{o.user} • {o.service} • {o.cloth}</div>
            {o.status === 'Ready' && !o.needsRevision && (
              <div className="mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium inline-block">
                Ready
              </div>
            )}
            {o.status === 'Not Satisfied' || o.needsRevision ? (
              <div className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium inline-block">
                Needs Revision
              </div>
            ) : null}
            <div className="mt-3">
              {(o.status !== 'Ready' || o.needsRevision || o.status === 'Not Satisfied') ? (
                <PrimaryButton onClick={() => openPhotoModal(o)} className="w-full">
                  {o.needsRevision || o.status === 'Not Satisfied' ? 'Mark Ready Again' : 'Mark Ready'}
                </PrimaryButton>
              ) : (
                <div className="text-sm text-neutral-600">Order marked as ready</div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Photo Upload Modal */}
      {showPhotoModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-lg font-semibold">Mark Order as Ready</div>
                <div className="text-sm text-neutral-600 mt-1">
                  Order {selectedOrder.id} • {selectedOrder.user}
                </div>
              </div>
              <button
                onClick={closePhotoModal}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="text-sm font-medium mb-2">
                Upload Photos <span className="text-red-500">*</span>
              </div>
              <div className="text-xs text-neutral-600 mb-3">
                Upload at least 1 photo of the completed work. You can upload multiple photos.
              </div>

              {/* Choose Upload Method */}
              {!uploadMode && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={startCamera}
                    className="border-2 border-neutral-300 rounded-xl p-6 text-center cursor-pointer hover:border-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/5 transition-colors"
                  >
                    <FiCamera className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                    <div className="text-sm font-medium text-neutral-700">
                      Use Camera
                    </div>
                  </button>
                  <div
                    onClick={() => {
                      fileInputRef.current?.click()
                    }}
                    className="border-2 border-neutral-300 rounded-xl p-6 text-center cursor-pointer hover:border-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/5 transition-colors"
                  >
                    <FiImage className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                    <div className="text-sm font-medium text-neutral-700">
                      Upload Files
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      handlePhotoUpload(e)
                      setUploadMode('upload')
                    }}
                    className="hidden"
                  />
                </div>
              )}

              {/* Camera View */}
              {uploadMode === 'camera' && (
                <div className="mb-4">
                  <div className="relative bg-black rounded-xl overflow-hidden mb-3">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-64 object-contain"
                    />
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="flex gap-2">
                    <PrimaryButton onClick={capturePhoto} className="flex-1">
                      <FiCamera className="w-4 h-4 mr-2" />
                      Capture Photo
                    </PrimaryButton>
                    <button
                      onClick={stopCamera}
                      className="btn-outline"
                    >
                      Switch to Upload
                    </button>
                  </div>
                </div>
              )}

              {/* File Upload Area */}
              {uploadMode === 'upload' && (
                <>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-300 rounded-xl p-6 text-center cursor-pointer hover:border-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/5 transition-colors mb-3"
                  >
                    <FiUpload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                    <div className="text-sm font-medium text-neutral-700 mb-1">
                      Click to upload photos
                    </div>
                    <div className="text-xs text-neutral-500">
                      Support: JPG, PNG (Max 5MB per image)
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                  <button
                    onClick={() => {
                      stopCamera()
                      startCamera()
                    }}
                    className="btn-outline w-full"
                  >
                    <FiCamera className="w-4 h-4 mr-2" />
                    Switch to Camera
                  </button>
                </>
              )}

              {/* Uploaded Photos Preview */}
              {photos.length > 0 && (
                <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.preview}
                        alt={photo.name}
                        className="w-full h-24 object-cover rounded-lg border border-neutral-200"
                      />
                      <button
                        onClick={() => removePhoto(photo.id)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {photos.length === 0 && (
                <div className="mt-3 text-xs text-red-600">
                  At least 1 photo is required
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={closePhotoModal}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <PrimaryButton
                onClick={handleMarkReady}
                className="flex-1"
                disabled={photos.length === 0}
              >
                Mark as Ready ({photos.length} {photos.length === 1 ? 'photo' : 'photos'})
              </PrimaryButton>
            </div>
          </Card>
        </div>
      )}
    </TailorLayout>
  )
}

export default Orders


