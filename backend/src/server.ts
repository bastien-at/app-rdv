import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import routes from './routes';
import { cleanExpiredLocks } from './db';
import { verifyEmailConfig } from './utils/email';

// Charger les variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de sécurité
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite de 100 requêtes par IP
  message: 'Trop de requêtes, veuillez réessayer plus tard',
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
  console.error('Erreur serveur:', err);
  res.status(500).json({
    success: false,
    error: 'Erreur interne du serveur',
  });
});

// Nettoyage périodique des locks expirés (toutes les 5 minutes)
setInterval(() => {
  cleanExpiredLocks().catch((error) => {
    console.error('Erreur lors du nettoyage des locks:', error);
  });
}, 5 * 60 * 1000);

// Démarrage du serveur
app.listen(PORT, async () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  
  // Vérifier la configuration email - DÉSACTIVÉ
  // const emailConfigValid = await verifyEmailConfig();
  // if (!emailConfigValid) {
  //   console.warn('⚠️  Configuration email invalide - les emails ne seront pas envoyés');
  // }
  console.log('📧 Envoi d\'emails désactivé');
  
  // Nettoyer les locks expirés au démarrage
  await cleanExpiredLocks();
  console.log('✅ Locks expirés nettoyés');
});

// Gestion de l'arrêt gracieux
process.on('SIGTERM', () => {
  console.log('SIGTERM reçu, arrêt du serveur...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT reçu, arrêt du serveur...');
  process.exit(0);
});

export default app;
