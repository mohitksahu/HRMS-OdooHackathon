const Counter = require('../models/Counter');

/**
 * Generate Login ID in format: [CompanyCode][FirstTwoLetters][LastTwoLetters][Year][Serial]
 * Example: OIJODO20220001
 * OI → Company Code (first 2 letters of company name)
 * JO → First two letters of first name
 * DO → First two letters of last name
 * 2022 → Year of joining
 * 0001 → Serial Number
 */
const generateLoginId = async (companyCode, firstName, lastName, joiningYear) => {
  const compCode = companyCode.substring(0, 2).toUpperCase();
  const firstNameCode = firstName.substring(0, 2).toUpperCase();
  const lastNameCode = lastName.substring(0, 2).toUpperCase();
  const year = joiningYear.toString();
  
  const seq = await Counter.getNextSequence(compCode, parseInt(year));
  const serial = seq.toString().padStart(4, '0');
  
  return `${compCode}${firstNameCode}${lastNameCode}${year}${serial}`;
};

/**
 * Generate Employee Code (shorter version for internal use)
 */
const generateEmployeeCode = async (companyCode, year) => {
  const code = companyCode.substring(0, 3).toUpperCase();
  const seq = await Counter.getNextSequence(`EMP_${code}`, year);
  const serial = seq.toString().padStart(4, '0');
  return `${code}-${year}-${serial}`;
};

module.exports = { generateLoginId, generateEmployeeCode };