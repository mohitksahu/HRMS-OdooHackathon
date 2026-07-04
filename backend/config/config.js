module.exports = {
  roles: {
    ADMIN: 'admin',
    HR_OFFICER: 'hr_officer',
    EMPLOYEE: 'employee'
  },
  leaveTypes: {
    PAID: 'paid_time_off',
    SICK: 'sick_leave',
    UNPAID: 'unpaid_leave'
  },
  attendanceStatus: {
    PRESENT: 'present',
    ABSENT: 'absent',
    HALF_DAY: 'half_day',
    ON_LEAVE: 'on_leave'
  },
  defaultAllocations: {
    paid_time_off: 24,
    sick_leave: 7,
    unpaid_leave: 0
  },
  salaryComponents: {
    BASIC: { name: 'Basic Salary', percentage: 50 },
    HRA: { name: 'House Rent Allowance', percentageOfBasic: 60 },
    STANDARD: { name: 'Standard Allowance', percentage: 8.33 },
    PERFORMANCE_BONUS: { name: 'Performance Bonus', percentage: 8.33 },
    LTA: { name: 'Leave Travel Allowance', percentage: 8.33 },
    FIXED: { name: 'Fixed Allowance', type: 'remainder' }
  },
  deductions: {
    PF_RATE: 12,
    PROFESSIONAL_TAX: 200
  }
};