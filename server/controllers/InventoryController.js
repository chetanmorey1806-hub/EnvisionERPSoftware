/**
 * InventoryController — /api/inventory (inventoryApi.js).
 * Stock updates are recorded as in/out transactions and adjust item quantity.
 */
const { pick, insert, findById, findAll, query } = require('../utils/crud');
const { success, created, fail } = require('../utils/response');

const ITEM_FIELDS = ['name', 'sku', 'category', 'quantity', 'unit', 'reorder_level', 'supplier_id', 'status'];
const SUPPLIER_FIELDS = ['name', 'contact', 'email', 'phone', 'address'];

const InventoryController = {
  // GET /inventory/items
  async getItems(req, res) {
    const rows = await query(
      `SELECT i.*, s.name AS supplier_name,
              (i.quantity <= i.reorder_level) AS low_stock
       FROM inventory_items i
       LEFT JOIN inventory_suppliers s ON s.id = i.supplier_id
       ORDER BY i.id DESC`
    );
    return success(res, { data: rows }, 'Inventory items fetched.');
  },

  // POST /inventory/items   (create item)
  async createItem(req, res) {
    const data = pick(req.body, ITEM_FIELDS);
    if (!data.name) return fail(res, 'Item name is required.', 422);
    const id = await insert('inventory_items', data);
    return created(res, { data: await findById('inventory_items', id) }, 'Item created.');
  },

  // POST /inventory/items/:itemId/stock  { type: 'in'|'out', quantity, note }
  async updateStock(req, res) {
    const item = await findById('inventory_items', req.params.itemId);
    if (!item) return fail(res, 'Item not found.', 404);

    const { type, quantity, note } = req.body || {};
    const qty = Number(quantity);
    if (!['in', 'out'].includes(type) || !qty || qty <= 0) {
      return fail(res, "type ('in'|'out') and a positive quantity are required.", 422);
    }
    if (type === 'out' && item.quantity < qty) {
      return fail(res, 'Insufficient stock for this withdrawal.', 409);
    }

    await insert('inventory_transactions', { item_id: item.id, type, quantity: qty, note: note || null });
    const delta = type === 'in' ? qty : -qty;
    await query('UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?', [delta, item.id]);
    return success(res, { data: await findById('inventory_items', item.id) }, 'Stock updated.');
  },

  // GET /inventory/suppliers
  async getSuppliers(req, res) {
    return success(res, { data: await findAll('inventory_suppliers') }, 'Suppliers fetched.');
  },

  // POST /inventory/suppliers  (create supplier)
  async createSupplier(req, res) {
    const data = pick(req.body, SUPPLIER_FIELDS);
    if (!data.name) return fail(res, 'Supplier name is required.', 422);
    const id = await insert('inventory_suppliers', data);
    return created(res, { data: await findById('inventory_suppliers', id) }, 'Supplier added.');
  },
};

module.exports = InventoryController;
