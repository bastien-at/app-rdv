import { Router } from 'express';
import { body } from 'express-validator';
import {
  getCustomers,
  searchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer
} from '../controllers/customerDirectoryController';
import { authenticateAdmin, requireStoreAccess } from '../middleware/auth';

const router = Router();

// Routes nécessitant une authentification admin
router.get('/stores/:store_id/customers', authenticateAdmin, requireStoreAccess, getCustomers);
router.get('/stores/:store_id/customers/search', authenticateAdmin, requireStoreAccess, searchCustomers);

router.post('/stores/:store_id/customers', authenticateAdmin, requireStoreAccess, [
  body('firstname')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Le prénom doit contenir entre 1 et 100 caractères'),
    // ...
], createCustomer);

router.put('/customers/:id', authenticateAdmin, [
    // ...
], updateCustomer);

router.delete('/customers/:id', authenticateAdmin, deleteCustomer);

export default router;
