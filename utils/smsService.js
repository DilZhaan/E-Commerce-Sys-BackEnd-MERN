import axios from 'axios';

const SMS_API_URL = process.env.SMS_API_URL || 'https://app.text.lk/api/v3/sms/send';
const SMS_API_TOKEN = process.env.SMS_API_TOKEN || "424|wKzC4qh8Bxeh6CSmd8oQX2vnuXAB99DiUUZbUvec60d7ff64";
const SMS_CONTACT_LIST_ID = process.env.SMS_CONTACT_LIST_ID || '6065ecdc9184a';

export const sendSMS = async (phone, firstName, lastName, message) => {
    try {
        // Check if API token is configured
        if (!SMS_API_TOKEN) {
            return {
                success: false,
                message: 'SMS service is not configured'
            };
        }

        // Validate phone number
        if (!phone) {
            throw new Error('Phone number is required');
        }

        // Format phone number if needed
        const formattedPhone = phone.startsWith('0') ? '94' + phone.substring(1) : phone;

        // Send the message
        const response = await axios.post(
            `${SMS_API_URL}`,
            {
                recipient: formattedPhone,
                sender_id: "TextLKDemo",
                type: "plain",
                message: message
            },
            {
                headers: {
                    'Authorization': `Bearer ${SMS_API_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        return {
            success: true,
            message: response.data
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || error.message
        };
    }
}; 