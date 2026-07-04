const AppError = require('../utils/AppError');

/**
 * Role-based access control middleware
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    
    next();
  };
};

/**
 * Check if user is admin or HR officer
 */
const isAdminOrHR = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required.', 401));
  }
  
  if (!['admin', 'hr_officer'].includes(req.user.role)) {
    return next(new AppError('Admin or HR officer access required.', 403));
  }
  
  next();
};

/**
 * Check if user is accessing their own resource or is admin
 */
const isSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required.', 401));
  }
  
  const requestedId = req.params.employeeId || req.params.id;
  const isOwner = req.user.employee && req.user.employee._id.toString() === requestedId;
  const isAdmin = ['admin', 'hr_officer'].includes(req.user.role);
  
  if (!isOwner && !isAdmin) {
    return next(new AppError('You can only access your own records.', 403));
  }
  
  next();
};

module.exports = { authorize, isAdminOrHR, isSelfOrAdmin };