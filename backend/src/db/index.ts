import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// Configuration du pool de connexions PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Gestion des erreurs du pool
pool.on('error', (err: any) => {
  console.error('Erreur inattendue du pool PostgreSQL:', err);
  process.exit(-1);
});

/**
 * Exécute une requête SQL
 */
export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Requête exécutée:', { text, duration, rows: res.rowCount });
    }
    
    return res;
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la requête:', error);
    throw error;
  }
};

/**
 * Obtient un client du pool pour les transactions
 */
export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect();
};

/**
 * Exécute une fonction dans une transaction
 */
export const transaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Nettoie les locks expirés
 */
export const cleanExpiredLocks = async (): Promise<void> => {
  await query('SELECT clean_expired_locks()');
};

/**
 * Ferme le pool de connexions
 */
export const closePool = async (): Promise<void> => {
  await pool.end();
};

export default pool;
