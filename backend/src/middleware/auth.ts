import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';

// Extension de l'interface Request pour inclure les données utilisateur
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        store_id?: string;
      };
    }
  }
}

/**
 * Middleware d'authentification JWT
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        success: false, 
        error: 'Token d\'authentification manquant' 
      });
      return;
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      error: 'Token invalide ou expiré' 
    });
  }
};

/**
 * Middleware pour vérifier le rôle super admin
 */
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'super_admin') {
    res.status(403).json({ 
      success: false, 
      error: 'Accès refusé : droits super admin requis' 
    });
    return;
  }
  
  next();
};

/**
 * Middleware pour vérifier l'accès à un magasin spécifique
 */
export const requireStoreAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const storeId = req.params.storeId || req.body.store_id;
  
  if (!req.user) {
    res.status(401).json({ 
      success: false, 
      error: 'Authentification requise' 
    });
    return;
  }
  
  // Super admin a accès à tous les magasins
  if (req.user.role === 'super_admin') {
    next();
    return;
  }
  
  // Store admin ne peut accéder qu'à son magasin
  if (req.user.store_id !== storeId) {
    res.status(403).json({ 
      success: false, 
      error: 'Accès refusé à ce magasin' 
    });
    return;
  }
  
  next();
};
