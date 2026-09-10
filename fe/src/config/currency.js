// fe/src/config/currency.js
export const CURRENCY = {
    PHP: {
        symbol: '₱',
        code: 'PHP',
        locale: 'en-PH',
        decimalPlaces: 2,
        format: '{value} ₱'
    },
    MMK: {
        symbol: 'Ks',
        code: 'MMK',
        locale: 'my-MM',
        decimalPlaces: 2,
        format: '{value} Ks',
    }
};

// Current currency - change this to switch
export const CURRENT_CURRENCY = CURRENCY.MMK;

export const formatCurrency = (amount, currency = CURRENT_CURRENCY) => {
    if (!amount && amount !== 0) return `0 ${currency.symbol}`;

    try {
        const formatter = new Intl.NumberFormat(currency.locale, {
            style: 'currency',
            currency: currency.symbol,
            format: currency.format,
            minimumFractionDigits: currency.decimalPlaces,
            maximumFractionDigits: currency.decimalPlaces,
        });
        return formatter.format(amount);
    } catch (error) {
        // Fallback if locale not supported
        const formatted = new Intl.NumberFormat().format(amount);
        return `${formatted} ${currency.symbol}`;
    }
};