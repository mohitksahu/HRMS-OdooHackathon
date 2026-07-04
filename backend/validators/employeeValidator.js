const { body } = require('express-validator');

const createEmployeeValidator = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),
  body('phone')
    .optional()
    .isMobilePhone().withMessage('Please enter a valid phone number'),
  body('dateOfJoining')
    .notEmpty().withMessage('Date of joining is required')
    .isISO8601().withMessage('Please provide a valid date'),
  body('department')
    .optional()
    .trim(),
  body('jobPosition')
    .optional()
    .trim(),
  body('monthlyWage')
    .optional()
    .isNumeric().withMessage('Monthly wage must be a number')
    .custom(value => value >= 0).withMessage('Monthly wage cannot be negative')
];

const updateEmployeeValidator = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('phone')
    .optional()
    .isMobilePhone().withMessage('Please enter a valid phone number')
];

module.exports = { createEmployeeValidator, updateEmployeeValidator };