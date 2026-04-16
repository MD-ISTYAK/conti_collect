const xlsx = require('xlsx');
const Complaint = require('../models/Complaint');
const CFA = require('../models/CFA');
const Dealer = require('../models/Dealer');
const ImportLog = require('../models/ImportLog');
const CustomField = require('../models/CustomField');
const { writeAuditLog } = require('../services/auditService');

/**
/**
 * Convert Excel serial date number OR "DD/MM/YYYY" / "MM/DD/YYYY" strings to JavaScript Date.
 */
function parseDateValue(value) {
  if (!value) return null;
  if (typeof value === 'number') {
    return new Date((value - 25569) * 86400 * 1000);
  }
  if (typeof value === 'string') {
    const parts = value.split(/[/-]/);
    if (parts.length === 3) {
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      let day, month;
      if (p1 > 12) {
        day = p1; month = p2;
      } else if (p2 > 12) {
        month = p1; day = p2;
      } else {
        day = p1; month = p2; // Default to DD/MM/YYYY for India
      }
      return new Date(y, month - 1, day);
    }
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/**
 * POST /admin/complaints/import
 * Daily MIS import with UPSERT logic:
 *  - Only processes rows where Status = "Adjusted"
 *  - New complaints get created with status CFA_ASSIGNED
 *  - Existing complaints that are already CFA_ASSIGNED+ get skipped as duplicates
 *  - Full date tracking from MIS Excel
 */
exports.importComplaints = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'Please upload an Excel or CSV file.' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    let data = [];
    let sheetName = '';

    // Find first non-empty sheet
    for (const name of workbook.SheetNames) {
      const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[name]);
      if (sheetData.length > 0) {
        data = sheetData;
        sheetName = name;
        break;
      }
    }

    console.log(`[Import] Processing sheet: "${sheetName}" with ${data.length} rows.`);

    if (data.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Excel file is empty or no data rows found.' });
    }

    const customFields = await CustomField.find({ isActive: true });

    const results = {
      imported: 0,
      updated: 0,
      duplicates: 0,
      skipped: 0,
      errors: 0,
      errorDetails: [],
      importedComplaintIds: [],
      updatedComplaintIds: [],
    };

    // Pre-fetch all CFA and Dealer entities for batch lookup
    const allCFAs = await CFA.find({ isActive: true });
    const allDealers = await Dealer.find({ isActive: true });
    const cfaByCode = {};
    allCFAs.forEach(c => { cfaByCode[c.code.toUpperCase()] = c; });
    const dealerByCode = {};
    allDealers.forEach(d => { dealerByCode[String(d.code).toUpperCase()] = d; });

    // Pre-fetch existing complaints for duplicate check
    const incomingIds = data
      .filter(row => {
        const status = String(row['Status'] || '').trim();
        return status.toLowerCase() === 'adjusted';
      })
      .map(row => String(row['Complaint No. Case No'] || row['Complaint No.'] || row['Complaint ID'] || row['complaintId'] || '').trim())
      .filter(Boolean);

    const existingComplaints = await Complaint.find({ complaintId: { $in: incomingIds } }).select('complaintId status');
    const existingMap = {};
    existingComplaints.forEach(c => { existingMap[c.complaintId] = c; });

    const toInsert = [];
    const seenInBatch = new Set();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2; // Excel row (header = 1)

      // 1. Filter: Only process "Adjusted" rows
      const statusValue = String(row['Status'] || '').trim();
      if (statusValue.toLowerCase() !== 'adjusted') {
        results.skipped++;
        continue;
      }

      // 2. Get Complaint ID
      const complaintId = String(
        row['Complaint No. Case No'] || row['Complaint No.'] || row['Complaint ID'] || row['complaintId'] || ''
      ).trim();

      if (!complaintId) {
        results.errors++;
        results.errorDetails.push({ row: rowIndex, message: 'Missing Complaint No. Case No' });
        continue;
      }

      // Duplicate within batch
      if (seenInBatch.has(complaintId)) {
        results.duplicates++;
        continue;
      }
      seenInBatch.add(complaintId);

      // 3. Parse dates
      const misCreatedAt = parseDateValue(row['Created On'] || row['Created At']);
      const misAdjustedAt = parseDateValue(row['Changed On'] || row['Updated At'] || row['Changed At']);

      // 4. Check if already exists
      const existing = existingMap[complaintId];
      if (existing) {
        // Already processed (CFA_ASSIGNED or beyond) → skip
        const processedStatuses = ['CFA_ASSIGNED', 'PICKED_UP', 'RECEIVED_AT_CFA', 'VERIFIED', 'REFUND_PROCESSED'];
        if (processedStatuses.includes(existing.status)) {
          results.duplicates++;
          continue;
        }

        // Exists but not yet CFA_ASSIGNED (was maybe created manually as CREATED/APPROVED)
        // → Update to CFA_ASSIGNED
        try {
          const complaint = await Complaint.findOne({ complaintId });
          complaint.status = 'CFA_ASSIGNED';
          complaint.misAdjustedAt = misAdjustedAt;
          complaint.misImportedAt = new Date();
          complaint.misImportedBy = req.user._id;
          complaint.source = 'mis_import';
          complaint.addTimelineEntry('CFA_ASSIGNED', req.user._id,
            `Status updated to Adjusted via MIS import (Adjusted on ${misAdjustedAt ? misAdjustedAt.toLocaleDateString('en-IN') : 'N/A'})`
          );
          await complaint.save();
          results.updated++;
          results.updatedComplaintIds.push(complaintId);
        } catch (updateErr) {
          results.errors++;
          results.errorDetails.push({ row: rowIndex, id: complaintId, message: `Update error: ${updateErr.message}` });
        }
        continue;
      }

      // 5. Resolve Dealer by AG code
      const agValue = String(row['AG'] || row['ag'] || '').trim().toUpperCase();
      if (!agValue) {
        results.errors++;
        results.errorDetails.push({ row: rowIndex, id: complaintId, message: 'AG Code column is empty.' });
        continue;
      }

      const dealer = dealerByCode[agValue];
      if (!dealer) {
        results.errors++;
        results.errorDetails.push({ row: rowIndex, id: complaintId, message: `AG Code '${agValue}' not found in Dealer Master.` });
        continue;
      }

      // 6. Resolve CFA by Sales Office code
      const soValue = String(row['Sales Office'] || row['salesOffice'] || '').trim().toUpperCase();
      let cfa = null;
      if (soValue) {
        cfa = cfaByCode[soValue];
        if (!cfa) {
          results.errors++;
          results.errorDetails.push({ row: rowIndex, id: complaintId, message: `Sales Office '${soValue}' not found in CFA Master.` });
          continue;
        }
      }

      // 7. Build complaint document
      const complaintDoc = {
        complaintId,
        dealerEntity: dealer._id,
        cfaEntity: cfa ? cfa._id : undefined,
        productName: String(row['Articale Number'] || row['Product'] || row['productName'] || 'Unknown').trim(),
        productType: 'tire',
        quantity: parseInt(row['Qty'] || row['quantity'] || 1) || 1,
        status: cfa ? 'CFA_ASSIGNED' : 'APPROVED',
        reason: 'other',
        description: row['Description'] || row['description'] || '',
        refundAmount: parseFloat(row['Credit Value Net'] || 0) || 0,
        images: [],
        source: 'mis_import',
        misCreatedAt,
        misAdjustedAt,
        misImportedAt: new Date(),
        misImportedBy: req.user._id,
        customData: {},
        timeline: [{
          status: cfa ? 'CFA_ASSIGNED' : 'APPROVED',
          timestamp: misAdjustedAt || new Date(),
          updatedBy: req.user._id,
          note: `Imported via MIS Excel (Created: ${misCreatedAt ? misCreatedAt.toLocaleDateString('en-IN') : 'N/A'}, Adjusted: ${misAdjustedAt ? misAdjustedAt.toLocaleDateString('en-IN') : 'N/A'})`,
        }],
      };

      // 8. Store all metadata in customData
      const specialMappings = {
        'Identification No.': 'identification_no',
        'AG': 'ag',
        'Dealer': 'dealer_business_name',
        'ASM': 'asm',
        'Region': 'region',
        'Sales Office': 'sales_office',
        'General Status': 'general_status',
        'Dealer Reference': 'dealer_reference',
        'Name of Engineer': 'name_of_engineer',
        'Status Remark': 'status_remark',
        'Status': 'mis_status',
      };

      Object.entries(specialMappings).forEach(([header, key]) => {
        if (row[header] !== undefined) complaintDoc.customData[key] = row[header];
      });

      // Custom fields
      for (const field of customFields) {
        const val = row[field.label] || row[field.key];
        if (val !== undefined) complaintDoc.customData[field.key] = val;
      }

      toInsert.push(complaintDoc);
    }

    // 9. Bulk insert new complaints
    if (toInsert.length > 0) {
      try {
        const inserted = await Complaint.insertMany(toInsert, { ordered: false });
        results.imported = inserted.length;
        results.importedComplaintIds = inserted.map(c => c.complaintId);
      } catch (insertError) {
        results.imported = insertError.insertedDocs?.length || 0;
        if (insertError.insertedDocs) {
          results.importedComplaintIds = insertError.insertedDocs.map(c => c.complaintId);
        }
        if (insertError.writeErrors) {
          insertError.writeErrors.forEach(err => {
            results.errors++;
            results.errorDetails.push({
              row: 'Batch',
              message: `Insert error: ${err.errmsg}`,
            });
          });
        }
      }
    }

    // 10. Create ImportLog
    const importLog = await ImportLog.create({
      importedBy: req.user._id,
      importedAt: new Date(),
      fileName: req.file.originalname,
      totalRows: data.length,
      adjustedRows: data.filter(r => String(r['Status'] || '').trim().toLowerCase() === 'adjusted').length,
      skippedRows: results.skipped,
      importedCount: results.imported,
      updatedCount: results.updated,
      duplicateCount: results.duplicates,
      errorCount: results.errors,
      errorDetails: results.errorDetails,
      importedComplaintIds: results.importedComplaintIds,
      updatedComplaintIds: results.updatedComplaintIds,
    });

    // 11. Audit log
    writeAuditLog({
      action: 'MIS_IMPORT',
      performedBy: req.user._id,
      targetId: importLog._id,
      targetModel: 'ImportLog',
      after: {
        fileName: req.file.originalname,
        totalRows: data.length,
        imported: results.imported,
        updated: results.updated,
        duplicates: results.duplicates,
        skipped: results.skipped,
        errors: results.errors,
      },
      req,
    });

    res.json({
      status: 'success',
      message: `Import completed: ${results.imported} imported, ${results.updated} updated, ${results.duplicates} duplicates skipped, ${results.skipped} non-Adjusted skipped.`,
      summary: {
        imported: results.imported,
        updated: results.updated,
        duplicates: results.duplicates,
        skipped: results.skipped,
        errors: results.errors,
        errorDetails: results.errorDetails,
      },
    });

  } catch (e) {
    console.error('Import error:', e);
    res.status(500).json({ status: 'error', message: e.message });
  }
};
