import express from 'express';
import { isAuth, isAdmin } from '../middleware/auth.middleware.js';
import {
    getAllEmployees,
    setUserAsEmployee,
    updateBasicSalary,
    addAllowance,
    addLoan,
    generateMonthlySalary,
    getEmployeeSalaryHistory,
    getEmployeeSalaryByMonth,
    getCurrentEmployeeSalary,
    deleteSalaryRecord
} from '../controllers/finance.controller.js';

const router = express.Router();

// Admin routes (protected)
router.get('/employees', isAuth, isAdmin, getAllEmployees);
router.post('/employees/set', isAuth, isAdmin, setUserAsEmployee);
router.post('/employees/salary/update', isAuth, isAdmin, updateBasicSalary);
router.post('/employees/allowance/add', isAuth, isAdmin, addAllowance);
router.post('/employees/loan/add', isAuth, isAdmin, addLoan);
router.post('/employees/salary/generate', isAuth, isAdmin, generateMonthlySalary);
router.get('/employees/:employeeId/salary', isAuth, isAdmin, getEmployeeSalaryHistory);
router.get('/employees/:employeeId/salary/:month/:year', isAuth, isAdmin, getEmployeeSalaryByMonth);
router.delete('/employees/salary/:salaryId', isAuth, isAdmin, deleteSalaryRecord);

// Employee routes
router.get('/employee/salary', isAuth, getCurrentEmployeeSalary);

export default router; 