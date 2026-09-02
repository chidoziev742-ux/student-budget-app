/**
 * notifications.js - Standalone fixed version
 */

(function() {
    // Use existing CONFIG if available, otherwise fallback
    const APP_NAME = (typeof CONFIG !== 'undefined' ? CONFIG.APP_NAME : 'StudentBudgetTracker');

    // Helper: format currency
    function formatCurrency(amount) {
        const numericAmount = Number(amount);
        const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;
        return `₦${safeAmount.toLocaleString('en-NG', { minimumFractionDigits: Number.isInteger(safeAmount) ? 0 : 2, maximumFractionDigits: 2 })}`;
    }

    // Notifications are optional and must never block app startup.
    if ("Notification" in window) {
        if (Notification.permission === "default") {
            Notification.requestPermission().then(permission => {
                console.log("Notification permission:", permission);
            }).catch((error) => {
                console.warn("Notification permission request failed silently:", error);
            });
        } else {
            console.log("Notification permission:", Notification.permission);
        }
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
