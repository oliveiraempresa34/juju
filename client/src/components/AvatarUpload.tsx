/**
 * AvatarUpload Component - Upload de Avatar com Preview
 *
 * Features:
 * - Upload via form multipart (local/S3/Cloudinary)
 * - Upload direto ao S3 via presigned URL (opcional)
 * - Preview da imagem antes do upload
 * - Validação de tipo e tamanho no cliente
 * - Progress indicator
 * - Crop/resize preview (opcional)
 * - Integração com Babylon.js para avatar 3D (futuro)
 *
 * @component AvatarUpload
 */

import React, { useState, useRef, ChangeEvent } from 'react';
import { useAuth } from '../store/useAuth';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onUploadSuccess?: (avatarUrl: string) => void;
  onUploadError?: (error: string) => void;
  maxSizeMB?: number;
  allowedTypes?: string[];
  usePresignedUpload?: boolean; // Se true, usa presigned URL (S3 apenas)
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatarUrl,
  onUploadSuccess,
  onUploadError,
  maxSizeMB = 5,
  allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  usePresignedUpload = false,
}) => {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:2567';

  /**
   * Valida arquivo selecionado
   */
  const validateFile = (file: File): string | null => {
    // Validar tipo
    if (!allowedTypes.includes(file.type)) {
      return `Tipo de arquivo não permitido. Permitidos: ${allowedTypes.join(', ')}`;
    }

    // Validar tamanho
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      return `Arquivo muito grande (${fileSizeMB.toFixed(2)}MB). Máximo: ${maxSizeMB}MB`;
    }

    return null;
  };

  /**
   * Handler de seleção de arquivo
   */
  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      onUploadError?.(validationError);
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Gerar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Upload via FormData (multipart)
   */
  const uploadViaFormData = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      // Progress tracking
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadProgress(progress);
        }
      });

      // Success
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          resolve(response.avatarUrl);
        } else {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error || 'Erro ao fazer upload'));
        }
      });

      // Error
      xhr.addEventListener('error', () => {
        reject(new Error('Erro de rede ao fazer upload'));
      });

      // Abort
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelado'));
      });

      // Send request
      xhr.open('POST', `${API_URL}/api/upload/avatar`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  };

  /**
   * Upload direto ao S3 via presigned URL
   */
  const uploadViaPresignedUrl = async (file: File): Promise<string> => {
    // 1. Obter presigned URL do backend
    const presignedResponse = await fetch(`${API_URL}/api/upload/avatar/presigned`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
      }),
    });

    if (!presignedResponse.ok) {
      const error = await presignedResponse.json();
      throw new Error(error.error || 'Erro ao gerar URL de upload');
    }

    const { uploadUrl, avatarUrl } = await presignedResponse.json();

    // 2. Upload direto ao S3
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error('Erro ao fazer upload para S3');
    }

    // 3. Atualizar avatar URL no backend
    const updateResponse = await fetch(`${API_URL}/api/users/me/avatar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ avatarUrl }),
    });

    if (!updateResponse.ok) {
      throw new Error('Erro ao atualizar avatar no perfil');
    }

    return avatarUrl;
  };

  /**
   * Handler de upload
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Selecione um arquivo primeiro');
      return;
    }

    if (!token) {
      setError('Você precisa estar logado');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      let avatarUrl: string;

      if (usePresignedUpload) {
        avatarUrl = await uploadViaPresignedUrl(selectedFile);
      } else {
        avatarUrl = await uploadViaFormData(selectedFile);
      }

      // Success
      setUploadProgress(100);
      onUploadSuccess?.(avatarUrl);
      setSelectedFile(null);

      // Atualizar preview com URL final
      setPreviewUrl(avatarUrl);
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao fazer upload';
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Handler de remoção de avatar
   */
  const handleRemove = async () => {
    if (!token) return;

    if (!window.confirm('Tem certeza que deseja remover seu avatar?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/upload/avatar`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao remover avatar');
      }

      setPreviewUrl(null);
      setSelectedFile(null);
      onUploadSuccess?.('');
    } catch (err: any) {
      setError(err.message || 'Erro ao remover avatar');
    }
  };

  /**
   * Handler de clique no botão de seleção
   */
  const handleClickSelectFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="avatar-upload-container">
      <style>{`
        .avatar-upload-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 24px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          border: 2px solid rgba(255, 255, 255, 0.1);
        }

        .avatar-preview {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.05);
          border: 3px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .avatar-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          font-size: 60px;
          color: rgba(255, 255, 255, 0.3);
        }

        .file-input-hidden {
          display: none;
        }

        .upload-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .btn-upload {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .btn-upload:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .btn-upload:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-select {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-confirm {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }

        .btn-remove {
          background: rgba(255, 59, 48, 0.8);
          color: white;
        }

        .progress-bar-container {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          transition: width 0.3s ease;
        }

        .error-message {
          color: #ff3b30;
          font-size: 14px;
          text-align: center;
          padding: 8px 12px;
          background: rgba(255, 59, 48, 0.1);
          border-radius: 6px;
          border: 1px solid rgba(255, 59, 48, 0.3);
        }

        .upload-info {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          text-align: center;
        }

        .file-selected-info {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
          text-align: center;
          padding: 8px 12px;
          background: rgba(102, 126, 234, 0.2);
          border-radius: 6px;
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>

      {/* Preview */}
      <div className="avatar-preview">
        {previewUrl ? (
          <img src={previewUrl} alt="Avatar preview" />
        ) : (
          <div className="avatar-placeholder">👤</div>
        )}
      </div>

      {/* File Input (Hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(',')}
        onChange={handleFileSelect}
        className="file-input-hidden"
      />

      {/* File Selected Info */}
      {selectedFile && (
        <div className="file-selected-info">
          📁 {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)}MB)
        </div>
      )}

      {/* Buttons */}
      <div className="upload-buttons">
        <button
          className="btn-upload btn-select"
          onClick={handleClickSelectFile}
          disabled={uploading}
        >
          {selectedFile ? '🔄 Escolher Outro' : '📁 Selecionar Arquivo'}
        </button>

        {selectedFile && (
          <button
            className="btn-upload btn-confirm"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? '⏳ Enviando...' : '✅ Confirmar Upload'}
          </button>
        )}

        {previewUrl && !selectedFile && (
          <button
            className="btn-upload btn-remove"
            onClick={handleRemove}
            disabled={uploading}
          >
            🗑️ Remover Avatar
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {/* Error Message */}
      {error && <div className="error-message">⚠️ {error}</div>}

      {/* Upload Info */}
      <div className="upload-info">
        Formatos permitidos: PNG, JPEG, WebP<br />
        Tamanho máximo: {maxSizeMB}MB
      </div>
    </div>
  );
};

export default AvatarUpload;
