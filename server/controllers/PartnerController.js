/**
 * PartnerController — corporate partners master (/api/partners).
 *
 * Partners are the companies that sponsor corporate training batches and hire
 * our students. Because they are invoiced, their PAN and GSTIN are validated
 * properly rather than stored as free text: a GSTIN embeds the PAN, so the two
 * are cross-checked against each other and a typo is caught at entry instead of
 * surfacing on a rejected invoice months later.
 */
const Partner = require('../models/PartnerModel');
const { success, created, fail } = require('../utils/response');

// PAN:   AAACL0140P   -> 5 letters, 4 digits, 1 letter
// GSTIN: 27AAACL0140P1ZJ -> 2-digit state code + PAN + entity digit + 'Z' + checksum
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

// GSTIN state codes actually in use (01–38, plus 97 Other Territory).
const validStateCode = (code) => {
  const n = Number(code);
  return (n >= 1 && n <= 38) || n === 97;
};

const clean = (v) => (v == null ? '' : String(v).trim());
const upper = (v) => clean(v).toUpperCase().replace(/\s+/g, '');

/**
 * Validate the tax identifiers. Returns an error string, or null when valid.
 * Both are optional — a small partner may have neither — but if given they must
 * be right, and if BOTH are given they must agree.
 */
function validateTaxIds(pan, gst) {
  if (pan && !PAN_RE.test(pan)) {
    return 'PAN must look like ABCDE1234F — 5 letters, 4 digits, then 1 letter.';
  }
  if (gst) {
    if (!GST_RE.test(gst)) {
      return 'GSTIN must be 15 characters, e.g. 27ABCDE1234F1Z5.';
    }
    if (!validStateCode(gst.slice(0, 2))) {
      return `"${gst.slice(0, 2)}" is not a valid GST state code.`;
    }
    // Characters 3–12 of a GSTIN are the holder's PAN.
    const panInGst = gst.slice(2, 12);
    if (pan && pan !== panInGst) {
      return `The GSTIN contains PAN ${panInGst}, which does not match the PAN you entered (${pan}).`;
    }
  }
  return null;
}

/** Normalise the writable fields off the request body. */
function readBody(body = {}) {
  return {
    name: clean(body.name),
    partner_type: ['hiring', 'training', 'both'].includes(body.partner_type) ? body.partner_type : 'both',
    pan: upper(body.pan) || null,
    gst: upper(body.gst) || null,
    corp_city: clean(body.corp_city) || null,
    corp_state: clean(body.corp_state) || null,
    corp_address: clean(body.corp_address) || null,
    venue_address: clean(body.venue_address) || null,
    website: clean(body.website) || null,
    notes: clean(body.notes) || null,
  };
}

const PartnerController = {
  /** GET /partners?search=&type=&deleted=1 */
  async list(req, res) {
    const partners = await Partner.list({
      search: clean(req.query.search),
      type: clean(req.query.type),
      deleted: String(req.query.deleted || '') === '1',
    });
    return success(res, { data: partners }, 'Partners fetched.');
  },

  /** GET /partners/:id — includes its contacts. */
  async getById(req, res) {
    const partner = await Partner.findById(req.params.id, { withDeleted: true });
    if (!partner) return fail(res, 'Partner not found.', 404);
    partner.contacts = await Partner.listContacts(partner.id);
    return success(res, { data: partner }, 'Partner fetched.');
  },

  /** POST /partners — the partner plus, optionally, its contacts in one call. */
  async create(req, res) {
    const data = readBody(req.body);
    if (!data.name) return fail(res, 'Company name is required.', 422);

    const taxError = validateTaxIds(data.pan, data.gst);
    if (taxError) return fail(res, taxError, 422);

    if (data.gst) {
      const clash = await Partner.findByGst(data.gst);
      if (clash) return fail(res, `GSTIN ${data.gst} already belongs to "${clash.name}".`, 409);
    }

    const partner = await Partner.create(data);

    // Contacts may ride along with the form submit.
    const contacts = Array.isArray(req.body?.contacts) ? req.body.contacts : [];
    for (const c of contacts) {
      if (clean(c.name)) {
        await Partner.addContact(partner.id, {
          name: clean(c.name),
          designation: clean(c.designation),
          phone: clean(c.phone),
          email: clean(c.email),
          is_primary: !!c.is_primary,
        });
      }
    }
    partner.contacts = await Partner.listContacts(partner.id);
    return created(res, { data: partner }, `"${partner.name}" added.`);
  },

  /** PUT /partners/:id */
  async update(req, res) {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return fail(res, 'Partner not found.', 404);

    const data = readBody(req.body);
    if (req.body?.name !== undefined && !data.name) return fail(res, 'Company name is required.', 422);

    const taxError = validateTaxIds(data.pan, data.gst);
    if (taxError) return fail(res, taxError, 422);

    if (data.gst) {
      const clash = await Partner.findByGst(data.gst);
      if (clash && Number(clash.id) !== Number(partner.id)) {
        return fail(res, `GSTIN ${data.gst} already belongs to "${clash.name}".`, 409);
      }
    }

    const updated = await Partner.update(partner.id, data);
    updated.contacts = await Partner.listContacts(updated.id);
    return success(res, { data: updated }, `"${updated.name}" updated.`);
  },

  /** DELETE /partners/:id — soft. History (invoices, placements) is preserved. */
  async remove(req, res) {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return fail(res, 'Partner not found.', 404);
    await Partner.softDelete(partner.id);
    return success(res, {}, `"${partner.name}" moved to Deleted. You can restore it.`);
  },

  /** POST /partners/:id/restore */
  async restore(req, res) {
    const partner = await Partner.findById(req.params.id, { withDeleted: true });
    if (!partner) return fail(res, 'Partner not found.', 404);
    if (!partner.is_deleted) return fail(res, 'This partner is not deleted.', 400);
    const back = await Partner.restore(partner.id);
    return success(res, { data: back }, `"${back.name}" restored.`);
  },

  // ---- contacts -----------------------------------------------------------

  /** GET /partners/:id/contacts */
  async contacts(req, res) {
    const partner = await Partner.findById(req.params.id, { withDeleted: true });
    if (!partner) return fail(res, 'Partner not found.', 404);
    return success(res, { data: await Partner.listContacts(partner.id) }, 'Contacts fetched.');
  },

  /** POST /partners/:id/contacts */
  async addContact(req, res) {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return fail(res, 'Partner not found.', 404);

    const name = clean(req.body?.name);
    if (!name) return fail(res, 'Contact name is required.', 422);

    const contact = await Partner.addContact(partner.id, {
      name,
      designation: clean(req.body?.designation),
      phone: clean(req.body?.phone),
      email: clean(req.body?.email),
      is_primary: !!req.body?.is_primary,
    });
    return created(res, { data: contact }, `${contact.name} added as a contact.`);
  },

  /** PUT /partners/:id/contacts/:contactId */
  async updateContact(req, res) {
    const contact = await Partner.findContact(req.params.contactId);
    if (!contact) return fail(res, 'Contact not found.', 404);
    // The contact must belong to the partner in the URL, or one partner's
    // contact could be edited through another partner's endpoint.
    if (Number(contact.partner_id) !== Number(req.params.id)) {
      return fail(res, 'That contact does not belong to this partner.', 404);
    }
    const updated = await Partner.updateContact(contact.id, contact.partner_id, req.body || {});
    return success(res, { data: updated }, 'Contact updated.');
  },

  /** DELETE /partners/:id/contacts/:contactId */
  async deleteContact(req, res) {
    const contact = await Partner.findContact(req.params.contactId);
    if (!contact) return fail(res, 'Contact not found.', 404);
    if (Number(contact.partner_id) !== Number(req.params.id)) {
      return fail(res, 'That contact does not belong to this partner.', 404);
    }
    await Partner.deleteContact(contact.id);
    return success(res, {}, 'Contact removed.');
  },
};

module.exports = PartnerController;
