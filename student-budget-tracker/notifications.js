/**
 * notifications.js - Standalone fixed version
 */

(function() {
    // Use existing CONFIG if available, otherwise fallback
    const APP_NAME = (typeof CONFIG !== 'undefined' ? CONFIG.APP_NAME : 'StudentBudgetTracker');

    // Helper: format currency
    function formatCurrency(amount) {
        return `₦${parseFloat(amount).toFixed(2)}`;
    }

    // Request notification permission if not already granted
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission().then(permission => {
            console.log("Notification permission:", permission);
        });
    }

    // Trigger budget notifications
    function triggerExpenseNotifications() {
        if (!("Notification" in window)) return; // Not supported
        if (Notification.permission !== "granted") return;

        const budgetAmount = appState.budget?.amount || 0;
        const totalExpenses = (appState.expenses || []).reduce((sum, e) => sum + e.amount, 0);
        const remaining = budgetAmount - totalExpenses;

        // Low balance warning
        if (remaining > 0 && remaining <= 50) {
            new Notification(`${APP_NAME} Alert!`, {
                body: `Your remaining balance is ${formatCurrency(remaining)}`,
            });
        }

        // Exceeded budget
        if (remaining <= 0) {
            new Notification(`${APP_NAME} Alert!`, {
                body: `You have exceeded your budget!`,
            });
        }
    }

    // Expose function globally
    window.triggerExpenseNotifications = triggerExpenseNotifications;

    // Optional: trigger on page load
    document.addEventListener('DOMContentLoaded', () => {
        triggerExpenseNotifications();
    });
})();
