import { useState, useRef, useEffect } from 'react';
import { X, Euro, Upload, Trash2, Camera } from 'lucide-react';
import Button from './Button';
import Card from './Card';

interface ReceptionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  inspectionId: string;
  customerName: string;
  onSuccess: () => void;
}

interface InspectionData {
  id: string;
  comments: string;
  photos: Array<{
    id: string;
    photo_url: string;
    photo_order: number;
  }>;
}

interface PhotoPreview {
  file: File;
  preview: string;
}

export default function ReceptionReportModal({
  isOpen,
  onClose,
  bookingId,
  inspectionId,
  customerName,
  onSuccess,
}: ReceptionReportModalProps) {
  const [inspectionData, setInspectionData] = useState<InspectionData | null>(null);
  const [loadingInspection, setLoadingInspection] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newPhotos, setNewPhotos] = useState<PhotoPreview[]>([]);
  const [workPerformed, setWorkPerformed] = useState('');
  const [partsReplaced, setPartsReplaced] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasSignature, setHasSignature] = useState(false);

  // Charger l'état des lieux existant
  useEffect(() => {
    if (isOpen && bookingId) {
      loadInspection();
    }
  }, [isOpen, bookingId]);

  const loadInspection = async () => {
    setLoadingInspection(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/inspection`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
      });

      if (response.ok) {
        const { data } = await response.json();
        setInspectionData(data);
      } else {
        console.warn('⚠️ Pas d\'état des lieux trouvé pour ce booking');
      }
    } catch (err) {
      console.error('Erreur chargement inspection:', err);
    } finally {
      setLoadingInspection(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (newPhotos.length + files.length > 5) {
      setError('Maximum 5 nouvelles photos autorisées');
      return;
    }

    const photos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setNewPhotos([...newPhotos, ...photos]);
    setError('');
  };

  const removePhoto = (index: number) => {
    const photos = [...newPhotos];
    URL.revokeObjectURL(photos[index].preview);
    photos.splice(index, 1);
    setNewPhotos(photos);
  };

  if (!isOpen) return null;

  const totalCost = (parseFloat(laborCost) || 0) + (parseFloat(partsCost) || 0);

  // Signature canvas handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async () => {
    if (!workPerformed.trim()) {
      setError('Veuillez décrire les travaux réalisés');
      return;
    }

    if (!hasSignature) {
      setError('La signature du client est requise');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Convertir la signature en base64
      const canvas = canvasRef.current;
      const signatureData = canvas?.toDataURL('image/png') || '';

      // 1. Créer le PV
      const reportResponse = await fetch(`/api/bookings/${bookingId}/reception-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
        body: JSON.stringify({
          inspectionId,
          technicianId: null, // TODO: Récupérer l'UUID du technicien connecté
          workPerformed,
          partsReplaced,
          recommendations,
          laborCost: parseFloat(laborCost) || 0,
          partsCost: parseFloat(partsCost) || 0,
          totalCost,
          customerSignatureData: signatureData,
        }),
      });

      if (!reportResponse.ok) {
        throw new Error('Erreur lors de la création du PV');
      }

      const { data: report } = await reportResponse.json();

      // 2. Envoyer l'email
      const sendResponse = await fetch(`/api/reception-reports/${report.id}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
      });

      if (!sendResponse.ok) {
        throw new Error('Erreur lors de l\'envoi de l\'email');
      }

      // Succès !
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    newPhotos.forEach(photo => URL.revokeObjectURL(photo.preview));
    setNewPhotos([]);
    setNewComment('');
    setWorkPerformed('');
    setPartsReplaced('');
    setRecommendations('');
    setLaborCost('');
    setPartsCost('');
    clearSignature();
    setError('');
    setInspectionData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">PV de réception</h2>
            <p className="text-sm text-gray-600 mt-1">Client : {customerName}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loadingInspection ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Chargement de l'état des lieux...</p>
            </div>
          ) : (
            <>
              {/* État des lieux (lecture seule) */}
              {inspectionData ? (
                <Card className="bg-gray-50">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Camera className="h-5 w-5 text-blue-500" />
                    État des lieux initial
                  </h3>

                  {/* Photos de l'état des lieux */}
                  {inspectionData.photos && Array.isArray(inspectionData.photos) && inspectionData.photos.filter(p => p).length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Photos du vélo ({inspectionData.photos.filter(p => p).length})</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {inspectionData.photos.filter(p => p).map((photo, index) => {
                          const imageUrl = photo.photo_url.startsWith('http') 
                            ? photo.photo_url 
                            : `http://localhost:3000${photo.photo_url}`;
                          
                          return (
                            <img
                              key={photo.id || index}
                              src={imageUrl}
                              alt={`Photo ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border-2 border-gray-300"
                              onError={(e) => {
                                console.error('❌ Erreur chargement image:', imageUrl);
                                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImage non disponible%3C/text%3E%3C/svg%3E';
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Commentaire initial */}
                  {inspectionData.comments && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Observations initiales</p>
                      <div className="bg-white p-4 rounded-lg border border-gray-300">
                        <p className="text-gray-800 whitespace-pre-wrap">{inspectionData.comments}</p>
                      </div>
                    </div>
                  )}
                </Card>
              ) : (
                <Card className="bg-yellow-50 border-yellow-200">
                  <div className="flex items-start gap-3">
                    <div className="text-yellow-600 text-2xl">⚠️</div>
                    <div>
                      <h3 className="font-semibold text-yellow-900 mb-2">
                        Aucun état des lieux trouvé
                      </h3>
                      <p className="text-sm text-yellow-800">
                        Vous devez d'abord créer un état des lieux avant de pouvoir remplir le PV de réception.
                        Fermez ce modal et cliquez sur le bouton "📸 État des lieux" pour commencer.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Nouveau commentaire technique */}
              <Card>
                <h3 className="text-lg font-semibold mb-4">Commentaire technique (optionnel)</h3>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ajoutez des observations techniques supplémentaires..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </Card>

              {/* Nouvelles photos (optionnel) */}
              <Card>
                <h3 className="text-lg font-semibold mb-4">Photos supplémentaires (optionnel)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {newPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo.preview}
                        alt={`Nouvelle photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {newPhotos.length < 5 && (
                    <label className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                      <Upload className="h-6 w-6 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-600">Ajouter</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </Card>

    
            </>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">📧 Envoi automatique</h4>
            <p className="text-sm text-blue-800">
              Une fois validé, le PV de réception avec la synthèse des travaux sera automatiquement envoyé au client et au magasin par email.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
          >
            Annuler
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={loading || !workPerformed.trim() || !hasSignature}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Valider et envoyer
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
