import api from './axios';

export const inventoryApi = {
  getItems: () => api.get('/inventory/items'),
  updateStock: (itemId, transaction) => api.post(`/inventory/items/${itemId}/stock`, transaction),
  getSuppliers: () => api.get('/inventory/suppliers')
};