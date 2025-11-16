/**
 * Upload Routes - Avatar Upload com S3/Cloudinary/Local
 *
 * Features:
 * - Upload direto para S3 com signed URLs
 * - Upload via Cloudinary API
 * - Fallback para storage local (desenvolvimento)
 * - Validação de tipo MIME e tamanho
 * - Integração com Database para salvar URLs
 *
 * Endpoints:
 * - POST /api/upload/avatar - Upload de avatar (retorna URL)
 * - POST /api/upload/avatar/presigned - Gera URL assinada para upload direto (S3)
 * - DELETE /api/upload/avatar - Remove avatar do usuário
 *
 * @module UploadRoutes
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getDatabaseInstance } from '../database/Database';
import { getConfig } from '../config';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// AWS SDK v3 (modular)
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Cloudinary
import { v2 as cloudinary } from 'cloudinary';

const router = Router();
const db = getDatabaseInstance();
const config = getConfig();

// ============================================================
// CONFIGURAÇÃO DE UPLOAD PROVIDERS
// ============================================================

// --- AWS S3 Client ---
let s3Client: S3Client | null = null;

if (config.upload.provider === 'S3' && config.upload.aws) {
  s3Client = new S3Client({
    region: config.upload.aws.region,
    credentials: {
      accessKeyId: config.upload.aws.accessKeyId,
      secretAccessKey: config.upload.aws.secretAccessKey,
    },
  });
  console.info('[Upload] AWS S3 client initialized');
}

// --- Cloudinary Client ---
if (config.upload.provider === 'CLOUDINARY' && config.upload.cloudinary) {
  cloudinary.config({
    cloud_name: config.upload.cloudinary.cloudName,
    api_key: config.upload.cloudinary.apiKey,
    api_secret: config.upload.cloudinary.apiSecret,
  });
  console.info('[Upload] Cloudinary client initialized');
}

// ============================================================
// MULTER CONFIGURATION (Para upload local ou buffer)
// ============================================================

// Storage local (fallback)
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = (req as any).user?.userId || 'unknown';
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${userId}-${randomName}${ext}`);
  },
});

// Memory storage (para S3/Cloudinary)
const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: config.upload.provider === 'LOCAL' ? localStorage : memoryStorage,
  limits: {
    fileSize: config.upload.maxAvatarSizeMB * 1024 * 1024, // MB para bytes
  },
  fileFilter: (req, file, cb) => {
    // Validar MIME type
    if (!config.upload.allowedAvatarTypes.includes(file.mimetype)) {
      return cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Gera nome único para arquivo
 */
function generateUniqueFileName(userId: string, originalName: string): string {
  const randomId = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now();
  const ext = path.extname(originalName);
  return `${userId}-${timestamp}-${randomId}${ext}`;
}

/**
 * Upload para S3
 */
async function uploadToS3(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  if (!s3Client || !config.upload.aws) {
    throw new Error('S3 client not configured');
  }

  const key = `${config.upload.aws.s3AvatarPrefix}${fileName}`;

  const command = new PutObjectCommand({
    Bucket: config.upload.aws.s3Bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    ACL: 'public-read', // ou 'private' + CloudFront
  });

  await s3Client.send(command);

  // Retornar URL (CloudFront ou S3 direto)
  if (config.upload.aws.cloudFrontUrl) {
    return `${config.upload.aws.cloudFrontUrl}/${key}`;
  } else {
    return `https://${config.upload.aws.s3Bucket}.s3.${config.upload.aws.region}.amazonaws.com/${key}`;
  }
}

/**
 * Upload para Cloudinary
 */
async function uploadToCloudinary(
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'drift_avatars',
        public_id: fileName.replace(/\.[^/.]+$/, ''), // Remove extensão
        upload_preset: config.upload.cloudinary?.uploadPreset,
        overwrite: true,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result!.secure_url);
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Remove arquivo do S3
 */
async function deleteFromS3(avatarUrl: string): Promise<void> {
  if (!s3Client || !config.upload.aws) return;

  try {
    // Extrair key do URL
    const urlObj = new URL(avatarUrl);
    const key = urlObj.pathname.substring(1); // Remove leading '/'

    const command = new DeleteObjectCommand({
      Bucket: config.upload.aws.s3Bucket,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('[Upload] Error deleting from S3:', error);
  }
}

/**
 * Remove arquivo do Cloudinary
 */
async function deleteFromCloudinary(avatarUrl: string): Promise<void> {
  try {
    // Extrair public_id do URL
    const urlParts = avatarUrl.split('/');
    const fileNameWithExt = urlParts[urlParts.length - 1];
    const publicId = `drift_avatars/${fileNameWithExt.split('.')[0]}`;

    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('[Upload] Error deleting from Cloudinary:', error);
  }
}

/**
 * Remove arquivo local
 */
function deleteLocalFile(avatarUrl: string): void {
  try {
    const fileName = path.basename(avatarUrl);
    const filePath = path.join(__dirname, '../../uploads/avatars', fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('[Upload] Error deleting local file:', error);
  }
}

// ============================================================
// ROUTES
// ============================================================

/**
 * POST /api/upload/avatar
 * Upload de avatar (multipart/form-data)
 *
 * Body: file (image file)
 * Returns: { avatarUrl: string }
 */
router.post(
  '/avatar',
  authenticate(),
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      let avatarUrl: string;

      // Upload baseado no provider configurado
      switch (config.upload.provider) {
        case 'S3':
          const s3FileName = generateUniqueFileName(userId, file.originalname);
          avatarUrl = await uploadToS3(file.buffer, s3FileName, file.mimetype);
          break;

        case 'CLOUDINARY':
          const cloudinaryFileName = generateUniqueFileName(userId, file.originalname);
          avatarUrl = await uploadToCloudinary(file.buffer, cloudinaryFileName);
          break;

        case 'LOCAL':
        default:
          // Arquivo já foi salvo pelo multer
          avatarUrl = `/uploads/avatars/${file.filename}`;
          break;
      }

      // Deletar avatar antigo (se existir)
      const oldAvatarUrl = await db.getUserAvatar(userId);
      if (oldAvatarUrl) {
        switch (config.upload.provider) {
          case 'S3':
            await deleteFromS3(oldAvatarUrl);
            break;
          case 'CLOUDINARY':
            await deleteFromCloudinary(oldAvatarUrl);
            break;
          case 'LOCAL':
            deleteLocalFile(oldAvatarUrl);
            break;
        }
      }

      // Salvar URL no banco
      await db.updateUserAvatar(userId, avatarUrl);

      return res.status(200).json({
        success: true,
        avatarUrl,
        provider: config.upload.provider,
      });
    } catch (error: any) {
      console.error('[Upload] Error uploading avatar:', error);

      if (error.message.includes('Tipo de arquivo não permitido')) {
        return res.status(400).json({ error: error.message });
      }

      if (error.message.includes('File too large')) {
        return res.status(400).json({
          error: `Arquivo muito grande. Máximo: ${config.upload.maxAvatarSizeMB}MB`,
        });
      }

      return res.status(500).json({ error: 'Erro ao fazer upload do avatar' });
    }
  }
);

/**
 * POST /api/upload/avatar/presigned
 * Gera URL assinada para upload direto ao S3 (client-side upload)
 *
 * Body: { fileName: string, fileType: string }
 * Returns: { uploadUrl: string, avatarUrl: string }
 */
router.post(
  '/avatar/presigned',
  authenticate(),
  async (req: Request, res: Response) => {
    try {
      if (config.upload.provider !== 'S3') {
        return res.status(400).json({
          error: 'Presigned URLs apenas disponíveis com S3',
        });
      }

      const userId = (req as any).user.userId;
      const { fileName, fileType } = req.body;

      if (!fileName || !fileType) {
        return res.status(400).json({
          error: 'fileName e fileType são obrigatórios',
        });
      }

      // Validar tipo de arquivo
      if (!config.upload.allowedAvatarTypes.includes(fileType)) {
        return res.status(400).json({
          error: `Tipo de arquivo não permitido: ${fileType}`,
        });
      }

      const uniqueFileName = generateUniqueFileName(userId, fileName);
      const key = `${config.upload.aws!.s3AvatarPrefix}${uniqueFileName}`;

      const command = new PutObjectCommand({
        Bucket: config.upload.aws!.s3Bucket,
        Key: key,
        ContentType: fileType,
        ACL: 'public-read',
      });

      // Gerar URL assinada (válida por 5 minutos)
      const uploadUrl = await getSignedUrl(s3Client!, command, { expiresIn: 300 });

      // URL final do avatar
      const avatarUrl = config.upload.aws!.cloudFrontUrl
        ? `${config.upload.aws!.cloudFrontUrl}/${key}`
        : `https://${config.upload.aws!.s3Bucket}.s3.${config.upload.aws!.region}.amazonaws.com/${key}`;

      return res.status(200).json({
        success: true,
        uploadUrl,
        avatarUrl,
        expiresIn: 300, // segundos
      });
    } catch (error: any) {
      console.error('[Upload] Error generating presigned URL:', error);
      return res.status(500).json({ error: 'Erro ao gerar URL de upload' });
    }
  }
);

/**
 * DELETE /api/upload/avatar
 * Remove avatar do usuário
 */
router.delete('/avatar', authenticate(), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    // Buscar avatar atual
    const avatarUrl = await db.getUserAvatar(userId);

    if (!avatarUrl) {
      return res.status(404).json({ error: 'Usuário não possui avatar' });
    }

    // Deletar arquivo do storage
    switch (config.upload.provider) {
      case 'S3':
        await deleteFromS3(avatarUrl);
        break;
      case 'CLOUDINARY':
        await deleteFromCloudinary(avatarUrl);
        break;
      case 'LOCAL':
        deleteLocalFile(avatarUrl);
        break;
    }

    // Remover URL do banco
    await db.updateUserAvatar(userId, '');

    return res.status(200).json({
      success: true,
      message: 'Avatar removido com sucesso',
    });
  } catch (error: any) {
    console.error('[Upload] Error deleting avatar:', error);
    return res.status(500).json({ error: 'Erro ao remover avatar' });
  }
});

export default router;
