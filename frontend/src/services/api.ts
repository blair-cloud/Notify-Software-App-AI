import {
  isMockToken,
  getMockUserByToken,
  MOCK_USERS,
  MOCK_PROPERTIES,
  MOCK_UNITS,
  MOCK_INVITATIONS,
  MOCK_TENANTS,
  MOCK_TENANCIES,
  MOCK_LEASES,
  MOCK_ADMIN_STATS,
  MOCK_ADMIN_USERS,
  MOCK_ADMIN_AUDIT_LOGS,
  MOCK_INVOICES,
  MOCK_PAYMENTS,
  MOCK_RECEIPTS,
  MOCK_EXPENSES,
  MOCK_LANDLORD_FINANCIALS,
  MOCK_TENANT_FINANCIALS,
  MOCK_NOTIFICATIONS,
  MOCK_NOTIFICATION_PREFERENCES,
  MOCK_DELIVERY_LOGS,
  MOCK_MAINTENANCE_REQUESTS,
  MOCK_COMPLAINTS,
  MOCK_WORKERS,
  MOCK_MESSAGES,
  MOCK_BANK_ACCOUNTS,
  MOCK_BANK_STATEMENTS,
  MOCK_BANK_TRANSACTIONS,
} from '../utils/mockAuth';


const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api/v1';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('notify_access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function handleMockRequest(endpoint: string, options: RequestInit = {}): any {
  const method = (options.method || 'GET').toUpperCase();
  const token = localStorage.getItem('notify_access_token') || '';

  // Auth / Me / Profile
  if (endpoint.startsWith('/auth/me')) {
    const user = getMockUserByToken(token) || MOCK_USERS['LANDLORD'];
    if (method === 'GET') {
      return user;
    }
    if (method === 'PATCH' || method === 'PUT') {
      const body = JSON.parse((options.body as string) || '{}');
      if (body.first_name !== undefined) user.first_name = body.first_name;
      if (body.last_name !== undefined) user.last_name = body.last_name;
      if (body.phone !== undefined) user.phone = body.phone;
      if (body.language !== undefined) user.language = body.language;
      if (body.avatar_url !== undefined) (user as any).avatar_url = body.avatar_url;
      if (user.landlord_profile) {
        if (body.business_type !== undefined) user.landlord_profile.business_type = body.business_type;
        if (body.business_name !== undefined) user.landlord_profile.business_name = body.business_name;
        if (body.address !== undefined) user.landlord_profile.address = body.address;
        if (body.district !== undefined) user.landlord_profile.district = body.district;
        if (body.city !== undefined) user.landlord_profile.city = body.city;
        if (body.tax_identifier !== undefined) (user.landlord_profile as any).tax_identifier = body.tax_identifier;
      }
      return user;
    }
  }

  if (endpoint.startsWith('/auth/change-password')) {
    return { status: 'success', message: 'Password updated successfully' };
  }

  // Landlord Dashboard Stats
  if (endpoint.startsWith('/landlord/stats') || endpoint.startsWith('/landlord/dashboard')) {
    const total_properties = MOCK_PROPERTIES.length;
    const total_units = MOCK_UNITS.length;
    const occupied_units = MOCK_UNITS.filter((u) => u.status === 'OCCUPIED').length;
    const vacant_units = MOCK_UNITS.filter((u) => u.status === 'VACANT').length;
    const maintenance_units = MOCK_UNITS.filter((u) => u.status === 'MAINTENANCE').length;
    const expected_monthly_rent = MOCK_UNITS.reduce(
      (sum, u) => sum + (u.monthly_rent || 0),
      0
    );
    const occupancy_rate = total_units > 0 ? (occupied_units / total_units) * 100 : 0;
    const leases_expiring_soon_count = MOCK_LEASES.filter(
      (l) => l.status === 'EXPIRING_SOON'
    ).length;

    return {
      total_properties,
      total_units,
      occupied_units,
      vacant_units,
      maintenance_units,
      expected_monthly_rent,
      occupancy_rate: Math.round(occupancy_rate * 10) / 10,
      leases_expiring_soon_count,
    };
  }

  // Properties
  if (endpoint.startsWith('/properties')) {
    const parts = endpoint.split('?')[0].split('/');
    const propId = parts[2];

    if (method === 'GET') {
      if (propId && propId !== '') {
        const prop = MOCK_PROPERTIES.find((p) => p.id === propId);
        if (!prop) throw new ApiError(404, 'Property not found');
        const units = MOCK_UNITS.filter((u) => u.property_id === propId);
        const occupied = units.filter((u) => u.status === 'OCCUPIED').length;
        const vacant = units.filter((u) => u.status === 'VACANT').length;
        const maintenance = units.filter((u) => u.status === 'MAINTENANCE').length;
        const rent = units.reduce((acc, u) => acc + (u.monthly_rent || 0), 0);
        return {
          ...prop,
          total_units: units.length,
          occupied_units: occupied,
          vacant_units: vacant,
          maintenance_units: maintenance,
          expected_monthly_rent: rent,
        };
      }
      return MOCK_PROPERTIES.map((p) => {
        const units = MOCK_UNITS.filter((u) => u.property_id === p.id);
        const occupied = units.filter((u) => u.status === 'OCCUPIED').length;
        const vacant = units.filter((u) => u.status === 'VACANT').length;
        const rent = units.reduce((acc, u) => acc + (u.monthly_rent || 0), 0);
        return {
          ...p,
          total_units: units.length,
          occupied_units: occupied,
          vacant_units: vacant,
          expected_monthly_rent: rent,
        };
      });
    }

    if (method === 'POST') {
      const body = JSON.parse((options.body as string) || '{}');
      const newProp = {
        id: `prop-${Date.now()}`,
        ...body,
        status: body.status || 'ACTIVE',
        total_units: 0,
        occupied_units: 0,
        vacant_units: 0,
        expected_monthly_rent: 0,
      };
      MOCK_PROPERTIES.push(newProp);
      return newProp;
    }

    if (method === 'PUT' || method === 'PATCH') {
      const body = JSON.parse((options.body as string) || '{}');
      const index = MOCK_PROPERTIES.findIndex((p) => p.id === propId);
      if (index !== -1) {
        MOCK_PROPERTIES[index] = { ...MOCK_PROPERTIES[index], ...body };
        return MOCK_PROPERTIES[index];
      }
    }

    if (method === 'DELETE') {
      const index = MOCK_PROPERTIES.findIndex((p) => p.id === propId);
      if (index !== -1) {
        // Soft delete / archive if property has units
        MOCK_PROPERTIES[index].status = 'ARCHIVED';
        return MOCK_PROPERTIES[index];
      }
    }
  }

  // Units
  if (endpoint.startsWith('/units')) {
    const parts = endpoint.split('?')[0].split('/');
    const unitId = parts[2];

    if (method === 'GET') {
      if (unitId && unitId !== '') {
        const unit = MOCK_UNITS.find((u) => u.id === unitId);
        if (!unit) throw new ApiError(404, 'Unit not found');
        return unit;
      }
      // Check query params e.g. property_id
      const urlObj = new URL('http://dummy.com' + endpoint);
      const propertyId = urlObj.searchParams.get('property_id');
      if (propertyId) {
        return MOCK_UNITS.filter((u) => u.property_id === propertyId);
      }
      return MOCK_UNITS;
    }

    if (method === 'POST') {
      const body = JSON.parse((options.body as string) || '{}');
      const newUnit = {
        id: `unit-${Date.now()}`,
        ...body,
        status: body.status || 'VACANT',
        floor: Number(body.floor) || 1,
        monthly_rent: Number(body.monthly_rent) || 0,
        currency: body.currency || 'RWF',
      };
      MOCK_UNITS.push(newUnit);
      return newUnit;
    }

    if (method === 'PUT' || method === 'PATCH') {
      const body = JSON.parse((options.body as string) || '{}');
      const index = MOCK_UNITS.findIndex((u) => u.id === unitId);
      if (index !== -1) {
        MOCK_UNITS[index] = { ...MOCK_UNITS[index], ...body };
        return MOCK_UNITS[index];
      }
    }

    if (method === 'DELETE') {
      const index = MOCK_UNITS.findIndex((u) => u.id === unitId);
      if (index !== -1) {
        MOCK_UNITS.splice(index, 1);
        return { message: 'Unit deleted' };
      }
    }
  }

  // Leases
  if (endpoint.startsWith('/leases')) {
    const parts = endpoint.split('?')[0].split('/');
    const leaseId = parts[2];
    const subAction = parts[3];

    if (method === 'GET') {
      if (leaseId && leaseId !== '') {
        const lease = MOCK_LEASES.find((l) => l.id === leaseId);
        if (!lease) throw new ApiError(404, 'Lease not found');
        return lease;
      }
      return MOCK_LEASES;
    }

    // Document upload / replacement on a lease
    if (subAction === 'document' && (method === 'POST' || method === 'PUT')) {
      const body = JSON.parse((options.body as string) || '{}');
      const index = MOCK_LEASES.findIndex((l) => l.id === leaseId);
      if (index === -1) throw new ApiError(404, 'Lease not found');

      const lease = MOCK_LEASES[index];
      const existingDoc = lease.agreement_document;
      const prevHistory = existingDoc?.history || lease.document_history || [];
      const newVersionNum = (existingDoc?.version || 0) + 1;
      const fileName = body.file_name || `${lease.property_name || 'Property'}_${lease.unit_number || 'Unit'}_Lease_Agreement_v${newVersionNum}.pdf`;
      const docName = body.document_name || fileName;
      const storagePath = `leases/${lease.id}/agreement/v${newVersionNum}/${fileName}`;
      const nowIso = new Date().toISOString();

      const newVersionEntry = {
        version: newVersionNum,
        document_name: docName,
        file_name: fileName,
        file_type: body.file_type || 'application/pdf',
        file_size: body.file_size || 2500000,
        storage_path: storagePath,
        file_data: body.file_data,
        uploaded_by: body.uploaded_by || 'Landlord',
        uploaded_by_role: body.uploaded_by_role || 'LANDLORD',
        uploaded_at: nowIso,
        version_notes: body.version_notes || (newVersionNum === 1 ? 'Initial signed agreement uploaded.' : `Version ${newVersionNum} uploaded by ${body.uploaded_by || 'Landlord'}`),
        status: 'ACTIVE' as const,
      };

      // Mark old versions in history as SUPERSEDED
      const updatedHistory = prevHistory.map((v: any) => ({
        ...v,
        status: 'SUPERSEDED',
      }));
      updatedHistory.push(newVersionEntry);

      const updatedAgreementDoc = {
        id: existingDoc?.id || `doc-${Date.now()}`,
        lease_id: lease.id,
        tenant_id: lease.tenant_id,
        tenant_name: lease.tenant_name,
        property_id: lease.property_id,
        property_name: lease.property_name,
        unit_id: lease.unit_id,
        unit_number: lease.unit_number,
        doc_type: 'LEASE_AGREEMENT' as const,
        document_name: docName,
        file_name: fileName,
        file_type: body.file_type || 'application/pdf',
        file_size: body.file_size || 2500000,
        storage_path: storagePath,
        file_data: body.file_data,
        uploaded_by: body.uploaded_by || 'Landlord',
        uploaded_by_role: body.uploaded_by_role || 'LANDLORD',
        uploaded_at: nowIso,
        version: newVersionNum,
        status: 'ACTIVE' as const,
        is_verified: true,
        history: updatedHistory,
      };

      MOCK_LEASES[index] = {
        ...lease,
        agreement_document: updatedAgreementDoc,
        document_history: updatedHistory,
        has_signed_document: true,
        compliance_status: 'COMPLETE',
        compliance_notes: 'All legal requirements met. Signed agreement on file.',
      };

      // Record Audit Log
      MOCK_ADMIN_AUDIT_LOGS.unshift({
        id: `audit-${Date.now()}`,
        action: newVersionNum === 1 ? 'LEASE_DOCUMENT_UPLOADED' : 'LEASE_DOCUMENT_REPLACED',
        user_email: body.uploaded_by || 'landlord@notify.test',
        details: `Lease ${lease.id} (${lease.property_name} - ${lease.unit_number}): Document '${docName}' v${newVersionNum} uploaded. Storage: ${storagePath}`,
        ip_address: '197.243.22.10',
        timestamp: nowIso,
      });

      // Notification
      MOCK_NOTIFICATIONS.unshift({
        id: `notif-${Date.now()}`,
        user_id: lease.tenant_id || 'tenant-001',
        type: 'LEASE_AGREEMENT_UPLOADED',
        title: 'Lease Agreement Uploaded',
        message: `A new lease agreement (v${newVersionNum}) has been uploaded for Unit ${lease.unit_number || ''} (${lease.property_name || 'Property'}).`,
        category: 'LEASE_EXPIRY',
        priority: 'MEDIUM',
        channel: 'IN_APP',
        status: 'SENT',
        entity_type: 'LEASE',
        entity_id: lease.id,
        is_read: false,
        created_at: nowIso,
      });

      return MOCK_LEASES[index];
    }

    // Activate lease endpoint (validates required document)
    if (subAction === 'activate' && (method === 'POST' || method === 'PATCH')) {
      const index = MOCK_LEASES.findIndex((l) => l.id === leaseId);
      if (index === -1) throw new ApiError(404, 'Lease not found');

      const lease = MOCK_LEASES[index];
      if (!lease.agreement_document && !lease.has_signed_document) {
        // Trigger notification about missing document
        MOCK_NOTIFICATIONS.unshift({
          id: `notif-req-${Date.now()}`,
          user_id: 'landlord-001',
          type: 'LEASE_AGREEMENT_REQUIRED',
          title: 'Lease Agreement Required',
          message: `A signed lease agreement must be uploaded before lease ${lease.id} for Unit ${lease.unit_number} can be activated.`,
          category: 'SYSTEM',
          priority: 'HIGH',
          channel: 'IN_APP',
          status: 'SENT',
          is_read: false,
          created_at: new Date().toISOString(),
        });
        throw new ApiError(400, 'Lease agreement document is required before this lease can be activated.');
      }

      MOCK_LEASES[index] = {
        ...lease,
        status: 'ACTIVE',
        compliance_status: 'COMPLETE',
      };

      MOCK_ADMIN_AUDIT_LOGS.unshift({
        id: `audit-${Date.now()}`,
        action: 'LEASE_ACTIVATED',
        user_email: 'landlord@notify.test',
        details: `Lease ${lease.id} for ${lease.tenant_name} (${lease.property_name} - ${lease.unit_number}) activated.`,
        ip_address: '197.243.22.10',
        timestamp: new Date().toISOString(),
      });

      return MOCK_LEASES[index];
    }

    // Renew lease endpoint
    if (subAction === 'renew' && method === 'POST') {
      const body = JSON.parse((options.body as string) || '{}');
      const index = MOCK_LEASES.findIndex((l) => l.id === leaseId);
      if (index === -1) throw new ApiError(404, 'Lease not found');

      const originalLease = MOCK_LEASES[index];
      const nowIso = new Date().toISOString();

      let renewedDoc = originalLease.agreement_document;
      let docHistory = originalLease.document_history || originalLease.agreement_document?.history || [];

      if (body.document) {
        const nextVer = (renewedDoc?.version || 0) + 1;
        const fileName = body.document.file_name || `${originalLease.property_name}_${originalLease.unit_number}_Renewal_Agreement_v${nextVer}.pdf`;
        const storagePath = `leases/${originalLease.id}/agreement/v${nextVer}/${fileName}`;

        const newVersionEntry = {
          version: nextVer,
          document_name: body.document.document_name || `Renewal Agreement v${nextVer}`,
          file_name: fileName,
          file_type: body.document.file_type || 'application/pdf',
          file_size: body.document.file_size || 2800000,
          storage_path: storagePath,
          file_data: body.document.file_data,
          uploaded_by: body.document.uploaded_by || 'Landlord',
          uploaded_by_role: 'LANDLORD',
          uploaded_at: nowIso,
          version_notes: body.document.version_notes || `Renewal executed for ${body.start_date || 'new term'} to ${body.end_date || 'extended term'}.`,
          status: 'ACTIVE' as const,
        };

        const updatedHistory = docHistory.map((h: any) => ({ ...h, status: 'SUPERSEDED' }));
        updatedHistory.push(newVersionEntry);
        docHistory = updatedHistory;

        renewedDoc = {
          id: `doc-${Date.now()}`,
          lease_id: originalLease.id,
          tenant_id: originalLease.tenant_id,
          tenant_name: originalLease.tenant_name,
          property_id: originalLease.property_id,
          property_name: originalLease.property_name,
          unit_id: originalLease.unit_id,
          unit_number: originalLease.unit_number,
          doc_type: 'RENEWAL_ADDENDUM' as const,
          document_name: body.document.document_name || `Renewal Agreement v${nextVer}`,
          file_name: fileName,
          file_type: body.document.file_type || 'application/pdf',
          file_size: body.document.file_size || 2800000,
          storage_path: storagePath,
          file_data: body.document.file_data,
          uploaded_by: body.document.uploaded_by || 'Landlord',
          uploaded_by_role: 'LANDLORD',
          uploaded_at: nowIso,
          version: nextVer,
          status: 'ACTIVE' as const,
          is_verified: true,
          history: docHistory,
        };
      }

      MOCK_LEASES[index] = {
        ...originalLease,
        start_date: body.start_date || originalLease.start_date,
        end_date: body.end_date || originalLease.end_date,
        monthly_rent: body.monthly_rent || originalLease.monthly_rent,
        security_deposit: body.security_deposit || originalLease.security_deposit,
        status: 'ACTIVE',
        days_remaining: 365,
        notes: body.notes || `Renewed on ${nowIso.slice(0, 10)}. Previous term extended.`,
        agreement_document: renewedDoc,
        document_history: docHistory,
        has_signed_document: true,
        compliance_status: 'COMPLETE',
        renewal_count: (originalLease.renewal_count || 0) + 1,
      };

      // Record renewal audit log
      MOCK_ADMIN_AUDIT_LOGS.unshift({
        id: `audit-${Date.now()}`,
        action: 'LEASE_RENEWED',
        user_email: 'landlord@notify.test',
        details: `Lease ${originalLease.id} renewed for ${originalLease.tenant_name} (${originalLease.property_name} - ${originalLease.unit_number}) until ${body.end_date}. Document relationship retained.`,
        ip_address: '197.243.22.10',
        timestamp: nowIso,
      });

      return MOCK_LEASES[index];
    }

    if (method === 'POST') {
      const body = JSON.parse((options.body as string) || '{}');
      const targetStatus = body.status || 'ACTIVE';
      const hasDoc = !!(body.agreement_document || body.document || body.has_signed_document);

      // Validation: Lease agreement document is required when activating/finalizing a lease
      if (targetStatus === 'ACTIVE' && !hasDoc) {
        throw new ApiError(400, 'Lease agreement document is required before this lease can be activated.');
      }

      const newLeaseId = `lease-${Date.now()}`;
      const nowIso = new Date().toISOString();

      let agreementDoc: any = undefined;
      let historyList: any[] = [];

      if (hasDoc) {
        const rawDoc = body.agreement_document || body.document || {};
        const fileName = rawDoc.file_name || `${body.property_name || 'Property'}_${body.unit_number || 'Unit'}_Lease_Agreement_v1.pdf`;
        const docName = rawDoc.document_name || fileName;
        const storagePath = `leases/${newLeaseId}/agreement/v1/${fileName}`;

        const initialVersion = {
          version: 1,
          document_name: docName,
          file_name: fileName,
          file_type: rawDoc.file_type || 'application/pdf',
          file_size: rawDoc.file_size || 2400000,
          storage_path: storagePath,
          file_data: rawDoc.file_data,
          uploaded_by: rawDoc.uploaded_by || 'Landlord',
          uploaded_by_role: 'LANDLORD',
          uploaded_at: nowIso,
          version_notes: rawDoc.version_notes || 'Initial executed signed lease agreement.',
          status: 'ACTIVE' as const,
        };

        historyList = [initialVersion];
        agreementDoc = {
          id: `doc-${Date.now()}`,
          lease_id: newLeaseId,
          tenant_id: body.tenant_id,
          tenant_name: body.tenant_name,
          property_id: body.property_id,
          property_name: body.property_name,
          unit_id: body.unit_id,
          unit_number: body.unit_number,
          doc_type: 'LEASE_AGREEMENT',
          document_name: docName,
          file_name: fileName,
          file_type: rawDoc.file_type || 'application/pdf',
          file_size: rawDoc.file_size || 2400000,
          storage_path: storagePath,
          file_data: rawDoc.file_data,
          uploaded_by: rawDoc.uploaded_by || 'Landlord',
          uploaded_by_role: 'LANDLORD',
          uploaded_at: nowIso,
          version: 1,
          status: 'ACTIVE',
          is_verified: true,
          history: historyList,
        };

        // Audit Log
        MOCK_ADMIN_AUDIT_LOGS.unshift({
          id: `audit-${Date.now()}`,
          action: 'LEASE_DOCUMENT_UPLOADED',
          user_email: rawDoc.uploaded_by || 'landlord@notify.test',
          details: `Lease ${newLeaseId}: Document '${docName}' v1 uploaded during lease creation. Storage: ${storagePath}`,
          ip_address: '197.243.22.10',
          timestamp: nowIso,
        });

        // Notification
        MOCK_NOTIFICATIONS.unshift({
          id: `notif-${Date.now()}`,
          user_id: body.tenant_id || 'tenant-001',
          type: 'LEASE_AGREEMENT_UPLOADED',
          title: 'Lease Agreement Uploaded',
          message: `A new lease agreement has been uploaded for Unit ${body.unit_number || ''} (${body.property_name || 'Property'}).`,
          category: 'LEASE_EXPIRY',
          priority: 'MEDIUM',
          channel: 'IN_APP',
          status: 'SENT',
          entity_type: 'LEASE',
          entity_id: newLeaseId,
          is_read: false,
          created_at: nowIso,
        });
      }

      const newLease = {
        id: newLeaseId,
        ...body,
        status: targetStatus,
        has_signed_document: hasDoc,
        compliance_status: hasDoc ? 'COMPLETE' : 'INCOMPLETE',
        compliance_notes: hasDoc
          ? 'All legal requirements met. Signed agreement on file.'
          : 'Missing: Signed Lease Agreement. Upload signed copy to activate lease.',
        agreement_document: agreementDoc,
        document_history: historyList,
      };

      MOCK_LEASES.push(newLease);

      MOCK_ADMIN_AUDIT_LOGS.unshift({
        id: `audit-create-${Date.now()}`,
        action: 'LEASE_CREATED',
        user_email: 'landlord@notify.test',
        details: `New lease ${newLeaseId} created for ${body.tenant_name || 'Tenant'} (${body.property_name} - ${body.unit_number}) in status ${targetStatus}.`,
        ip_address: '197.243.22.10',
        timestamp: nowIso,
      });

      return newLease;
    }

    if (method === 'PUT' || method === 'PATCH') {
      const body = JSON.parse((options.body as string) || '{}');
      const index = MOCK_LEASES.findIndex((l) => l.id === leaseId);
      if (index !== -1) {
        // If activating via update, check for document
        if (body.status === 'ACTIVE' && MOCK_LEASES[index].status === 'DRAFT') {
          const hasDoc = !!(MOCK_LEASES[index].agreement_document || MOCK_LEASES[index].has_signed_document || body.agreement_document);
          if (!hasDoc) {
            throw new ApiError(400, 'Lease agreement document is required before this lease can be activated.');
          }
        }
        MOCK_LEASES[index] = { ...MOCK_LEASES[index], ...body };
        return MOCK_LEASES[index];
      }
    }
  }

  // Documents Center (Unified single source of truth across leases, invoices, receipts, and compliance)
  if (endpoint.startsWith('/documents')) {
    if (method === 'GET') {
      const allDocs: any[] = [];
      
      // Surface all lease agreements
      MOCK_LEASES.forEach((l) => {
        if (l.agreement_document) {
          allDocs.push({
            ...l.agreement_document,
            category: 'LEASE_AGREEMENT',
            source: 'LEASE',
            reference_id: l.id,
            property_name: l.property_name,
            unit_number: l.unit_number,
            tenant_name: l.tenant_name,
          });
        }
      });

      return allDocs;
    }
  }

  // Tenancies
  if (endpoint.startsWith('/tenancies')) {
    const parts = endpoint.split('?')[0].split('/');
    const tenancyId = parts[2];

    if (method === 'GET') {
      return MOCK_TENANCIES;
    }

    if (method === 'POST') {
      const body = JSON.parse((options.body as string) || '{}');
      // Validate double occupancy
      const occupiedUnit = MOCK_UNITS.find(
        (u) => u.id === body.unit_id && u.status === 'OCCUPIED'
      );
      if (occupiedUnit) {
        throw new ApiError(400, 'This unit is already occupied by another tenant.');
      }

      const newTenancy = {
        id: `tenancy-${Date.now()}`,
        ...body,
        status: 'ACTIVE',
      };
      MOCK_TENANCIES.push(newTenancy);

      // Update unit status
      const unitIdx = MOCK_UNITS.findIndex((u) => u.id === body.unit_id);
      if (unitIdx !== -1) {
        MOCK_UNITS[unitIdx].status = 'OCCUPIED';
      }

      return newTenancy;
    }

    if (endpoint.includes('/end')) {
      const index = MOCK_TENANCIES.findIndex((t) => t.id === tenancyId);
      if (index !== -1) {
        MOCK_TENANCIES[index].status = 'ENDED';
        const unitId = MOCK_TENANCIES[index].unit_id;
        const unitIdx = MOCK_UNITS.findIndex((u) => u.id === unitId);
        if (unitIdx !== -1) {
          MOCK_UNITS[unitIdx].status = 'VACANT';
        }
        return MOCK_TENANCIES[index];
      }
    }
  }

  // Invitations
  if (endpoint.startsWith('/invitations')) {
    if (method === 'GET') return MOCK_INVITATIONS;
    if (method === 'POST') {
      const body = JSON.parse((options.body as string) || '{}');
      const prop = MOCK_PROPERTIES.find((p) => p.id === body.property_id);
      const unit = MOCK_UNITS.find((u) => u.id === body.unit_id);
      const newInv = {
        id: `inv-${Date.now()}`,
        tenant_email: body.tenant_email,
        tenant_phone: body.tenant_phone,
        property_id: body.property_id,
        property_name: prop ? prop.name : 'Selected Property',
        unit_id: body.unit_id,
        unit_number: unit ? unit.unit_number : 'Selected Unit',
        token: `inv_mock_${Date.now()}`,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      };
      MOCK_INVITATIONS.push(newInv);
      return {
        invitation: newInv,
        raw_token: newInv.token,
        invite_link: `/accept-invitation?token=${newInv.token}`,
      };
    }
  }

  // Tenant views
  if (endpoint.startsWith('/tenants/me/tenancies') || endpoint.startsWith('/tenant/tenancy')) {
    return MOCK_TENANCIES;
  }

  if (endpoint.startsWith('/tenants')) {
    const parts = endpoint.split('?')[0].split('/');
    const tenantId = parts[2];
    if (tenantId) {
      const tenant = MOCK_TENANTS.find((t) => t.id === tenantId);
      if (tenant) return tenant;
    }
    return MOCK_TENANTS;
  }

  // Admin views & operations
  if (endpoint.startsWith('/admin')) {
    if (endpoint.includes('/stats') || endpoint.includes('/dashboard')) {
      const expRent = MOCK_INVOICES.reduce((acc, i) => acc + (i.total_amount || 0), 0);
      const colRent = MOCK_INVOICES.reduce((acc, i) => acc + (i.amount_paid || 0), 0);
      const outBal = MOCK_INVOICES.reduce((acc, i) => acc + (i.balance_due || 0), 0);
      const pendingPays = MOCK_PAYMENTS.filter((p) => p.status === 'AWAITING_VERIFICATION' || p.status === 'PENDING' || p.verification_status === 'PENDING_VERIFICATION').length;
      const urgentMaint = MOCK_MAINTENANCE_REQUESTS.filter((m) => (m.priority === 'URGENT' || m.priority === 'HIGH') && m.status !== 'RESOLVED' && m.status !== 'CLOSED').length;
      const missingDocs = MOCK_LEASES.filter((l) => l.status === 'ACTIVE' && !l.agreement_document && !l.has_signed_document).length;
      const landlordsCount = MOCK_ADMIN_USERS.filter((u) => u.role === 'LANDLORD').length;
      const tenantsCount = MOCK_ADMIN_USERS.filter((u) => u.role === 'TENANT').length;

      return {
        ...MOCK_ADMIN_STATS,
        total_users: MOCK_ADMIN_USERS.length,
        total_landlords: landlordsCount || 3,
        total_tenants: tenantsCount || MOCK_TENANTS.length,
        total_properties: MOCK_PROPERTIES.length,
        total_units: MOCK_UNITS.length,
        occupied_units: MOCK_UNITS.filter((u) => u.status === 'OCCUPIED').length,
        vacant_units: MOCK_UNITS.filter((u) => u.status === 'VACANT').length,
        active_tenancies: MOCK_TENANCIES.length,
        active_leases: MOCK_LEASES.filter((l) => l.status === 'ACTIVE').length,
        expiring_leases: MOCK_LEASES.filter((l) => l.status === 'EXPIRING_SOON').length,
        expected_rent: expRent || 1450000,
        collected_rent: colRent || 1100000,
        outstanding_balance: outBal || 350000,
        collection_rate: expRent > 0 ? Math.round((colRent / expRent) * 1000) / 10 : 75.8,
        pending_payments: pendingPays,
        urgent_maintenance: urgentMaint,
        missing_docs_count: missingDocs,
        compliance_score: Math.max(0, 100 - (missingDocs * 5)),
        currency: 'RWF',
      };
    }

    if (endpoint.startsWith('/admin/users')) {
      const parts = endpoint.split('?')[0].split('/');
      const userId = parts[3];
      const action = parts[4];

      if (method === 'GET') {
        return MOCK_ADMIN_USERS;
      }

      if (method === 'POST' && !userId) {
        const body = JSON.parse((options.body as string) || '{}');
        const newId = `user-${Date.now()}`;
        const newUser = {
          id: newId,
          first_name: body.first_name || 'Admin',
          last_name: body.last_name || 'User',
          email: body.email,
          phone: body.phone || '+250780000000',
          role: body.role || 'LANDLORD',
          status: 'ACTIVE',
          business_name: body.business_name || (body.role === 'LANDLORD' ? `${body.last_name} Properties Ltd` : undefined),
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
        };
        MOCK_ADMIN_USERS.unshift(newUser);

        if (body.role === 'TENANT') {
          MOCK_TENANTS.unshift({
            id: `tenant-${Date.now()}`,
            user_id: newId,
            first_name: body.first_name,
            last_name: body.last_name,
            email: body.email,
            phone: body.phone,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          } as any);
        }

        MOCK_ADMIN_AUDIT_LOGS.unshift({
          id: `audit-${Date.now()}`,
          action: 'USER_CREATED',
          user_email: 'admin@notify.test',
          details: `Created new user account ${newUser.email} with role ${newUser.role}`,
          ip_address: '197.243.22.84',
          timestamp: new Date().toISOString(),
        } as any);

        return newUser;
      }

      if (userId) {
        const uIdx = MOCK_ADMIN_USERS.findIndex((u) => u.id === userId);
        if (uIdx !== -1) {
          const body = options.body ? JSON.parse(options.body as string) : {};
          if (action === 'suspend' || body.status === 'SUSPENDED') {
            MOCK_ADMIN_USERS[uIdx].status = 'SUSPENDED';
          } else if (action === 'activate' || body.status === 'ACTIVE') {
            MOCK_ADMIN_USERS[uIdx].status = 'ACTIVE';
          }
          if (action === 'role' || body.role) {
            MOCK_ADMIN_USERS[uIdx].role = body.role || MOCK_ADMIN_USERS[uIdx].role;
          }

          MOCK_ADMIN_AUDIT_LOGS.unshift({
            id: `audit-${Date.now()}`,
            action: 'USER_STATUS_UPDATED',
            user_email: 'admin@notify.test',
            details: `Updated user ${MOCK_ADMIN_USERS[uIdx].email}: status=${MOCK_ADMIN_USERS[uIdx].status}, role=${MOCK_ADMIN_USERS[uIdx].role}`,
            ip_address: '197.243.22.84',
            timestamp: new Date().toISOString(),
          } as any);

          return MOCK_ADMIN_USERS[uIdx];
        }
      }
    }

    if (endpoint.startsWith('/admin/properties') && endpoint.includes('/reassign')) {
      const parts = endpoint.split('/');
      const propId = parts[3];
      const body = JSON.parse((options.body as string) || '{}');
      const propIdx = MOCK_PROPERTIES.findIndex((p) => p.id === propId);
      if (propIdx !== -1) {
        const landlord = MOCK_ADMIN_USERS.find((u) => u.id === body.landlord_id);
        const landlordName = landlord ? `${landlord.first_name} ${landlord.last_name}` : 'Assigned Landlord';
        MOCK_PROPERTIES[propIdx].landlord_id = body.landlord_id;
        MOCK_PROPERTIES[propIdx].landlord_name = landlordName;

        // Cascade to units
        MOCK_UNITS.forEach((u) => {
          if (u.property_id === propId) {
            u.landlord_id = body.landlord_id;
            u.landlord_name = landlordName;
          }
        });

        MOCK_ADMIN_AUDIT_LOGS.unshift({
          id: `audit-${Date.now()}`,
          action: 'PROPERTY_REASSIGNED',
          user_email: 'admin@notify.test',
          details: `Reassigned property ${MOCK_PROPERTIES[propIdx].name} to landlord ${landlordName} (${body.landlord_id})`,
          ip_address: '197.243.22.84',
          timestamp: new Date().toISOString(),
        } as any);

        return MOCK_PROPERTIES[propIdx];
      }
    }

    if (endpoint.startsWith('/admin/notifications/broadcast')) {
      const body = JSON.parse((options.body as string) || '{}');
      const audience = body.target_audience || 'ALL';
      const newNotif = {
        id: `notif-broadcast-${Date.now()}`,
        user_id: 'broadcast-all',
        type: 'ADMIN_ANNOUNCEMENT',
        title: body.title,
        message: body.message,
        channel: 'IN_APP',
        priority: body.priority || 'HIGH',
        category: 'SYSTEM',
        status: 'SENT',
        target_audience: audience,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      MOCK_NOTIFICATIONS.unshift(newNotif);

      MOCK_ADMIN_AUDIT_LOGS.unshift({
        id: `audit-${Date.now()}`,
        action: 'BROADCAST_NOTIFICATION_SENT',
        user_email: 'admin@notify.test',
        details: `Broadcast notification "${body.title}" dispatched to audience: ${audience}`,
        ip_address: '197.243.22.84',
        timestamp: new Date().toISOString(),
      } as any);

      return { success: true, notification: newNotif };
    }

    if (endpoint.startsWith('/admin/audit-logs')) {
      return MOCK_ADMIN_AUDIT_LOGS;
    }

    if (endpoint.startsWith('/admin/properties')) {
      return MOCK_PROPERTIES;
    }

    if (endpoint.startsWith('/admin/units')) {
      return MOCK_UNITS;
    }

    if (endpoint.startsWith('/admin/tenants')) {
      return MOCK_TENANTS;
    }

    if (endpoint.startsWith('/admin/tenancies')) {
      return MOCK_TENANCIES;
    }

    if (endpoint.startsWith('/admin/leases')) {
      return MOCK_LEASES;
    }

    if (endpoint.startsWith('/admin/invitations')) {
      return MOCK_INVITATIONS;
    }
  }

  if (endpoint.startsWith('/auth/me')) {
    const user = getMockUserByToken(token);
    if (user) return user;
  }

  // --- PHASE 3 FINANCIAL MOCK HANDLERS ---

  // Invoices
  if (endpoint.startsWith('/invoices')) {
    if (endpoint.includes('/generate') || (method === 'POST' && endpoint === '/invoices')) {
      const body = options.body ? JSON.parse(options.body as string) : {};
      
      // Batch generate for all occupied units/leases if requested without specific tenant
      if (body.batch) {
        const generatedList: any[] = [];
        const activeTenancies = MOCK_TENANTS.filter((t) => t.unit_id && t.property_id);
        
        activeTenancies.forEach((t, idx) => {
          const invNum = `INV-2026-0000${MOCK_INVOICES.length + idx + 1}`;
          const newInv = {
            id: `inv-batch-${Date.now()}-${idx}`,
            invoice_number: invNum,
            landlord_id: 'mock-lp-001',
            tenant_id: t.id,
            property_id: t.property_id || 'prop-heights',
            unit_id: t.unit_id || 'unit-a102',
            tenancy_id: `tenancy-${t.id}`,
            lease_id: `lease-${t.id}`,
            invoice_type: 'RENT',
            billing_period_start: body.period_start || '2026-09-01',
            billing_period_end: body.period_end || '2026-09-30',
            issue_date: body.issue_date || new Date().toISOString().split('T')[0],
            due_date: body.due_date || '2026-09-05',
            subtotal: t.monthly_rent || 350000,
            discount: 0,
            late_fee: 0,
            total_amount: t.monthly_rent || 350000,
            amount_paid: 0,
            balance_due: t.monthly_rent || 350000,
            currency: 'RWF',
            status: 'ISSUED',
            tenant_name: `${t.first_name} ${t.last_name}`,
            property_name: t.property_name || 'Notify Heights',
            unit_number: t.unit_number || 'A-102',
            created_at: new Date().toISOString(),
          };
          MOCK_INVOICES.unshift(newInv);
          generatedList.push(newInv);
        });
        return generatedList;
      }

      // Single invoice generation
      const prop = MOCK_PROPERTIES.find((p) => p.id === body.property_id);
      const unit = MOCK_UNITS.find((u) => u.id === body.unit_id);
      const tenant = MOCK_TENANTS.find((t) => t.id === body.tenant_id);

      const amount = Number(body.total_amount || body.subtotal || 350000);
      const newInv = {
        id: `inv-${Date.now()}`,
        invoice_number: `INV-2026-0000${MOCK_INVOICES.length + 1}`,
        landlord_id: 'mock-lp-001',
        tenant_id: body.tenant_id || 'mock-tenant-001',
        property_id: body.property_id || 'prop-heights',
        unit_id: body.unit_id || 'unit-a102',
        tenancy_id: 'tenancy-101',
        lease_id: 'lease-101',
        invoice_type: body.invoice_type || 'RENT',
        billing_period_start: body.billing_period_start || '2026-09-01',
        billing_period_end: body.billing_period_end || '2026-09-30',
        issue_date: body.issue_date || new Date().toISOString().split('T')[0],
        due_date: body.due_date || '2026-09-05',
        subtotal: amount,
        discount: Number(body.discount || 0),
        late_fee: Number(body.late_fee || 0),
        total_amount: amount,
        amount_paid: 0,
        balance_due: amount,
        currency: 'RWF',
        status: 'ISSUED',
        tenant_name: tenant ? `${tenant.first_name} ${tenant.last_name}` : (body.tenant_name || 'Test Tenant'),
        property_name: prop ? prop.name : (body.property_name || 'Notify Heights'),
        unit_number: unit ? unit.unit_number : (body.unit_number || 'A-102'),
        created_at: new Date().toISOString(),
      };
      MOCK_INVOICES.unshift(newInv);
      return newInv;
    }
    if (method === 'DELETE') {
      const invId = endpoint.split('?')[0].split('/')[2];
      const idx = MOCK_INVOICES.findIndex((i) => i.id === invId);
      if (idx !== -1) {
        MOCK_INVOICES[idx].status = 'CANCELLED';
        return { message: 'Invoice cancelled', invoice: MOCK_INVOICES[idx] };
      }
    }
    if (endpoint.includes('/cancel')) {
      const invId = endpoint.split('/')[2];
      const inv = MOCK_INVOICES.find((i) => i.id === invId);
      if (inv) {
        inv.status = 'CANCELLED';
        return inv;
      }
    }
    const invId = endpoint.split('/')[2];
    if (invId && !endpoint.includes('landlord') && !endpoint.includes('tenant')) {
      return MOCK_INVOICES.find((i) => i.id === invId) || MOCK_INVOICES[0];
    }
    return MOCK_INVOICES;
  }

  // Payments
  if (endpoint.startsWith('/payments')) {
    if (endpoint.includes('/pay')) {
      const body = JSON.parse((options.body as string) || '{}');
      const invoice = MOCK_INVOICES.find((i) => i.id === body.invoice_id) || MOCK_INVOICES[0];
      const isOnline = body.payment_channel !== 'OFFLINE';
      const isAuto = body.auto_verify || isOnline;

      const newPay = {
        id: `pay-${Date.now()}`,
        payment_reference: `PAY-2026-00000${MOCK_PAYMENTS.length + 1}`,
        transaction_reference: body.transaction_reference || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        invoice_id: invoice.id,
        tenancy_id: invoice.tenancy_id,
        lease_id: invoice.lease_id,
        landlord_id: invoice.landlord_id,
        tenant_id: invoice.tenant_id,
        property_id: invoice.property_id,
        unit_id: invoice.unit_id,
        amount: Number(body.amount),
        currency: invoice.currency || 'RWF',
        payment_method: body.payment_method || 'MOBILE_MONEY',
        payment_channel: body.payment_channel || 'ONLINE',
        status: isAuto ? 'COMPLETED' : 'AWAITING_VERIFICATION',
        paid_at: isAuto ? new Date().toISOString() : undefined,
        verified_at: isAuto ? new Date().toISOString() : undefined,
        notes: body.notes,
        tenant_name: invoice.tenant_name || 'Test Tenant',
        property_name: invoice.property_name || 'Notify Heights',
        unit_number: invoice.unit_number || 'A-102',
        invoice_number: invoice.invoice_number,
        created_at: new Date().toISOString(),
      };

      MOCK_PAYMENTS.unshift(newPay);

      let newReceipt = null;
      if (isAuto) {
        invoice.amount_paid += newPay.amount;
        invoice.balance_due = Math.max(0, invoice.total_amount - invoice.amount_paid);
        if (invoice.balance_due === 0) invoice.status = 'PAID';
        else invoice.status = 'PARTIALLY_PAID';

        newReceipt = {
          id: `rct-${Date.now()}`,
          receipt_number: `RCT-2026-00000${MOCK_RECEIPTS.length + 1}`,
          payment_id: newPay.id,
          invoice_id: invoice.id,
          tenant_id: invoice.tenant_id,
          landlord_id: invoice.landlord_id,
          property_id: invoice.property_id,
          unit_id: invoice.unit_id,
          amount: newPay.amount,
          currency: newPay.currency,
          issued_at: new Date().toISOString(),
          tenant_name: invoice.tenant_name || 'Test Tenant',
          landlord_name: 'Notify Dev Properties Ltd',
          property_name: invoice.property_name || 'Notify Heights',
          unit_number: invoice.unit_number || 'A-102',
          payment_method: newPay.payment_method,
        };
        MOCK_RECEIPTS.unshift(newReceipt);

        MOCK_NOTIFICATIONS.unshift({
          id: `notif-${Date.now()}`,
          user_id: invoice.tenant_id,
          type: 'PAYMENT_RECEIVED',
          title: 'Payment Confirmed',
          message: `Payment of RWF ${newPay.amount.toLocaleString()} received for ${invoice.invoice_number}. Receipt #${newReceipt.receipt_number} issued.`,
          channel: 'IN_APP',
          status: 'SENT',
          reference_type: 'RECEIPT',
          reference_id: newReceipt.id,
          created_at: new Date().toISOString(),
        });
      }

      return { payment: newPay, receipt: newReceipt };
    }

    if (endpoint.includes('/verify')) {
      const parts = endpoint.split('/');
      const payId = parts[2];
      const body = JSON.parse((options.body as string) || '{}');
      const payIndex = MOCK_PAYMENTS.findIndex((p) => p.id === payId);
      if (payIndex !== -1) {
        const pay = MOCK_PAYMENTS[payIndex];
        const inv = MOCK_INVOICES.find((i) => i.id === pay.invoice_id) || MOCK_INVOICES[0];

        if (body.confirm) {
          pay.status = 'COMPLETED';
          pay.verified_at = new Date().toISOString();
          inv.amount_paid += pay.amount;
          inv.balance_due = Math.max(0, inv.total_amount - inv.amount_paid);
          if (inv.balance_due === 0) inv.status = 'PAID';
          else inv.status = 'PARTIALLY_PAID';

          const newReceipt = {
            id: `rct-${Date.now()}`,
            receipt_number: `RCT-2026-00000${MOCK_RECEIPTS.length + 1}`,
            payment_id: pay.id,
            invoice_id: inv.id,
            tenant_id: inv.tenant_id,
            landlord_id: inv.landlord_id,
            property_id: inv.property_id,
            unit_id: inv.unit_id,
            amount: pay.amount,
            currency: pay.currency,
            issued_at: new Date().toISOString(),
            tenant_name: inv.tenant_name || 'Tenant',
            landlord_name: 'Notify Dev Properties Ltd',
            property_name: inv.property_name || 'Property',
            unit_number: inv.unit_number || 'Unit',
            payment_method: pay.payment_method,
          };
          MOCK_RECEIPTS.unshift(newReceipt);
          return { payment: pay, receipt: newReceipt };
        } else {
          pay.status = 'FAILED';
          pay.verified_at = new Date().toISOString();
          return { payment: pay, receipt: null };
        }
      }
    }

    return MOCK_PAYMENTS;
  }

  // Receipts
  if (endpoint.startsWith('/receipts')) {
    const rctId = endpoint.split('/')[2];
    if (rctId && !endpoint.includes('tenant') && !endpoint.includes('landlord')) {
      return MOCK_RECEIPTS.find((r) => r.id === rctId) || MOCK_RECEIPTS[0];
    }
    return MOCK_RECEIPTS;
  }

  // Expenses
  if (endpoint.startsWith('/expenses')) {
    const expId = endpoint.split('?')[0].split('/')[2];

    if (method === 'PUT' || method === 'PATCH') {
      const body = JSON.parse((options.body as string) || '{}');
      const idx = MOCK_EXPENSES.findIndex((e) => e.id === expId);
      if (idx !== -1) {
        const prop = MOCK_PROPERTIES.find((p) => p.id === body.property_id);
        const unit = MOCK_UNITS.find((u) => u.id === body.unit_id);
        MOCK_EXPENSES[idx] = {
          ...MOCK_EXPENSES[idx],
          ...body,
          property_name: prop ? prop.name : MOCK_EXPENSES[idx].property_name,
          unit_number: unit ? unit.unit_number : MOCK_EXPENSES[idx].unit_number,
        };
        return MOCK_EXPENSES[idx];
      }
    }

    if (method === 'DELETE') {
      const idx = MOCK_EXPENSES.findIndex((e) => e.id === expId);
      if (idx !== -1) {
        MOCK_EXPENSES.splice(idx, 1);
        return { message: 'Expense deleted successfully' };
      }
    }

    if (method === 'POST') {
      const body = JSON.parse((options.body as string) || '{}');
      const prop = MOCK_PROPERTIES.find((p) => p.id === body.property_id);
      const unit = MOCK_UNITS.find((u) => u.id === body.unit_id);
      const newExp = {
        id: `exp-${Date.now()}`,
        ...body,
        status: 'RECORDED',
        property_name: prop ? prop.name : 'Notify Property',
        unit_number: unit ? unit.unit_number : undefined,
        created_at: new Date().toISOString(),
      };
      MOCK_EXPENSES.unshift(newExp);
      return newExp;
    }
    if (endpoint.includes('/summary')) {
      const total = MOCK_EXPENSES.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
      return { total_expenses: total, by_category: { MAINTENANCE: 45000, SECURITY: 120000, UTILITIES: 85000 } };
    }
    return MOCK_EXPENSES;
  }

  // Financials
  if (endpoint.startsWith('/financials')) {
    if (endpoint.includes('/landlord')) {
      const expected = MOCK_INVOICES.reduce((acc, i) => acc + (i.total_amount || 0), 0);
      const collected = MOCK_INVOICES.reduce((acc, i) => acc + (i.amount_paid || 0), 0);
      const outstanding = MOCK_INVOICES.reduce((acc, i) => acc + (i.balance_due || 0), 0);
      const overdue = MOCK_INVOICES.filter((i) => i.status === 'OVERDUE').reduce((acc, i) => acc + (i.balance_due || 0), 0);
      const expensesTotal = MOCK_EXPENSES.reduce((acc, e) => acc + (e.amount || 0), 0);
      return {
        expected_rent: expected,
        collected_rent: collected,
        outstanding_rent: outstanding,
        overdue_rent: overdue,
        collection_rate: expected > 0 ? Math.round((collected / expected) * 1000) / 10 : 0,
        total_expenses: expensesTotal,
        net_income: collected - expensesTotal,
        currency: 'RWF',
        monthly_trends: MOCK_LANDLORD_FINANCIALS.monthly_trends,
      };
    }
    if (endpoint.includes('/tenant')) {
      const tenantInvs = MOCK_INVOICES.filter((i) => i.tenant_id === 'mock-tenant-001' || i.tenant_name === 'Test Tenant');
      const activeInv = tenantInvs.find((i) => i.balance_due > 0) || tenantInvs[0];
      return {
        current_rent: activeInv ? activeInv.subtotal : 350000,
        amount_due: activeInv ? activeInv.balance_due : 0,
        due_date: activeInv ? activeInv.due_date : '2026-08-05',
        invoice_number: activeInv ? activeInv.invoice_number : 'INV-2026-000001',
        invoice_id: activeInv ? activeInv.id : 'inv-2026-001',
        invoice_status: activeInv ? activeInv.status : 'PAID',
        outstanding_balance: tenantInvs.reduce((acc, i) => acc + i.balance_due, 0),
        currency: 'RWF',
      };
    }
  }

  // Phase 5: Notifications & Automated Reminders
  if (endpoint.startsWith('/notifications')) {
    if (endpoint.includes('/unread-count')) {
      const unread = MOCK_NOTIFICATIONS.filter((n) => !n.is_read && n.status !== 'READ').length;
      return { unread_count: unread };
    }
    if (endpoint.includes('/preferences')) {
      if (method === 'PUT' || method === 'PATCH') {
        const body = JSON.parse((options.body as string) || '{}');
        Object.assign(MOCK_NOTIFICATION_PREFERENCES, body);
        return { ...MOCK_NOTIFICATION_PREFERENCES };
      }
      return { ...MOCK_NOTIFICATION_PREFERENCES };
    }
    if (endpoint.includes('/logs')) {
      return [...MOCK_DELIVERY_LOGS];
    }
    if (endpoint.includes('/templates')) {
      return [
        {
          code: 'LEASE_EXPIRY_30D',
          category: 'LEASE_EXPIRY',
          title_template: 'Lease Expiring in 30 Days: {{property_name}} - {{unit_number}}',
          body_template: 'Tenant {{tenant_name}} in unit {{unit_number}} at {{property_name}} has a lease expiring on {{expiry_date}} (30 days remaining).',
          action_label: 'Review Lease & Renew',
          action_url_template: '/dashboard/leases',
          default_priority: 'MEDIUM',
        },
        {
          code: 'LEASE_EXPIRY_14D',
          category: 'LEASE_EXPIRY',
          title_template: 'Lease Expiring in 14 Days: {{tenant_name}}',
          body_template: 'Lease for unit {{unit_number}} ({{property_name}}) expires in 14 days on {{expiry_date}}.',
          action_label: 'Contact Tenant',
          action_url_template: '/dashboard/leases',
          default_priority: 'MEDIUM',
        },
        {
          code: 'LEASE_EXPIRY_7D',
          category: 'LEASE_EXPIRY',
          title_template: 'Urgent: Lease Expiring in 7 Days ({{unit_number}})',
          body_template: 'Lease for {{tenant_name}} at {{property_name}}, Unit {{unit_number}} expires in 7 days on {{expiry_date}}.',
          action_label: 'Prepare Renewal',
          action_url_template: '/dashboard/leases',
          default_priority: 'HIGH',
        },
        {
          code: 'LEASE_EXPIRY_3D',
          category: 'LEASE_EXPIRY',
          title_template: 'Critical: Lease Expiring in 3 Days - {{tenant_name}}',
          body_template: 'Tenant {{tenant_name}} in Unit {{unit_number}} at {{property_name}} has only 3 days left until lease expiration on {{expiry_date}}.',
          action_label: 'Immediate Action Required',
          action_url_template: '/dashboard/leases',
          default_priority: 'CRITICAL',
        },
        {
          code: 'LEASE_EXPIRY_2D',
          category: 'LEASE_EXPIRY',
          title_template: 'Critical: Lease Expiring in 2 Days - {{tenant_name}}',
          body_template: 'Lease for Unit {{unit_number}} ({{property_name}}) will expire in 2 days on {{expiry_date}}.',
          action_label: 'Resolve Renewal Status',
          action_url_template: '/dashboard/leases',
          default_priority: 'CRITICAL',
        },
        {
          code: 'LEASE_EXPIRY_1D',
          category: 'LEASE_EXPIRY',
          title_template: 'Final Day Notice: Lease Expires Tomorrow - {{tenant_name}}',
          body_template: 'Lease for {{tenant_name}} in Unit {{unit_number}} at {{property_name}} expires tomorrow on {{expiry_date}}.',
          action_label: 'Finalize Lease',
          action_url_template: '/dashboard/leases',
          default_priority: 'CRITICAL',
        },
        {
          code: 'LEASE_EXPIRY_TODAY',
          category: 'LEASE_EXPIRY',
          title_template: 'Lease Expiring Today: {{tenant_name}} (Unit {{unit_number}})',
          body_template: 'The lease for {{tenant_name}} at {{property_name}}, Unit {{unit_number}} expires TODAY ({{expiry_date}}).',
          action_label: 'Execute Renewal / Handover',
          action_url_template: '/dashboard/leases',
          default_priority: 'CRITICAL',
        },
      ];
    }
    if (endpoint.includes('/test-email')) {
      const body = JSON.parse((options.body as string) || '{}');
      const email = body.email || 'landlord@notify.test';
      const days = body.days_remaining || 7;
      const newLog = {
        id: `log-test-${Date.now()}`,
        channel: 'EMAIL',
        recipient: email,
        subject: `[Test Notification] Lease Expiring in ${days} Days`,
        status: 'SENT',
        metadata_info: JSON.stringify({ test: true, days_remaining: days }),
        created_at: new Date().toISOString(),
      };
      MOCK_DELIVERY_LOGS.unshift(newLog);
      return { status: 'success', recipient: email };
    }
    if (endpoint.includes('/process-reminders')) {
      let created = 0;
      let expiredCount = 0;
      const details: any[] = [];
      const milestoneMap: Record<number, { code: string; priority: any; title: string }> = {
        30: { code: 'LEASE_EXPIRY_30D', priority: 'MEDIUM', title: 'Lease Expiring in 30 Days' },
        14: { code: 'LEASE_EXPIRY_14D', priority: 'MEDIUM', title: 'Lease Expiring in 14 Days' },
        7:  { code: 'LEASE_EXPIRY_7D',  priority: 'HIGH',   title: 'Urgent: Lease Expiring in 7 Days' },
        3:  { code: 'LEASE_EXPIRY_3D',  priority: 'CRITICAL', title: 'Critical: Lease Expiring in 3 Days' },
        2:  { code: 'LEASE_EXPIRY_2D',  priority: 'CRITICAL', title: 'Critical: Lease Expiring in 2 Days' },
        1:  { code: 'LEASE_EXPIRY_1D',  priority: 'CRITICAL', title: 'Final Day Notice: Lease Expires Tomorrow' },
        0:  { code: 'LEASE_EXPIRY_TODAY', priority: 'CRITICAL', title: 'Lease Expiring Today' },
      };

      MOCK_LEASES.forEach((lease) => {
        const days = lease.days_remaining !== undefined ? lease.days_remaining : 30;
        if (days < 0 && lease.status !== 'EXPIRED') {
          lease.status = 'EXPIRED';
          expiredCount++;
        } else if (days <= 30 && days >= 0) {
          lease.status = 'EXPIRING_SOON';
        }

        if (milestoneMap[days]) {
          const mInfo = milestoneMap[days];
          const exists = MOCK_NOTIFICATIONS.some(
            (n) => n.entity_id === lease.id && n.type === mInfo.code
          );
          if (!exists) {
            const notif = {
              id: `notif-auto-${lease.id}-${mInfo.code}`,
              user_id: 'mock-landlord-001',
              type: mInfo.code,
              title: `${mInfo.title}: ${lease.tenant_name || 'Tenant'} (${lease.unit_number || 'Unit'})`,
              message: `Lease for ${lease.tenant_name} in ${lease.unit_number} (${lease.property_name}) has ${days} day(s) remaining until expiration on ${lease.end_date}.`,
              channel: 'IN_APP',
              priority: mInfo.priority,
              category: 'LEASE_EXPIRY',
              status: 'SENT',
              is_read: false,
              entity_type: 'LEASE',
              entity_id: lease.id,
              action_url: '/dashboard/leases',
              action_label: 'View Lease & Renew',
              created_at: new Date().toISOString(),
            };
            MOCK_NOTIFICATIONS.unshift(notif);
            created++;
            if (MOCK_NOTIFICATION_PREFERENCES.lease_expiry_email) {
              MOCK_DELIVERY_LOGS.unshift({
                id: `log-${Date.now()}-${lease.id}`,
                notification_id: notif.id,
                channel: 'EMAIL',
                recipient: 'landlord@notify.test',
                subject: `[Notify Kigali] ${notif.title}`,
                status: 'SENT',
                metadata_info: JSON.stringify({ days_remaining: days, tenant: lease.tenant_name }),
                created_at: new Date().toISOString(),
              });
            }
          }
          details.push({
            lease_id: lease.id,
            tenant_name: lease.tenant_name,
            unit: lease.unit_number,
            milestone: mInfo.code,
            days_remaining: days,
            in_app_sent: true,
            email_sent: MOCK_NOTIFICATION_PREFERENCES.lease_expiry_email,
            status: 'PROCESSED',
          });
        }
      });

      return {
        checked_leases: MOCK_LEASES.length,
        reminders_created: created,
        reminders_skipped_duplicate: MOCK_LEASES.length - created,
        emails_sent: MOCK_NOTIFICATION_PREFERENCES.lease_expiry_email ? created : 0,
        emails_skipped: MOCK_NOTIFICATION_PREFERENCES.lease_expiry_email ? 0 : created,
        expired_leases_updated: expiredCount,
        details,
      };
    }
    if (endpoint.includes('/mark-all-read') || endpoint.includes('/read-all')) {
      MOCK_NOTIFICATIONS.forEach((n) => {
        n.is_read = true;
        n.status = 'READ';
      });
      return { marked_read: MOCK_NOTIFICATIONS.length, success: true };
    }
    if (method === 'POST' && (endpoint === '/notifications' || endpoint.startsWith('/notifications?'))) {
      const body = JSON.parse((options.body as string) || '{}');
      const newNotif = {
        id: `notif-${Date.now()}`,
        user_id: body.user_id || 'mock-tenant-001',
        type: body.type || 'RENT_DUE',
        title: body.title || 'Notification',
        message: body.message || '',
        channel: body.channel || 'IN_APP',
        priority: body.priority || 'HIGH',
        category: body.category || 'RENT_DUE',
        status: 'SENT',
        is_read: false,
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        action_url: body.action_url,
        action_label: body.action_label,
        created_at: new Date().toISOString(),
      };
      MOCK_NOTIFICATIONS.unshift(newNotif);
      return newNotif;
    }
    if (method === 'DELETE') {
      const notifId = endpoint.split('/')[2];
      const idx = MOCK_NOTIFICATIONS.findIndex((n) => n.id === notifId);
      if (idx !== -1) {
        MOCK_NOTIFICATIONS.splice(idx, 1);
      }
      return { status: 'success', message: 'Notification removed' };
    }
    if (endpoint.includes('/read')) {
      const notifId = endpoint.split('/')[2];
      const notif = MOCK_NOTIFICATIONS.find((n) => n.id === notifId);
      if (notif) {
        notif.is_read = true;
        notif.status = 'READ';
      }
      return notif || { success: true };
    }

    // Filter query params in mock mode
    let list = [...MOCK_NOTIFICATIONS];
    if (endpoint.includes('?')) {
      const qs = new URLSearchParams(endpoint.split('?')[1]);
      const cat = qs.get('category');
      const prio = qs.get('priority');
      const unread = qs.get('unread_only');
      const q = qs.get('search');
      if (cat && cat !== 'ALL') {
        list = list.filter((n) => n.category === cat || n.entity_type === cat);
      }
      if (prio && prio !== 'ALL') {
        list = list.filter((n) => n.priority === prio);
      }
      if (unread === 'true') {
        list = list.filter((n) => !n.is_read && n.status !== 'READ');
      }
      if (q) {
        const queryLower = q.toLowerCase();
        list = list.filter(
          (n) =>
            (n.title && n.title.toLowerCase().includes(queryLower)) ||
            (n.message && n.message.toLowerCase().includes(queryLower))
        );
      }
    }
    return list;
  }

  // Maintenance Requests
  if (endpoint.startsWith('/maintenance')) {
    if (endpoint.includes('/stats')) {
      const total = MOCK_MAINTENANCE_REQUESTS.length;
      const open = MOCK_MAINTENANCE_REQUESTS.filter((r) => ['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'SCHEDULED', 'REOPENED'].includes(r.status)).length;
      const urgent = MOCK_MAINTENANCE_REQUESTS.filter((r) => r.priority === 'URGENT' && r.status !== 'CLOSED').length;
      const in_progress = MOCK_MAINTENANCE_REQUESTS.filter((r) => r.status === 'IN_PROGRESS').length;
      const resolved = MOCK_MAINTENANCE_REQUESTS.filter((r) => r.status === 'RESOLVED').length;
      const closed = MOCK_MAINTENANCE_REQUESTS.filter((r) => r.status === 'CLOSED').length;
      const distribution: Record<string, number> = {};
      MOCK_MAINTENANCE_REQUESTS.forEach((r) => {
        distribution[r.category] = (distribution[r.category] || 0) + 1;
      });
      return {
        total_requests: total,
        open_requests: open,
        urgent_requests: urgent,
        in_progress_requests: in_progress,
        resolved_this_month: resolved,
        closed_requests: closed,
        average_resolution_days: 1.8,
        average_acknowledgement_hours: 3.5,
        category_distribution: distribution,
      };
    }

    if (endpoint.includes('/workers')) {
      if (method === 'POST') {
        const body = JSON.parse((options.body as string) || '{}');
        const newWorker = {
          id: `worker-${Date.now()}`,
          landlord_id: 'mock-lp-001',
          ...body,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        };
        MOCK_WORKERS.push(newWorker);
        return newWorker;
      }
      return MOCK_WORKERS;
    }

    if (method === 'POST' && !endpoint.includes('/acknowledge') && !endpoint.includes('/schedule') && !endpoint.includes('/resolve') && !endpoint.includes('/confirm') && !endpoint.includes('/reopen') && !endpoint.includes('/comments') && !endpoint.includes('/to-expense') && !endpoint.includes('/in-progress')) {
      const body = JSON.parse((options.body as string) || '{}');
      const newReq = {
        id: `mr-${Date.now()}`,
        request_number: `MR-2026-00000${MOCK_MAINTENANCE_REQUESTS.length + 1}`,
        tenant_id: 'mock-tp-001',
        landlord_id: 'mock-lp-001',
        property_id: 'prop-101',
        unit_id: 'unit-101',
        tenancy_id: 'tenancy-001',
        title: body.title,
        description: body.description,
        category: body.category || 'OTHER',
        priority: body.priority || 'MEDIUM',
        status: 'SUBMITTED',
        estimated_cost: 0,
        actual_cost: 0,
        currency: 'RWF',
        tenant_name: 'Test Tenant',
        property_name: 'Notify Dev Center',
        unit_number: '101',
        attachments: [],
        comments: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      MOCK_MAINTENANCE_REQUESTS.unshift(newReq);
      return newReq;
    }

    const parts = endpoint.split('/');
    const reqId = parts[2];
    const reqItem = MOCK_MAINTENANCE_REQUESTS.find((r) => r.id === reqId);

    if (reqItem) {
      if (endpoint.includes('/acknowledge')) {
        reqItem.status = 'ACKNOWLEDGED';
        reqItem.acknowledged_at = new Date().toISOString();
        reqItem.updated_at = new Date().toISOString();
        return reqItem;
      }
      if (endpoint.includes('/schedule')) {
        const body = JSON.parse((options.body as string) || '{}');
        reqItem.status = 'SCHEDULED';
        reqItem.assigned_to = body.assigned_to || reqItem.assigned_to;
        reqItem.scheduled_date = body.scheduled_date;
        reqItem.scheduled_time = body.scheduled_time;
        if (body.estimated_cost) reqItem.estimated_cost = Number(body.estimated_cost);
        reqItem.scheduled_at = new Date().toISOString();
        reqItem.updated_at = new Date().toISOString();
        return reqItem;
      }
      if (endpoint.includes('/in-progress')) {
        reqItem.status = 'IN_PROGRESS';
        reqItem.updated_at = new Date().toISOString();
        return reqItem;
      }
      if (endpoint.includes('/resolve')) {
        const body = JSON.parse((options.body as string) || '{}');
        reqItem.status = 'RESOLVED';
        if (body.actual_cost) reqItem.actual_cost = Number(body.actual_cost);
        if (body.landlord_notes) reqItem.landlord_notes = body.landlord_notes;
        reqItem.resolved_at = new Date().toISOString();
        reqItem.updated_at = new Date().toISOString();
        return reqItem;
      }
      if (endpoint.includes('/confirm-resolution') || endpoint.includes('/confirm')) {
        const body = JSON.parse((options.body as string) || '{}');
        reqItem.status = 'CLOSED';
        if (body.tenant_notes) reqItem.tenant_notes = body.tenant_notes;
        reqItem.closed_at = new Date().toISOString();
        reqItem.updated_at = new Date().toISOString();
        return reqItem;
      }
      if (endpoint.includes('/reopen')) {
        const body = JSON.parse((options.body as string) || '{}');
        reqItem.status = 'REOPENED';
        if (body.tenant_notes) reqItem.tenant_notes = body.tenant_notes;
        reqItem.updated_at = new Date().toISOString();
        return reqItem;
      }
      if (endpoint.includes('/to-expense')) {
        reqItem.expense_id = `exp-${Date.now()}`;
        return { success: true, expense_id: reqItem.expense_id };
      }
      if (endpoint.includes('/comments')) {
        const body = JSON.parse((options.body as string) || '{}');
        const comment = {
          id: `mc-${Date.now()}`,
          maintenance_request_id: reqId,
          user_id: 'mock-user',
          author_name: 'User',
          author_role: 'USER',
          message: body.message,
          created_at: new Date().toISOString(),
        };
        if (!reqItem.comments) reqItem.comments = [];
        reqItem.comments.push(comment);
        return comment;
      }
      return reqItem;
    }

    return MOCK_MAINTENANCE_REQUESTS;
  }

  // Complaints
  if (endpoint.startsWith('/complaints')) {
    if (endpoint.includes('/stats')) {
      const total = MOCK_COMPLAINTS.length;
      const open = MOCK_COMPLAINTS.filter((c) => ['SUBMITTED', 'ACKNOWLEDGED'].includes(c.status)).length;
      const review = MOCK_COMPLAINTS.filter((c) => c.status === 'UNDER_REVIEW').length;
      const resolved = MOCK_COMPLAINTS.filter((c) => c.status === 'RESOLVED').length;
      const closed = MOCK_COMPLAINTS.filter((c) => c.status === 'CLOSED').length;
      const distribution: Record<string, number> = {};
      MOCK_COMPLAINTS.forEach((c) => {
        distribution[c.category] = (distribution[c.category] || 0) + 1;
      });
      return {
        total_complaints: total,
        open_complaints: open,
        under_review: review,
        resolved: resolved,
        closed: closed,
        category_distribution: distribution,
      };
    }

    if (method === 'POST' && !endpoint.includes('/comments') && !endpoint.includes('/acknowledge') && !endpoint.includes('/under-review') && !endpoint.includes('/resolve') && !endpoint.includes('/close')) {
      const body = JSON.parse((options.body as string) || '{}');
      const newCmp = {
        id: `cmp-${Date.now()}`,
        complaint_number: `CMP-2026-00000${MOCK_COMPLAINTS.length + 1}`,
        tenant_id: 'mock-tp-001',
        landlord_id: 'mock-lp-001',
        property_id: 'prop-101',
        unit_id: 'unit-101',
        tenancy_id: 'tenancy-001',
        subject: body.subject,
        description: body.description,
        category: body.category || 'OTHER',
        priority: body.priority || 'MEDIUM',
        status: 'SUBMITTED',
        tenant_name: 'Test Tenant',
        property_name: 'Notify Dev Center',
        unit_number: '101',
        comments: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      MOCK_COMPLAINTS.unshift(newCmp);
      return newCmp;
    }

    const parts = endpoint.split('/');
    const cmpId = parts[2];
    const cmpItem = MOCK_COMPLAINTS.find((c) => c.id === cmpId);

    if (cmpItem) {
      if (endpoint.includes('/acknowledge')) {
        cmpItem.status = 'ACKNOWLEDGED';
        cmpItem.acknowledged_at = new Date().toISOString();
        cmpItem.updated_at = new Date().toISOString();
        return cmpItem;
      }
      if (endpoint.includes('/under-review')) {
        const body = JSON.parse((options.body as string) || '{}');
        cmpItem.status = 'UNDER_REVIEW';
        if (body.landlord_response) cmpItem.landlord_response = body.landlord_response;
        cmpItem.updated_at = new Date().toISOString();
        return cmpItem;
      }
      if (endpoint.includes('/resolve')) {
        const body = JSON.parse((options.body as string) || '{}');
        cmpItem.status = 'RESOLVED';
        if (body.landlord_response) cmpItem.landlord_response = body.landlord_response;
        cmpItem.resolved_at = new Date().toISOString();
        cmpItem.updated_at = new Date().toISOString();
        return cmpItem;
      }
      if (endpoint.includes('/close')) {
        cmpItem.status = 'CLOSED';
        cmpItem.closed_at = new Date().toISOString();
        cmpItem.updated_at = new Date().toISOString();
        return cmpItem;
      }
      if (endpoint.includes('/comments')) {
        const body = JSON.parse((options.body as string) || '{}');
        const comment = {
          id: `cc-${Date.now()}`,
          complaint_id: cmpId,
          user_id: 'mock-user',
          author_name: 'User',
          author_role: 'USER',
          message: body.message,
          created_at: new Date().toISOString(),
        };
        if (!cmpItem.comments) cmpItem.comments = [];
        cmpItem.comments.push(comment);
        return comment;
      }
      return cmpItem;
    }

    return MOCK_COMPLAINTS;
  }

  // Messages & WhatsApp-style Chat System (Unified Messages + Real-Time Maintenance Linking)
  if (endpoint.startsWith('/messages')) {
    if (endpoint.includes('/conversations')) {
      const partnerMap = new Map<string, any[]>();
      MOCK_MESSAGES.forEach((m) => {
        const partnerId = m.sender_role === 'TENANT' ? m.recipient_id : m.sender_id;
        if (!partnerMap.has(partnerId)) {
          partnerMap.set(partnerId, []);
        }
        partnerMap.get(partnerId)!.push(m);
      });

      const summaries = Array.from(partnerMap.entries()).map(([partnerId, msgs]) => {
        msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const lastMsg = msgs[0];
        const unreadCount = msgs.filter((m) => !m.is_read && m.sender_role !== 'TENANT').length;
        const maintMsg = msgs.find((m) => m.message_type === 'MAINTENANCE');
        let currentStatus = undefined;
        let maintTitle = maintMsg?.maintenance_title;
        if (maintMsg?.maintenance_request_id) {
          const req = MOCK_MAINTENANCE_REQUESTS.find((r) => r.id === maintMsg.maintenance_request_id);
          if (req) {
            currentStatus = req.status;
            maintTitle = req.title;
          }
        }
        return {
          id: `conv-${partnerId}`,
          partner_id: partnerId,
          partner_name: lastMsg.sender_role === 'TENANT' ? (lastMsg.recipient_name || 'Test Landlord (Notify Dev Properties)') : (lastMsg.sender_name || 'Test Tenant'),
          partner_role: lastMsg.sender_role === 'TENANT' ? 'LANDLORD' : 'TENANT',
          property_id: lastMsg.property_id || 'prop-101',
          property_name: lastMsg.property_name || 'Notify Dev Center',
          unit_id: lastMsg.unit_id || 'unit-101',
          unit_number: lastMsg.unit_number || '101',
          last_message: lastMsg.content,
          last_message_at: lastMsg.created_at,
          unread_count: unreadCount,
          message_type: lastMsg.message_type || 'GENERAL',
          has_maintenance: !!maintMsg,
          maintenance_request_id: maintMsg?.maintenance_request_id,
          maintenance_title: maintTitle,
          maintenance_status: currentStatus || maintMsg?.maintenance_status,
        };
      });

      if (summaries.length === 0) {
        summaries.push({
          id: 'conv-mock-landlord-001',
          partner_id: 'mock-landlord-001',
          partner_name: 'Test Landlord (Notify Dev Properties Ltd)',
          partner_role: 'LANDLORD',
          property_id: 'prop-101',
          property_name: 'Notify Dev Center',
          unit_id: 'unit-101',
          unit_number: '101',
          last_message: 'Welcome to your unified chat. Send general messages or log maintenance directly here.',
          last_message_at: new Date().toISOString(),
          unread_count: 0,
          message_type: 'GENERAL',
          has_maintenance: false,
          maintenance_request_id: undefined,
          maintenance_title: undefined,
          maintenance_status: undefined,
        });
      }

      return summaries;
    }

    if (endpoint.includes('/read/')) {
      const partnerId = endpoint.split('/read/')[1];
      MOCK_MESSAGES.forEach((m) => {
        if (m.sender_id === partnerId || m.recipient_id === partnerId) {
          m.is_read = true;
        }
      });
      return { status: 'ok', marked_as_read: true };
    }

    if (method === 'POST') {
      const body = JSON.parse((options.body as string) || '{}');
      let maintId = body.maintenance_request_id;
      let maintStatus = undefined;

      // If MAINTENANCE message, automatically create maintenance record in the existing maintenance system!
      if (body.message_type === 'MAINTENANCE' && !maintId) {
        const newReqNumber = `MR-2026-${String(MOCK_MAINTENANCE_REQUESTS.length + 1).padStart(6, '0')}`;
        const newReq = {
          id: `mr-${Date.now()}`,
          request_number: newReqNumber,
          tenant_id: 'mock-tp-001',
          landlord_id: 'mock-lp-001',
          property_id: body.property_id || 'prop-101',
          unit_id: body.unit_id || 'unit-101',
          tenancy_id: body.tenancy_id || 'tenancy-001',
          title: body.maintenance_title || body.content.slice(0, 50),
          description: body.content,
          category: body.maintenance_category || 'PLUMBING',
          priority: body.maintenance_priority || 'MEDIUM',
          status: 'SUBMITTED',
          estimated_cost: 0,
          actual_cost: 0,
          currency: 'RWF',
          tenant_name: 'Test Tenant',
          property_name: 'Notify Dev Center',
          unit_number: '101',
          attachments: body.attachment_url
            ? [
                {
                  id: `att-${Date.now()}`,
                  maintenance_request_id: `mr-${Date.now()}`,
                  file_path: body.attachment_url,
                  file_name: body.attachment_name || 'attachment.jpg',
                  size: body.attachment_size || 1048576,
                  uploaded_by: 'mock-tenant-001',
                  created_at: new Date().toISOString(),
                },
              ]
            : [],
          comments: [
            {
              id: `mc-${Date.now()}`,
              maintenance_request_id: `mr-${Date.now()}`,
              user_id: 'mock-tenant-001',
              author_name: 'Test Tenant',
              author_role: 'TENANT',
              message: body.content,
              created_at: new Date().toISOString(),
            },
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        MOCK_MAINTENANCE_REQUESTS.unshift(newReq);
        maintId = newReq.id;
        maintStatus = newReq.status;

        // Auto create Landlord notification in single source of truth
        MOCK_NOTIFICATIONS.unshift({
          id: `notif-maint-${Date.now()}`,
          user_id: 'mock-landlord-001',
          type: 'MAINTENANCE_CREATED',
          title: `🔧 New Maintenance Ticket: ${newReq.title}`,
          message: `Tenant Test Tenant (Unit 101) reported: ${body.content.slice(0, 100)}`,
          channel: 'IN_APP',
          priority: 'HIGH',
          category: 'MAINTENANCE',
          status: 'SENT',
          is_read: false,
          entity_type: 'MAINTENANCE',
          entity_id: newReq.id,
          action_url: '/dashboard/maintenance',
          action_label: 'View Request',
          created_at: new Date().toISOString(),
        });
      } else if (maintId) {
        // Find existing maintenance and sync comment
        const existing = MOCK_MAINTENANCE_REQUESTS.find((r) => r.id === maintId);
        if (existing) {
          maintStatus = existing.status;
          if (!existing.comments) existing.comments = [];
          existing.comments.push({
            id: `mc-${Date.now()}`,
            maintenance_request_id: maintId,
            user_id: 'mock-tenant-001',
            author_name: 'Test Tenant',
            author_role: 'TENANT',
            message: body.content,
            created_at: new Date().toISOString(),
          });
          existing.updated_at = new Date().toISOString();
        }
      }

      const newMsg = {
        id: `msg-${Date.now()}`,
        sender_id: 'mock-tenant-001',
        recipient_id: body.recipient_id || 'mock-landlord-001',
        sender_role: 'TENANT',
        sender_name: 'Test Tenant',
        recipient_name: 'Test Landlord',
        property_id: body.property_id || 'prop-101',
        property_name: 'Notify Dev Center',
        unit_id: body.unit_id || 'unit-101',
        unit_number: '101',
        tenancy_id: body.tenancy_id || 'tenancy-001',
        message_type: body.message_type || 'GENERAL',
        content: body.content,
        attachment_url: body.attachment_url,
        attachment_name: body.attachment_name,
        attachment_size: body.attachment_size,
        maintenance_request_id: maintId,
        maintenance_title: body.maintenance_title,
        maintenance_category: body.maintenance_category,
        maintenance_priority: body.maintenance_priority,
        maintenance_status: maintStatus,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      MOCK_MESSAGES.push(newMsg);
      return newMsg;
    }

    // GET /messages
    return MOCK_MESSAGES.map((m) => {
      if (m.maintenance_request_id) {
        const mr = MOCK_MAINTENANCE_REQUESTS.find((r) => r.id === m.maintenance_request_id);
        if (mr) {
          return {
            ...m,
            maintenance_status: mr.status,
            maintenance_title: mr.title,
            maintenance_category: mr.category,
            maintenance_priority: mr.priority,
          };
        }
      }
      return m;
    });
  }

  // Tracker Endpoints
  if (endpoint.startsWith('/tracker')) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const parts = endpoint.split('?')[0].split('/');
    const subRoute = parts[2];

    if (subRoute === 'dashboard') {
      const urlObj = new URL(`http://localhost${endpoint}`);
      const propFilter = urlObj.searchParams.get('property_id');
      const periodType = urlObj.searchParams.get('period_type') || 'THIS_MONTH';

      const activeLeases = MOCK_LEASES.filter((l) => {
        const matchesProp = !propFilter || propFilter === 'ALL' || l.property_id === propFilter;
        return matchesProp && (l.status === 'ACTIVE' || l.status === 'EXPIRING_SOON');
      });

      const tenantRows = activeLeases.map((l, idx) => {
        const t = MOCK_TENANTS.find((tn) => tn.id === l.tenant_id) || {
          id: l.tenant_id,
          first_name: l.tenant_name?.split(' ')[0] || 'Tenant',
          last_name: l.tenant_name?.split(' ')[1] || `${idx + 1}`,
          phone: '+25078800010' + idx,
          email: `tenant${idx + 1}@notify.test`,
        };
        const prop = MOCK_PROPERTIES.find((p) => p.id === l.property_id);
        const inv = MOCK_INVOICES.find((i) => i.lease_id === l.id || i.tenant_id === t.id);
        const tPayments = MOCK_PAYMENTS.filter((p) => p.lease_id === l.id || p.tenant_id === t.id);
        const lastPay = tPayments.length > 0 ? tPayments[tPayments.length - 1] : null;

        const rentAmt = l.monthly_rent || 350000;
        const expectedAmt = inv?.total_amount || rentAmt;
        const paidAmt = inv ? inv.amount_paid : (lastPay ? lastPay.amount : (idx % 3 === 0 ? rentAmt : (idx % 4 === 0 ? rentAmt * 0.5 : 0)));
        const balDue = Math.max(0, expectedAmt - paidAmt);
        const dueDay = l.rent_payment_due_day || 5;
        const dueDate = `${todayStr.slice(0, 8)}${String(dueDay).padStart(2, '0')}`;
        const paidDate = paidAmt >= expectedAmt ? `${todayStr.slice(0, 8)}03` : (paidAmt > 0 ? `${todayStr.slice(0, 8)}06` : undefined);

        let status: any = 'UPCOMING';
        if (paidAmt >= expectedAmt) {
          status = paidDate && paidDate > dueDate ? 'PAID_LATE' : 'PAID';
        } else if (paidAmt > 0) {
          status = 'PARTIAL';
        } else {
          status = new Date(dueDate) < new Date() ? 'NOT_PAID' : 'UPCOMING';
        }

        return {
          tenant_id: t.id,
          tenant_name: `${t.first_name} ${t.last_name}`,
          tenant_phone: t.phone,
          tenant_email: t.email,
          property_id: l.property_id,
          property_name: l.property_name || prop?.name || 'Notify Property',
          unit_id: l.unit_id,
          unit_number: l.unit_number || `Unit ${idx + 101}`,
          lease_id: l.id,
          invoice_id: inv?.id || `inv-mock-${idx}`,
          invoice_number: inv?.invoice_number || `NOTIFY-INV-2026-000${idx + 1}`,
          expected_amount: expectedAmt,
          paid_amount: paidAmt,
          balance_due: balDue,
          due_date: dueDate,
          paid_date: paidDate,
          status,
          match_confidence: status === 'PAID' || status === 'PAID_LATE' ? 'HIGH' : status === 'PARTIAL' ? 'MEDIUM' : 'NONE',
          payment_reference: lastPay?.payment_reference || (paidAmt > 0 ? `PAY-2026-0000${idx + 1}` : undefined),
          last_transaction_desc: lastPay?.notes || (paidAmt > 0 ? `Bank transfer received for ${l.unit_number}` : undefined),
        };
      });

      const totalExpected = tenantRows.reduce((sum, r) => sum + r.expected_amount, 0) || 5400000;
      const totalReceived = tenantRows.reduce((sum, r) => sum + r.paid_amount, 0) || 3850000;
      const totalOutstanding = Math.max(0, totalExpected - totalReceived);
      const paidCount = tenantRows.filter((r) => r.status === 'PAID' || r.status === 'PAID_LATE').length;
      const unpaidCount = tenantRows.filter((r) => r.status === 'NOT_PAID').length;
      const partialCount = tenantRows.filter((r) => r.status === 'PARTIAL').length;
      const collRate = totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0;

      // Paid today & Expected today
      const paidTodayList = [
        {
          tenant_id: 'mock-tenant-001',
          tenant_name: 'Aline Mukamana',
          property_name: 'Notify Dev Center',
          unit_number: '101',
          paid_amount: 450000,
          paid_time: '09:42',
          payment_reference: 'PAY-2026-00012',
          channel: 'Bank of Kigali Transfer',
        },
      ];

      const expectedTodayList = tenantRows.slice(0, 3).map((r) => ({
        tenant_id: r.tenant_id,
        tenant_name: r.tenant_name,
        property_name: r.property_name,
        unit_number: r.unit_number,
        expected_amount: r.expected_amount,
        status: r.status,
        paid_amount: r.paid_amount,
      }));

      // Timeline 30 days
      const curYear = new Date().getFullYear();
      const curMonth = new Date().getMonth() + 1;
      const daysInMonth = new Date(curYear, curMonth, 0).getDate();
      const timeline = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${curYear}-${String(curMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayExpected = tenantRows.filter((r) => r.due_date === dStr).reduce((s, r) => s + r.expected_amount, 0);
        const dayPaid = tenantRows.filter((r) => r.paid_date === dStr).reduce((s, r) => s + r.paid_amount, 0);
        const dayCount = tenantRows.filter((r) => r.due_date === dStr || r.paid_date === dStr).length;

        timeline.push({
          date: dStr,
          day_number: d,
          is_today: dStr === todayStr,
          expected_amount: dayExpected || (d === 5 ? 1800000 : d === 1 ? 600000 : 0),
          paid_amount: dayPaid || (d === 3 ? 1050000 : d === 2 ? 450000 : 0),
          tenants_count: dayCount || (d === 5 ? 4 : d === 3 ? 2 : 0),
          has_overdue: d < new Date().getDate() && dayExpected > dayPaid,
        });
      }

      return {
        period_start: `${todayStr.slice(0, 8)}01`,
        period_end: `${todayStr.slice(0, 8)}${daysInMonth}`,
        period_type: periodType,
        summary: {
          total_expected_amount: totalExpected,
          total_received_amount: totalReceived,
          total_outstanding_amount: totalOutstanding,
          total_expected_tenants: tenantRows.length,
          total_paid_tenants: paidCount,
          total_unpaid_tenants: unpaidCount,
          total_partial_tenants: partialCount,
          collection_rate_percent: collRate,
        },
        today_tracking: {
          date: todayStr,
          received_today_amount: 450000,
          received_today_count: paidTodayList.length,
          expected_today_amount: 800000,
          expected_today_count: expectedTodayList.length,
          paid_today_list: paidTodayList,
          expected_today_list: expectedTodayList,
        },
        tenant_tracking_list: tenantRows,
        needs_review_transactions: MOCK_BANK_TRANSACTIONS.filter(
          (t) => t.matching_status === 'NEEDS_REVIEW' || t.matching_status === 'UNMATCHED'
        ),
        recent_statements: MOCK_BANK_STATEMENTS,
        payment_timeline: timeline,
      };
    }

    if (subRoute === 'upload-content' || subRoute === 'upload-file') {
      const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : {}) : {};
      const fileName = body.file_name || 'Uploaded_Bank_Statement.csv';
      const newStmt = {
        id: `stmt-${Date.now()}`,
        file_name: fileName,
        file_type: fileName.endsWith('.xlsx') ? 'XLSX' : 'CSV',
        file_size: 32500,
        uploaded_at: new Date().toISOString(),
        period_start: `${todayStr.slice(0, 8)}01`,
        period_end: todayStr,
        total_transactions_count: 6,
        matched_count: 4,
        unmatched_count: 2,
        duplicate_count: 0,
        total_incoming_amount: 2400000,
        matched_amount: 1750000,
        status: 'COMPLETED',
        notes: 'Statement successfully parsed and reconciled against active lease invoices.',
      };
      MOCK_BANK_STATEMENTS.unshift(newStmt);

      // Add a couple matched and review transactions
      const newTxn1 = {
        id: `txn-${Date.now()}-1`,
        statement_id: newStmt.id,
        transaction_reference: `BK-${Date.now().toString().slice(-6)}`,
        transaction_date: todayStr,
        amount: 450000,
        payer_name: 'Aline Mukamana',
        description: `BK TRF: ALINE MUKAMANA RENT ${fileName}`,
        matching_status: 'MATCHED',
        confidence_score: 0.98,
        suggested_tenant_id: 'mock-tenant-001',
        suggested_invoice_id: 'inv-001',
        match_method: 'EXACT_NAME_AMOUNT_MATCH',
      };
      const newTxn2 = {
        id: `txn-${Date.now()}-2`,
        statement_id: newStmt.id,
        transaction_reference: `TXN-${Date.now().toString().slice(-6)}`,
        transaction_date: todayStr,
        amount: 320000,
        payer_name: 'Unknown Payer',
        description: 'MOMO PAY 0789991122 REF RENT',
        matching_status: 'NEEDS_REVIEW',
        confidence_score: 0.55,
        match_method: 'NAME_ONLY_MATCH',
      };
      MOCK_BANK_TRANSACTIONS.unshift(newTxn1, newTxn2);

      return {
        status: 'success',
        statement_id: newStmt.id,
        file_name: newStmt.file_name,
        total_transactions: newStmt.total_transactions_count,
        matched_count: newStmt.matched_count,
        unmatched_count: newStmt.unmatched_count,
        duplicate_count: newStmt.duplicate_count,
        total_incoming_amount: newStmt.total_incoming_amount,
        matched_amount: newStmt.matched_amount,
      };
    }

    if (subRoute === 'manual-match') {
      const body = JSON.parse((options.body as string) || '{}');
      const txn = MOCK_BANK_TRANSACTIONS.find((t) => t.id === body.transaction_id);
      if (txn) {
        txn.matching_status = 'MATCHED';
        txn.suggested_invoice_id = body.invoice_id;
        txn.confidence_score = 1.0;
        txn.match_method = 'MANUAL_MATCH';
      }
      return {
        status: 'success',
        match_id: `match-${Date.now()}`,
        matched_amount: txn?.amount || 350000,
        payment_id: `pay-${Date.now()}`,
      };
    }

    if (subRoute === 'reject-match') {
      const body = JSON.parse((options.body as string) || '{}');
      const txn = MOCK_BANK_TRANSACTIONS.find((t) => t.id === body.transaction_id);
      if (txn) {
        txn.matching_status = 'REJECTED';
        txn.confidence_score = 0.0;
      }
      return { status: 'success', message: 'Transaction match rejected' };
    }

    if (subRoute === 'statements') {
      return MOCK_BANK_STATEMENTS;
    }

    if (subRoute === 'accounts') {
      if (method === 'POST') {
        const body = JSON.parse((options.body as string) || '{}');
        const newAcc = {
          id: `ba-${Date.now()}`,
          bank_name: body.bank_name || 'Bank of Kigali',
          account_name: body.account_name || 'Notify Property Collection',
          account_number: body.account_number || '0000-0000-00',
          currency: body.currency || 'RWF',
          is_primary: body.is_primary || false,
        };
        MOCK_BANK_ACCOUNTS.push(newAcc);
        return newAcc;
      }
      return MOCK_BANK_ACCOUNTS;
    }
  }

  return {};
}


async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('notify_access_token');

  // Handle mock tokens seamlessly
  if (isMockToken(token)) {
    return handleMockRequest(endpoint, options) as T;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const headers = { ...getAuthHeaders(), ...options.headers };

  try {
    const response = await fetch(url, { ...options, headers });

    let data: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}`;
      if (typeof data?.detail === 'string') {
        errorMessage = data.detail;
      } else if (Array.isArray(data?.detail) && data.detail.length > 0) {
        errorMessage = data.detail.map((d) => d?.msg || d?.message || JSON.stringify(d)).join(', ');
      } else if (data?.detail && typeof data.detail === 'object') {
        errorMessage = JSON.stringify(data.detail);
      } else if (data?.message) {
        errorMessage = data.message;
      }
      throw new ApiError(response.status, errorMessage, data);
    }

    return data as T;
  } catch (err: any) {
    if (isMockToken(token)) {
      return handleMockRequest(endpoint, options) as T;
    }
    throw err;
  }
}

export const api = {
  // Authentication
  auth: {
    registerLandlord: (data: any) =>
      request<any>('/auth/register/landlord', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    registerTenant: (data: any) =>
      request<any>('/auth/register/tenant', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    login: (data: any) => {
      const payload = {
        email_or_phone: data.email_or_phone || data.email || data.username || data.phone || '',
        password: data.password || '',
      };
      return request<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getMe: () =>
      request<any>('/auth/me', {
        method: 'GET',
      }),

    updateProfile: (data: any) =>
      request<any>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    changePassword: (data: { current_password: string; new_password: string }) =>
      request<any>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    forgotPassword: (email: string) =>
      request<any>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    resetPassword: (data: {
      email?: string;
      reset_token: string;
      new_password: string;
      confirm_password?: string;
    }) =>
      request<any>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    logout: () =>
      request<any>('/auth/logout', {
        method: 'POST',
      }),
  },

  // Landlord Dashboard Stats
  landlord: {
    getStats: () => request<any>('/landlord/stats'),
  },

  // Properties
  properties: {
    list: () => request<any[]>('/properties'),
    get: (id: string) => request<any>(`/properties/${id}`),
    create: (data: any) =>
      request<any>('/properties', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/properties/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<any>(`/properties/${id}`, {
        method: 'DELETE',
      }),
  },

  // Units
  units: {
    list: (propertyId?: string) =>
      request<any[]>(`/units${propertyId ? `?property_id=${propertyId}` : ''}`),
    get: (id: string) => request<any>(`/units/${id}`),
    create: (data: any) =>
      request<any>('/units', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/units/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<any>(`/units/${id}`, {
        method: 'DELETE',
      }),
  },

  // Leases
  leases: {
    list: () => request<any[]>('/leases'),
    get: (id: string) => request<any>(`/leases/${id}`),
    create: (data: any) =>
      request<any>('/leases', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/leases/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    uploadDocument: (id: string, docData: any) =>
      request<any>(`/leases/${id}/document`, {
        method: 'POST',
        body: JSON.stringify(docData),
      }),
    activate: (id: string) =>
      request<any>(`/leases/${id}/activate`, {
        method: 'POST',
      }),
    renew: (id: string, renewData: any) =>
      request<any>(`/leases/${id}/renew`, {
        method: 'POST',
        body: JSON.stringify(renewData),
      }),
  },

  // Documents
  documents: {
    list: () => request<any[]>('/documents'),
  },

  // Tenancies
  tenancies: {
    list: () => request<any[]>('/tenancies'),
    create: (data: any) =>
      request<any>('/tenancies', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    end: (id: string) =>
      request<any>(`/tenancies/${id}/end`, {
        method: 'PATCH',
      }),
  },

  // Invitations
  invitations: {
    create: (data: any) =>
      request<any>('/invitations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    list: () => request<any[]>('/invitations'),
    getByToken: (token: string) => request<any>(`/invitations/token/${token}`),
    validateToken: (token: string) => request<any>(`/invitations/validate/${token}`),
    cancel: (id: string) =>
      request<any>(`/invitations/${id}/cancel`, {
        method: 'PATCH',
      }),
    accept: (token: string) =>
      request<any>('/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
  },

  // Tenants & Tenancies
  tenants: {
    getMyTenancies: () => request<any[]>('/tenants/me/tenancies'),
    getLandlordTenants: () => request<any[]>('/tenants'),
    getTenantProfile: (tenantId: string) => request<any>(`/tenants/${tenantId}`),
  },

  // System Admin
  admin: {
    getStats: () => request<any>('/admin/stats'),
    getUsers: () => request<any[]>('/admin/users'),
    createUser: (data: any) =>
      request<any>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateUserStatus: (userId: string, status: string) =>
      request<any>(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    updateUserRole: (userId: string, role: string) =>
      request<any>(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    suspendUser: (userId: string) =>
      request<any>(`/admin/users/${userId}/suspend`, {
        method: 'PATCH',
      }),
    activateUser: (userId: string) =>
      request<any>(`/admin/users/${userId}/activate`, {
        method: 'PATCH',
      }),
    getProperties: () => request<any[]>('/admin/properties'),
    reassignProperty: (propertyId: string, landlordId: string) =>
      request<any>(`/admin/properties/${propertyId}/reassign`, {
        method: 'POST',
        body: JSON.stringify({ landlord_id: landlordId }),
      }),
    getUnits: () => request<any[]>('/admin/units'),
    getTenants: () => request<any[]>('/admin/tenants'),
    getTenancies: () => request<any[]>('/admin/tenancies'),
    getLeases: () => request<any[]>('/admin/leases'),
    getInvitations: () => request<any[]>('/admin/invitations'),
    getAuditLogs: () => request<any[]>('/admin/audit-logs'),
    broadcastNotification: (data: any) =>
      request<any>('/admin/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // --- PHASE 3 FINANCIAL API SERVICES ---

  invoices: {
    list: () => request<any[]>('/invoices'),
    create: (data: any) =>
      request<any>('/invoices/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancel: (invoiceId: string) =>
      request<any>(`/invoices/${invoiceId}/cancel`, {
        method: 'POST',
      }),
    delete: (invoiceId: string) =>
      request<any>(`/invoices/${invoiceId}`, {
        method: 'DELETE',
      }),
    getLandlordInvoices: (landlordId: string) => request<any[]>(`/invoices/landlord/${landlordId}`),
    getTenantInvoices: (tenantId: string) => request<any[]>(`/invoices/tenant/${tenantId}`),
    getDetails: (invoiceId: string) => request<any>(`/invoices/${invoiceId}`),
    generateMonthlyInvoices: () =>
      request<any[]>('/invoices/generate', {
        method: 'POST',
      }),
  },

  payments: {
    list: () => request<any[]>('/payments'),
    processPayment: (data: {
      invoice_id: string;
      amount: number;
      payment_method: string;
      payment_channel?: string;
      transaction_reference?: string;
      notes?: string;
      auto_verify?: boolean;
    }) =>
      request<any>('/payments/pay', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    verifyPayment: (
      paymentId: string,
      verifierIdOrConfirm: string | boolean,
      confirmOrReason?: boolean | string,
      notes?: string
    ) => {
      let verifierId = 'mock-lp-001';
      let isConfirm = true;
      let noteText = notes;

      if (typeof verifierIdOrConfirm === 'boolean') {
        isConfirm = verifierIdOrConfirm;
        if (typeof confirmOrReason === 'string') {
          noteText = confirmOrReason;
        }
      } else {
        verifierId = verifierIdOrConfirm;
        if (typeof confirmOrReason === 'boolean') {
          isConfirm = confirmOrReason;
        }
      }

      return request<any>(`/payments/${paymentId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ verifier_id: verifierId, confirm: isConfirm, notes: noteText }),
      });
    },

    getLandlordPayments: (landlordId: string) => request<any[]>(`/payments/landlord/${landlordId}`),
    getTenantPayments: (tenantId: string) => request<any[]>(`/payments/tenant/${tenantId}`),
  },

  receipts: {
    list: () => request<any[]>('/receipts'),
    getReceipt: (receiptId: string) => request<any>(`/receipts/${receiptId}`),
    getReceiptByPayment: (paymentId: string) => request<any>(`/receipts/payment/${paymentId}`),
    getTenantReceipts: (tenantId: string) => request<any[]>(`/receipts/tenant/${tenantId}`),
    getLandlordReceipts: (landlordId: string) => request<any[]>(`/receipts/landlord/${landlordId}`),
  },

  expenses: {
    list: () => request<any[]>('/expenses'),
    create: (data: any) =>
      request<any>('/expenses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createExpense: (data: any) =>
      request<any>('/expenses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<any>(`/expenses/${id}`, {
        method: 'DELETE',
      }),
    getLandlordExpenses: (landlordId: string, propertyId?: string, category?: string) => {
      let query = `/expenses/landlord/${landlordId}`;
      const params = new URLSearchParams();
      if (propertyId) params.append('property_id', propertyId);
      if (category) params.append('category', category);
      if (params.toString()) query += `?${params.toString()}`;
      return request<any[]>(query);
    },
    getSummary: (landlordId: string) => request<any>(`/expenses/summary/${landlordId}`),
  },

  financials: {
    getLandlordFinancials: (landlordId: string) => request<any>(`/financials/landlord/${landlordId}`),
    getLandlordSummary: (landlordId?: string) => request<any>('/financials/landlord/me'),
    getTenantFinancials: (tenantId: string) => request<any>(`/financials/tenant/${tenantId}`),
    getTenantSummary: (tenantId?: string) => request<any>(`/financials/tenant/${tenantId || 'mock-tenant-001'}`),
  },

  // --- PHASE 4 MAINTENANCE & COMPLAINT SERVICES ---

  maintenance: {
    getTenantRequests: () => request<any[]>('/maintenance/tenant/me'),
    getLandlordRequests: (params?: { property_id?: string; status?: string; priority?: string }) => {
      let query = '/maintenance/landlord/me';
      if (params) {
        const q = new URLSearchParams();
        if (params.property_id) q.append('property_id', params.property_id);
        if (params.status) q.append('status', params.status);
        if (params.priority) q.append('priority', params.priority);
        if (q.toString()) query += `?${q.toString()}`;
      }
      return request<any[]>(query);
    },
    getAllRequests: (params?: { status?: string; priority?: string }) => {
      let query = '/maintenance';
      if (params) {
        const q = new URLSearchParams();
        if (params.status) q.append('status', params.status);
        if (params.priority) q.append('priority', params.priority);
        if (q.toString()) query += `?${q.toString()}`;
      }
      return request<any[]>(query);
    },
    getLandlordStats: () => request<any>('/maintenance/landlord/stats'),
    getAllStats: () => request<any>('/maintenance/admin/stats'),
    getRequestDetails: (id: string) => request<any>(`/maintenance/${id}`),
    createRequest: (data: {
      title: string;
      description: string;
      category: string;
      priority?: string;
      tenancy_id?: string;
    }) =>
      request<any>('/maintenance', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    acknowledgeRequest: (id: string) =>
      request<any>(`/maintenance/${id}/acknowledge`, {
        method: 'POST',
      }),
    scheduleRequest: (
      id: string,
      data: {
        scheduled_date: string;
        scheduled_time?: string;
        assigned_to?: string;
        assigned_worker_id?: string;
        estimated_cost?: number;
      }
    ) =>
      request<any>(`/maintenance/${id}/schedule`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    markInProgress: (id: string) =>
      request<any>(`/maintenance/${id}/in-progress`, {
        method: 'POST',
      }),
    resolveRequest: (
      id: string,
      data: {
        actual_cost?: number;
        landlord_notes?: string;
      }
    ) =>
      request<any>(`/maintenance/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    addToExpenses: (id: string) =>
      request<any>(`/maintenance/${id}/to-expense`, {
        method: 'POST',
      }),
    tenantConfirmClose: (
      id: string,
      data?: {
        tenant_notes?: string;
        rating?: number;
      }
    ) =>
      request<any>(`/maintenance/${id}/confirm-resolution`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    confirmResolution: (
      id: string,
      options?: { rating?: number; tenant_notes?: string } | number,
      feedback?: string
    ) => {
      const payload =
        typeof options === 'object' && options !== null
          ? options
          : { rating: options, tenant_notes: feedback };
      return request<any>(`/maintenance/${id}/confirm-resolution`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    tenantReopen: (
      id: string,
      data: {
        tenant_notes: string;
      }
    ) =>
      request<any>(`/maintenance/${id}/reopen`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    reopen: (id: string, options?: { tenant_notes?: string } | string) => {
      const payload =
        typeof options === 'object' && options !== null
          ? options
          : { tenant_notes: options };
      return request<any>(`/maintenance/${id}/reopen`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    addComment: (id: string, message: string) =>
      request<any>(`/maintenance/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
    getWorkers: () => request<any[]>('/maintenance/workers'),
    createWorker: (data: {
      name: string;
      phone: string;
      specialization: string;
      notes?: string;
    }) =>
      request<any>('/maintenance/workers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  complaints: {
    getTenantComplaints: () => request<any[]>('/complaints/tenant/me'),
    getLandlordComplaints: (params?: { property_id?: string; status?: string }) => {
      let query = '/complaints/landlord/me';
      if (params) {
        const q = new URLSearchParams();
        if (params.property_id) q.append('property_id', params.property_id);
        if (params.status) q.append('status', params.status);
        if (q.toString()) query += `?${q.toString()}`;
      }
      return request<any[]>(query);
    },
    getAllComplaints: (params?: { status?: string }) => {
      let query = '/complaints';
      if (params) {
        const q = new URLSearchParams();
        if (params.status) q.append('status', params.status);
        if (q.toString()) query += `?${q.toString()}`;
      }
      return request<any[]>(query);
    },
    getLandlordStats: () => request<any>('/complaints/landlord/stats'),
    getAllStats: () => request<any>('/complaints/admin/stats'),
    getComplaintDetails: (id: string) => request<any>(`/complaints/${id}`),
    createComplaint: (data: {
      subject: string;
      description: string;
      category: string;
      priority?: string;
      tenancy_id?: string;
    }) =>
      request<any>('/complaints', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    acknowledgeComplaint: (id: string) =>
      request<any>(`/complaints/${id}/acknowledge`, {
        method: 'POST',
      }),
    markUnderReview: (id: string, data?: { landlord_response?: string }) =>
      request<any>(`/complaints/${id}/under-review`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    resolveComplaint: (id: string, data: { landlord_response: string }) =>
      request<any>(`/complaints/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    closeComplaint: (id: string) =>
      request<any>(`/complaints/${id}/close`, {
        method: 'POST',
      }),
    addComment: (id: string, message: string) =>
      request<any>(`/complaints/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
  },

  notifications: {
    create: (data: any) =>
      request<any>('/notifications', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getUserNotifications: (userId: string) => request<any[]>('/notifications'),
    list: (params?: { channel?: string; status?: string; limit?: number; unread_only?: boolean }) => {
      let query = '/notifications';
      if (params) {
        const q = new URLSearchParams();
        if (params.channel) q.append('channel', params.channel);
        if (params.status) q.append('status', params.status);
        if (params.limit) q.append('limit', String(params.limit));
        if (params.unread_only) q.append('unread_only', 'true');
        if (q.toString()) query += `?${q.toString()}`;
      }
      return request<any[]>(query);
    },
    getAll: (params?: {
      category?: string;
      priority?: string;
      unread_only?: boolean;
      search?: string;
    }) => {
      let query = '/notifications';
      if (params) {
        const q = new URLSearchParams();
        if (params.category) q.append('category', params.category);
        if (params.priority) q.append('priority', params.priority);
        if (params.unread_only !== undefined) q.append('unread_only', String(params.unread_only));
        if (params.search) q.append('search', params.search);
        if (q.toString()) query += `?${q.toString()}`;
      }
      return request<any[]>(query);
    },
    getUnreadCount: () => request<{ unread_count: number }>('/notifications/unread-count'),
    markAsRead: (id: string) =>
      request<any>(`/notifications/${id}/read`, {
        method: 'PATCH',
      }),
    markAllAsRead: () =>
      request<any>('/notifications/mark-all-read', {
        method: 'POST',
      }),
    delete: (id: string) =>
      request<any>(`/notifications/${id}`, {
        method: 'DELETE',
      }),
    getPreferences: () => request<any>('/notifications/preferences'),
    updatePreferences: (data: any) =>
      request<any>('/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    processReminders: () =>
      request<any>('/notifications/process-reminders', {
        method: 'POST',
      }),
    sendTestEmail: (data: { email: string; days_remaining?: number; milestone?: string }) =>
      request<any>('/notifications/test-email', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getDeliveryLogs: () => request<any[]>('/notifications/logs'),
    getTemplates: () => request<any[]>('/notifications/templates'),
  },

  messages: {
    getAll: (partnerId?: string) => {
      const url = partnerId ? `/messages?partner_id=${partnerId}` : '/messages';
      return request<any[]>(url);
    },
    getConversations: () => request<any[]>('/messages/conversations'),
    send: (data: {
      recipient_id?: string;
      property_id?: string;
      unit_id?: string;
      tenancy_id?: string;
      message_type: 'GENERAL' | 'MAINTENANCE';
      content: string;
      attachment_url?: string;
      attachment_name?: string;
      attachment_size?: number;
      maintenance_title?: string;
      maintenance_category?: string;
      maintenance_priority?: string;
      maintenance_request_id?: string;
    }) =>
      request<any>('/messages', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    markAsRead: (partnerId: string) =>
      request<any>(`/messages/read/${partnerId}`, {
        method: 'POST',
      }),
  },

  tracker: {
    getDashboard: (params?: {
      property_id?: string;
      period_type?: string;
      start_date?: string;
      end_date?: string;
    }) => {
      let query = '/tracker/dashboard';
      if (params) {
        const q = new URLSearchParams();
        if (params.property_id) q.append('property_id', params.property_id);
        if (params.period_type) q.append('period_type', params.period_type);
        if (params.start_date) q.append('start_date', params.start_date);
        if (params.end_date) q.append('end_date', params.end_date);
        if (q.toString()) query += `?${q.toString()}`;
      }
      return request<any>(query);
    },
    uploadContent: (data: {
      property_id?: string;
      bank_account_id?: string;
      file_name: string;
      content: string;
      auto_confirm?: boolean;
    }) =>
      request<any>('/tracker/upload-content', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    uploadFile: (formData: FormData) => {
      const token = localStorage.getItem('notify_access_token');
      if (isMockToken(token)) {
        return handleMockRequest('/tracker/upload-file', { method: 'POST', body: formData });
      }
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      return fetch(`${API_BASE_URL}/tracker/upload-file`, {
        method: 'POST',
        headers,
        body: formData,
      }).then((res) => res.json());
    },
    manualMatch: (data: {
      transaction_id: string;
      invoice_id: string;
      notes?: string;
    }) =>
      request<any>('/tracker/manual-match', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    rejectMatch: (data: {
      transaction_id: string;
      reason?: string;
    }) =>
      request<any>('/tracker/reject-match', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getStatements: () => request<any[]>('/tracker/statements'),
    getAccounts: () => request<any[]>('/tracker/accounts'),
    createAccount: (data: {
      bank_name: string;
      account_name: string;
      account_number: string;
      currency?: string;
      is_primary?: boolean;
    }) =>
      request<any>('/tracker/accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};

