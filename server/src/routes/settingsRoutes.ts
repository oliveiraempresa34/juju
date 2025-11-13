import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Database } from '../database/Database';

export function createSettingsRoutes(database: Database): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    try {
      const settings = await database.getSettings();
      res.json({ settings: {
        headerLogo: settings.headerLogo ?? null
      }});
    } catch (error) {
      console.error('[settings] failed to load settings', error);
      res.status(500).json({ error: 'Erro ao carregar configurações' });
    }
  });

  router.put(
    '/:adminId/logo',
    body('logoDataUrl').optional({ nullable: true }).isString().withMessage('logoDataUrl deve ser uma string'),
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ error: 'Dados inválidos', details: errors.array() });
        }

        const { adminId } = req.params;
        const { logoDataUrl } = req.body as { logoDataUrl?: string | null };

        const admin = await database.getUserById(adminId);
        if (!admin || admin.role !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
        }

        if (logoDataUrl &&
            !/^data:image\/(webp|png|jpeg|jpg);base64,/i.test(logoDataUrl)) {
          return res.status(400).json({ error: 'A imagem deve estar no formato PNG, JPEG ou WebP (data URL)' });
        }

        // Limitar tamanho a ~2.5MB para evitar sobrecarga no banco
        if (logoDataUrl && logoDataUrl.length > 3_500_000) {
          return res.status(400).json({ error: 'Imagem muito grande. Utilize uma WebP com até 2.5MB.' });
        }

        await database.setSetting('headerLogo', logoDataUrl ?? null);

        res.json({
          success: true,
          logo: logoDataUrl ?? null,
          message: logoDataUrl ? 'Logo atualizada com sucesso' : 'Logo removida com sucesso'
        });
      } catch (error) {
        console.error('[settings] failed to update logo', error);
        res.status(500).json({ error: 'Erro ao atualizar logo' });
      }
    }
  );

  return router;
}
