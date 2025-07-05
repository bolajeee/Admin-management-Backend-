export const getSuggestedActions = (req, res) => {
    // You can make this dynamic based on user role, stats, etc.
    const actions = [
        { label: "Create Company Wide Memo", action: "create_memo", route: "/memos/broadcast" },
        { label: "Add Employee", action: "add_employee", route: "/employees/new" },
        { label: "View Reports", action: "view_reports", route: "/reports" },
        // { label: "Send Message", action: "send_message", route: "/messages" }
    ];
    res.json({ actions });
};