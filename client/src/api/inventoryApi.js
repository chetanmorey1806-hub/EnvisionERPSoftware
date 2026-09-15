import api from './axios';

export const inventoryApi = {
  getItems: () => api.get('/inventory/items'),
  // POST /inventory/items exists server-side and InventoryPage already calls
  // createItem — it was simply never declared here, so "Add item" threw
  // "createItem is not a function".
  createItem: (data) => api.post('/inventory/items', data),
  updateStock: (itemId, transaction) => api.post(`/inventory/items/${itemId}/stock`, transaction),
  getSuppliers: () => api.get('/inventory/suppliers'),
  createSupplier: (data) => api.post('/inventory/suppliers', data),
};
