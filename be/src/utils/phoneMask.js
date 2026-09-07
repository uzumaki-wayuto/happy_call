// src/utils/phoneMask.js

/**
 * Mask phone number for display in list views
 * @param {string} phone - Full phone number
 * @param {string} maskChar - Character to use for masking (default: '*')
 * @returns {string} Masked phone number
 */
export const maskPhoneNumber = (phone, maskChar = '*') => {
    if (!phone) return '';
    if (phone.length <= 4) return phone;

    const visibleStart = 4;
    const visibleEnd = 4;

    // Show first 4 and last 4 digits
    const start = phone.slice(0, visibleStart);
    const end = phone.slice(-visibleEnd);
    const middleLength = phone.length - visibleStart - visibleEnd;
    const masked = maskChar.repeat(Math.min(middleLength, 8));

    return `${start}${masked}${end}`;
};

/**
 * Check if phone number should be masked for the current user
 * @param {string} userRole - Current user's role
 * @param {string} action - What the user is trying to do
 * @returns {boolean} True if phone should be masked
 */
export const shouldMaskPhone = (userRole, action = 'view') => {
    // Admin and Supervisor can see full numbers
    if (userRole === 'ADMIN' || userRole === 'SUPERVISOR') {
        return false;
    }

    // Agents can only see full numbers on detail view (SCR-004)
    if (userRole === 'VERIFIER' || userRole === 'AGENT') {
        return action !== 'detail';
    }

    return true;
};

/**
 * Get phone display based on user role and context
 * @param {string} phone - Full phone number
 * @param {string} userRole - Current user's role
 * @param {string} context - 'list' or 'detail'
 * @returns {string} Phone number to display
 */
export const getPhoneDisplay = (phone, userRole, context = 'list') => {
    if (!phone) return '';

    if (context === 'detail' && (userRole === 'ADMIN' || userRole === 'SUPERVISOR' || userRole === 'VERIFIER')) {
        return phone;
    }

    if (context === 'detail' && userRole === 'AGENT') {
        return phone; // Agent on detail view
    }

    return maskPhoneNumber(phone);
};