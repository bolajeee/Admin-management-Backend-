// backend/src/controllers/admin.controller.js
export const getSuggestedActions = (req, res) => {
    // You can make this dynamic based on user role, stats, etc.
    const actions = [
        { label: "Create Company Wide Memo", action: "create_memo", route: "/memos/broadcast" },
        { label: "Create Task", action: "create_task" }, 
        { label: "Add Employee", action: "add_employee", route: "/admin/employees" },
        { label: "View Reports", action: "view_reports", route: "/admin/reports" },
    ];
    res.json({ actions });
};