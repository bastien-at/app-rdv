import { useState } from 'react';
import { X, Upload, Camera, Trash2, Send } from 'lucide-react';
import Button from './Button';
import Card from './Card';

interface BikeInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  customerName: string;
  onSuccess: () => void;
}

interface PhotoPreview {
  file: File;
  preview: string;
}

export default function BikeInspectionModal({
  isOpen,
  onClose,
  bookingId,
  customerName,
  onSuccess,
}: BikeInspectionModalProps) {
  const [comments, setComments] = useState('');
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (photos.length + files.length > 5) {
      setError('Maximum 5 photos autorisées');
      return;
    }

    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setPhotos([...photos, ...newPhotos]);
    setError('');
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      setError('Veuillez ajouter au moins une photo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Créer l'inspection
      const inspectionResponse = await fetch(`/api/bookings/${bookingId}/inspection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
        body: JSON.stringify({
          comments,
          technicianId: null, // TODO: Récupérer l'UUID du technicien connecté
        }),
      });

      if (!inspectionResponse.ok) {
        throw new Error('Erreur lors de la création de l\'état des lieux');
      }

      const { data: inspection } = await inspectionResponse.json();

      // 2. Upload des photos
      const formData = new FormData();
      photos.forEach(photo => {
        formData.append('photos', photo.file);
      });

      const uploadResponse = await fetch(`/api/inspections/${inspection.id}/photos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Erreur lors de l\'upload des photos');
      }

      // 3. Envoyer l'email
      const sendResponse = await fetch(`/api/inspections/${inspection.id}/send`, {
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
    photos.forEach(photo => URL.revokeObjectURL(photo.preview));
    setPhotos([]);
    setComments('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">État des lieux du vélo</h2>
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
          {/* Upload photos */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-500" />
              Photos du vélo (1 à 5 photos)
            </h3>

            {/* Photo grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo.preview}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-40 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Upload button */}
              {photos.length < 5 && (
                <label className="h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Ajouter une photo</span>
                  <span className="text-xs text-gray-400 mt-1">
                    {photos.length}/5
                  </span>
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

            <p className="text-xs text-gray-500">
              Formats acceptés : JPG, PNG, WEBP • Taille max : 5 MB par photo
            </p>
          </Card>

          {/* Commentaires */}
          <Card>
            <h3 className="text-lg font-semibold mb-4">Commentaires et observations</h3>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Décrivez l'état général du vélo, les points d'attention, les défauts constatés..."
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              Ces informations seront envoyées au client et au magasin par email
            </p>
          </Card>

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
              Une fois validé, un email avec les photos et vos commentaires sera automatiquement envoyé au client et au magasin.
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
            disabled={loading || photos.length === 0}
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
