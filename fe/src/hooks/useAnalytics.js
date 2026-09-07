// fe/src/hooks/useAnalytics.js
export const useAnalytics = () => {
    return {
        trackEvent: (eventName, properties) => {
            console.log('[Analytics]', eventName, properties);
        },
        trackPageView: (page, properties) => {
            console.log('[Analytics] Page View:', page, properties);
        },
        identifyUser: (userId, traits) => {
            console.log('[Analytics] Identify User:', userId, traits);
        },
    };
};