// src/constants/trendData.js
import dayjs from 'dayjs';

// Generate weekly data (Monday to Sunday)
export const generateWeeklyTrend = (baseData = {}) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = dayjs();
    const startOfWeek = today.startOf('week');

    // First map: generate data with random fallbacks
    const rawData = days.map((day, index) => {
        const date = startOfWeek.add(index, 'day');
        const dayData = baseData[day] || {};

        return {
            day: day,
            date: date.format('YYYY-MM-DD'),
            completed: dayData.completed !== undefined ? dayData.completed : Math.floor(Math.random() * 300) + 100,
            exceptions: dayData.exceptions !== undefined ? dayData.exceptions : Math.floor(Math.random() * 30) + 5,
            noContact: dayData.noContact !== undefined ? dayData.noContact : Math.floor(Math.random() * 50) + 10,
        }

    });
    // Second map: calculate total for each item
    return rawData.map(function(item) {
        return {
            ...item,
            total: item.completed + item.exceptions + item.noContact,
        };
    });
};

// Mock weekly data for all agents combined
export const GLOBAL_WEEKLY_TREND = generateWeeklyTrend({
    Mon: { completed: 450, exceptions: 22, noContact: 45 },
    Tue: { completed: 420, exceptions: 18, noContact: 38 },
    Wed: { completed: 390, exceptions: 25, noContact: 42 },
    Thu: { completed: 380, exceptions: 20, noContact: 35 },
    Fri: { completed: 350, exceptions: 15, noContact: 30 },
    Sat: { completed: 270, exceptions: 12, noContact: 25 },
    Sun: { completed: 310, exceptions: 10, noContact: 20 },
});

// Mock monthly data
export const MONTHLY_TREND = [
    { month: 'Jan', completed: 3200, exceptions: 180, noContact: 420 },
    { month: 'Feb', completed: 3400, exceptions: 160, noContact: 380 },
    { month: 'Mar', completed: 3600, exceptions: 190, noContact: 400 },
    { month: 'Apr', completed: 3800, exceptions: 170, noContact: 390 },
    { month: 'May', completed: 4000, exceptions: 200, noContact: 410 },
    { month: 'Jun', completed: 4200, exceptions: 180, noContact: 430 },
    { month: 'Jul', completed: 4100, exceptions: 220, noContact: 450 },
    { month: 'Aug', completed: 4300, exceptions: 190, noContact: 420 },
    { month: 'Sep', completed: 4500, exceptions: 210, noContact: 440 },
    { month: 'Oct', completed: 4400, exceptions: 195, noContact: 430 },
    { month: 'Nov', completed: 4600, exceptions: 205, noContact: 450 },
    { month: 'Dec', completed: 4800, exceptions: 230, noContact: 470 },
];

// Mock agent-specific trends
export const AGENT_TRENDS = {
    'A001': {
        name: 'John',
        weekly: generateWeeklyTrend({
            Mon: { completed: 85, exceptions: 5, noContact: 10 },
            Tue: { completed: 78, exceptions: 4, noContact: 8 },
            Wed: { completed: 72, exceptions: 6, noContact: 9 },
            Thu: { completed: 70, exceptions: 3, noContact: 7 },
            Fri: { completed: 65, exceptions: 4, noContact: 6 },
            Sat: { completed: 50, exceptions: 2, noContact: 5 },
            Sun: { completed: 55, exceptions: 3, noContact: 4 },
        }),
        monthly: [
            { month: 'Jun', completed: 320, exceptions: 18, noContact: 35 },
            { month: 'Jul', completed: 340, exceptions: 15, noContact: 30 },
            { month: 'Aug', completed: 380, exceptions: 20, noContact: 38 },
        ],
    },
    'A002': {
        name: 'Mary',
        weekly: generateWeeklyTrend({
            Mon: { completed: 92, exceptions: 6, noContact: 12 },
            Tue: { completed: 85, exceptions: 5, noContact: 10 },
            Wed: { completed: 80, exceptions: 4, noContact: 8 },
            Thu: { completed: 78, exceptions: 5, noContact: 9 },
            Fri: { completed: 72, exceptions: 3, noContact: 7 },
            Sat: { completed: 55, exceptions: 2, noContact: 4 },
            Sun: { completed: 60, exceptions: 4, noContact: 5 },
        }),
        monthly: [
            { month: 'Jun', completed: 350, exceptions: 20, noContact: 40 },
            { month: 'Jul', completed: 360, exceptions: 18, noContact: 35 },
            { month: 'Aug', completed: 390, exceptions: 22, noContact: 42 },
        ],
    },
    'A003': {
        name: 'David',
        weekly: generateWeeklyTrend({
            Mon: { completed: 75, exceptions: 4, noContact: 8 },
            Tue: { completed: 70, exceptions: 3, noContact: 7 },
            Wed: { completed: 68, exceptions: 5, noContact: 6 },
            Thu: { completed: 65, exceptions: 4, noContact: 5 },
            Fri: { completed: 60, exceptions: 2, noContact: 4 },
            Sat: { completed: 45, exceptions: 1, noContact: 3 },
            Sun: { completed: 48, exceptions: 2, noContact: 3 },
        }),
        monthly: [
            { month: 'Jun', completed: 280, exceptions: 15, noContact: 30 },
            { month: 'Jul', completed: 290, exceptions: 14, noContact: 28 },
            { month: 'Aug', completed: 310, exceptions: 16, noContact: 32 },
        ],
    },
};

// Helper to get agent trend data
export const getAgentTrend = (agentId) => {
    return AGENT_TRENDS[agentId] || null;
};

// Helper to get global trend data
export const getGlobalTrend = (timeFrame = 'weekly') => {
    return timeFrame === 'weekly' ? GLOBAL_WEEKLY_TREND : MONTHLY_TREND;
};