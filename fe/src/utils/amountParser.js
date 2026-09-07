// fe/src/utils/amountParser.js

/**
 * Safely parse any amount format
 * Supports: 500000, 500,000, 500.000, 500.00, etc.
 */
export const parseAmount = (value) => {
    if (value === null || value === undefined || value === '') {
        return 0;
    }

    // If it's already a number, return it
    if (typeof value === 'number') {
        return value;
    }

    // Convert to string and clean
    let str = String(value).trim();

    // Remove currency symbols
    str = str.replace(/[₱$€£¥]/g, '');

    // Remove spaces
    str = str.replace(/\s/g, '');

    // Check if it has both comma and period (e.g., 1,000.50)
    if (str.includes(',') && str.includes('.')) {
        // Format like 1,000.50 → remove commas, keep period
        str = str.replace(/,/g, '');
    } else if (str.includes(',')) {
        // Check if comma is thousands or decimal
        const parts = str.split(',');
        if (parts.length === 2) {
            // Could be thousands (1,000) or decimal (0,50)
            // If the part after comma has 3 digits, it's thousands
            if (parts[1].length === 3) {
                str = str.replace(/,/g, ''); // Remove thousands comma
            } else {
                str = str.replace(',', '.'); // Convert decimal comma to period
            }
        }
    }

    // Parse the number
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

/**
 * Format amount for display
 */
export const formatAmount = (amount, currencySymbol = '₱') => {
    const num = typeof amount === 'number' ? amount : parseAmount(amount);
    if (num === 0) return `${currencySymbol}0`;
    return `${currencySymbol}${num.toLocaleString()}`;
};