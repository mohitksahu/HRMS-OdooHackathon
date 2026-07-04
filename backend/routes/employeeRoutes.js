const express = require('express');
const router = express.Router();
const {
  getAllEmployees, getEmployee, createEmployee,
  updateEmployee, deactivateEmployee, uploadAvatar
} = require('../controllers/employeeController');
const { authenticate } = require('../middleware/auth');
const { authorize, isAdminOrHR, isSelfOrAdmin } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { createEmployeeValidator, updateEmployeeValidator } = require('../validators/employeeValidator');
const upload = require('../middleware/upload');

router.use(authenticate);

// Admin/HR routes
router.get('/', getAllEmployees); // All authenticated users can see employee list
router.post('/', isAdminOrHR, createEmployeeValidator, validate, createEmployee);
router.delete('/:id', authorize('admin'), deactivateEmployee);

// Self or Admin routes
router.get('/:id', getEmployee);
router.put('/:id', isSelfOrAdmin, updateEmployeeValidator, validate, updateEmployee);
router.post('/:id/avatar', isSelfOrAdmin, upload.single('avatar'), uploadAvatar);

module.exports = router;