const Employee = require('../models/Employee');
const User = require('../models/User');
const Salary = require('../models/Salary');
const TimeOffAllocation = require('../models/TimeOffAllocation');
const { generateLoginId, generateEmployeeCode } = require('../services/idGenerator');
const { generatePassword } = require('../services/passwordGenerator');
const { calculateSalaryComponents } = require('../services/salaryCalculator');
const { sendWelcomeEmail } = require('../services/emailService');
const { defaultAllocations } = require('../config/config');
const AppError = require('../utils/AppError');

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private (Admin/HR)
const getAllEmployees = async (req, res, next) => {
  try {
    const { search, department, status, page = 1, limit = 20 } = req.query;
    const companyId = req.user.company._id || req.user.company;

    let query = { company: companyId, isActive: true };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    if (department) {
      query.department = department;
    }

    if (status) {
      query.workStatus = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const employees = await Employee.find(query)
      .populate('user', 'loginId email role isActive')
      .populate('manager', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Employee.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        employees,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Private
const getEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('user', 'loginId email role isActive lastLogin')
      .populate('manager', 'firstName lastName jobPosition')
      .populate('company', 'name code logo');

    if (!employee) {
      return next(new AppError('Employee not found', 404));
    }

    // If employee role, can only see own profile details
    if (req.user.role === 'employee') {
      const userEmployeeId = req.user.employee._id || req.user.employee;
      if (employee._id.toString() !== userEmployeeId.toString()) {
        // Return limited info for other employees
        return res.status(200).json({
          success: true,
          data: {
            employee: {
              _id: employee._id,
              firstName: employee.firstName,
              lastName: employee.lastName,
              fullName: employee.fullName,
              avatar: employee.avatar,
              jobPosition: employee.jobPosition,
              department: employee.department,
              workStatus: employee.workStatus,
              isCheckedIn: employee.isCheckedIn
            }
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      data: { employee }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create employee (Admin/HR creates employee)
// @route   POST /api/employees
// @access  Private (Admin/HR)
const createEmployee = async (req, res, next) => {
  try {
    const {
      firstName, lastName, email, phone, dateOfJoining,
      department, jobPosition, location, monthlyWage,
      role = 'employee'
    } = req.body;

    const companyId = req.user.company._id || req.user.company;
    const company = await require('../models/Company').findById(companyId);

    if (!company) {
      return next(new AppError('Company not found', 404));
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email already registered', 400));
    }

    // Generate credentials
    const joiningYear = new Date(dateOfJoining).getFullYear();
    const loginId = await generateLoginId(company.code, firstName, lastName, joiningYear);
    const employeeCode = await generateEmployeeCode(company.code, joiningYear);
    const password = generatePassword();

    // Create user
    const user = await User.create({
      loginId,
      email,
      password,
      role: role || 'employee',
      isEmailVerified: true,
      company: companyId
    });

    // Create employee
    const employee = await Employee.create({
      user: user._id,
      company: companyId,
      employeeCode,
      firstName,
      lastName,
      phone,
      dateOfJoining: new Date(dateOfJoining),
      department: department || '',
      jobPosition: jobPosition || '',
      location: location || ''
    });

    // Link employee to user
    user.employee = employee._id;
    await user.save();

    // Create salary structure if wage provided
    if (monthlyWage && monthlyWage > 0) {
      const salaryData = calculateSalaryComponents(monthlyWage);
      await Salary.create({
        employee: employee._id,
        company: companyId,
        monthlyWage,
        yearlyWage: monthlyWage * 12,
        workingDaysPerWeek: company.workingDaysPerWeek || 5,
        breakTimeHours: company.breakTimeHours || 1,
        ...salaryData
      });
    }

    // Create default leave allocations
    const year = new Date().getFullYear();
    const allocations = Object.entries(defaultAllocations).map(([type, days]) => ({
      employee: employee._id,
      company: companyId,
      leaveType: type,
      totalAllocated: days,
      used: 0,
      remaining: days,
      validityStart: new Date(year, 0, 1),
      validityEnd: new Date(year, 11, 31),
      year
    }));
    await TimeOffAllocation.insertMany(allocations);

    // Send welcome email with credentials
    await sendWelcomeEmail(email, loginId, password, `${firstName} ${lastName}`);

    res.status(201).json({
      success: true,
      message: 'Employee created successfully. Login credentials sent to email.',
      data: {
        employee,
        credentials: {
          loginId,
          email,
          temporaryPassword: password // Only shown once during creation
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private
const updateEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return next(new AppError('Employee not found', 404));
    }

    // Determine which fields can be updated based on role
    let allowedFields;
    if (['admin', 'hr_officer'].includes(req.user.role)) {
      // Admin can update all fields
      allowedFields = [
        'firstName', 'lastName', 'phone', 'dateOfBirth', 'gender',
        'maritalStatus', 'nationality', 'personalEmail', 'residingAddress',
        'jobPosition', 'department', 'location', 'manager',
        'bankDetails', 'about', 'whatILove', 'interestsAndHobbies',
        'skills', 'certifications', 'workStatus', 'avatar'
      ];
    } else {
      // Employee can only update limited fields
      allowedFields = [
        'phone', 'residingAddress', 'personalEmail', 'avatar',
        'about', 'whatILove', 'interestsAndHobbies', 'skills'
      ];
    }

    // Filter body to only allowed fields
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('user', 'loginId email role')
     .populate('manager', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: { employee: updatedEmployee }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate employee
// @route   DELETE /api/employees/:id
// @access  Private (Admin)
const deactivateEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return next(new AppError('Employee not found', 404));
    }

    employee.isActive = false;
    employee.workStatus = 'terminated';
    await employee.save();

    // Deactivate user account
    await User.findByIdAndUpdate(employee.user, { isActive: false });

    res.status(200).json({
      success: true,
      message: 'Employee deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload avatar
// @route   POST /api/employees/:id/avatar
// @access  Private
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please upload a file', 400));
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { avatar: `/uploads/avatars/${req.file.filename}` },
      { new: true }
    );

    if (!employee) {
      return next(new AppError('Employee not found', 404));
    }

    res.status(200).json({
      success: true,
      data: { avatar: employee.avatar }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  uploadAvatar
};