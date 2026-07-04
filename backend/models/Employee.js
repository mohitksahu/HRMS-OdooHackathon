const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  employeeCode: {
    type: String,
    required: true,
    unique: true
  },
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  avatar: {
    type: String,
    default: ''
  },
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other', '']
  },
  maritalStatus: {
    type: String,
    enum: ['single', 'married', 'divorced', 'widowed', '']
  },
  nationality: String,
  personalEmail: String,
  phone: String,
  
  // Address
  residingAddress: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },

  // Job Details
  jobPosition: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    default: ''
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  location: String,
  dateOfJoining: {
    type: Date,
    required: [true, 'Date of joining is required']
  },
  
  // Bank Details
  bankDetails: {
    accountNumber: String,
    bankName: String,
    ifscCode: String,
    panNo: String,
    uanNo: String
  },

  // Resume / About
  about: {
    type: String,
    default: ''
  },
  whatILove: {
    type: String,
    default: ''
  },
  interestsAndHobbies: {
    type: String,
    default: ''
  },
  skills: [{
    type: String
  }],
  certifications: [{
    name: String,
    issuer: String,
    date: Date,
    url: String
  }],

  // Documents
  documents: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],

  // Work Status
  workStatus: {
    type: String,
    enum: ['active', 'on_leave', 'absent', 'terminated', 'resigned'],
    default: 'active'
  },
  
  // Attendance source
  attendanceSource: {
    type: String,
    enum: ['manual', 'biometric', 'system'],
    default: 'manual'
  },

  isCheckedIn: {
    type: Boolean,
    default: false
  },
  lastCheckIn: Date,

  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Index for searching
employeeSchema.index({ firstName: 'text', lastName: 'text', employeeCode: 'text', department: 'text' });

module.exports = mongoose.model('Employee', employeeSchema);