const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '1d' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

const getDateRange = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getMonthRange = (year, month) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
};

const calculateWorkingDays = (startDate, endDate, workingDaysPerWeek = 5) => {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (workingDaysPerWeek === 5) {
      if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    } else if (workingDaysPerWeek === 6) {
      if (dayOfWeek !== 0) count++;
    } else {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

module.exports = { 
  generateAccessToken, 
  generateRefreshToken, 
  getDateRange, 
  getMonthRange,
  calculateWorkingDays 
};