const User = require('../models/User');
const Company = require('../models/Company');
const Employee = require('../models/Employee');
const TimeOffAllocation = require('../models/TimeOffAllocation');
const { generateAccessToken, generateRefreshToken } = require('../utils/helpers');
const { generateLoginId, generateEmployeeCode } = require('../services/idGenerator');
const { generatePassword } = require('../services/passwordGenerator');
const { sendWelcomeEmail } = require('../services/emailService');
const { calculateSalaryComponents } = require('../services/salaryCalculator');
const Salary = require('../models/Salary');
const AppError = require('../utils/AppError');
const jwt = require('jsonwebtoken');
const { defaultAllocations } = require('../config/config');

// @desc    Register company admin (Sign Up)
// @route   POST /api/auth/signup
// @access  Public
const signUp = async (req, res, next) => {
  try {
    const { companyName, name, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email already registered', 400));
    }

    // Check if company already exists
    const existingCompany = await Company.findOne({ name: companyName });
    if (existingCompany) {
      return next(new AppError('Company already registered', 400));
    }

    // Generate company code
    const companyCode = companyName.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();

    // Create company
    const company = await Company.create({
      name: companyName,
      code: companyCode,
      email,
      phone
    });

    // Split name into first and last
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];

    // Generate login ID
    const currentYear = new Date().getFullYear();
    const loginId = await generateLoginId(companyCode, firstName, lastName, currentYear);
    const employeeCode = await generateEmployeeCode(companyCode, currentYear);

    // Create user (admin role for first user)
    const user = await User.create({
      loginId,
      email,
      password,
      role: 'admin',
      isEmailVerified: true, // For now, skip email verification
      company: company._id
    });

    // Create employee profile
    const employee = await Employee.create({
      user: user._id,
      company: company._id,
      employeeCode,
      firstName,
      lastName,
      phone,
      dateOfJoining: new Date(),
      jobPosition: 'Admin',
      department: 'Management'
    });

    // Link employee to user
    user.employee = employee._id;
    await user.save();

    // Update company creator
    company.createdBy = user._id;
    await company.save();

    // Create default leave allocations
    const year = new Date().getFullYear();
    const allocations = Object.entries(defaultAllocations).map(([type, days]) => ({
      employee: employee._id,
      company: company._id,
      leaveType: type,
      totalAllocated: days,
      used: 0,
      remaining: days,
      validityStart: new Date(year, 0, 1),
      validityEnd: new Date(year, 11, 31),
      year
    }));
    await TimeOffAllocation.insertMany(allocations);

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          loginId: user.loginId,
          email: user.email,
          role: user.role,
          employee: {
            id: employee._id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            fullName: employee.fullName
          }
        },
        company: {
          id: company._id,
          name: company.name,
          code: company.code
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Sign In
// @route   POST /api/auth/signin
// @access  Public
const signIn = async (req, res, next) => {
  try {
    const { loginId, password } = req.body;

    // Find user by loginId or email
    const user = await User.findOne({
      $or: [
        { loginId: loginId.toUpperCase() },
        { email: loginId.toLowerCase() }
      ]
    }).select('+password').populate('employee company');

    if (!user) {
      return next(new AppError('Invalid credentials', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated. Contact your HR.', 401));
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid credentials', 401));
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Update user
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Set cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          loginId: user.loginId,
          email: user.email,
          role: user.role,
          employee: user.employee ? {
            id: user.employee._id,
            firstName: user.employee.firstName,
            lastName: user.employee.lastName,
            fullName: user.employee.fullName,
            avatar: user.employee.avatar,
            isCheckedIn: user.employee.isCheckedIn,
            jobPosition: user.employee.jobPosition,
            department: user.employee.department
          } : null,
          company: user.company ? {
            id: user.company._id,
            name: user.company.name,
            logo: user.company.logo
          } : null
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    
    if (!token) {
      return next(new AppError('Refresh token required', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token) {
      return next(new AppError('Invalid refresh token', 401));
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    next(new AppError('Invalid refresh token', 401));
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.refreshToken = null;
    await user.save();

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -refreshToken')
      .populate({
        path: 'employee',
        populate: { path: 'manager', select: 'firstName lastName' }
      })
      .populate('company');

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(new AppError('Current password is incorrect', 400));
    }

    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    // Generate new tokens
    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      data: { accessToken, refreshToken: newRefreshToken }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth callback
// @route   GET /api/auth/google/callback
// @access  Public
const googleCallback = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.CLIENT_URL}/signin?error=no_account`);
    }

    const accessToken = generateAccessToken(req.user);
    const newRefreshToken = generateRefreshToken(req.user);

    req.user.refreshToken = newRefreshToken;
    req.user.lastLogin = new Date();
    await req.user.save();

    // Redirect to frontend with tokens
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${accessToken}&refresh=${newRefreshToken}`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signUp,
  signIn,
  refreshToken,
  logout,
  getMe,
  changePassword,
  googleCallback
};