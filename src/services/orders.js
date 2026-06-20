const ORDERS = {
  "ORD-001": { orderId: "ORD-001", product: "Widget A", quantity: 2, status: "delivered" },
  "ORD-002": { orderId: "ORD-002", product: "Widget B", quantity: 1, status: "pending" },
  "ORD-003": { orderId: "ORD-003", product: "Widget C", quantity: 5, status: "shipped" },
};

function getOrderById(orderId) {
  const order = ORDERS[orderId];

  if (!order) {
    const err = new Error(`Order ${orderId} not found`);
    err.statusCode = 404;
    err.code = "ORDER_NOT_FOUND";
    err.publicMessage = `Order ${orderId} not found`;
    throw err;
  }

  return order;
}

module.exports = {
  getOrderById,
};
