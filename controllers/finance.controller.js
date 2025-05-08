import User from '../models/User.Model.js';

// Get all employees
export const getAllEmployees = async (req, res) => {
    try {
        const employees = await User.find({ role: 'EMPLOYEE' });
        res.status(200).json({
            success: true,
            data: employees,
            message: 'Employees fetched successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Set user as employee
export const setUserAsEmployee = async (req, res) => {
    try {
        const { userId, basicSalary } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.role = 'EMPLOYEE';
        user.employeeDetails = {
            basicSalary: basicSalary || 0,
            additionalAllowances: [],
            loans: [],
            salaryHistory: []
        };

        await user.save();

        res.status(200).json({
            success: true,
            data: user,
            message: 'User set as employee successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update employee basic salary
export const updateBasicSalary = async (req, res) => {
    try {
        const { employeeId, basicSalary } = req.body;
        
        if (!employeeId || !basicSalary) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID and basic salary are required'
            });
        }

        const employee = await User.findById(employeeId);
        if (!employee || employee.role !== 'EMPLOYEE') {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        employee.employeeDetails.basicSalary = basicSalary;
        await employee.save();

        res.status(200).json({
            success: true,
            data: employee,
            message: 'Basic salary updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Add allowance to employee
export const addAllowance = async (req, res) => {
    try {
        const { employeeId, name, amount, description } = req.body;
        
        if (!employeeId || !name || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID, allowance name, and amount are required'
            });
        }

        const employee = await User.findById(employeeId);
        if (!employee || employee.role !== 'EMPLOYEE') {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        employee.employeeDetails.additionalAllowances.push({
            name,
            amount,
            description: description || ''
        });

        await employee.save();

        res.status(200).json({
            success: true,
            data: employee,
            message: 'Allowance added successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Add loan to employee
export const addLoan = async (req, res) => {
    try {
        const { employeeId, amount, reason, installmentAmount, totalInstallments } = req.body;
        
        if (!employeeId || !amount || !installmentAmount || !totalInstallments) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID, loan amount, installment amount, and total installments are required'
            });
        }

        const employee = await User.findById(employeeId);
        if (!employee || employee.role !== 'EMPLOYEE') {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        employee.employeeDetails.loans.push({
            amount,
            reason: reason || 'Not specified',
            installmentAmount,
            totalInstallments,
            remainingInstallments: totalInstallments,
            status: 'ACTIVE'
        });

        await employee.save();

        res.status(200).json({
            success: true,
            data: employee,
            message: 'Loan added successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Generate monthly salary
export const generateMonthlySalary = async (req, res) => {
    try {
        const { employeeId, month, year } = req.body;
        
        if (!employeeId || !month || !year) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID, month, and year are required'
            });
        }

        const employee = await User.findById(employeeId);
        if (!employee || employee.role !== 'EMPLOYEE') {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Check if salary for the month already exists
        const existingSalary = employee.employeeDetails.salaryHistory.find(
            salary => salary.month === month && salary.year === year
        );

        if (existingSalary) {
            return res.status(400).json({
                success: false,
                message: 'Salary for this month already generated'
            });
        }

        // Calculate loan deductions
        let totalLoanDeductions = 0;
        const updatedLoans = employee.employeeDetails.loans.map(loan => {
            if (loan.status === 'ACTIVE' && loan.remainingInstallments > 0) {
                totalLoanDeductions += loan.installmentAmount;
                loan.remainingInstallments -= 1;
                
                if (loan.remainingInstallments === 0) {
                    loan.status = 'PAID';
                }
                
                return loan;
            }
            return loan;
        });
        
        employee.employeeDetails.loans = updatedLoans;

        // Calculate allowances
        const allowances = employee.employeeDetails.additionalAllowances.map(allowance => ({
            name: allowance.name,
            amount: allowance.amount
        }));

        const totalAllowances = allowances.reduce((sum, allowance) => sum + allowance.amount, 0);

        // Calculate EPF and ETF deductions
        const basicSalary = employee.employeeDetails.basicSalary;
        const epfDeduction = basicSalary * 0.12; // 12% of basic salary
        const etfDeduction = basicSalary * 0.03; // 3% of basic salary
        
        // Add EPF and ETF to deductions array
        const deductions = [
            { name: 'EPF (12%)', amount: epfDeduction },
            { name: 'ETF (3%)', amount: etfDeduction }
        ];
        
        const totalDeductions = epfDeduction + etfDeduction;

        // Calculate net salary (basic + allowances - loans - epf - etf)
        const netSalary = employee.employeeDetails.basicSalary + totalAllowances - totalLoanDeductions - totalDeductions;

        // Create salary record
        const salaryRecord = {
            month,
            year,
            basicSalary: employee.employeeDetails.basicSalary,
            allowances,
            deductions,
            loanDeductions: totalLoanDeductions,
            netSalary,
            paymentStatus: 'PENDING'
        };

        employee.employeeDetails.salaryHistory.push(salaryRecord);
        await employee.save();

        res.status(200).json({
            success: true,
            data: salaryRecord,
            message: 'Salary generated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get employee salary history
export const getEmployeeSalaryHistory = async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        const employee = await User.findById(employeeId);
        if (!employee || employee.role !== 'EMPLOYEE') {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.status(200).json({
            success: true,
            data: employee.employeeDetails.salaryHistory,
            message: 'Salary history fetched successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get employee salary by month
export const getEmployeeSalaryByMonth = async (req, res) => {
    try {
        const { employeeId, month, year } = req.params;
        
        const employee = await User.findById(employeeId);
        if (!employee || employee.role !== 'EMPLOYEE') {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const salaryRecord = employee.employeeDetails.salaryHistory.find(
            salary => salary.month == month && salary.year == year
        );

        if (!salaryRecord) {
            return res.status(404).json({
                success: false,
                message: 'Salary record not found for the specified month'
            });
        }

        res.status(200).json({
            success: true,
            data: salaryRecord,
            message: 'Salary record fetched successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get current employee's salary (for employee login)
export const getCurrentEmployeeSalary = async (req, res) => {
    try {
        // Assuming req.user is set in the auth middleware
        const userId = req.user._id;
        
        const employee = await User.findById(userId);
        if (!employee || employee.role !== 'EMPLOYEE') {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                basicSalary: employee.employeeDetails.basicSalary,
                additionalAllowances: employee.employeeDetails.additionalAllowances,
                loans: employee.employeeDetails.loans,
                salaryHistory: employee.employeeDetails.salaryHistory
            },
            message: 'Employee salary details fetched successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete salary record
export const deleteSalaryRecord = async (req, res) => {
    try {
        const { salaryId } = req.params;
        
        if (!salaryId) {
            return res.status(400).json({
                success: false,
                message: 'Salary ID is required'
            });
        }

        // Find the employee with this salary record in their history
        const employee = await User.findOne({
            'employeeDetails.salaryHistory._id': salaryId
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Salary record not found'
            });
        }

        // Remove the salary record from the employee's salary history
        employee.employeeDetails.salaryHistory = employee.employeeDetails.salaryHistory.filter(
            salary => salary._id.toString() !== salaryId
        );

        await employee.save();

        res.status(200).json({
            success: true,
            message: 'Salary record deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}; 