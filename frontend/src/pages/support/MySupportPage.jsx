/**
 * MySupportPage — User-facing support history page: /support/my-tickets
 */
import React, { useState } from 'react';
import { MySupportTickets } from '../../components/support/MySupportTickets.jsx';
import '../../components/support/support.css';

// This page is embedded within the relevant layout by each role's router
export default function MySupportPage() {
    return <MySupportTickets />;
}
