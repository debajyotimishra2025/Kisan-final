const API_URL = "/api";

async function request(
  path,
  { method = "GET", body, token } = {}
) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body
      ? JSON.stringify(body)
      : undefined,
  });

  let data = null;

  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const message =
      (data && data.error) ||
      `Request failed with status ${res.status}`;

    throw new Error(message);
  }

  return data;
}

export const api = {
  // =========================
  // AUTH
  // =========================

  register: (payload) =>
    request("/auth/register", {
      method: "POST",
      body: payload,
    }),

  login: (payload) =>
    request("/auth/login", {
      method: "POST",
      body: payload,
    }),

  me: (token) =>
    request("/auth/me", {
      token,
    }),

  // =========================
  // NOTIFICATIONS
  // =========================

  notifications: (token) =>
    request("/notifications", {
      token,
    }),

  markNotificationRead: (
    notificationId,
    token
  ) =>
    request(
      `/notifications/${notificationId}/read`,
      {
        method: "PATCH",
        token,
      }
    ),

  // =========================
  // CROPS
  // =========================

  getCrops: () =>
    request("/crops"),

  // =========================
  // CENTERS
  // =========================

  getCenters: () =>
    request("/centers"),

  getAvailability: (
    centerId,
    date
  ) =>
    request(
      `/centers/${centerId}/availability?date=${encodeURIComponent(
        date
      )}`
    ),

  // =========================
  // ORDERS
  // =========================

  createOrder: (
    items,
    token
  ) =>
    request("/orders", {
      method: "POST",
      body: { items },
      token,
    }),

  myOrders: (token) =>
    request("/orders/me", {
      token,
    }),

  allOrders: (token) =>
    request("/orders", {
      token,
    }),

  createPaymentSession: (
    orderId,
    token
  ) =>
    request(
      `/orders/${orderId}/payment-session`,
      {
        method: "POST",
        token,
      }
    ),

  getPaymentPortal: (
    orderId,
    paymentToken
  ) =>
    request(
      `/orders/${orderId}/payment?token=${encodeURIComponent(
        paymentToken
      )}`
    ),

  completePayment: (
    orderId,
    paymentToken,
    method
  ) =>
    request(
      `/orders/${orderId}/payment/complete`,
      {
        method: "POST",
        body: {
          token: paymentToken,
          method,
        },
      }
    ),

  updateOrderStatus: (
    orderId,
    status,
    token
  ) =>
    request(
      `/orders/${orderId}/status`,
      {
        method: "PATCH",
        body: { status },
        token,
      }
    ),

  // =========================
  // APPOINTMENTS
  // =========================

  bookAppointment: (
    payload,
    token
  ) =>
    request("/appointments", {
      method: "POST",
      body: payload,
      token,
    }),

  myAppointments: (token) =>
    request("/appointments/me", {
      token,
    }),

  allAppointments: (token) =>
    request("/appointments", {
      token,
    }),
};

export default api;