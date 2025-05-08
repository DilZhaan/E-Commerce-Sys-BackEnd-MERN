import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    proPic:String,
    fName: String,
    lName: String,
    address: String,
    city: String,
    phone: String,
    dob:Date,
    gender:String,
    email: {
        type: String,
        unique: true,
        required: true
    },
    pwd: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['GENERAL', 'ADMIN', 'EMPLOYEE'],
        default: 'GENERAL'
    },
    // Employee-specific fields
    employeeDetails: {
        basicSalary: {
            type: Number,
            default: 0
        },
        additionalAllowances: [{
            name: String,
            amount: Number,
            description: String
        }],
        loans: [{
            amount: Number,
            reason: String,
            dateIssued: {
                type: Date,
                default: Date.now
            },
            installmentAmount: Number,
            totalInstallments: Number,
            remainingInstallments: Number,
            status: {
                type: String,
                enum: ['ACTIVE', 'PAID', 'CANCELLED'],
                default: 'ACTIVE'
            }
        }],
        salaryHistory: [{
            month: Number,
            year: Number,
            basicSalary: Number,
            allowances: [{
                name: String,
                amount: Number
            }],
            deductions: [{
                name: String,
                amount: Number
            }],
            loanDeductions: Number,
            netSalary: Number,
            paymentStatus: {
                type: String,
                enum: ['PENDING', 'PAID'],
                default: 'PENDING'
            },
            paymentDate: Date
        }]
    }
},
    {
        timestamps: true
    }
)

const userModel = mongoose.models.User || mongoose.model('User', userSchema);

export default userModel;