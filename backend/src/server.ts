import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import routes from './routes';
import { cleanExpiredLocks, query } from './db';
import { verifyEmailConfig } from './utils/email';
import { logger } from './utils/logger';

// Charger les variables d'environnement avec debug
const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  logger.error('Erreur chargement .env', result.error);
} else {
  logger.info('.env chargé', { path: envPath });
  logger.debug('Clés trouvées', { keys: Object.keys(result.parsed || {}) });
}

const app = express();
const PORT = process.env.PORT || 3000;

// Fonction de migration pour ajouter la colonne service_type si elle manque
const runMigrations = async () => {
  try {
    await query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'availability_blocks' AND column_name = 'service_type') THEN 
          ALTER TABLE availability_blocks ADD COLUMN service_type VARCHAR(50); 
          RAISE NOTICE 'Colonne service_type ajoutée à availability_blocks';
        END IF; 
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_locks' AND column_name = 'service_type') THEN 
          ALTER TABLE booking_locks ADD COLUMN service_type VARCHAR(50); 
          RAISE NOTICE 'Colonne service_type ajoutée à booking_locks';
        END IF;
      END $$;
    `);
    logger.info('Migrations vérifiées');
  } catch (error) {
    logger.error('Erreur lors des migrations', error);
  }
};

// Middlewares de sécurité
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: function(origin, callback) {
    // Autoriser les requêtes sans origine (comme les applications mobiles ou curl)
    if (!origin) return callback(null, true);
    
    // Autoriser l'URL du frontend définie dans .env
    const frontendUrl = process.env.FRONTEND_URL;
    if (frontendUrl && origin === frontendUrl) {
      return callback(null, true);
    }

    // Autoriser localhost, 127.0.0.1 et l'IP locale spécifique
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.1.44')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting (sauf pour login)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite de 100 requêtes par IP
  message: 'Trop de requêtes, veuillez réessayer plus tard',
  skip: (req) => req.path === '/api/admin/login'
});

app.use('/api', limiter);

// Parsing du body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers uploadés
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api', routes);

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
  });
});

// Gestion globale des erreurs
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Erreur serveur', err);
  res.status(500).json({
    success: false,
    error: 'Erreur interne du serveur',
  });
});

// Nettoyage périodique des locks expirés (toutes les 5 minutes)
setInterval(() => {
  cleanExpiredLocks().catch((error) => {
    logger.error('Erreur lors du nettoyage des locks', error);
  });
}, 5 * 60 * 1000);

// Démarrage du serveur uniquement si on n'est pas en mode test
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    logger.info(`Serveur démarré sur le port ${PORT}`);
    logger.info(`Environnement: ${process.env.NODE_ENV || 'development'}`);
    
    // Exécuter les migrations
    await runMigrations();
    
    // Vérifier la configuration email
    const emailConfigValid = await verifyEmailConfig();
    if (!emailConfigValid) {
      logger.warn('Configuration email invalide ou manquante - les emails ne seront pas envoyés');
    } else {
      logger.info('Service d\'emails configuré et actif');
    }
    
    // Nettoyer les locks expirés au démarrage
    try {
      await cleanExpiredLocks();
      logger.info('Locks expirés nettoyés');
    } catch (error) {
      logger.error('Erreur lors du nettoyage des locks (base de données inaccessible)', error);
      logger.warn('Le serveur continue sans connexion à la base de données');
    }
  });
}

// Gestion de l'arrêt gracieux
process.on('SIGTERM', () => {
  logger.info('SIGTERM reçu, arrêt du serveur...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT reçu, arrêt du serveur...');
  process.exit(0);
});

export default app;
