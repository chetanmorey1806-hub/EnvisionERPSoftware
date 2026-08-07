import React from 'react';
import { Band } from '../common/PageShell';
import { Icons } from '../common/icons';

/* NOTE: placeholder figure — not yet wired to the enquiry API. */
const EnquiryDashboard = () => (
  <Band
    icon={Icons.enquiries}
    label="Inbound leads (this week)"
    value="342"
    note="All sources"
  />
);

export default EnquiryDashboard;
